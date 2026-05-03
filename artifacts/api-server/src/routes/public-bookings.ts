import { Router } from "express";
import { db, bookings, packages } from "@workspace/db";
import { and, eq, gte, ne, sql } from "drizzle-orm";
import crypto from "crypto";
import { createReferralRewardIfNeeded } from "./admin-rewards";
import { ensureTicketToken } from "./tickets";
import { consumePromoCode } from "./admin-promo-codes";
import { checkCapacity } from "./admin-capacity";

const router = Router();

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}
function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  if (/^0(10|11|12|15)\d{8}$/.test(p)) return true;
  if (/^\+?\d{8,15}$/.test(p)) return true;
  return false;
}

function parseIntStrict(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim();
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

const IDEMPOTENCY_TTL_MS = 5 * 60_000;
const idempotencyCache = new Map<string, { id: number; at: number }>();
const inFlight = new Map<string, Promise<number>>();

function idempotencyKey(phone: string, packageId: number | null, packageName: string, date: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone}|${packageId ?? `name:${packageName}`}|${date}`)
    .digest("hex");
}
function getRecentBooking(key: string): number | null {
  const hit = idempotencyCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return hit.id;
}
function rememberBooking(key: string, id: number): void {
  idempotencyCache.set(key, { id, at: Date.now() });
  // Opportunistic cleanup
  if (idempotencyCache.size > 5000) {
    const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
    for (const [k, v] of idempotencyCache) {
      if (v.at < cutoff) idempotencyCache.delete(k);
    }
  }
}

router.post("/bookings", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? "").trim().slice(0, 200);
    const phoneRaw = String(body.phone ?? "").trim().slice(0, 32);
    const date = String(body.date ?? "").trim().slice(0, 64);
    const notes = String(body.notes ?? "").trim().slice(0, 2000);
    const currency = String(body.currency ?? "EGP").trim().slice(0, 8) || "EGP";
    const referralCode = String(body.referralCode ?? "").toUpperCase().trim().slice(0, 32);
    const promoCodeRaw = String(body.promoCode ?? "").toUpperCase().trim().slice(0, 32);

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!isValidPhone(phoneRaw)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }
    if (!date) return res.status(400).json({ error: "Date is required" });

    const phone = normalizePhone(phoneRaw);
    const adults = parseIntStrict(body.adults ?? 1, 1, 50);
    const children = parseIntStrict(body.children ?? 0, 0, 50);
    const infants = parseIntStrict(body.infants ?? 0, 0, 20);
    if (adults === null) {
      return res.status(400).json({ error: "Adults must be a whole number between 1 and 50" });
    }
    if (children === null) {
      return res.status(400).json({ error: "Children must be a whole number between 0 and 50" });
    }
    if (infants === null) {
      return res.status(400).json({ error: "Infants must be a whole number between 0 and 20" });
    }

    const rawPackageId = body.packageId;
    let packageId: number | null = null;
    let packageName = "";
    let packageNameAr = "";
    let priceAtBooking: number | null = null;

    if (rawPackageId !== undefined && rawPackageId !== null && rawPackageId !== "") {
      const pid = Number.parseInt(String(rawPackageId), 10);
      if (!Number.isFinite(pid) || pid <= 0) {
        return res.status(400).json({ error: "Invalid package id" });
      }
      const [pkg] = await db
        .select()
        .from(packages)
        .where(and(eq(packages.id, pid), eq(packages.active, true)));
      if (!pkg) {
        return res.status(400).json({ error: "Selected package is not available" });
      }
      packageId = pkg.id;
      packageName = pkg.titleEn;
      packageNameAr = pkg.titleAr;
      priceAtBooking = pkg.priceEGP;
    } else {
      packageName = String(body.packageName ?? "").trim().slice(0, 200);
      packageNameAr = String(body.packageNameAr ?? "").trim().slice(0, 200);
      if (!packageName && !packageNameAr) {
        return res.status(400).json({ error: "Package is required" });
      }
    }

    // Pre-flight capacity check (best-effort; final atomic check inside transaction below)
    if (packageId !== null) {
      const requested = (adults || 0) + (children || 0);
      const cap = await checkCapacity(packageId, date, requested);
      if (!cap.ok) {
        return res.status(409).json({
          error: cap.reason,
          code: "CAPACITY_FULL",
          remaining: cap.remaining,
        });
      }
    }

    // Promo code application (atomic increment)
    let appliedPromoCode = "";
    let discountAmount = 0;
    if (promoCodeRaw && priceAtBooking) {
      const result = await consumePromoCode(promoCodeRaw, priceAtBooking, packageId);
      if (result) {
        appliedPromoCode = result.codeRow.code;
        discountAmount = result.discount;
      }
    }

    const key = idempotencyKey(phone, packageId, packageName, date);
    const recent = getRecentBooking(key);
    if (recent) {
      return res.status(200).json({ success: true, id: recent, deduplicated: true });
    }

    const existingFlight = inFlight.get(key);
    if (existingFlight) {
      try {
        const id = await existingFlight;
        return res.status(200).json({ success: true, id, deduplicated: true });
      } catch {
        // fall through
      }
    }

    const flight = (async (): Promise<number> => {
      const since = new Date(Date.now() - IDEMPOTENCY_TTL_MS);
      const requested = (adults || 0) + (children || 0);
      const booking = await db.transaction(async (tx) => {
        if (packageId !== null) {
          // Lock the capacity row (if any) to serialize concurrent bookings for same package+date
          const capRows = await tx.execute(
            sql`SELECT id, max_seats FROM package_capacity WHERE package_id = ${packageId} AND date = ${date} FOR UPDATE`,
          );
          const capRow = (capRows as any).rows?.[0] ?? (Array.isArray(capRows) ? (capRows as any)[0] : undefined);
          const maxSeats = Number(capRow?.max_seats ?? 0);
          if (capRow && maxSeats > 0) {
            const sumRes = await tx
              .select({ total: sql<number>`COALESCE(SUM(${bookings.adults} + ${bookings.children}), 0)` })
              .from(bookings)
              .where(and(
                eq(bookings.packageId, packageId),
                eq(bookings.date, date),
                ne(bookings.status, "cancelled"),
              ));
            const booked = Number(sumRes[0]?.total ?? 0);
            const remaining = Math.max(0, maxSeats - booked);
            if (remaining < requested) {
              const err = new Error(`CAPACITY_FULL:${remaining}`);
              (err as any).code = "CAPACITY_FULL";
              (err as any).remaining = remaining;
              throw err;
            }
          }
        }

        const dupRows = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.phone, phone),
              eq(bookings.date, date),
              gte(bookings.createdAt, since),
              packageId !== null
                ? eq(bookings.packageId, packageId)
                : eq(bookings.packageName, packageName),
            ),
          );
        if (dupRows.length > 0) {
          return { id: dupRows[0]!.id, deduped: true } as { id: number; deduped: boolean };
        }

        const [row] = await tx
          .insert(bookings)
          .values({
            name,
            phone,
            packageId,
            packageName,
            packageNameAr,
            date,
            adults,
            children,
            infants,
            notes,
            currency,
            priceAtBooking,
            promoCode: appliedPromoCode,
            discountAmount,
            referralCode,
            status: "new",
          })
          .returning();
        return { id: row.id, deduped: false } as { id: number; deduped: boolean };
      });

      rememberBooking(key, booking.id);

      if (!booking.deduped) {
        if (referralCode) {
          try {
            await createReferralRewardIfNeeded(
              booking.id,
              referralCode,
              name,
              packageName || packageNameAr || "",
            );
          } catch (err) {
            console.error("[public-bookings] referral reward failed:", err);
          }
        }

        try {
          await ensureTicketToken(booking.id);
        } catch (err) {
          console.error("[public-bookings] ensureTicketToken failed:", err);
        }
      }

      return booking.id;
    })();

    inFlight.set(key, flight);
    let createdId: number;
    try {
      createdId = await flight;
    } finally {
      if (inFlight.get(key) === flight) inFlight.delete(key);
    }

    return res.status(201).json({ success: true, id: createdId });
  } catch (err: any) {
    if (err?.code === "CAPACITY_FULL") {
      return res.status(409).json({
        error: `المقاعد المتاحة لهذا اليوم ${err.remaining ?? 0} فقط`,
        code: "CAPACITY_FULL",
        remaining: err.remaining ?? 0,
      });
    }
    const msg = err instanceof Error ? err.message : "Failed to create booking";
    console.error("[public-bookings] error:", msg);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
