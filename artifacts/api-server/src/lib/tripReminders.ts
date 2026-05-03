import webpush from "web-push";
import { db, pool, bookings, pushSubscriptions } from "@workspace/db";
import { and, eq, isNull, inArray } from "drizzle-orm";

let started = false;

async function applyMigrations(): Promise<void> {
  await pool.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP`,
  );
  await pool.query(
    `ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS booking_id INTEGER`,
  );
}

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface VapidGetter {
  (): Promise<{ publicKey: string; privateKey: string } | null>;
}

export async function runReminderSweep(getVapid: VapidGetter): Promise<{ processed: number; sent: number; failed: number }> {
  const vapid = await getVapid();
  if (!vapid) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const target = tomorrowDateString();
  const due = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        eq(bookings.date, target),
        isNull(bookings.reminderSentAt),
      ),
    );

  let totalSent = 0;
  let totalFailed = 0;

  for (const b of due) {
    if (!b.ticketToken) continue;

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.bookingId, b.id));

    // No linked subscribers: leave reminder_sent_at NULL so a later sweep
    // (after the customer opens their ticket / grants push) can still
    // deliver the reminder while date=tomorrow holds.
    if (subs.length === 0) continue;

    const pkgEn = b.packageName || "";
    const pkgAr = b.packageNameAr || "";
    const titleEn = "Trip reminder · DR Travel";
    const titleAr = "تذكير برحلتك غداً 🚤";
    const lineEn = pkgEn
      ? `${pkgEn} tomorrow — tap to open your ticket`
      : "Your trip is tomorrow — tap to open your ticket";
    const lineAr = pkgAr
      ? `${pkgAr} — اضغط لفتح تذكرتك قبل الانطلاق`
      : "اضغط لفتح تذكرتك قبل الانطلاق";

    const payload = JSON.stringify({
      title: `${titleAr} · ${titleEn}`,
      body: `${lineAr}\n${lineEn}`,
      url: `/ticket/${b.ticketToken}`,
    });

    const expired: string[] = [];
    let bookingSent = 0;

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400, urgency: "high" },
          );
          totalSent++;
          bookingSent++;
        } catch (err) {
          totalFailed++;
          const statusCode =
            typeof err === "object" && err !== null && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          if (statusCode === 410 || statusCode === 404) {
            expired.push(sub.endpoint);
          }
        }
      }),
    );

    if (expired.length > 0) {
      await db
        .delete(pushSubscriptions)
        .where(inArray(pushSubscriptions.endpoint, expired));
    }

    // Only mark as sent when at least one notification succeeded; otherwise
    // the next hourly sweep will retry within the 24h window.
    if (bookingSent > 0) {
      await db
        .update(bookings)
        .set({ reminderSentAt: new Date() })
        .where(eq(bookings.id, b.id));
    }
  }

  return { processed: due.length, sent: totalSent, failed: totalFailed };
}

export async function startTripReminderScheduler(getVapid: VapidGetter): Promise<void> {
  if (started) return;
  started = true;

  try {
    await applyMigrations();
    console.log("[trip-reminders] schema migrations applied");
  } catch (err) {
    console.error("[trip-reminders] migration error:", err);
  }

  const tick = async () => {
    try {
      const result = await runReminderSweep(getVapid);
      if (result.processed > 0) {
        console.log(
          `[trip-reminders] swept ${result.processed} booking(s), sent ${result.sent}, failed ${result.failed}`,
        );
      }
    } catch (err) {
      console.error("[trip-reminders] sweep error:", err);
    }
  };

  // First sweep shortly after startup, then hourly
  setTimeout(tick, 30_000);
  setInterval(tick, 60 * 60 * 1000);
}
