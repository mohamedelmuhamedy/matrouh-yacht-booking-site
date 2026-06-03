import { Router } from "express";
import { db, bookingReviews, bookings, reviews } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import {
  ObjectNotFoundError,
  StorageUploadError,
} from "../lib/objectStorage";
import { MediaStorageService } from "../lib/mediaStorage";

const router = Router();
const mediaStorage = new MediaStorageService();

const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);
const REVIEW_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_REVIEW_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REVIEW_PHOTOS = 5;
const REVIEW_UPLOAD_FOLDERS = new Set(["reviews", "review-avatars"]);
const REVIEW_RATE_WINDOW_MS = 60 * 60 * 1000;
const REVIEW_RATE_MAX = 8;
const reviewSubmissions = new Map<string, number[]>();

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function ipKey(req: any): string {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkPublicRateLimit(req: any): boolean {
  const key = ipKey(req);
  const now = Date.now();
  const arr = (reviewSubmissions.get(key) || []).filter((t) => now - t < REVIEW_RATE_WINDOW_MS);
  if (arr.length >= REVIEW_RATE_MAX) return false;
  arr.push(now);
  reviewSubmissions.set(key, arr);
  if (reviewSubmissions.size > 5000) {
    const first = reviewSubmissions.keys().next().value;
    if (first) reviewSubmissions.delete(first);
  }
  return true;
}

function sanitizePhotos(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    const url = clean(raw, 700);
    if (!url) continue;
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    } catch {
      continue;
    }
    out.push(url);
    if (out.length >= MAX_REVIEW_PHOTOS) break;
  }
  return out;
}

function sanitizeOptionalImageUrl(input: unknown): string | null {
  const url = clean(input, 700);
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function publicReview(row: typeof reviews.$inferSelect) {
  return {
    id: row.id,
    customerName: row.customerName,
    rating: row.rating,
    reviewText: row.reviewText,
    avatarUrl: row.avatarUrl || "",
    photos: row.photos || [],
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Public: upload one review photo using the same ObjectStorageService flow as the existing site uploads.
router.post("/reviews/upload", async (req, res) => {
  const contentType =
    (req.headers["x-content-type"] as string) ||
    (req.headers["content-type"] as string) ||
    "";
  if (!REVIEW_IMAGE_TYPES[contentType]) {
    return res.status(400).json({ error: "صور JPG / PNG / WEBP فقط" });
  }
  const contentLengthHeader = req.headers["content-length"];
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
  if (
    typeof contentLength === "number" &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_REVIEW_IMAGE_BYTES
  ) {
    return res.status(413).json({ error: "حجم الصورة كبير جداً. الحد الأقصى: 8 MB" });
  }
  if (!checkPublicRateLimit(req)) {
    return res.status(429).json({ error: "تم تجاوز الحد. حاول مرة أخرى لاحقاً." });
  }

  try {
    const requestedFolder = clean(req.query.folder, 64);
    const folder = REVIEW_UPLOAD_FOLDERS.has(requestedFolder) ? requestedFolder : "reviews";
    const uploaded = await mediaStorage.uploadPublic({
      category: folder,
      originalFilename: `review${REVIEW_IMAGE_TYPES[contentType]}`,
      contentType,
      stream: req,
      contentLength,
      maxBytes: MAX_REVIEW_IMAGE_BYTES,
    });
    return res.json({
      url: uploaded.url,
      objectPath: uploaded.objectPath,
      proxyUrl: uploaded.proxyUrl,
      publicUrl: uploaded.publicUrl,
      deliveryUrl: uploaded.deliveryUrl,
      provider: uploaded.provider,
      mediaAssetId: uploaded.mediaAssetId,
    });
  } catch (error) {
    console.error("[reviews] public upload:", error);
    if (error instanceof StorageUploadError) return res.status(error.statusCode).json({ error: error.message });
    if (error instanceof ObjectNotFoundError) return res.status(404).json({ error: "الملف غير موجود" });
    return res.status(500).json({ error: "فشل رفع الصورة" });
  }
});

router.post("/reviews", async (req, res) => {
  if (!checkPublicRateLimit(req)) {
    return res.status(429).json({ error: "تم تجاوز الحد. حاول مرة أخرى لاحقاً." });
  }
  try {
    const customerName = clean(req.body?.customerName, 120);
    const reviewText = clean(req.body?.reviewText, 1500);
    const rating = clampInt(req.body?.rating, 1, 5, 0);
    const photos = sanitizePhotos(req.body?.photos);
    const avatarUrl = sanitizeOptionalImageUrl(req.body?.avatarUrl);

    if (!customerName) return res.status(400).json({ error: "اسم العميل مطلوب" });
    if (!rating) return res.status(400).json({ error: "التقييم مطلوب" });
    if (!reviewText) return res.status(400).json({ error: "نص الرأي مطلوب" });
    if (reviewText.length < 8) return res.status(400).json({ error: "نص الرأي قصير جداً" });

    const [row] = await db.insert(reviews).values({
      customerName,
      rating,
      reviewText,
      avatarUrl,
      photos,
      status: "pending",
    }).returning();

    return res.status(201).json({ success: true, review: publicReview(row) });
  } catch (err) {
    console.error("[reviews] public submit:", err);
    return res.status(500).json({ error: "فشل إرسال الرأي" });
  }
});

router.get("/reviews/approved", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.createdAt))
      .limit(300);
    return res.json(rows.map(publicReview));
  } catch (err) {
    console.error("[reviews] approved:", err);
    return res.status(500).json({ error: "Failed to list reviews" });
  }
});

router.get("/admin/reviews/pending-count", authMiddleware, async (_req, res) => {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.status, "pending"));
    return res.json({ count: row?.count ?? 0 });
  } catch (err) {
    console.error("[reviews] pending-count:", err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/reviews", authMiddleware, async (req, res) => {
  try {
    const status = clean(req.query.status, 32);
    const query = db
      .select()
      .from(reviews)
      .where(REVIEW_STATUSES.has(status) ? eq(reviews.status, status as "pending" | "approved" | "rejected") : undefined)
      .orderBy(desc(reviews.createdAt))
      .limit(500);
    const rows = await query;
    return res.json(rows.map(publicReview));
  } catch (err) {
    console.error("[reviews] admin list:", err);
    return res.status(500).json({ error: "Failed to list reviews" });
  }
});

async function setReviewStatus(id: string, status: "approved" | "rejected" | "pending", res: any) {
  if (!isUuid(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db
    .update(reviews)
    .set({ status, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(publicReview(row));
}

router.patch("/admin/reviews/:id/approve", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    return await setReviewStatus(String(req.params.id), "approved", res);
  } catch (err) {
    console.error("[reviews] approve:", err);
    return res.status(500).json({ error: "Failed to approve" });
  }
});

router.patch("/admin/reviews/:id/reject", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    return await setReviewStatus(String(req.params.id), "rejected", res);
  } catch (err) {
    console.error("[reviews] reject:", err);
    return res.status(500).json({ error: "Failed to reject" });
  }
});

router.patch("/admin/reviews/:id", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    const status = clean(req.body?.status, 32);
    if (!REVIEW_STATUSES.has(status)) return res.status(400).json({ error: "Invalid status" });
    return await setReviewStatus(String(req.params.id), status as "approved" | "rejected" | "pending", res);
  } catch (err) {
    console.error("[reviews] patch:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/admin/reviews/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!isUuid(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(reviews).where(eq(reviews.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[reviews] delete:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Existing ticket-token review flow remains available for old QR/ticket links.
router.get("/reviews/by-token/:token", async (req, res) => {
  try {
    const token = clean(req.params.token, 200);
    if (!token) return res.status(400).json({ error: "Token required" });
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });
    const [existing] = await db.select().from(bookingReviews).where(eq(bookingReviews.bookingId, b.id));
    const fullName = b.name || "";
    const firstName = fullName.trim().split(/\s+/)[0] || "";
    const maskedName = firstName ? `${firstName[0]}***` : "";
    return res.json({
      bookingId: b.id,
      customerName: maskedName,
      packageName: b.packageNameAr || b.packageName,
      date: b.date,
      alreadyReviewed: !!existing,
      review: existing ? { id: existing.id, status: existing.status, rating: existing.rating } : null,
    });
  } catch (err) {
    console.error("[reviews] lookup:", err);
    return res.status(500).json({ error: "Lookup failed" });
  }
});

router.post("/reviews/submit", async (req, res) => {
  try {
    const token = clean(req.body?.token, 200);
    if (!token) return res.status(400).json({ error: "Token required" });
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });

    const existing = await db.select().from(bookingReviews).where(eq(bookingReviews.bookingId, b.id));
    if (existing.length > 0) return res.status(409).json({ error: "تم تقييم هذا الحجز بالفعل" });

    const rating = clampInt(req.body?.rating, 1, 5, 5);
    const comment = clean(req.body?.comment, 1500);
    const customerName = clean(req.body?.customerName, 120) || clean(b.name, 120);
    const photoUrls = sanitizePhotos(req.body?.photoUrls);
    const avatarUrl = sanitizeOptionalImageUrl(req.body?.avatarUrl);

    const [legacy] = await db.insert(bookingReviews).values({
      bookingId: b.id,
      rating,
      comment,
      customerName,
      photoUrls,
      status: "pending",
    }).returning();

    if (comment) {
      await db.insert(reviews).values({
        customerName,
        rating,
        reviewText: comment,
        avatarUrl,
        photos: photoUrls,
        status: "pending",
      });
    }

    return res.status(201).json({ success: true, review: legacy });
  } catch (err) {
    console.error("[reviews] submit:", err);
    return res.status(500).json({ error: "Submit failed" });
  }
});

export default router;
