import { Router } from "express";
import { db, customerPhotos, bookings } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { ObjectStorageService, StorageUploadError } from "../lib/objectStorage";

const router = Router();
const objectStorage = new ObjectStorageService();

const PHOTO_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
};
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const MAX_PHOTOS_PER_BOOKING = 12;
const MAX_URL_LEN = 600;

// Public: customer uploads a photo (token-gated, raw body stream)
router.post("/customer-photos/upload", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim().slice(0, 200);
    if (!token) return res.status(400).json({ error: "Token required" });
    const contentType = String(req.headers["x-content-type"] || req.headers["content-type"] || "");
    if (!PHOTO_MIME_EXT[contentType]) return res.status(400).json({ error: "نوع الصورة غير مدعوم" });
    const lenH = req.headers["content-length"];
    const len = lenH ? Number(lenH) : undefined;
    if (typeof len === "number" && Number.isFinite(len) && len > MAX_PHOTO_BYTES) {
      return res.status(413).json({ error: "حجم الصورة كبير (الحد 8 MB)" });
    }

    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });
    const existing = await db.select({ id: customerPhotos.id }).from(customerPhotos).where(eq(customerPhotos.bookingId, b.id));
    if (existing.length >= MAX_PHOTOS_PER_BOOKING) {
      return res.status(409).json({ error: `الحد الأقصى ${MAX_PHOTOS_PER_BOOKING} صورة لكل رحلة` });
    }

    const objectPath = objectStorage.createObjectPath(`customer${PHOTO_MIME_EXT[contentType]}`);
    await objectStorage.uploadRequestStream({ objectPath, contentType, stream: req, contentLength: len });
    const photoUrl = objectStorage.getPublicUrl(objectPath);

    const [row] = await db.insert(customerPhotos).values({
      bookingId: b.id, photoUrl, caption: "",
      customerName: b.name, packageId: b.packageId, tripDate: b.date,
      status: "pending",
    }).returning();
    return res.status(201).json({ success: true, id: row.id, photoUrl });
  } catch (err) {
    console.error("[customer-photos] upload:", err);
    if (err instanceof StorageUploadError) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: "فشل الرفع" });
  }
});

// Public: customer adds a photo URL (alternative if pre-uploaded)
router.post("/customer-photos/add", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim().slice(0, 200);
    const photoUrl = String(req.body?.photoUrl ?? "").trim().slice(0, MAX_URL_LEN);
    const caption = String(req.body?.caption ?? "").trim().slice(0, 500);
    if (!token) return res.status(400).json({ error: "Token required" });
    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) return res.status(400).json({ error: "Invalid photo URL" });

    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });

    // Limit photos per booking
    const existing = await db.select({ id: customerPhotos.id }).from(customerPhotos).where(eq(customerPhotos.bookingId, b.id));
    if (existing.length >= MAX_PHOTOS_PER_BOOKING) {
      return res.status(409).json({ error: `الحد الأقصى ${MAX_PHOTOS_PER_BOOKING} صورة لكل رحلة` });
    }

    const [row] = await db.insert(customerPhotos).values({
      bookingId: b.id,
      photoUrl,
      caption,
      customerName: b.name,
      packageId: b.packageId,
      tripDate: b.date,
      status: "pending",
    }).returning();
    return res.status(201).json({ success: true, photo: { id: row.id, status: row.status } });
  } catch (err) {
    console.error("[customer-photos] add:", err);
    return res.status(500).json({ error: "فشل الرفع" });
  }
});

// Public: list approved photos (optionally by trip date or package)
router.get("/customer-photos", async (req, res) => {
  try {
    const filters = [eq(customerPhotos.status, "approved")];
    if (typeof req.query.tripDate === "string") {
      filters.push(eq(customerPhotos.tripDate, req.query.tripDate));
    }
    if (typeof req.query.packageId === "string") {
      const pid = Number.parseInt(req.query.packageId, 10);
      if (Number.isFinite(pid)) filters.push(eq(customerPhotos.packageId, pid));
    }
    const rows = await db.select({
      id: customerPhotos.id,
      photoUrl: customerPhotos.photoUrl,
      caption: customerPhotos.caption,
      customerName: customerPhotos.customerName,
      packageId: customerPhotos.packageId,
      tripDate: customerPhotos.tripDate,
      featured: customerPhotos.featured,
      createdAt: customerPhotos.createdAt,
    }).from(customerPhotos).where(and(...filters)).orderBy(desc(customerPhotos.featured), desc(customerPhotos.createdAt)).limit(200);
    // Mask name to first letter
    const out = rows.map(r => {
      const first = (r.customerName || "").trim().split(/\s+/)[0] || "";
      return { ...r, customerName: first ? first[0] + "***" : "" };
    });
    return res.json(out);
  } catch (err) {
    console.error("[customer-photos] list:", err);
    return res.status(500).json({ error: "Failed" });
  }
});

// Admin: list all (any status)
router.get("/admin/customer-photos", authMiddleware, async (req, res) => {
  try {
    const filters = [];
    if (typeof req.query.status === "string" && req.query.status !== "all") {
      filters.push(eq(customerPhotos.status, req.query.status));
    }
    const rows = await db.select().from(customerPhotos)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(customerPhotos.createdAt))
      .limit(500);
    return res.json(rows);
  } catch (err) {
    console.error("[customer-photos] admin list:", err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.put("/admin/customer-photos/:id", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.status === "string" && ["pending", "approved", "rejected"].includes(b.status)) patch.status = b.status;
    if (typeof b.caption === "string") patch.caption = b.caption.slice(0, 500);
    if (typeof b.featured === "number" || typeof b.featured === "boolean") patch.featured = b.featured ? 1 : 0;
    const [row] = await db.update(customerPhotos).set(patch).where(eq(customerPhotos.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[customer-photos] update:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/admin/customer-photos/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(customerPhotos).where(eq(customerPhotos.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
