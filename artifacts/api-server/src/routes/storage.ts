import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { authMiddleware } from "../middleware/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

router.post("/storage/uploads/request-url", authMiddleware, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body as { name?: string; size?: number; contentType?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" }); return;
  }
  if (typeof size !== "number" || size <= 0 || size > MAX_SIZE_BYTES) {
    res.status(400).json({ error: `size must be a positive number up to ${MAX_SIZE_BYTES} bytes` }); return;
  }
  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    res.status(400).json({ error: "Unsupported file type", allowed: ALLOWED_TYPES }); return;
  }
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
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

// Private file serving — objectPath as query param: ?objectPath=/objects/uuid
router.get("/storage/objects", async (req: Request, res: Response) => {
  const objectPath = (req.query.objectPath as string) || "";
  if (!objectPath) { res.status(400).json({ error: "objectPath query param required" }); return; }
  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file, 3600);
    res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (response.body) {
      const { Readable } = await import("stream");
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Not found" }); return; }
    console.error("Error serving object:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
