import { inArray } from "drizzle-orm";
import { db, paymentRequests } from "@workspace/db";
import { expireOverduePayments } from "./payments";
import { sendPushToBooking } from "../routes/push";

let started = false;

export async function runPaymentExpirationSweep(): Promise<void> {
  const result = await expireOverduePayments();
  if (result.expired > 0) {
    console.log(`[payments] expired ${result.expired} overdue payment request(s)`);
    const rows = await db
      .select({ bookingId: paymentRequests.bookingId, portalToken: paymentRequests.portalToken })
      .from(paymentRequests)
      .where(inArray(paymentRequests.bookingId, result.bookingIds));
    for (const row of rows) {
      void sendPushToBooking(row.bookingId, {
        title: "انتهت مهلة الدفع",
        body: "تم تحرير المقاعد لهذا الحجز. يمكنك بدء حجز جديد من الموقع.",
        url: `/payment/${row.portalToken}`,
      }).catch((err) => console.error("[payments] expiration customer push:", err));
    }
  }
}

export async function startPaymentExpirationScheduler(): Promise<void> {
  if (started) return;
  started = true;
  const tick = () => {
    runPaymentExpirationSweep().catch((err) => {
      console.error("[payments] expiration sweep failed:", err);
    });
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 15 * 60_000);
}
