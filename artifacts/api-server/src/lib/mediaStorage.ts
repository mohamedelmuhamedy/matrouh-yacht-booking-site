import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Readable, Transform } from "node:stream";
import { and, desc, eq, or } from "drizzle-orm";
import { db, mediaAssets } from "@workspace/db";
import { ObjectStorageService, StorageUploadError } from "./objectStorage";

export type MediaVisibility = "public" | "private";
export type MediaProvider = "supabase_legacy" | "cloudinary";

export interface MediaUploadInput {
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
  maxBytes: number;
  originalFilename?: string;
  category?: string;
  visibility?: MediaVisibility;
  ownerType?: string;
  ownerId?: string;
  prefix?: string;
}

export interface MediaUploadResult {
  provider: MediaProvider;
  mediaAssetId?: string;
  url: string;
  publicUrl: string;
  deliveryUrl: string;
  objectPath: string;
  proxyUrl: string;
  contentType: string;
  sizeBytes: number;
  metadata: Record<string, unknown>;
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderPrefix: string;
}

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  url?: string;
  resource_type?: string;
  bytes?: number;
  format?: string;
  version?: number;
  asset_id?: string;
  width?: number;
  height?: number;
};

export class MediaStorageService {
  private readonly objectStorage = new ObjectStorageService();

  async uploadPublic(input: MediaUploadInput): Promise<MediaUploadResult> {
    const contentType = input.contentType.trim().toLowerCase();
    const category = this.sanitizeCategory(input.category || "general");
    const originalFilename = this.cleanFilename(input.originalFilename);

    if (!this.isCloudinaryPublicContentType(contentType)) {
      throw new StorageUploadError("Public media must be an image or video file", 400);
    }

    if (!this.getCloudinaryConfig()) {
      throw new StorageUploadError("Cloudinary public media storage is not configured", 500);
    }

    const buffer = await this.readToBuffer(input.stream, input.maxBytes);
    return await this.uploadCloudinaryBuffer({
      ...input,
      stream: Readable.from(buffer),
      contentType,
      originalFilename,
      category,
      contentLength: buffer.byteLength,
      buffer,
    });
  }

  async recordLegacyPublicAsset(input: {
    category: string;
    contentType: string;
    sizeBytes?: number;
    originalFilename?: string;
    objectPath: string;
    publicUrl: string;
    ownerType?: string;
    ownerId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string | undefined> {
    return await this.recordAsset({
      provider: "supabase_legacy",
      visibility: "public",
      category: this.sanitizeCategory(input.category),
      bucket: this.objectStorage.getBucketName("public"),
      objectKey: this.objectKeyFromPath(input.objectPath),
      objectPath: input.objectPath,
      publicUrl: input.publicUrl,
      deliveryUrl: input.publicUrl,
      secureUrl: input.publicUrl,
      resourceType: this.resourceTypeFromContentType(input.contentType),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes || 0,
      checksum: "",
      originalFilename: this.cleanFilename(input.originalFilename),
      ownerType: this.cleanOwner(input.ownerType),
      ownerId: this.cleanOwner(input.ownerId),
      status: "active",
      migrationStatus: "legacy_recorded",
      legacyUrl: input.publicUrl,
      legacyObjectPath: input.objectPath,
      providerMetadata: input.metadata || {},
    });
  }

  async uploadPrivateBuffer(input: {
    buffer: Buffer;
    contentType: string;
    originalFilename?: string;
    category: string;
    ownerType?: string;
    ownerId?: string;
    prefix?: string;
  }): Promise<MediaUploadResult> {
    const contentType = input.contentType.trim().toLowerCase();
    const category = this.sanitizeCategory(input.category || "private");
    const originalFilename = this.cleanFilename(input.originalFilename);
    const objectPath = this.objectStorage.createObjectPath(
      originalFilename || `upload${this.extForContentType(contentType)}`,
      input.prefix || category,
      "private",
    );
    const uploaded = await this.objectStorage.uploadRequestStream({
      objectPath,
      contentType,
      stream: Readable.from(input.buffer),
      contentLength: input.buffer.byteLength,
      maxBytes: input.buffer.byteLength,
      visibility: "private",
      cacheControl: "private, max-age=0, no-store",
    });
    const checksum = createHash("sha256").update(input.buffer).digest("hex");
    const mediaAssetId = await this.recordAsset({
      provider: "supabase_legacy",
      visibility: "private",
      category,
      bucket: this.objectStorage.getBucketName("private"),
      objectKey: this.objectKeyFromPath(objectPath),
      objectPath,
      publicUrl: "",
      deliveryUrl: "",
      secureUrl: "",
      resourceType: this.resourceTypeFromContentType(contentType),
      contentType,
      sizeBytes: input.buffer.byteLength,
      checksum,
      originalFilename,
      ownerType: this.cleanOwner(input.ownerType),
      ownerId: this.cleanOwner(input.ownerId),
      status: "active",
      migrationStatus: "native",
      legacyUrl: "",
      legacyObjectPath: "",
      providerMetadata: {},
    });

    return {
      provider: "supabase_legacy",
      mediaAssetId,
      url: "",
      publicUrl: "",
      deliveryUrl: "",
      objectPath: uploaded.objectPath,
      proxyUrl: "",
      contentType,
      sizeBytes: input.buffer.byteLength,
      metadata: {},
    };
  }

  async uploadCloudinaryMigrationAsset(input: {
    buffer: Buffer;
    contentType: string;
    originalFilename?: string;
    category: string;
    visibility: MediaVisibility;
    legacyUrl?: string;
    legacyObjectPath?: string;
    ownerType?: string;
    ownerId?: string;
  }): Promise<MediaUploadResult> {
    return await this.uploadCloudinaryBuffer({
      stream: Readable.from(input.buffer),
      buffer: input.buffer,
      contentType: input.contentType.trim().toLowerCase(),
      maxBytes: input.buffer.byteLength,
      contentLength: input.buffer.byteLength,
      originalFilename: this.cleanFilename(input.originalFilename),
      category: this.sanitizeCategory(input.category),
      visibility: input.visibility,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      legacyUrl: input.legacyUrl,
      legacyObjectPath: input.legacyObjectPath,
    });
  }

  async findCloudinaryAssetByLegacyRef(ref: string): Promise<typeof mediaAssets.$inferSelect | null> {
    const cleanRef = String(ref || "").trim();
    if (!cleanRef) return null;
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(and(
        eq(mediaAssets.provider, "cloudinary"),
        eq(mediaAssets.status, "active"),
        eq(mediaAssets.migrationStatus, "verified"),
        or(eq(mediaAssets.legacyUrl, cleanRef), eq(mediaAssets.legacyObjectPath, cleanRef)),
      ))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(1);
    return asset || null;
  }

  async proxyAsset(asset: typeof mediaAssets.$inferSelect, rangeHeader?: string): Promise<Response> {
    if (asset.provider === "cloudinary") {
      const url = this.cloudinaryDeliveryUrl(asset);
      const headers: Record<string, string> = {};
      if (rangeHeader) headers.Range = rangeHeader;
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5 * 60_000),
      });
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new StorageUploadError(
          details || `Cloudinary fetch failed with status ${response.status}`,
          response.status,
        );
      }
      return response;
    }
    return await this.objectStorage.proxyObject(asset.objectPath, rangeHeader);
  }

  cloudinaryDeliveryUrl(asset: typeof mediaAssets.$inferSelect): string {
    if (asset.provider !== "cloudinary") return asset.deliveryUrl || asset.publicUrl || asset.secureUrl;
    const metadata = (asset.providerMetadata || {}) as Record<string, unknown>;
    const deliveryType = String(metadata.deliveryType || (asset.visibility === "private" ? "authenticated" : "upload"));
    if (deliveryType !== "authenticated") return asset.deliveryUrl || asset.publicUrl || asset.secureUrl;
    const config = this.getCloudinaryConfig();
    if (!config) throw new StorageUploadError("Cloudinary is not configured", 500);
    const unsigned = asset.secureUrl || asset.deliveryUrl || asset.publicUrl;
    if (!unsigned) throw new StorageUploadError("Cloudinary asset URL is missing", 500);
    return this.signCloudinaryDeliveryUrl(unsigned, config.apiSecret);
  }

  private async uploadSupabasePublic(input: MediaUploadInput): Promise<MediaUploadResult> {
    const objectPath = this.objectStorage.createObjectPath(
      input.originalFilename || `upload${this.extForContentType(input.contentType)}`,
      input.prefix || input.category || "",
      "public",
    );
    const uploaded = await this.objectStorage.uploadRequestStream({
      objectPath,
      contentType: input.contentType,
      stream: input.stream,
      contentLength: input.contentLength,
      maxBytes: input.maxBytes,
    });
    const publicUrl = uploaded.publicUrl;
    const mediaAssetId = await this.recordLegacyPublicAsset({
      category: input.category || "general",
      contentType: input.contentType,
      sizeBytes: input.contentLength,
      originalFilename: input.originalFilename,
      objectPath,
      publicUrl,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
    });

    return {
      provider: "supabase_legacy",
      mediaAssetId,
      url: publicUrl,
      publicUrl,
      deliveryUrl: publicUrl,
      objectPath,
      proxyUrl: this.objectStorage.toApiObjectUrl(objectPath),
      contentType: input.contentType,
      sizeBytes: input.contentLength || 0,
      metadata: {},
    };
  }

  private async uploadCloudinaryBuffer(input: MediaUploadInput & {
    buffer: Buffer;
    category: string;
    originalFilename: string;
    legacyUrl?: string;
    legacyObjectPath?: string;
  }): Promise<MediaUploadResult> {
    const config = this.getCloudinaryConfig();
    if (!config) throw new StorageUploadError("Cloudinary is not configured", 500);

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = this.cloudinaryFolder(config.folderPrefix, input.category);
    const deliveryType = input.visibility === "private" ? "authenticated" : "upload";
    const signature = this.signCloudinaryParams({ folder, timestamp, type: deliveryType }, config.apiSecret);
    const fileName = input.originalFilename || `${randomUUID()}${this.extForContentType(input.contentType)}`;
    const fileBytes = new Uint8Array(input.buffer.byteLength);
    fileBytes.set(input.buffer);
    const form = new FormData();
    form.append("file", new Blob([fileBytes], { type: input.contentType }), fileName);
    form.append("api_key", config.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("type", deliveryType);
    form.append("signature", signature);
    const resourceType = this.resourceTypeFromContentType(input.contentType);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${encodeURIComponent(resourceType)}/upload`,
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(5 * 60_000),
      },
    );

    const raw = await response.text();
    let payload: CloudinaryUploadResponse & { error?: { message?: string } };
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }

    if (!response.ok || !payload.secure_url || !payload.public_id) {
      throw new StorageUploadError(
        payload.error?.message || raw || `Cloudinary upload failed with status ${response.status}`,
        response.status || 500,
      );
    }

    const secureUrl = payload.secure_url;
    const deliveryUrl = deliveryType === "authenticated"
      ? secureUrl
      : this.optimizedCloudinaryUrl(secureUrl, payload.resource_type || resourceType);
    const objectPath = `cloudinary://${payload.resource_type || resourceType}/${deliveryType}/${payload.public_id}`;
    const checksum = createHash("sha256").update(input.buffer).digest("hex");
    const mediaAssetId = await this.recordAsset({
      provider: "cloudinary",
      visibility: input.visibility === "private" ? "private" : "public",
      category: input.category,
      bucket: config.cloudName,
      objectKey: payload.public_id,
      objectPath,
      publicUrl: secureUrl,
      deliveryUrl,
      secureUrl,
      resourceType: payload.resource_type || resourceType,
      contentType: input.contentType,
      sizeBytes: payload.bytes || input.buffer.byteLength,
      checksum,
      originalFilename: input.originalFilename,
      ownerType: this.cleanOwner(input.ownerType),
      ownerId: this.cleanOwner(input.ownerId),
      status: "active",
      migrationStatus: input.legacyUrl || input.legacyObjectPath ? "migrated" : "native",
      legacyUrl: input.legacyUrl || "",
      legacyObjectPath: input.legacyObjectPath || "",
      providerMetadata: {
        deliveryType,
        assetId: payload.asset_id,
        version: payload.version,
        format: payload.format,
        width: payload.width,
        height: payload.height,
      },
    });

    return {
      provider: "cloudinary",
      mediaAssetId,
      url: deliveryUrl,
      publicUrl: deliveryUrl,
      deliveryUrl,
      objectPath,
      proxyUrl: deliveryUrl,
      contentType: input.contentType,
      sizeBytes: payload.bytes || input.buffer.byteLength,
      metadata: {
        cloudName: config.cloudName,
        publicId: payload.public_id,
        secureUrl,
        resourceType: payload.resource_type,
      },
    };
  }

  private isCloudinaryPublicContentType(contentType: string): boolean {
    return contentType.startsWith("image/") || contentType.startsWith("video/");
  }

  private getCloudinaryConfig(): CloudinaryConfig | null {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();
    if (!cloudName || !apiKey || !apiSecret) return null;
    return {
      cloudName,
      apiKey,
      apiSecret,
      folderPrefix: (process.env.CLOUDINARY_FOLDER_PREFIX || "dr-travel").trim() || "dr-travel",
    };
  }

  private async recordAsset(values: typeof mediaAssets.$inferInsert): Promise<string | undefined> {
    try {
      const [row] = await db.insert(mediaAssets).values(values).returning({ id: mediaAssets.id });
      return row?.id;
    } catch (error) {
      console.error("[media] failed to record media asset metadata:", error);
      return undefined;
    }
  }

  private signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
    const base = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return createHash("sha1").update(`${base}${apiSecret}`).digest("hex");
  }

  private signCloudinaryDeliveryUrl(value: string, apiSecret: string): string {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 4) return value;
    const prefix = segments.slice(0, 3);
    const rest = segments.slice(3).filter((segment) => !/^s--[^/]+--$/.test(segment));
    if (!rest.length) return value;
    const signature = createHash("sha1")
      .update(`${rest.join("/")}${apiSecret}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "")
      .slice(0, 8);
    url.pathname = `/${[...prefix, `s--${signature}--`, ...rest].join("/")}`;
    return url.toString();
  }

  private optimizedCloudinaryUrl(secureUrl: string, resourceType: string): string {
    if (resourceType !== "image") return secureUrl;
    return secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
  }

  private async readToBuffer(stream: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let seen = 0;
    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      seen += buffer.byteLength;
      if (seen > maxBytes) {
        throw new StorageUploadError("Uploaded file exceeded the approved size limit", 413);
      }
      chunks.push(buffer);
    }
    return Buffer.concat(chunks, seen);
  }

  private sanitizeCategory(value: string): string {
    return String(value || "general")
      .replace(/[^a-zA-Z0-9/_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-/]+|[-/]+$/g, "")
      .slice(0, 120) || "general";
  }

  private cleanFilename(value?: string): string {
    return String(value || "")
      .replace(/\u0000/g, "")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim()
      .slice(0, 200);
  }

  private cleanOwner(value?: string): string {
    return String(value || "").trim().slice(0, 120);
  }

  private cloudinaryFolder(prefix: string, category: string): string {
    return `${this.sanitizeCategory(prefix)}/${this.sanitizeCategory(category)}`.replace(/\/+/g, "/");
  }

  private objectKeyFromPath(objectPath: string): string {
    if (objectPath.startsWith("/objects/")) return objectPath.slice("/objects/".length);
    if (objectPath.startsWith("/private-objects/")) return objectPath.slice("/private-objects/".length);
    return objectPath;
  }

  private resourceTypeFromContentType(contentType: string): string {
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";
    if (contentType === "application/pdf") return "raw";
    return "raw";
  }

  private extForContentType(contentType: string): string {
    const ext = extname(`x.${contentType.split("/")[1] || ""}`).toLowerCase();
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "application/pdf": ".pdf",
    };
    return map[contentType] || (ext && /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "");
  }
}

export function byteLimitStream(stream: NodeJS.ReadableStream, maxBytes: number): NodeJS.ReadableStream {
  let seen = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      seen += Buffer.byteLength(chunk);
      if (seen > maxBytes) {
        callback(new StorageUploadError("Uploaded file exceeded the approved size limit", 413));
        return;
      }
      callback(null, chunk);
    },
  });
  return stream.pipe(limiter);
}
