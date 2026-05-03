import { Router } from "express";
import { db, testimonials } from "@workspace/db";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  StorageUploadError,
} from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

const MAX_REVIEW_IMAGE_BYTES = 8 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const submissions = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const RATE_MAP_MAX_KEYS = 5000;

function ipKey(req: any): string {
  // Prefer Express's req.ip (which respects "trust proxy"); fall back to socket.
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function pruneExpired(now: number) {
  for (const [k, arr] of submissions) {
    const fresh = arr.filter(t => now - t < RATE_WINDOW_MS);
    if (fresh.length === 0) submissions.delete(k);
    else if (fresh.length !== arr.length) submissions.set(k, fresh);
  }
  // Hard cap to avoid unbounded growth under heavy/malicious use.
  if (submissions.size > RATE_MAP_MAX_KEYS) {
    const overflow = submissions.size - RATE_MAP_MAX_KEYS;
    let i = 0;
    for (const k of submissions.keys()) {
      if (i++ >= overflow) break;
      submissions.delete(k);
    }
  }
}

function checkRateLimit(req: any): boolean {
  const key = ipKey(req);
  const now = Date.now();
  // Opportunistically prune ~1% of the time to keep the map bounded.
  if (Math.random() < 0.01) pruneExpired(now);
  const arr = (submissions.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return false;
  arr.push(now);
  submissions.set(key, arr);
  return true;
}

function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/\u0000/g, "").trim().slice(0, max);
}

router.post("/testimonials/upload", async (req, res) => {
  const contentType =
    (req.headers["x-content-type"] as string) ||
    (req.headers["content-type"] as string) ||
    "";
  if (!MIME_TO_EXT[contentType]) {
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
  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: "تم تجاوز الحد. حاول مرة أخرى لاحقاً." });
  }
  try {
    const objectPath = objectStorageService.createObjectPath(`review${MIME_TO_EXT[contentType]}`);
    await objectStorageService.uploadRequestStream({
      objectPath,
      contentType,
      stream: req,
      contentLength,
    });
    return res.json({
      url: objectStorageService.getPublicUrl(objectPath),
      objectPath,
      proxyUrl: objectStorageService.toApiObjectUrl(objectPath),
    });
  } catch (error) {
    console.error("Public testimonial upload failed:", error);
    if (error instanceof StorageUploadError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "الملف غير موجود" });
    }
    return res.status(500).json({ error: "فشل رفع الصورة" });
  }
});

router.post("/testimonials/submit", async (req, res) => {
  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: "تم تجاوز الحد. حاول مرة أخرى لاحقاً." });
  }
  try {
    const body = req.body ?? {};
    const nameAr = clean(body.nameAr, 80);
    const nameEn = clean(body.nameEn, 80);
    const textAr = clean(body.textAr, 1500);
    const textEn = clean(body.textEn, 1500);
    const rating = Math.max(1, Math.min(5, parseInt(String(body.rating)) || 5));
    const packageName = clean(body.packageName, 120);
    let imageUrl = clean(body.imageUrl, 500);

    if (imageUrl) {
      try {
        const u = new URL(imageUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") imageUrl = "";
      } catch {
        imageUrl = "";
      }
    }

    const finalNameAr = nameAr || nameEn;
    const finalTextAr = textAr || textEn;
    if (!finalNameAr) return res.status(400).json({ error: "الاسم مطلوب" });
    if (!finalTextAr) return res.status(400).json({ error: "نص التقييم مطلوب" });
    if (finalTextAr.length < 8) return res.status(400).json({ error: "نص التقييم قصير جداً" });

    const [created] = await db.insert(testimonials).values({
      nameAr: finalNameAr,
      nameEn: nameEn || finalNameAr,
      textAr: finalTextAr,
      textEn: textEn || finalTextAr,
      rating,
      packageName,
      avatar: "",
      imageUrl,
      status: "pending",
      source: "visitor",
      isVisible: false,
      sortOrder: 0,
    }).returning({ id: testimonials.id });

    return res.status(201).json({ success: true, id: created?.id });
  } catch (err: any) {
    console.error("Submit testimonial failed:", err);
    return res.status(500).json({ error: err.message || "فشل إرسال التقييم" });
  }
});

export default router;
