import crypto from "crypto";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import {
  bookings,
  db,
  packagePaymentSettings,
  paymentNotifications,
  paymentRequestEvents,
  paymentRequests,
  paymentMethods,
  siteSettings,
} from "@workspace/db";

export const PAYMENT_STATUSES = {
  NOT_REQUIRED: "not_required",
  PENDING: "pending",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  REUPLOAD_REQUESTED: "reupload_requested",
  EXPIRED: "expired",
  WAIVED: "waived",
  OFFLINE_PAID: "offline_paid",
} as const;

export const PAYMENT_BOOKING_STATUSES = new Set([
  "payment_pending",
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "payment_reupload_requested",
  "payment_expired",
]);

export const RELEASED_BOOKING_STATUSES = new Set(["cancelled", "payment_expired", "payment_rejected"]);

export type TicketIssuanceMode = "manual" | "automatic";

export function isReleasedForCapacity(status: string): boolean {
  return RELEASED_BOOKING_STATUSES.has(status);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function getGlobalPaymentExpirationHours(): Promise<number> {
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, "payment_default_expiration_hours"));
  return clampInt(row?.value, 1, 168, 12);
}

export async function getPackagePaymentRule(packageId: number | null): Promise<{
  required: boolean;
  methodKeys: string[];
  depositPercent: number;
  expirationHours: number;
  ticketIssuanceMode: TicketIssuanceMode;
  instructionsAr: string;
  instructionsEn: string;
}> {
  const globalHours = await getGlobalPaymentExpirationHours();
  if (!packageId) {
    return {
      required: false,
      methodKeys: [],
      depositPercent: 100,
      expirationHours: globalHours,
      ticketIssuanceMode: "manual",
      instructionsAr: "",
      instructionsEn: "",
    };
  }

  const [setting] = await db
    .select()
    .from(packagePaymentSettings)
    .where(eq(packagePaymentSettings.packageId, packageId));
  if (!setting?.enabled) {
    return {
      required: false,
      methodKeys: [],
      depositPercent: 100,
      expirationHours: globalHours,
      ticketIssuanceMode: "manual",
      instructionsAr: "",
      instructionsEn: "",
    };
  }

  return {
    required: true,
    methodKeys: Array.isArray(setting.methodKeys) ? setting.methodKeys : [],
    depositPercent: clampInt(setting.depositPercent, 1, 100, 100),
    expirationHours: clampInt(setting.expirationHours, 1, 168, globalHours),
    ticketIssuanceMode: setting.ticketIssuanceMode === "automatic" ? "automatic" : "manual",
    instructionsAr: setting.instructionsAr || "",
    instructionsEn: setting.instructionsEn || "",
  };
}

export function createPaymentPortalToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function calculateExpectedDeposit(finalAmount: number, depositPercent: number): number {
  const amount = Math.max(0, Math.round(finalAmount || 0));
  const percent = clampInt(depositPercent, 1, 100, 100);
  return Math.max(0, Math.ceil((amount * percent) / 100));
}

export function publicPaymentPortalUrl(req: { headers: Record<string, unknown>; protocol?: string }, token: string): string {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0];
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0];
  return host ? `${proto}://${host}/payment/${token}` : `/payment/${token}`;
}

export async function snapshotInstructions(methodKeys: string[], overrideAr: string, overrideEn: string): Promise<string> {
  const keys = methodKeys.length ? methodKeys : ["instapay", "vodafone_cash", "bank_account"];
  const methods = await db
    .select()
    .from(paymentMethods)
    .where(inArray(paymentMethods.key, keys));
  const parts = methods
    .filter((method) => method.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((method) => {
      const account = method.accountIdentifier ? `\n${method.accountIdentifier}` : "";
      const text = method.instructionsAr || method.instructionsEn || "";
      return `${method.labelAr || method.labelEn}${account}${text ? `\n${text}` : ""}`;
    });
  const override = overrideAr || overrideEn;
  if (override) parts.unshift(override);
  return parts.join("\n\n").trim();
}

export async function createPaymentRequestForBooking(input: {
  tx: any;
  bookingId: number;
  packageId: number | null;
  currency: string;
  priceSnapshot: number;
  discountSnapshot: number;
  finalAmountSnapshot: number;
  rule: Awaited<ReturnType<typeof getPackagePaymentRule>>;
}): Promise<{ id: string; token: string; expiresAt: Date; expectedDepositAmount: number }> {
  const token = createPaymentPortalToken();
  const expiresAt = sql`localtimestamp + (${input.rule.expirationHours}::int * interval '1 hour')`;
  const expectedDepositAmount = calculateExpectedDeposit(input.finalAmountSnapshot, input.rule.depositPercent);
  const instructions = await snapshotInstructions(input.rule.methodKeys, input.rule.instructionsAr, input.rule.instructionsEn);
  const [row] = await input.tx
    .insert(paymentRequests)
    .values({
      bookingId: input.bookingId,
      packageId: input.packageId,
      portalToken: token,
      status: PAYMENT_STATUSES.PENDING,
      currency: input.currency || "EGP",
      priceSnapshot: input.priceSnapshot,
      discountSnapshot: input.discountSnapshot,
      finalAmountSnapshot: input.finalAmountSnapshot,
      depositPercentSnapshot: input.rule.depositPercent,
      expectedDepositAmount,
      paymentInstructionsSnapshot: instructions,
      expiresAt,
    })
    .returning();
  await input.tx.insert(paymentRequestEvents).values({
    paymentRequestId: row.id,
    bookingId: input.bookingId,
    action: "payment.created",
    actorType: "system",
    metadata: { expirationHours: input.rule.expirationHours },
  });
  await input.tx.insert(paymentNotifications).values({
    paymentRequestId: row.id,
    bookingId: input.bookingId,
    type: "payment_created",
    channel: "internal",
    status: "pending",
  });
  return { id: row.id, token, expiresAt: row.expiresAt, expectedDepositAmount };
}

export function canIssueTicketForBooking(b: {
  paymentRequired?: boolean | null;
  paymentStatus?: string | null;
  status?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!b.paymentRequired) return { ok: true };
  const paymentStatus = String(b.paymentStatus || "");
  if (
    paymentStatus === PAYMENT_STATUSES.APPROVED ||
    paymentStatus === PAYMENT_STATUSES.WAIVED ||
    paymentStatus === PAYMENT_STATUSES.OFFLINE_PAID
  ) {
    return { ok: true };
  }
  return { ok: false, reason: "Payment approval is required before ticket issuance" };
}

export async function expireOverduePayments(): Promise<{ expired: number; bookingIds: number[] }> {
  const now = new Date();
  const rows = await db
    .select({ id: paymentRequests.id, bookingId: paymentRequests.bookingId })
    .from(paymentRequests)
    .where(
      and(
        inArray(paymentRequests.status, [
          PAYMENT_STATUSES.PENDING,
          PAYMENT_STATUSES.REUPLOAD_REQUESTED,
        ]),
        isNotNull(paymentRequests.expiresAt),
        sql`${paymentRequests.expiresAt} <= localtimestamp`,
      ),
    );
  if (rows.length === 0) return { expired: 0, bookingIds: [] };
  const ids = rows.map((row) => row.id);
  const bookingIds = rows.map((row) => row.bookingId);
  await db.transaction(async (tx) => {
    await tx
      .update(paymentRequests)
      .set({ status: PAYMENT_STATUSES.EXPIRED, updatedAt: now })
      .where(inArray(paymentRequests.id, ids));
    await tx
      .update(bookings)
      .set({
        status: "payment_expired",
        paymentStatus: PAYMENT_STATUSES.EXPIRED,
        updatedAt: now,
      })
      .where(and(inArray(bookings.id, bookingIds), ne(bookings.status, "cancelled")));
    await tx.insert(paymentRequestEvents).values(
      rows.map((row) => ({
        paymentRequestId: row.id,
        bookingId: row.bookingId,
        action: "payment.expired",
        actorType: "system",
      })),
    );
    await tx.insert(paymentNotifications).values(
      rows.map((row) => ({
        paymentRequestId: row.id,
        bookingId: row.bookingId,
        type: "payment_expired",
        channel: "internal",
        status: "pending",
      })),
    );
  });
  return { expired: rows.length, bookingIds };
}

export function activeCapacityWhere(packageId: number, date: string) {
  return and(
    eq(bookings.packageId, packageId),
    eq(bookings.date, date),
    sql`${bookings.status} NOT IN ('cancelled', 'payment_expired', 'payment_rejected')`,
  );
}
