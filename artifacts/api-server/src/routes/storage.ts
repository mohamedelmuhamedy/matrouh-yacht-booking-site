import { Readable } from "node:stream";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  StorageConfigurationError,
  StorageUploadError,
} from "../lib/objectStorage";
import { authMiddleware } from "../middleware/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

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

router.post("/storage/uploads/request-url", authMiddleware, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body as {
    name?: string;
    size?: number;
    contentType?: string;
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
    const { uploadURL, objectPath, publicUrl } =
      objectStorageService.createDirectUploadTarget({ name, size, contentType });
    res.json({ uploadURL, objectPath, publicUrl, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    const status = error instanceof StorageConfigurationError ? 500 : 500;
    res.status(status).json({
      error: "فشل في توليد رابط الرفع. تأكد من إعدادات Supabase Storage ثم حاول مرة أخرى.",
      code: "STORAGE_ERROR",
    });
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
