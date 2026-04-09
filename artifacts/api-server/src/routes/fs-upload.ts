import { Router, type IRouter } from "express";
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from "fs";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth";

const router: IRouter = Router();

const UPLOAD_DIR = "/home/runner/workspace/data/uploads";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
  "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/x-msvideo": ".avi",
};
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".avi": "video/x-msvideo",
};

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

// POST /admin/storage/upload — direct streaming upload saved to disk
router.post("/admin/storage/upload", authMiddleware, (req, res) => {
  ensureUploadDir();

  const contentType = (req.headers["x-content-type"] as string) || (req.headers["content-type"] as string) || "";
  const isVideo = contentType.startsWith("video/");
  const isImage = contentType.startsWith("image/");

  if (!MIME_TO_EXT[contentType]) {
    return res.status(400).json({ error: `نوع الملف غير مدعوم: ${contentType}` });
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const ext = MIME_TO_EXT[contentType];
  const filename = `${randomUUID()}${ext}`;
  const filePath = join(UPLOAD_DIR, filename);
  const writeStream = createWriteStream(filePath);

  let size = 0;
  let done = false;

  const cleanup = () => {
    try { if (existsSync(filePath)) unlinkSync(filePath); } catch {}
  };

  req.on("data", (chunk: Buffer) => {
    if (done) return;
    size += chunk.length;
    if (size > maxBytes) {
      done = true;
      writeStream.destroy();
      cleanup();
      if (!res.headersSent) {
        res.status(413).json({
          error: `حجم الملف كبير جداً. الحد الأقصى: ${isVideo ? "300" : "15"} MB`,
        });
      }
      req.destroy();
      return;
    }
    writeStream.write(chunk);
  });

  req.on("end", () => {
    if (done) return;
    done = true;
    writeStream.end(() => {
      res.json({ url: `/api/uploads/${filename}` });
    });
  });

  req.on("error", () => {
    if (done) return;
    done = true;
    writeStream.destroy();
    cleanup();
    if (!res.headersSent) res.status(500).json({ error: "فشل الرفع" });
  });

  writeStream.on("error", () => {
    if (done) return;
    done = true;
    cleanup();
    if (!res.headersSent) res.status(500).json({ error: "فشل الكتابة على الخادم" });
  });
});

// GET /uploads/:filename — serve uploaded files with range support
router.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "اسم ملف غير صالح" });
  }

  const filePath = join(UPLOAD_DIR, filename);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: "الملف غير موجود" });
  }

  const ext = extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const isVideo = contentType.startsWith("video/");
  const stat = statSync(filePath);
  const fileSize = stat.size;

  const rangeHeader = req.headers["range"];
  if (isVideo && rangeHeader) {
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
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", fileSize);
  res.setHeader("Cache-Control", "private, max-age=3600");
  createReadStream(filePath).pipe(res);
});

export default router;
