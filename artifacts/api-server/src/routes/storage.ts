import { Readable } from "node:stream";
import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, mediaAssets } from "@workspace/db";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  StorageUploadError,
} from "../lib/objectStorage";
import { MediaStorageService } from "../lib/mediaStorage";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { requirePermission } from "../lib/adminPermissions";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const mediaStorage = new MediaStorageService();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

interface CloudinaryLegacyUploadToken extends jwt.JwtPayload {
  type: "cloudinary-legacy-upload";
  mediaAssetId: string;
  name: string;
  size: number;
  contentType: string;
  category: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function getMaxBytesForContentType(contentType: string): number {
  return ALLOWED_VIDEO_TYPES.includes(contentType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

function copyProxyHeaders(source: globalThis.Response, res: Response): void {
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified",
  ];

  for (const headerName of passthroughHeaders) {
    const value = source.headers.get(headerName);
    if (value) {
      res.setHeader(headerName, value);
    }
  }
}

router.post("/storage/uploads/request-url", authMiddleware, requireRole("operator"), requirePermission("media.upload"), async (req: Request, res: Response) => {
  const { name, size, contentType, category } = req.body as {
    name?: string;
    size?: number;
    contentType?: string;
    category?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "اسم الملف مطلوب", code: "MISSING_NAME" });
    return;
  }

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    const isVideo = contentType?.startsWith("video/");
    res.status(400).json({
      error: isVideo
        ? `نوع الفيديو غير مدعوم: ${contentType}. الأنواع المدعومة: MP4, WebM, MOV`
        : `نوع الملف غير مدعوم: ${contentType}. الأنواع المدعومة: JPEG, PNG, WebP, GIF`,
      code: "UNSUPPORTED_TYPE",
      allowed: ALLOWED_TYPES,
    });
    return;
  }

  if (typeof size !== "number" || size <= 0) {
    res.status(400).json({ error: "حجم الملف غير صحيح", code: "INVALID_SIZE" });
    return;
  }

  const maxBytes = getMaxBytesForContentType(contentType);
  if (size > maxBytes) {
    res.status(400).json({
      error: `حجم الملف كبير جداً (${formatBytes(size)}). الحد الأقصى: ${formatBytes(maxBytes)}`,
      code: "FILE_TOO_LARGE",
      maxBytes,
    });
    return;
  }

  try {
    const cleanCategory = typeof category === "string" && category.trim() ? category.trim() : "legacy-direct-upload";
    const [pending] = await db.insert(mediaAssets).values({
      provider: "cloudinary",
      visibility: "public",
      category: cleanCategory,
      contentType,
      sizeBytes: size,
      originalFilename: name,
      status: "pending",
      migrationStatus: "pending_upload",
      providerMetadata: { legacyDirectUpload: true },
    }).returning({ id: mediaAssets.id });
    const token = jwt.sign(
      {
        type: "cloudinary-legacy-upload",
        mediaAssetId: pending.id,
        name,
        size,
        contentType,
        category: cleanCategory,
      } satisfies CloudinaryLegacyUploadToken,
      objectStorageService.getUploadTokenSecret(),
      { expiresIn: "30m" },
    );
    const uploadURL = `/api/storage/uploads/cloudinary-direct?token=${encodeURIComponent(token)}`;
    const publicUrl = `/api/media/assets/${pending.id}`;
    res.json({ uploadURL, objectPath: publicUrl, publicUrl, metadata: { name, size, contentType, provider: "cloudinary" } });
  } catch (error) {
    console.error("Error generating Cloudinary upload target:", error);
    res.status(500).json({
      error: "فشل في تجهيز رفع Cloudinary. تأكد من إعدادات Cloudinary ثم حاول مرة أخرى.",
      code: "STORAGE_ERROR",
    });
  }
});

router.put("/storage/uploads/cloudinary-direct", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "رمز الرفع غير موجود", code: "MISSING_UPLOAD_TOKEN" });
    return;
  }

  try {
    const decoded = jwt.verify(token, objectStorageService.getUploadTokenSecret()) as Partial<CloudinaryLegacyUploadToken>;
    if (
      decoded.type !== "cloudinary-legacy-upload" ||
      typeof decoded.mediaAssetId !== "string" ||
      typeof decoded.contentType !== "string" ||
      typeof decoded.size !== "number"
    ) {
      res.status(401).json({ error: "Invalid upload token", code: "INVALID_UPLOAD_TOKEN" });
      return;
    }

    const contentType = (req.headers["content-type"] as string) || "";
    if (contentType !== decoded.contentType) {
      res.status(400).json({ error: "نوع الملف لا يطابق الطلب الأصلي", code: "CONTENT_TYPE_MISMATCH" });
      return;
    }

    const contentLengthHeader = req.headers["content-length"];
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
    if (
      typeof contentLength === "number" &&
      Number.isFinite(contentLength) &&
      contentLength > decoded.size
    ) {
      res.status(413).json({ error: "حجم الملف أكبر من الحد المسموح", code: "FILE_TOO_LARGE" });
      return;
    }

    const uploaded = await mediaStorage.uploadPublic({
      category: decoded.category || "legacy-direct-upload",
      originalFilename: decoded.name || "upload",
      contentType: decoded.contentType,
      stream: req,
      contentLength,
      maxBytes: decoded.size,
    });
    await db.update(mediaAssets)
      .set({
        provider: uploaded.provider,
        visibility: "public",
        objectPath: uploaded.objectPath,
        publicUrl: uploaded.publicUrl,
        deliveryUrl: uploaded.deliveryUrl,
        secureUrl: String(uploaded.metadata.secureUrl || uploaded.publicUrl || uploaded.deliveryUrl || ""),
        resourceType: String(uploaded.metadata.resourceType || (decoded.contentType.startsWith("video/") ? "video" : "image")),
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
        status: "active",
        migrationStatus: "native",
        providerMetadata: {
          ...uploaded.metadata,
          legacyDirectUpload: true,
          nativeMediaAssetId: uploaded.mediaAssetId,
        },
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, decoded.mediaAssetId));

    res.status(200).json({
      url: uploaded.url,
      publicUrl: `/api/media/assets/${decoded.mediaAssetId}`,
      deliveryUrl: uploaded.deliveryUrl,
      provider: uploaded.provider,
      mediaAssetId: decoded.mediaAssetId,
    });
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    if (error instanceof StorageUploadError) {
      res.status(error.statusCode).json({ error: error.message, code: "UPLOAD_FAILED" });
      return;
    }
    res.status(500).json({ error: "فشل رفع الملف إلى Cloudinary", code: "UPLOAD_FAILED" });
  }
});

router.put("/storage/uploads/direct", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "رمز الرفع غير موجود", code: "MISSING_UPLOAD_TOKEN" });
    return;
  }

  try {
    const payload = objectStorageService.verifyUploadToken(token);
    if ((payload.visibility || "public") !== "private") {
      res.status(410).json({
        error: "Public Supabase direct uploads are disabled. Use the Cloudinary upload endpoint.",
        code: "PUBLIC_SUPABASE_UPLOAD_DISABLED",
      });
      return;
    }

    const contentType = (req.headers["content-type"] as string) || "";
    if (contentType !== payload.contentType) {
      res.status(400).json({ error: "نوع الملف لا يطابق الطلب الأصلي", code: "CONTENT_TYPE_MISMATCH" });
      return;
    }

    const contentLengthHeader = req.headers["content-length"];
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
    if (
      typeof contentLength === "number" &&
      Number.isFinite(contentLength) &&
      contentLength > payload.size
    ) {
      res.status(413).json({ error: "حجم الملف أكبر من الحد المسموح", code: "FILE_TOO_LARGE" });
      return;
    }

    await objectStorageService.uploadRequestStream({
      objectPath: payload.objectPath,
      contentType: payload.contentType,
      stream: req,
      contentLength,
      maxBytes: payload.size,
      visibility: payload.visibility,
    });

    res.status(200).end();
  } catch (error) {
    console.error("Error uploading file to Supabase Storage:", error);
    if (error instanceof StorageUploadError) {
      res.status(error.statusCode).json({ error: error.message, code: "UPLOAD_FAILED" });
      return;
    }
    res.status(500).json({ error: "فشل رفع الملف إلى Supabase Storage", code: "UPLOAD_FAILED" });
  }
});

router.get("/storage/public-objects", async (req: Request, res: Response) => {
  const filePath = (req.query.path as string) || "";
  if (!filePath) {
    res.status(400).json({ error: "path query param required" });
    return;
  }

  try {
    const response = await objectStorageService.proxyObject(`/objects/${filePath}`);
    copyProxyHeaders(response, res);
    res.status(response.status);

    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    console.error("Error serving public object:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

router.get("/storage/objects", async (req: Request, res: Response) => {
  const objectPath = (req.query.objectPath as string) || "";
  if (!objectPath) {
    res.status(400).json({ error: "objectPath query param required" });
    return;
  }

  if (objectPath.startsWith("/private-objects/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const response = await objectStorageService.proxyObject(
      objectPath,
      typeof req.headers.range === "string" ? req.headers.range : undefined,
    );

    copyProxyHeaders(response, res);
    res.status(response.status);

    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const statusCode = error instanceof StorageUploadError ? error.statusCode : 500;
    console.error("Error serving object:", error);
    res.status(statusCode).json({ error: "Failed to serve file" });
  }
});

export default router;
