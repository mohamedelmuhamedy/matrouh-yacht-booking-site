import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Readable } from "node:stream";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

const DEFAULT_SUPABASE_URL = "https://aiodvunlslvsmeskgjok.supabase.co";
const DEFAULT_BUCKET = "uploads";
const DEFAULT_CACHE_CONTROL = "3600";

interface UploadTokenPayload extends jwt.JwtPayload {
  type: "storage-upload";
  objectPath: string;
  contentType: string;
  size: number;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
    Object.setPrototypeOf(this, StorageConfigurationError.prototype);
  }
}

export class StorageUploadError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "StorageUploadError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, StorageUploadError.prototype);
  }
}

export class ObjectStorageService {
  private bucketReadyPromise: Promise<void> | null = null;

  getBucketName(): string {
    return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  }

  getSupabaseUrl(): string {
    const raw =
      process.env.SUPABASE_URL ||
      process.env.SUPABASE_PROJECT_URL ||
      DEFAULT_SUPABASE_URL;
    return raw.replace(/\/+$/, "");
  }

  getServiceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new StorageConfigurationError(
        "SUPABASE_SERVICE_ROLE_KEY is required for Supabase Storage uploads.",
      );
    }
    return key;
  }

  getUploadTokenSecret(): string {
    const secret =
      process.env.SUPABASE_UPLOAD_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      process.env.SESSION_SECRET;
    if (!secret) {
      throw new StorageConfigurationError(
        "JWT_SECRET or SUPABASE_UPLOAD_TOKEN_SECRET is required for upload tokens.",
      );
    }
    return secret;
  }

  async ensureBucketExists(): Promise<void> {
    if (!this.bucketReadyPromise) {
      this.bucketReadyPromise = this.ensureBucketExistsInternal().catch((error) => {
        this.bucketReadyPromise = null;
        throw error;
      });
    }
    await this.bucketReadyPromise;
  }

  private async ensureBucketExistsInternal(): Promise<void> {
    const bucket = this.getBucketName();
    await pool.query(
      `
        insert into storage.buckets (id, name, public)
        values ($1, $1, true)
        on conflict (id)
        do update set public = true
      `,
      [bucket],
    );
  }

  createObjectPath(fileName?: string, prefix = "uploads"): string {
    const safePrefix = this.sanitizeSegment(prefix) || "uploads";
    const safeExt = this.sanitizeExtension(fileName);
    return `/objects/${safePrefix}/${randomUUID()}${safeExt}`;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) return rawPath;

    if (rawPath.startsWith("/api/storage/objects?")) {
      const parsed = new URL(rawPath, "http://localhost");
      return parsed.searchParams.get("objectPath") || rawPath;
    }

    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    if (rawPath.startsWith("/api/uploads/")) {
      const filename = rawPath.slice("/api/uploads/".length);
      return `/objects/uploads/${filename}`;
    }

    if (rawPath.startsWith("/uploads/")) {
      const filename = rawPath.slice("/uploads/".length);
      return `/objects/uploads/${filename}`;
    }

    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      const url = new URL(rawPath);
      const publicPrefix = `/storage/v1/object/public/${this.getBucketName()}/`;
      if (url.pathname.startsWith(publicPrefix)) {
        const objectKey = decodeURIComponent(url.pathname.slice(publicPrefix.length));
        return `/objects/${objectKey}`;
      }
    }

    return rawPath;
  }

  toApiObjectUrl(objectPath: string): string {
    return `/api/storage/objects?objectPath=${encodeURIComponent(objectPath)}`;
  }

  getPublicUrl(objectPath: string): string {
    const objectKey = this.getObjectKey(objectPath);
    return `${this.getSupabaseUrl()}/storage/v1/object/public/${encodeURIComponent(
      this.getBucketName(),
    )}/${this.encodeObjectKey(objectKey)}`;
  }

  createDirectUploadTarget(input: {
    name?: string;
    size: number;
    contentType: string;
  }): { uploadURL: string; objectPath: string; publicUrl: string } {
    const objectPath = this.createObjectPath(input.name);
    const token = jwt.sign(
      {
        type: "storage-upload",
        objectPath,
        contentType: input.contentType,
        size: input.size,
      } satisfies UploadTokenPayload,
      this.getUploadTokenSecret(),
      { expiresIn: "30m" },
    );

    return {
      uploadURL: `/api/storage/uploads/direct?token=${encodeURIComponent(token)}`,
      objectPath,
      publicUrl: this.getPublicUrl(objectPath),
    };
  }

  verifyUploadToken(token: string): UploadTokenPayload {
    const decoded = jwt.verify(token, this.getUploadTokenSecret());
    if (!decoded || typeof decoded !== "object") {
      throw new StorageUploadError("Invalid upload token", 401);
    }
    const payload = decoded as Partial<UploadTokenPayload>;
    if (
      payload.type !== "storage-upload" ||
      typeof payload.objectPath !== "string" ||
      typeof payload.contentType !== "string" ||
      typeof payload.size !== "number"
    ) {
      throw new StorageUploadError("Invalid upload token", 401);
    }
    return payload as UploadTokenPayload;
  }

  async uploadRequestStream(input: {
    objectPath: string;
    contentType: string;
    stream: NodeJS.ReadableStream;
    contentLength?: number;
    cacheControl?: string;
  }): Promise<{ objectPath: string; publicUrl: string }> {
    await this.ensureBucketExists();

    const objectKey = this.getObjectKey(input.objectPath);
    const uploadUrl = `${this.getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(
      this.getBucketName(),
    )}/${this.encodeObjectKey(objectKey)}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getServiceRoleKey()}`,
      apikey: this.getServiceRoleKey(),
      "Content-Type": input.contentType,
      "Cache-Control": input.cacheControl || DEFAULT_CACHE_CONTROL,
      "x-upsert": "false",
    };

    if (
      typeof input.contentLength === "number" &&
      Number.isFinite(input.contentLength) &&
      input.contentLength > 0
    ) {
      headers["Content-Length"] = String(input.contentLength);
    }

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: Readable.toWeb(input.stream as Readable) as any,
      duplex: "half",
      signal: AbortSignal.timeout(10 * 60_000),
    } as RequestInit & { duplex: "half" });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new StorageUploadError(
        details || `Supabase Storage upload failed with status ${response.status}`,
        response.status,
      );
    }

    return {
      objectPath: input.objectPath,
      publicUrl: this.getPublicUrl(input.objectPath),
    };
  }

  async deleteByUrl(rawUrl: string): Promise<void> {
    const normalized = this.normalizeObjectEntityPath(rawUrl);
    if (!normalized.startsWith("/objects/")) return;
    await this.deleteObject(normalized);
  }

  async deleteObject(objectPath: string): Promise<void> {
    await this.ensureBucketExists();
    const objectKey = this.getObjectKey(objectPath);
    const deleteUrl = `${this.getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(
      this.getBucketName(),
    )}/${this.encodeObjectKey(objectKey)}`;

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.getServiceRoleKey()}`,
        apikey: this.getServiceRoleKey(),
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (response.status === 404) return;
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new StorageUploadError(
        details || `Supabase Storage delete failed with status ${response.status}`,
        response.status,
      );
    }
  }

  async objectExists(rawPath: string): Promise<boolean> {
    const normalized = this.normalizeObjectEntityPath(rawPath);
    if (!normalized.startsWith("/objects/")) return false;

    const response = await fetch(this.getPublicUrl(normalized), {
      method: "HEAD",
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  }

  async proxyObject(objectPath: string, rangeHeader?: string): Promise<Response> {
    const normalized = this.normalizeObjectEntityPath(objectPath);
    if (!normalized.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const headers: Record<string, string> = {};
    if (rangeHeader) headers.Range = rangeHeader;

    const response = await fetch(this.getPublicUrl(normalized), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5 * 60_000),
    });

    if (response.status === 404) {
      throw new ObjectNotFoundError();
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new StorageUploadError(
        details || `Supabase Storage fetch failed with status ${response.status}`,
        response.status,
      );
    }

    return response;
  }

  private getObjectKey(rawPath: string): string {
    const normalized = this.normalizeObjectEntityPath(rawPath);
    if (!normalized.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const objectKey = normalized.slice("/objects/".length);
    if (!objectKey) {
      throw new ObjectNotFoundError();
    }
    return objectKey;
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
  }

  private sanitizeExtension(fileName?: string): string {
    const ext = extname(fileName || "").toLowerCase();
    if (!ext) return "";
    if (!/^\.[a-z0-9]{1,10}$/.test(ext)) return "";
    return ext;
  }

  private encodeObjectKey(objectKey: string): string {
    return objectKey
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }
}
