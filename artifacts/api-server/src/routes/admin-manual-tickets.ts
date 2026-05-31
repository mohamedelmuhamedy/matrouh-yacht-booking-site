import { Router } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { and, desc, eq } from "drizzle-orm";
import { db, bookings, manualTickets, packages, siteSettings } from "@workspace/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { ensureManualTicketToken, ensureTicketToken } from "./tickets";
import { recordAudit } from "../lib/audit";
import { checkCapacity } from "./admin-capacity";

const router = Router();
const TICKETS_DIR = path.resolve(process.cwd(), "data", "tickets");

const VALID_STATUSES = ["new", "contacted", "confirmed", "client_confirmed", "completed", "cancelled"];

function ensureDir() {
  try { fs.mkdirSync(TICKETS_DIR, { recursive: true }); } catch {}
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  if (/^0(10|11|12|15)\d{8}$/.test(p)) return true;
  if (/^\+?\d{8,15}$/.test(p)) return true;
  return false;
}

function cap(raw: unknown, max: number): string {
  return String(raw ?? "").trim().slice(0, max);
}

async function convertManualTicketsToBookings(): Promise<boolean> {
  const [setting] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, "convert_manual_tickets_to_bookings"));
  return (setting?.value ?? "true") !== "false";
}

async function resolveTrip(body: Record<string, unknown>): Promise<{
  packageId: number | null;
  packageName: string;
  packageNameAr: string;
  priceAtBooking: number | null;
}> {
  const rawPackageId = body.packageId;
  if (rawPackageId !== undefined && rawPackageId !== null && rawPackageId !== "") {
    const packageId = Number.parseInt(String(rawPackageId), 10);
    if (!Number.isFinite(packageId) || packageId <= 0) {
      throw new Error("INVALID_PACKAGE");
    }
    const [pkg] = await db.select().from(packages).where(eq(packages.id, packageId));
    if (!pkg || !pkg.active) throw new Error("PACKAGE_NOT_FOUND");
    return {
      packageId: pkg.id,
      packageName: pkg.titleEn,
      packageNameAr: pkg.titleAr,
      priceAtBooking: pkg.priceEGP,
    };
  }

  const packageName = cap(body.packageName ?? body.trip, 200);
  const packageNameAr = cap(body.packageNameAr ?? body.trip, 200);
  if (!packageName && !packageNameAr) throw new Error("TRIP_REQUIRED");
  return { packageId: null, packageName, packageNameAr, priceAtBooking: null };
}

async function parsePayload(body: Record<string, unknown>): Promise<{
  name: string;
  phone: string;
  packageId: number | null;
  packageName: string;
  packageNameAr: string;
  priceAtBooking: number | null;
  date: string;
  passengerCount: number;
  pickupLocation: string;
  pickupLocationAr: string;
  meetingTime: string;
  supervisorName: string;
  supervisorPhone: string;
  remainingBalance: string;
  status: string;
  notes: string;
}> {
  const name = cap(body.name ?? body.customerName, 200);
  const phoneRaw = cap(body.phone ?? body.phoneNumber, 32);
  const date = cap(body.date ?? body.travelDate, 64);
  const passengerCount = Number.parseInt(String(body.passengerCount ?? body.passengers ?? 1), 10);
  const pickup = cap(body.pickupLocation ?? body.pickupPoint, 256);
  const meetingTime = cap(body.meetingTime ?? body.departureTime, 64);
  const supervisorName = cap(body.supervisorName, 128);
  const supervisorPhone = cap(body.supervisorPhone, 32);
  const remainingBalance = cap(body.remainingBalance ?? body.remainingAmount, 64);
  const status = VALID_STATUSES.includes(String(body.status)) ? String(body.status) : "confirmed";
  const notes = cap(body.notes, 2000);
  const trip = await resolveTrip(body);

  if (!name) throw new Error("NAME_REQUIRED");
  if (!phoneRaw || !isValidPhone(phoneRaw)) throw new Error("PHONE_INVALID");
  if (!date) throw new Error("DATE_REQUIRED");
  if (!Number.isFinite(passengerCount) || passengerCount < 1 || passengerCount > 200) {
    throw new Error("PASSENGERS_INVALID");
  }
  if (!pickup) throw new Error("PICKUP_REQUIRED");
  if (!meetingTime) throw new Error("DEPARTURE_REQUIRED");
  if (!supervisorName) throw new Error("SUPERVISOR_REQUIRED");
  if (!supervisorPhone) throw new Error("SUPERVISOR_PHONE_REQUIRED");
  if (!remainingBalance) throw new Error("REMAINING_REQUIRED");

  return {
    ...trip,
    name,
    phone: normalizePhone(phoneRaw),
    date,
    passengerCount,
    pickupLocation: pickup,
    pickupLocationAr: pickup,
    meetingTime,
    supervisorName,
    supervisorPhone,
    remainingBalance,
    status,
    notes,
  };
}

function payloadError(err: unknown): { status: number; error: string } {
  const code = err instanceof Error ? err.message : String(err);
  const map: Record<string, string> = {
    NAME_REQUIRED: "اسم العميل مطلوب",
    PHONE_INVALID: "رقم الهاتف غير صالح",
    DATE_REQUIRED: "تاريخ الرحلة مطلوب",
    PASSENGERS_INVALID: "عدد الركاب غير صالح",
    PICKUP_REQUIRED: "نقطة التجمع مطلوبة",
    DEPARTURE_REQUIRED: "وقت الانطلاق مطلوب",
    SUPERVISOR_REQUIRED: "اسم المشرف مطلوب",
    SUPERVISOR_PHONE_REQUIRED: "هاتف المشرف مطلوب",
    REMAINING_REQUIRED: "المبلغ المتبقي مطلوب",
    TRIP_REQUIRED: "الرحلة مطلوبة",
    INVALID_PACKAGE: "الرحلة غير صالحة",
    PACKAGE_NOT_FOUND: "الرحلة غير موجودة أو غير مفعلة",
  };
  return { status: map[code] ? 400 : 500, error: map[code] ?? "Failed to validate manual ticket" };
}

function bookingAsManual(b: typeof bookings.$inferSelect) {
  return {
    kind: "booking" as const,
    id: b.id,
    name: b.name,
    phone: b.phone,
    packageId: b.packageId,
    packageName: b.packageName,
    packageNameAr: b.packageNameAr,
    date: b.date,
    passengerCount: (b.adults || 0) + (b.children || 0) + (b.infants || 0),
    pickupLocation: b.pickupLocation,
    pickupLocationAr: b.pickupLocationAr,
    meetingTime: b.meetingTime,
    supervisorName: b.supervisorName,
    supervisorPhone: b.supervisorPhone,
    remainingBalance: b.remainingBalance,
    status: b.status,
    notes: b.notes,
    ticketToken: b.ticketToken,
    ticketNumber: b.ticketNumber,
    ticketIssuedAt: b.ticketIssuedAt,
    ticketUsedAt: b.ticketUsedAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    storageMode: "booking" as const,
  };
}

function manualAsManual(t: typeof manualTickets.$inferSelect) {
  return {
    kind: "manual" as const,
    id: t.id,
    name: t.name,
    phone: t.phone,
    packageId: t.packageId,
    packageName: t.packageName,
    packageNameAr: t.packageNameAr,
    date: t.date,
    passengerCount: t.passengerCount,
    pickupLocation: t.pickupLocation,
    pickupLocationAr: t.pickupLocationAr,
    meetingTime: t.meetingTime,
    supervisorName: t.supervisorName,
    supervisorPhone: t.supervisorPhone,
    remainingBalance: t.remainingBalance,
    status: t.status,
    notes: t.notes,
    ticketToken: t.ticketToken,
    ticketNumber: t.ticketNumber,
    ticketIssuedAt: t.ticketIssuedAt,
    ticketUsedAt: t.ticketUsedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    storageMode: "manual" as const,
  };
}

async function findManualManagedRecord(kind: string, id: number) {
  if (kind === "booking") {
    const [row] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.source, "manual_admin")));
    return row ? { kind: "booking" as const, row } : null;
  }
  if (kind === "manual") {
    const [row] = await db.select().from(manualTickets).where(eq(manualTickets.id, id));
    return row ? { kind: "manual" as const, row } : null;
  }
  return null;
}

router.get("/admin/manual-tickets", authMiddleware, async (_req, res) => {
  try {
    const convertToBookings = await convertManualTicketsToBookings();
    const [manualRows, bookingRows] = await Promise.all([
      db.select().from(manualTickets).orderBy(desc(manualTickets.createdAt)),
      db.select().from(bookings).where(eq(bookings.source, "manual_admin")).orderBy(desc(bookings.createdAt)),
    ]);
    const rows = [
      ...manualRows.map(manualAsManual),
      ...bookingRows.map(bookingAsManual),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ convertToBookings, rows });
  } catch (err) {
    console.error("[manual-tickets] list:", err);
    return res.status(500).json({ error: "Failed to fetch manual tickets" });
  }
});

router.get("/admin/manual-tickets/trips", authMiddleware, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: packages.id,
        titleAr: packages.titleAr,
        titleEn: packages.titleEn,
        priceEGP: packages.priceEGP,
      })
      .from(packages)
      .where(eq(packages.active, true))
      .orderBy(desc(packages.sortOrder), desc(packages.createdAt));
    return res.json(rows);
  } catch (err) {
    console.error("[manual-tickets] trips:", err);
    return res.status(500).json({ error: "Failed to fetch trips" });
  }
});

router.post("/admin/manual-tickets", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const data = await parsePayload(req.body ?? {});
    const convertToBookings = await convertManualTicketsToBookings();
    const admin = (req as any).admin as { userId?: number; username?: string };

    if (convertToBookings && data.packageId !== null) {
      const cap = await checkCapacity(data.packageId, data.date, data.passengerCount);
      if (!cap.ok) {
        return res.status(409).json({ error: cap.reason, code: "CAPACITY_FULL", remaining: cap.remaining });
      }
    }

    if (convertToBookings) {
      const [row] = await db.insert(bookings).values({
        name: data.name,
        phone: data.phone,
        packageId: data.packageId,
        packageName: data.packageName,
        packageNameAr: data.packageNameAr,
        date: data.date,
        adults: data.passengerCount,
        children: 0,
        infants: 0,
        notes: data.notes,
        adminNotes: "Created manually from admin panel",
        currency: "EGP",
        priceAtBooking: data.priceAtBooking,
        status: data.status,
        source: "manual_admin",
        meetingTime: data.meetingTime,
        pickupLocation: data.pickupLocation,
        pickupLocationAr: data.pickupLocationAr,
        supervisorName: data.supervisorName,
        supervisorPhone: data.supervisorPhone,
        remainingBalance: data.remainingBalance,
      }).returning();
      const issued = await ensureTicketToken(row.id);
      const out = bookingAsManual({ ...row, ticketToken: issued?.token ?? row.ticketToken, ticketNumber: issued?.ticketNumber ?? row.ticketNumber });
      await recordAudit(req, {
        action: "manual_ticket.create_booking",
        entity: "booking",
        entityId: row.id,
        metadata: { source: "manual_admin", customer: data.name },
      });
      return res.status(201).json({ kind: "booking", item: out, convertToBookings });
    }

    const [row] = await db.insert(manualTickets).values({
      name: data.name,
      phone: data.phone,
      packageId: data.packageId,
      packageName: data.packageName,
      packageNameAr: data.packageNameAr,
      date: data.date,
      passengerCount: data.passengerCount,
      pickupLocation: data.pickupLocation,
      pickupLocationAr: data.pickupLocationAr,
      meetingTime: data.meetingTime,
      supervisorName: data.supervisorName,
      supervisorPhone: data.supervisorPhone,
      remainingBalance: data.remainingBalance,
      status: data.status,
      notes: data.notes,
      createdByAdminId: admin.userId ?? null,
      createdByAdminUsername: admin.username ?? "",
    }).returning();
    const issued = await ensureManualTicketToken(row.id);
    const out = manualAsManual({ ...row, ticketToken: issued?.token ?? row.ticketToken, ticketNumber: issued?.ticketNumber ?? row.ticketNumber });
    await recordAudit(req, {
      action: "manual_ticket.create",
      entity: "manual_ticket",
      entityId: row.id,
      metadata: { customer: data.name },
    });
    return res.status(201).json({ kind: "manual", item: out, convertToBookings });
  } catch (err) {
    const mapped = payloadError(err);
    if (mapped.status >= 500) console.error("[manual-tickets] create:", err);
    return res.status(mapped.status).json({ error: mapped.error });
  }
});

router.put("/admin/manual-tickets/:kind/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const data = await parsePayload(req.body ?? {});
    const existing = await findManualManagedRecord(String(req.params.kind), id);
    if (!existing) return res.status(404).json({ error: "Manual ticket not found" });

    if (existing.kind === "booking") {
      const [row] = await db.update(bookings).set({
        name: data.name,
        phone: data.phone,
        packageId: data.packageId,
        packageName: data.packageName,
        packageNameAr: data.packageNameAr,
        date: data.date,
        adults: data.passengerCount,
        children: 0,
        infants: 0,
        notes: data.notes,
        priceAtBooking: data.priceAtBooking,
        status: data.status,
        meetingTime: data.meetingTime,
        pickupLocation: data.pickupLocation,
        pickupLocationAr: data.pickupLocationAr,
        supervisorName: data.supervisorName,
        supervisorPhone: data.supervisorPhone,
        remainingBalance: data.remainingBalance,
        updatedAt: new Date(),
      }).where(and(eq(bookings.id, id), eq(bookings.source, "manual_admin"))).returning();
      await recordAudit(req, { action: "manual_ticket.update_booking", entity: "booking", entityId: id });
      return res.json(bookingAsManual(row));
    }

    const [row] = await db.update(manualTickets).set({
      name: data.name,
      phone: data.phone,
      packageId: data.packageId,
      packageName: data.packageName,
      packageNameAr: data.packageNameAr,
      date: data.date,
      passengerCount: data.passengerCount,
      pickupLocation: data.pickupLocation,
      pickupLocationAr: data.pickupLocationAr,
      meetingTime: data.meetingTime,
      supervisorName: data.supervisorName,
      supervisorPhone: data.supervisorPhone,
      remainingBalance: data.remainingBalance,
      status: data.status,
      notes: data.notes,
      updatedAt: new Date(),
    }).where(eq(manualTickets.id, id)).returning();
    await recordAudit(req, { action: "manual_ticket.update", entity: "manual_ticket", entityId: id });
    return res.json(manualAsManual(row));
  } catch (err) {
    const mapped = payloadError(err);
    if (mapped.status >= 500) console.error("[manual-tickets] update:", err);
    return res.status(mapped.status).json({ error: mapped.error });
  }
});

router.put("/admin/manual-tickets/:kind/:id/status", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    const status = String(req.body?.status ?? "");
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const existing = await findManualManagedRecord(String(req.params.kind), id);
    if (!existing) return res.status(404).json({ error: "Manual ticket not found" });
    if (existing.kind === "booking") {
      const [row] = await db.update(bookings).set({ status, updatedAt: new Date() })
        .where(and(eq(bookings.id, id), eq(bookings.source, "manual_admin")))
        .returning();
      return res.json(bookingAsManual(row));
    }
    const [row] = await db.update(manualTickets).set({ status, updatedAt: new Date() })
      .where(eq(manualTickets.id, id))
      .returning();
    return res.json(manualAsManual(row));
  } catch (err) {
    console.error("[manual-tickets] status:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

router.put("/admin/manual-tickets/:kind/:id/ticket-fields", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const body = req.body ?? {};
    const patch = {
      meetingTime: cap(body.meetingTime, 64),
      pickupLocation: cap(body.pickupLocation, 256),
      pickupLocationAr: cap(body.pickupLocationAr, 256),
      supervisorName: cap(body.supervisorName, 128),
      supervisorPhone: cap(body.supervisorPhone, 32),
      remainingBalance: cap(body.remainingBalance, 64),
      updatedAt: new Date(),
    };
    const existing = await findManualManagedRecord(String(req.params.kind), id);
    if (!existing) return res.status(404).json({ error: "Manual ticket not found" });
    if (existing.kind === "booking") {
      const [row] = await db.update(bookings).set(patch)
        .where(and(eq(bookings.id, id), eq(bookings.source, "manual_admin")))
        .returning();
      return res.json(bookingAsManual(row));
    }
    const [row] = await db.update(manualTickets).set(patch).where(eq(manualTickets.id, id)).returning();
    return res.json(manualAsManual(row));
  } catch (err) {
    console.error("[manual-tickets] ticket-fields:", err);
    return res.status(500).json({ error: "Failed to update ticket fields" });
  }
});

router.post("/admin/manual-tickets/:kind/:id/issue-ticket", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const existing = await findManualManagedRecord(String(req.params.kind), id);
    if (!existing) return res.status(404).json({ error: "Manual ticket not found" });
    const issued = existing.kind === "booking"
      ? await ensureTicketToken(id)
      : await ensureManualTicketToken(id);
    if (!issued) return res.status(500).json({ error: "Token issuance failed" });
    return res.json({
      token: issued.token,
      ticketNumber: issued.ticketNumber,
      signature: issued.signature,
      id,
      kind: existing.kind,
    });
  } catch (err) {
    console.error("[manual-tickets] issue:", err);
    return res.status(500).json({ error: "Failed to issue ticket" });
  }
});

router.post(
  "/admin/manual-tickets/:kind/:id/ticket-pdf",
  authMiddleware,
  requireRole("admin"),
  express.raw({ type: "application/pdf", limit: "30mb" }),
  async (req, res) => {
    try {
      const id = Number.parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      const existing = await findManualManagedRecord(String(req.params.kind), id);
      if (!existing) return res.status(404).json({ error: "Manual ticket not found" });
      const issued = existing.kind === "booking"
        ? await ensureTicketToken(id)
        : await ensureManualTicketToken(id);
      if (!issued) return res.status(500).json({ error: "Token issuance failed" });
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 1000) {
        return res.status(400).json({ error: "PDF body missing or too small" });
      }
      if (body.slice(0, 4).toString("utf8") !== "%PDF") {
        return res.status(400).json({ error: "Invalid PDF file" });
      }
      ensureDir();
      const pdfPath = path.join(TICKETS_DIR, `${issued.token}.pdf`);
      fs.writeFileSync(pdfPath, body);
      await recordAudit(req, {
        action: "manual_ticket.pdf_upload",
        entity: existing.kind === "manual" ? "manual_ticket" : "booking",
        entityId: id,
        metadata: { bytes: body.length },
      });
      return res.json({
        ok: true,
        token: issued.token,
        ticketNumber: issued.ticketNumber,
        signature: issued.signature,
        url: `/api/tickets/${issued.token}.pdf?sig=${encodeURIComponent(issued.signature)}`,
        bytes: body.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to store ticket PDF";
      return res.status(500).json({ error: msg });
    }
  },
);

router.delete("/admin/manual-tickets/:kind/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const existing = await findManualManagedRecord(String(req.params.kind), id);
    if (!existing) return res.status(404).json({ error: "Manual ticket not found" });
    if (existing.kind === "booking") {
      await db.delete(bookings).where(and(eq(bookings.id, id), eq(bookings.source, "manual_admin")));
      await recordAudit(req, { action: "manual_ticket.delete_booking", entity: "booking", entityId: id });
    } else {
      await db.delete(manualTickets).where(eq(manualTickets.id, id));
      await recordAudit(req, { action: "manual_ticket.delete", entity: "manual_ticket", entityId: id });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("[manual-tickets] delete:", err);
    return res.status(500).json({ error: "Failed to delete manual ticket" });
  }
});

export default router;
