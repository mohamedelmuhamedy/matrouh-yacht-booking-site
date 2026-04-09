import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { authMiddleware } from "../middleware/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;   // 15 MB for images
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;  // 300 MB for videos

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

router.post("/storage/uploads/request-url", authMiddleware, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body as { name?: string; size?: number; contentType?: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "اسم الملف مطلوب", code: "MISSING_NAME" }); return;
  }

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    const isVideo = contentType?.startsWith("video/");
    res.status(400).json({
      error: isVideo
        ? `نوع الفيديو غير مدعوم: ${contentType}. الأنواع المدعومة: MP4, WebM, MOV`
        : `نوع الملف غير مدعوم: ${contentType}. الأنواع المدعومة: JPEG, PNG, WebP, GIF`,
      code: "UNSUPPORTED_TYPE",
      allowed: ALLOWED_TYPES,
    }); return;
  }

  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (typeof size !== "number" || size <= 0) {
    res.status(400).json({ error: "حجم الملف غير صحيح", code: "INVALID_SIZE" }); return;
  }
  if (size > maxBytes) {
    res.status(400).json({
      error: `حجم الملف كبير جداً (${formatBytes(size)}). الحد الأقصى لـ${isVideo ? "الفيديو" : "الصورة"}: ${formatBytes(maxBytes)}`,
      code: "FILE_TOO_LARGE",
      maxBytes,
    }); return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "فشل في توليد رابط الرفع. حاول مرة أخرى.", code: "STORAGE_ERROR" });
  }
});

// Public file serving — path passed as query param: ?path=images/foo.jpg
router.get("/storage/public-objects", async (req: Request, res: Response) => {
  const filePath = (req.query.path as string) || "";
  if (!filePath) { res.status(400).json({ error: "path query param required" }); return; }
  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) { res.status(404).json({ error: "Not found" }); return; }
    const response = await objectStorageService.downloadObject(file);
    res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (response.body) {
      const { Readable } = await import("stream");
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    console.error("Error serving public object:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// Private file serving with Range request support for video streaming
// objectPath as query param: ?objectPath=/objects/uuid
router.get("/storage/objects", async (req: Request, res: Response) => {
  const objectPath = (req.query.objectPath as string) || "";
  if (!objectPath) { res.status(400).json({ error: "objectPath query param required" }); return; }

  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string) || "application/octet-stream";
    const fileSize = Number(metadata.size || 0);
    const isVideo = contentType.startsWith("video/");

    // Support HTTP Range requests (needed for video seeking in <video> elements)
    const rangeHeader = req.headers["range"];

    if (isVideo && rangeHeader && fileSize > 0) {
      // Parse range: "bytes=start-end"
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        });

        const nodeStream = file.createReadStream({ start, end });
        nodeStream.pipe(res);
        nodeStream.on("error", (err) => {
          console.error("Range stream error:", err);
          if (!res.headersSent) res.status(500).end();
        });
        return;
      }
    }

    // Full file response
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (fileSize > 0) res.setHeader("Content-Length", fileSize);

    const response = await objectStorageService.downloadObject(file, 3600);
    if (response.body) {
      const { Readable } = await import("stream");
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Not found" }); return; }
    const msg = (error as any)?.response?.data || (error as any)?.message || "";
    if (msg === "no allowed resources" || (error as any)?.response?.status === 401) {
      res.status(404).json({ error: "Not found" }); return;
    }
    console.error("Error serving object:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
