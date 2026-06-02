import { expireOverduePayments } from "./payments";

let started = false;

export async function runPaymentExpirationSweep(): Promise<void> {
  const result = await expireOverduePayments();
  if (result.expired > 0) {
    console.log(`[payments] expired ${result.expired} overdue payment request(s)`);
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
