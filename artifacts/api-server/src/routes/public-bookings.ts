import { Router } from "express";
import { db, bookings, packages, paymentRequests } from "@workspace/db";
import { and, eq, gte, ne, sql } from "drizzle-orm";
import crypto from "crypto";
import { createReferralRewardIfNeeded } from "./admin-rewards";
import { ensureTicketToken } from "./tickets";
import { consumePromoCode } from "./admin-promo-codes";
import { markCartRecovered } from "./admin-abandoned-carts";
import { checkCapacity } from "./admin-capacity";
import { createPaymentRequestForBooking, getPackagePaymentRule, publicPaymentPortalUrl } from "../lib/payments";

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
type BookingResult = { id: number; paymentToken?: string };
const inFlight = new Map<string, Promise<BookingResult>>();

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
    const sessionKey = String(body.sessionKey ?? "").trim().slice(0, 64);

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
    let paymentRule = await getPackagePaymentRule(null);

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
      paymentRule = await getPackagePaymentRule(pkg.id);
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

    const key = idempotencyKey(phone, packageId, packageName, date);
    const sendBookingResponse = async (statusCode: number, id: number, deduplicated = false) => {
      const [created] = await db.select({
        id: bookings.id,
        paymentRequired: bookings.paymentRequired,
        paymentRequestId: bookings.paymentRequestId,
      }).from(bookings).where(eq(bookings.id, id));
      if (created?.paymentRequired && created.paymentRequestId) {
        const [payment] = await db
          .select({ token: paymentRequests.portalToken })
          .from(paymentRequests)
          .where(eq(paymentRequests.id, created.paymentRequestId));
        if (payment?.token) {
          return res.status(statusCode).json({
            success: true,
            id,
            deduplicated,
            nextAction: "payment",
            paymentPortalUrl: publicPaymentPortalUrl(req, payment.token),
          });
        }
      }
      return res.status(statusCode).json({ success: true, id, deduplicated, nextAction: "whatsapp" });
    };
    const recent = getRecentBooking(key);
    if (recent) {
      return sendBookingResponse(200, recent, true);
    }

    const existingFlight = inFlight.get(key);
    if (existingFlight) {
      try {
        const result = await existingFlight;
        return sendBookingResponse(200, result.id, true);
      } catch {
        // fall through
      }
    }

    const flight = (async (): Promise<BookingResult> => {
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
                sql`${bookings.status} NOT IN ('cancelled', 'payment_expired')`,
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

        // Promo code consumption — only after dedup, so duplicate submits don't re-consume
        let appliedPromoCode = "";
        let discountAmount = 0;
        if (promoCodeRaw && priceAtBooking) {
          const result = await consumePromoCode(promoCodeRaw, priceAtBooking, packageId);
          if (result) {
            appliedPromoCode = result.codeRow.code;
            discountAmount = result.discount;
          }
        }

        const paymentRequired = paymentRule.required;
        const baseAmount = priceAtBooking ? priceAtBooking * adults : 0;
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
            status: paymentRequired ? "payment_pending" : "new",
            paymentRequired,
            paymentStatus: paymentRequired ? "pending" : "not_required",
          })
          .returning();
        if (paymentRequired) {
          const finalAmount = Math.max(0, baseAmount - discountAmount);
          const payment = await createPaymentRequestForBooking({
            tx,
            bookingId: row.id,
            packageId,
            currency,
            priceSnapshot: baseAmount,
            discountSnapshot: discountAmount,
            finalAmountSnapshot: finalAmount,
            rule: paymentRule,
          });
          await tx
            .update(bookings)
            .set({
              paymentRequestId: payment.id,
              paymentExpiresAt: payment.expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(bookings.id, row.id));
          return { id: row.id, deduped: false, paymentToken: payment.token } as {
            id: number;
            deduped: boolean;
            paymentToken?: string;
          };
        }
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

        const paymentToken = (booking as { paymentToken?: string }).paymentToken;
        if (!paymentToken) {
          try {
            await ensureTicketToken(booking.id);
          } catch (err) {
            console.error("[public-bookings] ensureTicketToken failed:", err);
          }
        }

        // Mark any abandoned cart as recovered (fire-and-forget; don't block the response)
        void markCartRecovered({
          sessionKey: sessionKey || undefined,
          phone,
          packageId,
          date,
          bookingId: booking.id,
        }).catch(err => console.error("[public-bookings] markCartRecovered failed:", err));
      }

      return { id: booking.id, paymentToken: (booking as { paymentToken?: string }).paymentToken };
    })();

    inFlight.set(key, flight);
    let created: BookingResult;
    try {
      created = await flight;
    } finally {
      if (inFlight.get(key) === flight) inFlight.delete(key);
    }

    return sendBookingResponse(201, created.id, false);
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
