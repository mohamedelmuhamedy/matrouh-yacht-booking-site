import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  StorageUploadError,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
};

router.post("/admin/storage/upload", authMiddleware, async (req, res) => {
  const contentType =
    (req.headers["x-content-type"] as string) ||
    (req.headers["content-type"] as string) ||
    "";

  if (!MIME_TO_EXT[contentType]) {
    res.status(400).json({ error: `نوع الملف غير مدعوم: ${contentType}` });
    return;
  }

  const isVideo = contentType.startsWith("video/");
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const contentLengthHeader = req.headers["content-length"];
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

  if (
    typeof contentLength === "number" &&
    Number.isFinite(contentLength) &&
    contentLength > maxBytes
  ) {
    res.status(413).json({
      error: `حجم الملف كبير جداً. الحد الأقصى: ${isVideo ? "300" : "15"} MB`,
    });
    return;
  }

  try {
    const objectPath = objectStorageService.createObjectPath(
      `upload${MIME_TO_EXT[contentType]}`,
      "uploads",
    );

    await objectStorageService.uploadRequestStream({
      objectPath,
      contentType,
      stream: req,
      contentLength,
    });

    res.json({
      url: objectStorageService.toApiObjectUrl(objectPath),
      objectPath,
      publicUrl: objectStorageService.getPublicUrl(objectPath),
    });
  } catch (error) {
    console.error("Admin storage upload failed:", error);
    if (error instanceof StorageUploadError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "فشل الرفع إلى Supabase Storage" });
  }
});

router.get("/uploads/:filename", async (req, res) => {
  const filename = req.params.filename;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).json({ error: "اسم ملف غير صالح" });
    return;
  }

  try {
    const response = await objectStorageService.proxyObject(`/objects/uploads/${filename}`);
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
      const value = response.headers.get(headerName);
      if (value) {
        res.setHeader(headerName, value);
      }
    }

    res.status(response.status);
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    console.error("Legacy upload proxy failed:", error);
    res.status(500).json({ error: "فشل في جلب الملف" });
  }
});

export default router;
