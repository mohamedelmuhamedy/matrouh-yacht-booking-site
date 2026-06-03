import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { Router, type Request, type Response } from "express";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  bookings,
  db,
  packagePaymentSettings,
  packages,
  paymentMethods,
  paymentNotifications,
  paymentRequestAttachments,
  paymentRequestEvents,
  paymentRequests,
  pushSubscriptions,
  siteSettings,
} from "@workspace/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { ObjectNotFoundError, ObjectStorageService, StorageUploadError } from "../lib/objectStorage";
import { recordAudit } from "../lib/audit";
import { userHasPermission } from "../lib/adminPermissions";
import {
  canIssueTicketForBooking,
  expireOverduePayments,
  getGlobalPaymentExpirationHours,
  getPackagePaymentRule,
  PAYMENT_STATUSES,
} from "../lib/payments";
import { ensureTicketToken } from "./tickets";
import { checkCapacity } from "./admin-capacity";
import { signTicket } from "../lib/ticketSecurity";
import { sendPushToAdmins, sendPushToBooking } from "./push";

const router = Router();
const storage = new ObjectStorageService();

const PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function adminInfo(req: Request): { id?: number; username: string } {
  const admin = (req as unknown as { admin?: { userId?: number; username?: string } }).admin;
  return { id: admin?.userId, username: admin?.username || "admin" };
}

function copyProxyHeaders(source: globalThis.Response, res: Response): void {
  for (const name of ["content-type", "content-length", "cache-control", "etag", "last-modified"]) {
    const value = source.headers.get(name);
    if (value) res.setHeader(name, value);
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function ticketSnapshot(booking: typeof bookings.$inferSelect) {
  if (!booking.ticketToken || !booking.ticketNumber) return null;
  const signature = signTicket({
    bookingId: booking.id,
    ticketToken: booking.ticketToken,
    ticketNumber: booking.ticketNumber,
  });
  const pdfPath = path.resolve(process.cwd(), "data", "tickets", `${booking.ticketToken}.pdf`);
  const pdfAvailable = fs.existsSync(pdfPath);
  return {
    status: "issued",
    token: booking.ticketToken,
    ticketNumber: booking.ticketNumber,
    ticketSignature: signature,
    issuedAt: booking.ticketIssuedAt || booking.updatedAt,
    ticketUrl: `/ticket/${booking.ticketToken}`,
    verifyUrl: `/verify/${booking.ticketToken}?sig=${encodeURIComponent(signature)}`,
    pdfAvailable,
    pdfUrl: pdfAvailable ? `/api/tickets/${booking.ticketToken}.pdf?sig=${encodeURIComponent(signature)}` : null,
  };
}

function portalState(payment: typeof paymentRequests.$inferSelect, booking: typeof bookings.$inferSelect) {
  const ticket = ticketSnapshot(booking);
  const paymentStatus = String(payment.status || "");
  const ticketIssued = !!ticket;
  const steps = [
    {
      key: "payment_created",
      label: "تم إنشاء طلب الدفع",
      status: "done",
    },
    {
      key: "payment_proof",
      label: paymentStatus === PAYMENT_STATUSES.REUPLOAD_REQUESTED ? "مطلوب إعادة رفع إثبات الدفع" : "رفع إثبات الدفع",
      status: [
        PAYMENT_STATUSES.SUBMITTED,
        PAYMENT_STATUSES.APPROVED,
        PAYMENT_STATUSES.REJECTED,
        PAYMENT_STATUSES.REUPLOAD_REQUESTED,
        PAYMENT_STATUSES.WAIVED,
        PAYMENT_STATUSES.OFFLINE_PAID,
      ].includes(paymentStatus as any)
        ? "done"
        : paymentStatus === PAYMENT_STATUSES.EXPIRED
          ? "blocked"
          : "current",
    },
    {
      key: "payment_review",
      label: "مراجعة الإدارة",
      status: [
        PAYMENT_STATUSES.APPROVED,
        PAYMENT_STATUSES.REJECTED,
        PAYMENT_STATUSES.REUPLOAD_REQUESTED,
        PAYMENT_STATUSES.WAIVED,
        PAYMENT_STATUSES.OFFLINE_PAID,
      ].includes(paymentStatus as any)
        ? "done"
        : paymentStatus === PAYMENT_STATUSES.SUBMITTED
          ? "current"
          : paymentStatus === PAYMENT_STATUSES.EXPIRED
            ? "blocked"
            : "upcoming",
    },
    {
      key: "ticket_issue",
      label: "إصدار التذكرة",
      status: ticketIssued
        ? "done"
        : [PAYMENT_STATUSES.APPROVED, PAYMENT_STATUSES.WAIVED, PAYMENT_STATUSES.OFFLINE_PAID].includes(paymentStatus as any)
          ? "current"
          : paymentStatus === PAYMENT_STATUSES.REJECTED || paymentStatus === PAYMENT_STATUSES.EXPIRED
            ? "blocked"
            : "upcoming",
    },
  ];

  let action = "upload_proof";
  let message = "ارفع إثبات الدفع قبل انتهاء المهلة ليتم مراجعة الحجز.";
  if (paymentStatus === PAYMENT_STATUSES.SUBMITTED) {
    action = "wait_review";
    message = "تم استلام إثبات الدفع، وسيتم مراجعته قريبًا.";
  } else if (paymentStatus === PAYMENT_STATUSES.REUPLOAD_REQUESTED) {
    action = "reupload_proof";
    message = payment.adminNote || "مطلوب رفع إثبات دفع جديد.";
  } else if ([PAYMENT_STATUSES.APPROVED, PAYMENT_STATUSES.WAIVED, PAYMENT_STATUSES.OFFLINE_PAID].includes(paymentStatus as any)) {
    action = ticketIssued ? "open_ticket" : "wait_ticket";
    message = ticketIssued ? "تم إصدار التذكرة ويمكنك فتحها أو تحميلها." : "تم اعتماد الدفع، والتذكرة قيد التجهيز.";
  } else if (paymentStatus === PAYMENT_STATUSES.REJECTED) {
    action = "start_new_booking";
    message = payment.adminNote || "تم رفض إثبات الدفع. يمكنك بدء حجز جديد أو التواصل معنا عند الحاجة.";
  } else if (paymentStatus === PAYMENT_STATUSES.EXPIRED) {
    action = "start_new_booking";
    message = "انتهت مهلة الدفع وتم تحرير المقاعد. يمكنك بدء حجز جديد.";
  }

  return { action, message, timeline: steps, ticket };
}

function serializeMethod(row: typeof paymentMethods.$inferSelect) {
  return {
    id: row.id,
    key: row.key,
    provider: row.provider,
    labelAr: row.labelAr,
    labelEn: row.labelEn,
    instructionsAr: row.instructionsAr,
    instructionsEn: row.instructionsEn,
    accountIdentifier: row.accountIdentifier,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

async function loadPortal(token: string) {
  const [payment] = await db.select().from(paymentRequests).where(eq(paymentRequests.portalToken, token));
  if (!payment) return null;
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId));
  if (!booking) return null;
  const rule = await getPackagePaymentRule(booking.packageId);
  const keys = rule.methodKeys.length ? rule.methodKeys : ["instapay", "vodafone_cash", "bank_account"];
  const methods = await db
    .select()
    .from(paymentMethods)
    .where(and(inArray(paymentMethods.key, keys), eq(paymentMethods.active, true)))
    .orderBy(asc(paymentMethods.sortOrder));
  const attachments = await db
    .select()
    .from(paymentRequestAttachments)
    .where(eq(paymentRequestAttachments.paymentRequestId, payment.id))
    .orderBy(asc(paymentRequestAttachments.attempt), asc(paymentRequestAttachments.sortOrder));
  return { payment, booking, methods, attachments };
}

router.get("/payments/portal/:token", async (req, res) => {
  try {
    await expireOverduePayments();
    const token = String(req.params.token || "").trim();
    if (token.length < 32) return res.status(404).json({ error: "Not found" });
    const portal = await loadPortal(token);
    if (!portal) return res.status(404).json({ error: "Not found" });
    const { payment, booking, methods, attachments } = portal;
    const state = portalState(payment, booking);
    return res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        methodKey: payment.methodKey,
        currency: payment.currency,
        finalAmount: payment.finalAmountSnapshot,
        expectedDepositAmount: payment.expectedDepositAmount,
        depositPercent: payment.depositPercentSnapshot,
        instructions: payment.paymentInstructionsSnapshot,
        expiresAt: payment.expiresAt,
        submittedAt: payment.submittedAt,
        activeAttempt: payment.activeAttempt,
        adminNote: payment.adminNote,
      },
      booking: {
        id: booking.id,
        name: booking.name,
        phone: booking.phone,
        packageName: booking.packageName,
        packageNameAr: booking.packageNameAr,
        date: booking.date,
        passengers: booking.adults + booking.children + booking.infants,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
      methods: methods.map(serializeMethod),
      attachments: attachments.map((a) => ({
        id: a.id,
        attempt: a.attempt,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        originalFilename: a.originalFilename,
        createdAt: a.createdAt,
      })),
      action: state.action,
      message: state.message,
      timeline: state.timeline,
      ticket: state.ticket,
    });
  } catch (err) {
    console.error("[payments.portal] load:", err);
    return res.status(500).json({ error: "Failed to load payment portal" });
  }
});

router.post("/payments/portal/:token/upload-url", async (req, res) => {
  try {
    await expireOverduePayments();
    const token = String(req.params.token || "").trim();
    const portal = await loadPortal(token);
    if (!portal) return res.status(404).json({ error: "Not found" });
    if (![PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.REUPLOAD_REQUESTED].includes(portal.payment.status as any)) {
      return res.status(409).json({ error: "Payment request is not accepting uploads" });
    }
    const body = req.body as { name?: string; size?: number; contentType?: string };
    const name = String(body.name || "").trim().slice(0, 200);
    const size = Number(body.size || 0);
    const contentType = String(body.contentType || "").trim().toLowerCase();
    if (!name) return res.status(400).json({ error: "File name is required" });
    if (!PROOF_TYPES.has(contentType)) return res.status(400).json({ error: "Only images and PDF receipts are allowed" });
    if (!Number.isFinite(size) || size <= 0 || size > MAX_PROOF_BYTES) {
      return res.status(400).json({ error: "File size must be 10 MB or less" });
    }
    const prefix = `payment-proofs/${portal.booking.id}/${portal.payment.id}`;
    const target = storage.createDirectUploadTarget({ name, size, contentType, prefix });
    return res.json({ uploadURL: target.uploadURL, objectPath: target.objectPath, metadata: { name, size, contentType } });
  } catch (err) {
    console.error("[payments.portal] upload-url:", err);
    return res.status(500).json({ error: "Failed to create upload target" });
  }
});

router.post("/payments/portal/:token/proof", async (req, res) => {
  try {
    await expireOverduePayments();
    const token = String(req.params.token || "").trim();
    const portal = await loadPortal(token);
    if (!portal) return res.status(404).json({ error: "Not found" });
    if (![PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.REUPLOAD_REQUESTED].includes(portal.payment.status as any)) {
      return res.status(409).json({ error: "Payment request is not accepting proof submissions" });
    }
    const methodKey = String(req.body?.methodKey || "").trim();
    const customerNote = String(req.body?.customerNote || "").trim().slice(0, 1000);
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const allowed = portal.methods.map((m) => m.key);
    if (!allowed.includes(methodKey)) return res.status(400).json({ error: "Invalid payment method" });
    if (attachments.length < 1 || attachments.length > MAX_ATTACHMENTS) {
      return res.status(400).json({ error: "Please upload between 1 and 5 attachments" });
    }

    const clean: Array<{
      objectPath: string;
      mimeType: string;
      sizeBytes: number;
      originalFilename: string;
      sortOrder: number;
    }> = attachments.map((raw: any, index: number) => ({
      objectPath: String(raw?.objectPath || "").trim(),
      mimeType: String(raw?.mimeType || raw?.contentType || "").trim().toLowerCase(),
      sizeBytes: clampInt(raw?.sizeBytes ?? raw?.size, 1, MAX_PROOF_BYTES, 0),
      originalFilename: String(raw?.originalFilename || raw?.name || "").trim().slice(0, 200),
      sortOrder: index,
    }));
    for (const file of clean) {
      const expectedPrefix = `/objects/payment-proofs/${portal.booking.id}/${portal.payment.id}/`;
      if (!file.objectPath.startsWith(expectedPrefix)) return res.status(400).json({ error: "Invalid attachment path" });
      if (!PROOF_TYPES.has(file.mimeType)) return res.status(400).json({ error: "Unsupported attachment type" });
      if (file.sizeBytes <= 0 || file.sizeBytes > MAX_PROOF_BYTES) return res.status(400).json({ error: "Invalid attachment size" });
      if (!(await storage.objectExists(file.objectPath))) return res.status(400).json({ error: "Uploaded attachment was not found" });
    }

    const now = new Date();
    const nextAttempt = portal.payment.status === PAYMENT_STATUSES.REUPLOAD_REQUESTED
      ? portal.payment.activeAttempt + 1
      : portal.payment.activeAttempt;
    await db.transaction(async (tx) => {
      await tx.insert(paymentRequestAttachments).values(
        clean.map((file) => ({
          paymentRequestId: portal.payment.id,
          attempt: nextAttempt,
          objectPath: file.objectPath,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          originalFilename: file.originalFilename,
          sortOrder: file.sortOrder,
        })),
      );
      await tx
        .update(paymentRequests)
        .set({
          status: PAYMENT_STATUSES.SUBMITTED,
          methodKey,
          customerNote,
          submittedAt: now,
          activeAttempt: nextAttempt,
          updatedAt: now,
        })
        .where(eq(paymentRequests.id, portal.payment.id));
      await tx
        .update(bookings)
        .set({ status: "payment_submitted", paymentStatus: PAYMENT_STATUSES.SUBMITTED, updatedAt: now })
        .where(eq(bookings.id, portal.booking.id));
      await tx.insert(paymentRequestEvents).values({
        paymentRequestId: portal.payment.id,
        bookingId: portal.booking.id,
        action: "payment.submitted",
        actorType: "customer",
        note: customerNote,
        metadata: { methodKey, attachments: clean.length, attempt: nextAttempt },
      });
      await tx.insert(paymentNotifications).values({
        paymentRequestId: portal.payment.id,
        bookingId: portal.booking.id,
        type: "payment_submitted",
        channel: "internal",
        status: "pending",
        recipient: portal.booking.phone,
      });
    });
    void sendPushToAdmins({
      title: "إثبات دفع جديد",
      body: `${portal.booking.name} رفع إثبات دفع لحجز ${portal.booking.packageNameAr || portal.booking.packageName}`,
      url: "/admin/payment-gateway",
    }).catch((err) => console.error("[payments.portal] admin push:", err));
    return res.json({ success: true, status: PAYMENT_STATUSES.SUBMITTED });
  } catch (err) {
    console.error("[payments.portal] submit:", err);
    return res.status(500).json({ error: "Failed to submit payment proof" });
  }
});

router.post("/payments/portal/:token/subscribe", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    const portal = await loadPortal(token);
    if (!portal) return res.status(404).json({ error: "Not found" });
    const { endpoint, keys } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing subscription fields" });
    }
    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        bookingId: portal.booking.id,
        audience: "customer",
        adminUserId: null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          bookingId: portal.booking.id,
          audience: "customer",
          adminUserId: null,
        },
      });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[payments.portal] subscribe:", err);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

router.get("/admin/payment-gateway/settings", authMiddleware, async (_req, res) => {
  try {
    const [methods, settings, pkgRows, globalExpirationHours] = await Promise.all([
      db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder)),
      db.select().from(packagePaymentSettings),
      db.select({
        id: packages.id,
        titleAr: packages.titleAr,
        titleEn: packages.titleEn,
        priceEGP: packages.priceEGP,
        active: packages.active,
        status: packages.status,
      }).from(packages).orderBy(asc(packages.sortOrder)),
      getGlobalPaymentExpirationHours(),
    ]);
    return res.json({
      globalExpirationHours,
      methods: methods.map(serializeMethod),
      packages: pkgRows,
      settings,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load payment settings" });
  }
});

router.put("/admin/payment-gateway/settings", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const b = req.body || {};
    const globalExpirationHours = clampInt(b.globalExpirationHours, 1, 168, 12);
    const methods = Array.isArray(b.methods) ? b.methods : [];
    const packageSettings = Array.isArray(b.packageSettings) ? b.packageSettings : [];
    await db.transaction(async (tx) => {
      await tx
        .insert(siteSettings)
        .values({ key: "payment_default_expiration_hours", value: String(globalExpirationHours), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: String(globalExpirationHours), updatedAt: new Date() },
        });
      for (const raw of methods) {
        const key = String(raw?.key || "").trim();
        if (!key) continue;
        await tx
          .insert(paymentMethods)
          .values({
            key,
            provider: String(raw.provider || "manual_transfer").slice(0, 64),
            labelAr: String(raw.labelAr || key).slice(0, 128),
            labelEn: String(raw.labelEn || raw.labelAr || key).slice(0, 128),
            instructionsAr: String(raw.instructionsAr || "").slice(0, 5000),
            instructionsEn: String(raw.instructionsEn || "").slice(0, 5000),
            accountIdentifier: String(raw.accountIdentifier || "").slice(0, 256),
            active: raw.active !== false,
            sortOrder: clampInt(raw.sortOrder, 0, 9999, 0),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: paymentMethods.key,
            set: {
              provider: String(raw.provider || "manual_transfer").slice(0, 64),
              labelAr: String(raw.labelAr || key).slice(0, 128),
              labelEn: String(raw.labelEn || raw.labelAr || key).slice(0, 128),
              instructionsAr: String(raw.instructionsAr || "").slice(0, 5000),
              instructionsEn: String(raw.instructionsEn || "").slice(0, 5000),
              accountIdentifier: String(raw.accountIdentifier || "").slice(0, 256),
              active: raw.active !== false,
              sortOrder: clampInt(raw.sortOrder, 0, 9999, 0),
              updatedAt: new Date(),
            },
          });
      }
      for (const raw of packageSettings) {
        const packageId = Number.parseInt(String(raw?.packageId || ""), 10);
        if (!Number.isFinite(packageId) || packageId <= 0) continue;
        const methodKeys = Array.isArray(raw.methodKeys)
          ? raw.methodKeys.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 10)
          : [];
        const values = {
          packageId,
          enabled: !!raw.enabled,
          methodKeys,
          depositPercent: clampInt(raw.depositPercent, 1, 100, 100),
          expirationHours: raw.expirationHours === "" || raw.expirationHours == null
            ? null
            : clampInt(raw.expirationHours, 1, 168, globalExpirationHours),
          ticketIssuanceMode: raw.ticketIssuanceMode === "automatic" ? "automatic" : "manual",
          instructionsAr: String(raw.instructionsAr || "").slice(0, 5000),
          instructionsEn: String(raw.instructionsEn || "").slice(0, 5000),
          updatedAt: new Date(),
        };
        await tx
          .insert(packagePaymentSettings)
          .values(values)
          .onConflictDoUpdate({
            target: packagePaymentSettings.packageId,
            set: values,
          });
      }
    });
    await recordAudit(req, {
      action: "payment.settings_update",
      entity: "payment_gateway",
      metadata: { methodCount: methods.length, packageCount: packageSettings.length, globalExpirationHours },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[payment.admin] save settings:", err);
    return res.status(500).json({ error: "Failed to save payment settings" });
  }
});

async function listPaymentRequests(req: Request) {
  await expireOverduePayments();
  const status = String(req.query.status || "all");
  const search = String(req.query.search || "").trim();
  const filters = [];
  if (status !== "all") filters.push(eq(paymentRequests.status, status));
  if (search) {
    const term = `%${search}%`;
    filters.push(or(ilike(bookings.name, term), ilike(bookings.phone, term), ilike(bookings.packageName, term)));
  }
  const rows = await db
    .select({ payment: paymentRequests, booking: bookings })
    .from(paymentRequests)
    .leftJoin(bookings, eq(paymentRequests.bookingId, bookings.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(paymentRequests.createdAt));
  const ids = rows.map((row) => row.payment.id);
  const attachments = ids.length
    ? await db.select().from(paymentRequestAttachments).where(inArray(paymentRequestAttachments.paymentRequestId, ids))
    : [];
  const events = ids.length
    ? await db.select().from(paymentRequestEvents).where(inArray(paymentRequestEvents.paymentRequestId, ids)).orderBy(desc(paymentRequestEvents.createdAt))
    : [];
  return rows.map((row) => ({
    ...row.payment,
    booking: row.booking,
    attachments: attachments.filter((a) => a.paymentRequestId === row.payment.id),
    events: events.filter((e) => e.paymentRequestId === row.payment.id),
  }));
}

router.get("/admin/payment-requests/pending-count", authMiddleware, async (_req, res) => {
  try {
    await expireOverduePayments();
    const rows = await db
      .select({ id: paymentRequests.bookingId })
      .from(paymentRequests)
      .where(eq(paymentRequests.status, PAYMENT_STATUSES.SUBMITTED));
    const ids = rows.map((row) => row.id);
    return res.json({ count: ids.length, ids });
  } catch {
    return res.json({ count: 0, ids: [] });
  }
});

router.get("/admin/payment-requests", authMiddleware, async (req, res) => {
  try {
    const rows = await listPaymentRequests(req);
    return res.json(rows);
  } catch (err) {
    console.error("[payment.admin] list:", err);
    return res.status(500).json({ error: "Failed to list payment requests" });
  }
});

router.get("/admin/payment-requests/attachments/:id", authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const [attachment] = await db.select().from(paymentRequestAttachments).where(eq(paymentRequestAttachments.id, id));
    if (!attachment) return res.status(404).json({ error: "Not found" });
    const response = await storage.proxyObject(attachment.objectPath);
    copyProxyHeaders(response, res);
    res.status(response.status);
    if (response.body) Readable.fromWeb(response.body as ReadableStream).pipe(res);
    else res.end();
    return;
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return res.status(404).json({ error: "Not found" });
    const status = err instanceof StorageUploadError ? err.statusCode : 500;
    return res.status(status).json({ error: "Failed to load attachment" });
  }
});

async function reviewPayment(req: Request, res: Response, action: "approve" | "reject" | "request-reupload") {
  const id = String(req.params.id || "").trim();
  const note = String(req.body?.note || "").trim().slice(0, 1000);
  const admin = adminInfo(req);
  const [payment] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
  if (!payment) return res.status(404).json({ error: "Payment request not found" });
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId));
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (payment.status === PAYMENT_STATUSES.EXPIRED && action === "approve") {
    return res.status(409).json({ error: "Expired payments require restore/override first" });
  }
  if (action === "approve" && payment.status !== PAYMENT_STATUSES.SUBMITTED) {
    return res.status(409).json({ error: "Only submitted payment requests can be approved" });
  }
  if (action === "request-reupload" && payment.status !== PAYMENT_STATUSES.SUBMITTED) {
    return res.status(409).json({ error: "Only submitted payment requests can request re-upload" });
  }
  if (
    action === "reject" &&
    ![PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.SUBMITTED, PAYMENT_STATUSES.REUPLOAD_REQUESTED].includes(payment.status as any)
  ) {
    return res.status(409).json({ error: "This payment request cannot be rejected from its current status" });
  }
  if ((action === "reject" || action === "request-reupload") && !note) {
    return res.status(400).json({ error: "Admin note is required" });
  }
  const now = new Date();
  const next = action === "approve"
    ? { paymentStatus: PAYMENT_STATUSES.APPROVED, bookingStatus: "payment_approved", notification: "payment_approved" }
    : action === "reject"
      ? { paymentStatus: PAYMENT_STATUSES.REJECTED, bookingStatus: "payment_rejected", notification: "payment_rejected" }
      : { paymentStatus: PAYMENT_STATUSES.REUPLOAD_REQUESTED, bookingStatus: "payment_reupload_requested", notification: "payment_reupload_requested" };

  await db.transaction(async (tx) => {
    await tx
      .update(paymentRequests)
      .set({
        status: next.paymentStatus,
        reviewedAt: now,
        reviewedByAdminId: admin.id || null,
        reviewedByAdminUsername: admin.username,
        adminNote: note,
        updatedAt: now,
      })
      .where(eq(paymentRequests.id, id));
    await tx
      .update(bookings)
      .set({
        status: next.bookingStatus,
        paymentStatus: next.paymentStatus,
        paymentApprovedAt: action === "approve" ? now : booking.paymentApprovedAt,
        updatedAt: now,
      })
      .where(eq(bookings.id, booking.id));
    await tx.insert(paymentRequestEvents).values({
      paymentRequestId: id,
      bookingId: booking.id,
      action: `payment.${action}`,
      actorType: "admin",
      actorId: admin.id || null,
      actorName: admin.username,
      note,
    });
    await tx.insert(paymentNotifications).values({
      paymentRequestId: id,
      bookingId: booking.id,
      type: next.notification,
      channel: "internal",
      status: "pending",
      recipient: booking.phone,
    });
  });

  let issuedTicket = false;
  if (action === "approve") {
    const rule = await getPackagePaymentRule(booking.packageId);
    if (rule.ticketIssuanceMode === "automatic") {
      const guard = canIssueTicketForBooking({ ...booking, paymentRequired: true, paymentStatus: PAYMENT_STATUSES.APPROVED });
      if (guard.ok) issuedTicket = !!(await ensureTicketToken(booking.id));
    }
  }

  await recordAudit(req, {
    action: `payment.${action}`,
    entity: "payment_request",
    entityId: booking.id,
    metadata: { paymentRequestId: id, bookingId: booking.id, note },
  });
  const customerPush =
    action === "approve"
      ? {
          title: issuedTicket ? "الدفع مقبول والتذكرة جاهزة" : "تم اعتماد الدفع",
          body: issuedTicket ? "تذكرتك جاهزة الآن داخل بوابة الدفع." : "تم اعتماد الدفع وسيتم تجهيز التذكرة قريبًا.",
        }
      : action === "reject"
        ? { title: "تم رفض إثبات الدفع", body: note || "راجع بوابة الدفع لمعرفة التفاصيل." }
        : { title: "مطلوب إعادة رفع إثبات الدفع", body: note || "راجع بوابة الدفع لمعرفة المطلوب." };
  void sendPushToBooking(booking.id, {
    ...customerPush,
    url: payment.portalToken ? `/payment/${payment.portalToken}` : "/",
  }).catch((err) => console.error("[payment.admin] customer push:", err));
  return res.json({ success: true });
}

router.patch("/admin/payment-requests/:id/approve", authMiddleware, requireRole("operator"), async (req, res) => {
  try { return await reviewPayment(req, res, "approve"); }
  catch (err) { console.error("[payment.admin] approve:", err); return res.status(500).json({ error: "Failed to approve payment" }); }
});

router.patch("/admin/payment-requests/:id/reject", authMiddleware, requireRole("operator"), async (req, res) => {
  try { return await reviewPayment(req, res, "reject"); }
  catch (err) { console.error("[payment.admin] reject:", err); return res.status(500).json({ error: "Failed to reject payment" }); }
});

router.patch("/admin/payment-requests/:id/request-reupload", authMiddleware, requireRole("operator"), async (req, res) => {
  try { return await reviewPayment(req, res, "request-reupload"); }
  catch (err) { console.error("[payment.admin] reupload:", err); return res.status(500).json({ error: "Failed to request re-upload" }); }
});

router.patch("/admin/payment-requests/:id/override", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const admin = adminInfo(req);
    if (!admin.id || !(await userHasPermission(admin.id, "payment_gateway.override"))) {
      return res.status(403).json({ error: "Insufficient permissions", requiredPermission: "payment_gateway.override" });
    }
    const id = String(req.params.id || "").trim();
    const mode = String(req.body?.mode || "").trim();
    const note = String(req.body?.note || "").trim().slice(0, 1000);
    if (!note) return res.status(400).json({ error: "Override reason is required" });
    const allowed = new Set(["offline_paid", "waive", "manual_approve", "restore_expired"]);
    if (!allowed.has(mode)) return res.status(400).json({ error: "Invalid override mode" });
    const [payment] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    if (!payment) return res.status(404).json({ error: "Payment request not found" });
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const capacityMustBeRestored = ["payment_expired", "payment_rejected"].includes(booking.status);
    if (mode === "restore_expired" || (capacityMustBeRestored && mode !== "restore_expired")) {
      const requested = (booking.adults || 0) + (booking.children || 0);
      if (booking.packageId) {
        const cap = await checkCapacity(booking.packageId, booking.date, requested);
        if (!cap.ok) return res.status(409).json({ error: cap.reason, remaining: cap.remaining });
      }
    }
    const now = new Date();
    const status = mode === "offline_paid" ? PAYMENT_STATUSES.OFFLINE_PAID
      : mode === "waive" ? PAYMENT_STATUSES.WAIVED
        : mode === "restore_expired" ? PAYMENT_STATUSES.PENDING
          : PAYMENT_STATUSES.APPROVED;
    const bookingStatus = status === PAYMENT_STATUSES.PENDING ? "payment_pending" : "payment_approved";
    const nextExpiresAt = mode === "restore_expired"
      ? sql`localtimestamp + (${(await getPackagePaymentRule(booking.packageId)).expirationHours}::int * interval '1 hour')`
      : payment.expiresAt;
    await db.transaction(async (tx) => {
      await tx.update(paymentRequests).set({
        status,
        expiresAt: nextExpiresAt,
        reviewedAt: now,
        reviewedByAdminId: admin.id,
        reviewedByAdminUsername: admin.username,
        adminNote: note,
        updatedAt: now,
      }).where(eq(paymentRequests.id, id));
      await tx.update(bookings).set({
        status: bookingStatus,
        paymentStatus: status,
        paymentExpiresAt: nextExpiresAt,
        paymentApprovedAt: status === PAYMENT_STATUSES.PENDING ? booking.paymentApprovedAt : now,
        updatedAt: now,
      }).where(eq(bookings.id, booking.id));
      await tx.insert(paymentRequestEvents).values({
        paymentRequestId: id,
        bookingId: booking.id,
        action: `payment.override.${mode}`,
        actorType: "admin",
        actorId: admin.id,
        actorName: admin.username,
        note,
      });
    });
    await recordAudit(req, {
      action: `payment.override.${mode}`,
      entity: "payment_request",
      entityId: booking.id,
      metadata: { paymentRequestId: id, bookingId: booking.id, note },
    });
    const pushMessage = mode === "restore_expired"
      ? { title: "تمت استعادة طلب الدفع", body: "يمكنك استكمال الدفع من بوابة الدفع." }
      : { title: "تم تحديث حالة الدفع", body: "راجع بوابة الدفع لمعرفة حالة حجزك الحالية." };
    void sendPushToBooking(booking.id, {
      ...pushMessage,
      url: payment.portalToken ? `/payment/${payment.portalToken}` : "/",
    }).catch((err) => console.error("[payment.admin] override customer push:", err));
    return res.json({ success: true });
  } catch (err) {
    console.error("[payment.admin] override:", err);
    return res.status(500).json({ error: "Failed to apply override" });
  }
});

export default router;
