import { Readable } from "node:stream";
import { Router, type Response } from "express";
import { MediaStorageService } from "../lib/mediaStorage";
import {
  ObjectNotFoundError,
  ObjectStorageService,
  StorageUploadError,
} from "../lib/objectStorage";

const router = Router();
const mediaStorage = new MediaStorageService();
const objectStorage = new ObjectStorageService();

function copyProxyHeaders(source: globalThis.Response, res: Response): void {
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified",
  ]) {
    const value = source.headers.get(name);
    if (value) res.setHeader(name, value);
  }
}

router.get("/media/public", async (req, res) => {
  const ref = String(req.query.ref || "").trim();
  if (!ref) return res.status(400).json({ error: "ref query param required" });

  try {
    const migrated = await mediaStorage.findCloudinaryAssetByLegacyRef(ref);
    if (migrated?.visibility === "public") {
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.redirect(302, mediaStorage.cloudinaryDeliveryUrl(migrated));
    }

    const normalized = objectStorage.normalizeObjectEntityPath(ref);
    if (normalized.startsWith("/objects/")) {
      const response = await objectStorage.proxyObject(
        normalized,
        typeof req.headers.range === "string" ? req.headers.range : undefined,
      );
      copyProxyHeaders(response, res);
      res.status(response.status);
      if (response.body) Readable.fromWeb(response.body as ReadableStream).pipe(res);
      else res.end();
      return;
    }

    if (/^https?:\/\//i.test(ref)) {
      return res.redirect(302, ref);
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return res.status(404).json({ error: "Not found" });
    const status = error instanceof StorageUploadError ? error.statusCode : 500;
    console.error("[media.public] failed:", error);
    return res.status(status).json({ error: "Failed to resolve media" });
  }
});

export default router;
