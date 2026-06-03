import { Readable } from "node:stream";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  StorageUploadError,
} from "../lib/objectStorage";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { requirePermission } from "../lib/adminPermissions";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

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

router.post("/storage/uploads/request-url", authMiddleware, requireRole("operator"), requirePermission("media.upload"), async (_req: Request, res: Response) => {
  res.status(410).json({
    error: "Public media uploads now use Cloudinary. Please upload through /api/admin/storage/upload.",
    code: "PUBLIC_SUPABASE_UPLOAD_DISABLED",
  });
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
