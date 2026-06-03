import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "@workspace/db";
import sharp from "sharp";

type Visibility = "public" | "private";

type InventoryItem = {
  id: string;
  source: string;
  category: string;
  visibility: Visibility;
  ref: string;
  legacyUrl: string;
  legacyObjectPath: string;
  contentType: string;
  originalFilename: string;
  ownerType: string;
  ownerId: string;
  tableName?: string;
  rowId?: string;
  columnName?: string;
};

type MigrationReport = {
  startedAt: string;
  finishedAt?: string;
  totalAssetsFound: number;
  totalAssetsMigrated: number;
  totalAssetsVerified: number;
  totalAssetsOptimized: number;
  skipped: Array<{ id: string; ref: string; reason: string }>;
  failures: Array<{ id: string; ref: string; error: string }>;
};

const OUT_DIR = path.resolve(process.cwd(), "artifacts", "media-migration");
const DEFAULT_SITE_URL = "https://drtravel-matrouh.com";
const PUBLIC_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_STORAGE_BUCKET || "private-uploads";
const CLOUDINARY_MAX_UPLOAD_BYTES = Number(process.env.CLOUDINARY_MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
const CLOUDINARY_OPTIMIZED_TARGET_BYTES = Number(process.env.CLOUDINARY_OPTIMIZED_TARGET_BYTES || 9 * 1024 * 1024);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeSegment(value: string): string {
  return String(value || "general")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 120) || "general";
}

function cleanRef(value: unknown): string {
  return String(value || "").replace(/\u0000/g, "").trim();
}

function looksLikeMediaRef(value: string): boolean {
  if (!value) return false;
  if (/^(data|blob|mailto|tel):/i.test(value)) return false;
  if (value.startsWith("/api/storage/objects?") || value.startsWith("/api/uploads/")) return true;
  if (value.startsWith("/objects/") || value.startsWith("/private-objects/") || value.startsWith("/uploads/")) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  if (value.includes("/storage/v1/object/")) return true;
  if (value.includes("res.cloudinary.com")) return true;
  return /\.(jpe?g|png|webp|gif|avif|svg|mp4|webm|mov|avi|pdf)(?:[?#].*)?$/i.test(value);
}

function contentTypeFromRef(ref: string, fallback = ""): string {
  const lower = ref.split("?")[0]?.toLowerCase() || "";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return fallback || "application/octet-stream";
}

function cloudinaryResourceType(contentType: string): "image" | "video" | "raw" {
  const clean = contentType.split(";")[0]?.trim().toLowerCase() || "";
  if (clean.startsWith("image/")) return "image";
  if (clean.startsWith("video/")) return "video";
  return "raw";
}

function isImageContentType(contentType: string): boolean {
  return contentType.split(";")[0]?.trim().toLowerCase().startsWith("image/") || false;
}

function isVideoContentType(contentType: string): boolean {
  return contentType.split(";")[0]?.trim().toLowerCase().startsWith("video/") || false;
}

function isPublicVisualCandidate(item: InventoryItem): boolean {
  if (item.visibility !== "public") return false;
  if (isSensitivePublicItem(item)) return false;
  return isImageContentType(item.contentType) || isVideoContentType(item.contentType);
}

function isSensitivePublicItem(item: InventoryItem): boolean {
  const ref = `${item.category} ${item.ref} ${item.legacyObjectPath}`.toLowerCase();
  if (ref.includes("payment-proof") || ref.includes("payment_proof")) return true;
  if (item.category === "ticket-pdfs" || item.ownerType === "ticket_pdf") return true;
  if (item.contentType === "application/pdf") return true;
  return false;
}

function filenameFromRef(ref: string): string {
  try {
    const url = new URL(ref, "https://local.invalid");
    const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    return name.slice(0, 180);
  } catch {
    return path.basename(ref).slice(0, 180);
  }
}

function supabaseUrl(): string {
  return requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
}

function normalizeObjectPath(ref: string): string {
  if (ref.startsWith("/api/storage/objects?")) {
    const parsed = new URL(ref, "https://local.invalid");
    return parsed.searchParams.get("objectPath") || "";
  }
  if (ref.startsWith("/api/uploads/")) return `/objects/uploads/${ref.slice("/api/uploads/".length)}`;
  if (ref.startsWith("/objects/") || ref.startsWith("/private-objects/")) return ref;
  if (ref.startsWith("/uploads/")) return `/objects/uploads/${ref.slice("/uploads/".length)}`;
  if (/^https?:\/\//i.test(ref)) {
    const url = new URL(ref);
    const publicPrefix = `/storage/v1/object/public/${PUBLIC_BUCKET}/`;
    if (url.pathname.startsWith(publicPrefix)) {
      return `/objects/${decodeURIComponent(url.pathname.slice(publicPrefix.length))}`;
    }
  }
  return "";
}

function publicSupabaseUrlFromObjectPath(objectPath: string): string {
  const key = objectPath.replace(/^\/objects\//, "");
  return `${supabaseUrl()}/storage/v1/object/public/${encodeURIComponent(PUBLIC_BUCKET)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function cloudinaryConfig() {
  return {
    cloudName: requiredEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requiredEnv("CLOUDINARY_API_KEY"),
    apiSecret: requiredEnv("CLOUDINARY_API_SECRET"),
    folderPrefix: optionalEnv("CLOUDINARY_FOLDER_PREFIX", "dr-travel-migration"),
  };
}

async function ensureMediaSchema(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text NOT NULL,
      visibility text NOT NULL DEFAULT 'public',
      category text NOT NULL DEFAULT 'general',
      bucket text NOT NULL DEFAULT '',
      object_key text NOT NULL DEFAULT '',
      object_path text NOT NULL DEFAULT '',
      public_url text NOT NULL DEFAULT '',
      delivery_url text NOT NULL DEFAULT '',
      secure_url text NOT NULL DEFAULT '',
      resource_type text NOT NULL DEFAULT '',
      content_type text NOT NULL DEFAULT '',
      size_bytes integer NOT NULL DEFAULT 0,
      checksum text NOT NULL DEFAULT '',
      original_filename text NOT NULL DEFAULT '',
      owner_type text NOT NULL DEFAULT '',
      owner_id text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'active',
      migration_status text NOT NULL DEFAULT 'native',
      legacy_url text NOT NULL DEFAULT '',
      legacy_object_path text NOT NULL DEFAULT '',
      provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS legacy_object_path text NOT NULL DEFAULT ''`);
  await pool.query(`CREATE INDEX IF NOT EXISTS media_assets_legacy_url_idx ON media_assets (legacy_url)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS media_assets_legacy_object_path_idx ON media_assets (legacy_object_path)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS media_assets_provider_object_idx ON media_assets (provider, object_key)`);
}

async function ensureSupabaseBucket(bucket: string, isPublic: boolean): Promise<void> {
  await pool.query(
    `insert into storage.buckets (id, name, public)
     values ($1, $1, $2)
     on conflict (id) do update set public = $2`,
    [bucket, isPublic],
  );
}

async function queryRows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  try {
    const result = await pool.query(sql);
    return result.rows as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist/i.test(message)) return [];
    throw error;
  }
}

function addRef(items: Map<string, InventoryItem>, rawRef: unknown, input: Omit<InventoryItem, "id" | "ref" | "legacyUrl" | "legacyObjectPath" | "contentType" | "originalFilename"> & {
  contentType?: string;
  originalFilename?: string;
}) {
  const ref = cleanRef(rawRef);
  if (!looksLikeMediaRef(ref)) return;
  if (ref.includes("res.cloudinary.com")) return;
  const objectPath = normalizeObjectPath(ref);
  const legacyUrl = /^https?:\/\//i.test(ref) ? ref : (objectPath.startsWith("/objects/") ? publicSupabaseUrlFromObjectPath(objectPath) : "");
  const legacyObjectPath = objectPath;
  const id = sha(`${input.source}|${ref}|${legacyObjectPath}`);
  if (items.has(id)) return;
  items.set(id, {
    ...input,
    id,
    ref,
    legacyUrl,
    legacyObjectPath,
    contentType: input.contentType || contentTypeFromRef(ref),
    originalFilename: input.originalFilename || filenameFromRef(ref),
  });
}

async function collectDatabaseRefs(items: Map<string, InventoryItem>): Promise<void> {
  for (const row of await queryRows<{ id: number; images: string[] }>(`SELECT id, images FROM packages`)) {
    for (const ref of Array.isArray(row.images) ? row.images : []) {
      addRef(items, ref, { source: "db", category: "packages", visibility: "public", ownerType: "package", ownerId: String(row.id), tableName: "packages", rowId: String(row.id), columnName: "images" });
    }
  }

  for (const row of await queryRows<{ id: number; cover_image: string }>(`SELECT id, cover_image FROM gallery_albums`)) {
    addRef(items, row.cover_image, { source: "db", category: "gallery", visibility: "public", ownerType: "gallery_album", ownerId: String(row.id), tableName: "gallery_albums", rowId: String(row.id), columnName: "cover_image" });
  }
  for (const row of await queryRows<{ id: number; url: string; type: string }>(`SELECT id, url, type FROM gallery_items`)) {
    addRef(items, row.url, { source: "db", category: "gallery", visibility: "public", ownerType: "gallery_item", ownerId: String(row.id), tableName: "gallery_items", rowId: String(row.id), columnName: "url", contentType: row.type === "video" ? contentTypeFromRef(row.url, "video/mp4") : undefined });
  }
  for (const row of await queryRows<{ id: number; url: string; type: string }>(`SELECT id, url, type FROM hero_slides`)) {
    addRef(items, row.url, { source: "db", category: "hero-slides", visibility: "public", ownerType: "hero_slide", ownerId: String(row.id), tableName: "hero_slides", rowId: String(row.id), columnName: "url", contentType: row.type === "video" ? contentTypeFromRef(row.url, "video/mp4") : undefined });
  }

  for (const row of await queryRows<any>(`SELECT id, image_url, about_image_url, features_image_url, cta_image_url, features FROM services`)) {
    for (const col of ["image_url", "about_image_url", "features_image_url", "cta_image_url"]) {
      addRef(items, row[col], { source: "db", category: "services", visibility: "public", ownerType: "service", ownerId: String(row.id), tableName: "services", rowId: String(row.id), columnName: col });
    }
    for (const feature of Array.isArray(row.features) ? row.features : []) {
      addRef(items, feature?.image, { source: "db", category: "services", visibility: "public", ownerType: "service", ownerId: String(row.id), tableName: "services", rowId: String(row.id), columnName: "features.image" });
    }
  }

  for (const row of await queryRows<any>(`SELECT id, hero_image_url, accent_image_url, gallery_images FROM why_us_cards`)) {
    addRef(items, row.hero_image_url, { source: "db", category: "why-us", visibility: "public", ownerType: "why_us", ownerId: String(row.id), tableName: "why_us_cards", rowId: String(row.id), columnName: "hero_image_url" });
    addRef(items, row.accent_image_url, { source: "db", category: "why-us", visibility: "public", ownerType: "why_us", ownerId: String(row.id), tableName: "why_us_cards", rowId: String(row.id), columnName: "accent_image_url" });
    for (const ref of Array.isArray(row.gallery_images) ? row.gallery_images : []) {
      addRef(items, ref, { source: "db", category: "why-us", visibility: "public", ownerType: "why_us", ownerId: String(row.id), tableName: "why_us_cards", rowId: String(row.id), columnName: "gallery_images" });
    }
  }

  for (const row of await queryRows<{ key: string; value: string }>(`SELECT key, value FROM site_settings`)) {
    addRef(items, row.value, { source: "db", category: `settings/${safeSegment(row.key)}`, visibility: "public", ownerType: "site_setting", ownerId: row.key, tableName: "site_settings", rowId: row.key, columnName: "value" });
  }

  for (const row of await queryRows<any>(`SELECT id, avatar_url, photos FROM reviews`)) {
    addRef(items, row.avatar_url, { source: "db", category: "reviews", visibility: "public", ownerType: "review", ownerId: String(row.id), tableName: "reviews", rowId: String(row.id), columnName: "avatar_url" });
    for (const ref of Array.isArray(row.photos) ? row.photos : []) {
      addRef(items, ref, { source: "db", category: "reviews", visibility: "public", ownerType: "review", ownerId: String(row.id), tableName: "reviews", rowId: String(row.id), columnName: "photos" });
    }
  }

  for (const row of await queryRows<any>(`SELECT id, avatar, image_url FROM testimonials`)) {
    addRef(items, row.avatar, { source: "db", category: "testimonials", visibility: "public", ownerType: "testimonial", ownerId: String(row.id), tableName: "testimonials", rowId: String(row.id), columnName: "avatar" });
    addRef(items, row.image_url, { source: "db", category: "testimonials", visibility: "public", ownerType: "testimonial", ownerId: String(row.id), tableName: "testimonials", rowId: String(row.id), columnName: "image_url" });
  }

  for (const row of await queryRows<any>(`SELECT id, photo_urls FROM booking_reviews`)) {
    for (const ref of Array.isArray(row.photo_urls) ? row.photo_urls : []) {
      addRef(items, ref, { source: "db", category: "booking-reviews", visibility: "public", ownerType: "booking_review", ownerId: String(row.id), tableName: "booking_reviews", rowId: String(row.id), columnName: "photo_urls" });
    }
  }
  for (const row of await queryRows<any>(`SELECT id, photo_url, booking_id FROM customer_photos`)) {
    addRef(items, row.photo_url, { source: "db", category: "customer-photos", visibility: "public", ownerType: "customer_photo", ownerId: String(row.id), tableName: "customer_photos", rowId: String(row.id), columnName: "photo_url" });
  }
  for (const row of await queryRows<any>(`SELECT id, object_path, mime_type, original_filename, payment_request_id FROM payment_request_attachments`)) {
    addRef(items, row.object_path, { source: "db", category: "payment-proofs", visibility: "private", ownerType: "payment_request_attachment", ownerId: String(row.id), tableName: "payment_request_attachments", rowId: String(row.id), columnName: "object_path", contentType: row.mime_type, originalFilename: row.original_filename });
  }
}

async function listSupabasePrefix(bucket: string, prefix: string): Promise<Array<{ name: string; metadata?: Record<string, unknown>; id?: string | null }>> {
  const url = `${supabaseUrl()}/storage/v1/object/list/${encodeURIComponent(bucket)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Supabase list ${bucket}/${prefix} failed: ${response.status} ${await response.text()}`);
  return await response.json() as Array<{ name: string; metadata?: Record<string, unknown>; id?: string | null }>;
}

async function collectSupabaseObjects(items: Map<string, InventoryItem>, bucket: string, visibility: Visibility, prefix = ""): Promise<void> {
  const rows = await listSupabasePrefix(bucket, prefix);
  for (const row of rows) {
    const name = String(row.name || "");
    if (!name) continue;
    const key = prefix ? `${prefix.replace(/\/+$/, "")}/${name}` : name;
    const isFile = Boolean(row.id) || Boolean(row.metadata);
    if (!isFile) {
      await collectSupabaseObjects(items, bucket, visibility, key);
      continue;
    }
    const objectPath = `${visibility === "private" ? "/private-objects" : "/objects"}/${key}`;
    const publicUrl = visibility === "public" ? publicSupabaseUrlFromObjectPath(objectPath) : "";
    const id = sha(`supabase-storage|${bucket}|${objectPath}`);
    if (items.has(id)) continue;
    items.set(id, {
      id,
      source: "supabase-storage",
      category: key.split("/")[0] || "storage",
      visibility,
      ref: objectPath,
      legacyUrl: publicUrl,
      legacyObjectPath: objectPath,
      contentType: contentTypeFromRef(key, String((row.metadata as any)?.mimetype || "")),
      originalFilename: filenameFromRef(key),
      ownerType: "supabase_object",
      ownerId: key,
    });
  }
}

async function collectTicketPdfs(items: Map<string, InventoryItem>): Promise<void> {
  const siteUrl = optionalEnv("PUBLIC_SITE_URL", DEFAULT_SITE_URL).replace(/\/+$/, "");
  const rows = [
    ...await queryRows<any>(`SELECT id, ticket_token FROM bookings WHERE ticket_token IS NOT NULL AND ticket_token <> ''`),
    ...await queryRows<any>(`SELECT id, ticket_token FROM manual_tickets WHERE ticket_token IS NOT NULL AND ticket_token <> ''`),
  ];
  for (const row of rows) {
    const token = cleanRef(row.ticket_token);
    if (!token) continue;
    const ref = `${siteUrl}/api/tickets/${encodeURIComponent(token)}.pdf`;
    const id = sha(`ticket-pdf|${token}`);
    if (items.has(id)) continue;
    items.set(id, {
      id,
      source: "ticket-pdf",
      category: "ticket-pdfs",
      visibility: "private",
      ref,
      legacyUrl: ref,
      legacyObjectPath: "",
      contentType: "application/pdf",
      originalFilename: `${token}.pdf`,
      ownerType: "ticket_pdf",
      ownerId: token,
    });
  }
}

async function collectInventory(): Promise<InventoryItem[]> {
  const items = new Map<string, InventoryItem>();
  await collectDatabaseRefs(items);
  await collectSupabaseObjects(items, PUBLIC_BUCKET, "public").catch((error) => {
    console.error("[media-migration] public Supabase storage listing failed:", error instanceof Error ? error.message : error);
  });
  await collectSupabaseObjects(items, PRIVATE_BUCKET, "private").catch((error) => {
    console.error("[media-migration] private Supabase storage listing failed:", error instanceof Error ? error.message : error);
  });
  await collectTicketPdfs(items);
  return [...items.values()].sort((a, b) => a.category.localeCompare(b.category) || a.ref.localeCompare(b.ref));
}

async function fetchSupabaseObject(objectPath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const visibility: Visibility = objectPath.startsWith("/private-objects/") ? "private" : "public";
  const bucket = visibility === "private" ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  const key = objectPath.replace(visibility === "private" ? /^\/private-objects\// : /^\/objects\//, "");
  const url = `${supabaseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${requiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    },
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!response.ok) throw new Error(`Supabase object fetch failed ${response.status}: ${await response.text()}`);
  return { buffer: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "" };
}

async function uploadPrivateSupabaseObject(input: {
  objectPath: string;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  await ensureSupabaseBucket(PRIVATE_BUCKET, false);
  const key = input.objectPath.replace(/^\/private-objects\//, "");
  const url = `${supabaseUrl()}/storage/v1/object/${encodeURIComponent(PRIVATE_BUCKET)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      "Content-Type": input.contentType,
      "Cache-Control": "private, max-age=0, no-store",
      "x-upsert": "false",
    },
    body: new Uint8Array(input.buffer),
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`Private Supabase upload failed ${response.status}: ${await response.text()}`);
  }
}

async function fetchHttpAsset(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(5 * 60_000) });
  if (!response.ok) throw new Error(`HTTP fetch failed ${response.status}: ${url}`);
  return { buffer: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "" };
}

async function readAsset(item: InventoryItem): Promise<{ buffer: Buffer; contentType: string }> {
  if (item.source === "ticket-pdf") {
    const local = path.resolve(process.cwd(), "artifacts", "api-server", "data", "tickets", `${item.ownerId}.pdf`);
    let result: { buffer: Buffer; contentType: string };
    try {
      result = { buffer: await readFile(local), contentType: "application/pdf" };
    } catch {
      result = await fetchHttpAsset(item.legacyUrl);
    }
    if (result.buffer.slice(0, 4).toString("utf8") !== "%PDF") {
      throw new Error(`ticket PDF source did not return a PDF (${result.contentType || "unknown content type"})`);
    }
    return { buffer: result.buffer, contentType: "application/pdf" };
  }
  if (item.legacyObjectPath) return await fetchSupabaseObject(item.legacyObjectPath);
  if (item.legacyUrl) return await fetchHttpAsset(item.legacyUrl);
  if (/^https?:\/\//i.test(item.ref)) return await fetchHttpAsset(item.ref);
  throw new Error("No readable source for asset");
}

async function preparePublicVisualForCloudinary(
  item: InventoryItem,
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string; optimized: boolean; originalSize: number }> {
  const cleanType = contentType.split(";")[0]?.trim().toLowerCase() || item.contentType || "application/octet-stream";
  if (!isImageContentType(cleanType) || buffer.byteLength <= CLOUDINARY_MAX_UPLOAD_BYTES) {
    return { buffer, contentType: cleanType, optimized: false, originalSize: buffer.byteLength };
  }

  if (cleanType === "image/svg+xml" || cleanType === "image/gif") {
    throw new Error(`Public image is larger than Cloudinary limit and cannot be safely optimized automatically (${formatNumber(buffer.byteLength)} bytes)`);
  }

  const metadata = await sharp(buffer, { failOn: "none" }).metadata();
  const targetWidth = metadata.width && metadata.width > 2600 ? 2600 : metadata.width;
  const hasAlpha = Boolean(metadata.hasAlpha);
  const outputType = hasAlpha ? "image/webp" : "image/jpeg";
  let best: Buffer | null = null;

  for (const quality of [88, 82, 76, 70, 64, 58]) {
    let pipeline = sharp(buffer, { failOn: "none" }).rotate();
    if (targetWidth && metadata.width && targetWidth < metadata.width) {
      pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true });
    }
    const candidate = hasAlpha
      ? await pipeline.webp({ quality, effort: 5 }).toBuffer()
      : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    best = candidate;
    if (candidate.byteLength <= CLOUDINARY_OPTIMIZED_TARGET_BYTES) {
      return { buffer: candidate, contentType: outputType, optimized: true, originalSize: buffer.byteLength };
    }
  }

  if (best && best.byteLength < buffer.byteLength && best.byteLength <= CLOUDINARY_MAX_UPLOAD_BYTES) {
    return { buffer: best, contentType: outputType, optimized: true, originalSize: buffer.byteLength };
  }

  throw new Error(
    `Image optimization could not get below Cloudinary limit. Original=${formatNumber(buffer.byteLength)} optimized=${formatNumber(best?.byteLength || 0)} bytes`,
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function signUploadParams(params: Record<string, string | number>, apiSecret: string): string {
  const base = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${base}${apiSecret}`).digest("hex");
}

function optimizedUrl(secureUrl: string, resourceType: string, visibility: Visibility): string {
  if (visibility === "private" || resourceType !== "image") return secureUrl;
  return secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
}

function signDeliveryUrl(value: string, apiSecret: string): string {
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

async function uploadToCloudinary(item: InventoryItem, buffer: Buffer, contentType: string): Promise<any> {
  if (buffer.byteLength > 9 * 1024 * 1024) {
    return await uploadToCloudinaryChunked(item, buffer, contentType);
  }
  const cfg = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryType = item.visibility === "private" ? "authenticated" : "upload";
  const folder = `${safeSegment(cfg.folderPrefix)}/${safeSegment(item.category)}`.replace(/\/+/g, "/");
  const publicId = sha(item.legacyUrl || item.legacyObjectPath || item.ref).slice(0, 40);
  const overwrite = "true";
  const signature = signUploadParams({ folder, timestamp, type: deliveryType, public_id: publicId, overwrite }, cfg.apiSecret);
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), item.originalFilename || `${publicId}`);
  form.append("api_key", cfg.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("type", deliveryType);
  form.append("public_id", publicId);
  form.append("overwrite", overwrite);
  form.append("signature", signature);

  const resourceType = cloudinaryResourceType(contentType);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/${encodeURIComponent(resourceType)}/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(10 * 60_000),
  });
  const text = await response.text();
  const payload = JSON.parse(text || "{}");
  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message || text || `Cloudinary upload failed ${response.status}`);
  }
  return { payload, deliveryType, resourceType };
}

async function uploadToCloudinaryChunked(item: InventoryItem, buffer: Buffer, contentType: string): Promise<any> {
  const cfg = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryType = item.visibility === "private" ? "authenticated" : "upload";
  const folder = `${safeSegment(cfg.folderPrefix)}/${safeSegment(item.category)}`.replace(/\/+/g, "/");
  const publicId = sha(item.legacyUrl || item.legacyObjectPath || item.ref).slice(0, 40);
  const overwrite = "true";
  const signature = signUploadParams({ folder, timestamp, type: deliveryType, public_id: publicId, overwrite }, cfg.apiSecret);
  const uploadId = `${Date.now()}-${publicId}`;
  const chunkSize = 6 * 1024 * 1024;
  let finalPayload: any = null;

  for (let start = 0; start < buffer.byteLength; start += chunkSize) {
    const end = Math.min(start + chunkSize, buffer.byteLength) - 1;
    const chunk = buffer.subarray(start, end + 1);
    const bytes = new Uint8Array(chunk.byteLength);
    bytes.set(chunk);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: contentType }), item.originalFilename || publicId);
    form.append("api_key", cfg.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("type", deliveryType);
    form.append("public_id", publicId);
    form.append("overwrite", overwrite);
    form.append("signature", signature);

    const resourceType = cloudinaryResourceType(contentType);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/${encodeURIComponent(resourceType)}/upload`, {
      method: "POST",
      headers: {
        "X-Unique-Upload-Id": uploadId,
        "Content-Range": `bytes ${start}-${end}/${buffer.byteLength}`,
      },
      body: form,
      signal: AbortSignal.timeout(10 * 60_000),
    });
    const text = await response.text();
    const payload = JSON.parse(text || "{}");
    if (!response.ok) {
      throw new Error(payload.error?.message || text || `Cloudinary chunk upload failed ${response.status}`);
    }
    finalPayload = payload;
  }

  if (!finalPayload?.secure_url || !finalPayload?.public_id) {
    throw new Error("Cloudinary chunk upload did not return a final asset response");
  }
  return { payload: finalPayload, deliveryType, resourceType: cloudinaryResourceType(contentType) };
}

async function existingMapping(item: InventoryItem): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM media_assets
     WHERE provider = 'cloudinary'
       AND status = 'active'
       AND migration_status IN ('migrated', 'verified')
       AND (
         ($1 <> '' AND legacy_url = $1)
         OR ($2 <> '' AND legacy_object_path = $2)
       )
     LIMIT 1`,
    [item.legacyUrl || "", item.legacyObjectPath || ""],
  );
  return (result.rowCount || 0) > 0;
}

async function insertMapping(item: InventoryItem, buffer: Buffer, contentType: string, cloudinary: any): Promise<void> {
  const cfg = cloudinaryConfig();
  const payload = cloudinary.payload;
  const resourceType = payload.resource_type || cloudinary.resourceType || cloudinaryResourceType(contentType);
  const secureUrl = payload.secure_url;
  const deliveryUrl = optimizedUrl(secureUrl, resourceType, item.visibility);
  await pool.query(
    `INSERT INTO media_assets (
      provider, visibility, category, bucket, object_key, object_path,
      public_url, delivery_url, secure_url, resource_type, content_type,
      size_bytes, checksum, original_filename, owner_type, owner_id,
      status, migration_status, legacy_url, legacy_object_path, provider_metadata,
      created_at, updated_at
    ) VALUES (
      'cloudinary', $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      'active', 'migrated', $16, $17, $18::jsonb,
      now(), now()
    )`,
    [
      item.visibility,
      item.category,
      cfg.cloudName,
      payload.public_id,
      `cloudinary://${resourceType}/${cloudinary.deliveryType}/${payload.public_id}`,
      item.visibility === "public" ? secureUrl : "",
      item.visibility === "public" ? deliveryUrl : "",
      secureUrl,
      resourceType,
      contentType,
      payload.bytes || buffer.byteLength,
      sha(buffer.toString("base64")),
      item.originalFilename,
      item.ownerType,
      item.ownerId,
      item.legacyUrl,
      item.legacyObjectPath,
      JSON.stringify({
        deliveryType: cloudinary.deliveryType,
        assetId: payload.asset_id,
        version: payload.version,
        format: payload.format,
        width: payload.width,
        height: payload.height,
        optimized: cloudinary.optimized || false,
        originalSizeBytes: cloudinary.originalSizeBytes || buffer.byteLength,
        source: item.source,
        tableName: item.tableName,
        rowId: item.rowId,
        columnName: item.columnName,
      }),
    ],
  );
}

async function verifyAssetByUrl(url: string): Promise<boolean> {
  const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) return false;
  const body = await response.arrayBuffer();
  return body.byteLength > 0;
}

async function verifyCloudinaryMappings(options: { publicOnly?: boolean } = {}): Promise<{ verified: number; failures: Array<{ id: string; ref: string; error: string }> }> {
  const cfg = cloudinaryConfig();
  const rows = await queryRows<any>(
    `SELECT id, visibility, delivery_url, secure_url, legacy_url, legacy_object_path, provider_metadata
     FROM media_assets
     WHERE provider = 'cloudinary'
       AND status = 'active'
       AND migration_status IN ('migrated', 'verified')
       ${options.publicOnly ? "AND visibility = 'public'" : ""}`,
  );
  let verified = 0;
  const failures: Array<{ id: string; ref: string; error: string }> = [];
  for (const row of rows) {
    try {
      const deliveryType = row.provider_metadata?.deliveryType || (row.visibility === "private" ? "authenticated" : "upload");
      const url = row.visibility === "private" || deliveryType === "authenticated"
        ? signDeliveryUrl(row.secure_url, cfg.apiSecret)
        : (row.delivery_url || row.secure_url);
      const ok = await verifyAssetByUrl(url);
      if (!ok) throw new Error("verification fetch returned empty or non-OK response");
      await pool.query(`UPDATE media_assets SET migration_status = 'verified', updated_at = now() WHERE id = $1`, [row.id]);
      verified += 1;
    } catch (error) {
      failures.push({
        id: row.id,
        ref: row.legacy_url || row.legacy_object_path || "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { verified, failures };
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseLimit(): number {
  const raw = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

type RewriteReport = {
  startedAt: string;
  finishedAt?: string;
  updatedRows: number;
  updatedRefs: number;
  missingMappings: Array<{ table: string; id: string; column: string; ref: string }>;
  unchangedRefs: number;
};

let activeRewriteClient: { query: typeof pool.query } | null = null;

async function rewriteQuery(sql: string, params?: unknown[]): Promise<void> {
  await (activeRewriteClient || pool).query(sql, params);
}

async function loadVerifiedPublicReplacementMap(): Promise<Map<string, string>> {
  const rows = await queryRows<any>(
    `SELECT legacy_url, legacy_object_path, delivery_url, public_url, secure_url
     FROM media_assets
     WHERE provider = 'cloudinary'
       AND visibility = 'public'
       AND status = 'active'
       AND migration_status = 'verified'`,
  );
  const map = new Map<string, string>();
  for (const row of rows) {
    const delivery = cleanRef(row.delivery_url || row.public_url || row.secure_url);
    if (!delivery) continue;
    for (const ref of [row.legacy_url, row.legacy_object_path]) {
      const clean = cleanRef(ref);
      if (!clean) continue;
      map.set(clean, delivery);
      const normalized = normalizeObjectPath(clean);
      if (normalized) {
        map.set(normalized, delivery);
        map.set(publicSupabaseUrlFromObjectPath(normalized), delivery);
      }
    }
  }
  return map;
}

function isCloudinaryRef(ref: string): boolean {
  return /res\.cloudinary\.com/i.test(ref) || ref.startsWith("cloudinary://");
}

function replacementForRef(
  ref: unknown,
  replacements: Map<string, string>,
  report: RewriteReport,
  context: { table: string; id: string; column: string },
): string {
  const clean = cleanRef(ref);
  if (!clean || !looksLikeMediaRef(clean) || isCloudinaryRef(clean)) {
    report.unchangedRefs += clean ? 1 : 0;
    return clean;
  }

  const normalized = normalizeObjectPath(clean);
  const replacement = replacements.get(clean)
    || (normalized ? replacements.get(normalized) : undefined)
    || (normalized ? replacements.get(publicSupabaseUrlFromObjectPath(normalized)) : undefined);
  if (replacement) return replacement;

  report.missingMappings.push({ ...context, ref: clean });
  return clean;
}

function rewriteStringArray(
  value: unknown,
  replacements: Map<string, string>,
  report: RewriteReport,
  context: { table: string; id: string; column: string },
): { value: string[]; changed: boolean; refsChanged: number } {
  const arr = Array.isArray(value) ? value : [];
  let changed = false;
  let refsChanged = 0;
  const next = arr.map((item) => {
    const before = cleanRef(item);
    const after = replacementForRef(before, replacements, report, context);
    if (after !== before) {
      changed = true;
      refsChanged += 1;
    }
    return after;
  });
  return { value: next, changed, refsChanged };
}

function rewriteSingle(
  value: unknown,
  replacements: Map<string, string>,
  report: RewriteReport,
  context: { table: string; id: string; column: string },
): { value: string; changed: boolean; refsChanged: number } {
  const before = cleanRef(value);
  const after = replacementForRef(before, replacements, report, context);
  return { value: after, changed: after !== before, refsChanged: after !== before ? 1 : 0 };
}

async function updateJsonbColumn(table: string, idColumn: string, id: string | number, column: string, value: unknown): Promise<void> {
  await rewriteQuery(
    `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column)} = $1::jsonb WHERE ${quoteIdent(idColumn)} = $2`,
    [JSON.stringify(value), id],
  );
}

async function updateTextArrayColumn(table: string, idColumn: string, id: string | number, column: string, value: string[]): Promise<void> {
  await rewriteQuery(
    `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column)} = $1::text[] WHERE ${quoteIdent(idColumn)} = $2`,
    [value, id],
  );
}

async function updateTextColumn(table: string, idColumn: string, id: string | number, column: string, value: string): Promise<void> {
  await rewriteQuery(
    `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column)} = $1 WHERE ${quoteIdent(idColumn)} = $2`,
    [value, id],
  );
}

async function rewritePublicRefs(): Promise<RewriteReport> {
  await ensureMediaSchema();
  const replacements = await loadVerifiedPublicReplacementMap();
  const report: RewriteReport = {
    startedAt: new Date().toISOString(),
    updatedRows: 0,
    updatedRefs: 0,
    missingMappings: [],
    unchangedRefs: 0,
  };

  const client = await pool.connect();
  activeRewriteClient = client as unknown as { query: typeof pool.query };
  await client.query("BEGIN");
  try {
    for (const row of await queryRows<any>(`SELECT id, images FROM packages`)) {
      const rewritten = rewriteStringArray(row.images, replacements, report, { table: "packages", id: String(row.id), column: "images" });
      if (rewritten.changed) {
        await updateJsonbColumn("packages", "id", row.id, "images", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, cover_image FROM gallery_albums`)) {
      const rewritten = rewriteSingle(row.cover_image, replacements, report, { table: "gallery_albums", id: String(row.id), column: "cover_image" });
      if (rewritten.changed) {
        await updateTextColumn("gallery_albums", "id", row.id, "cover_image", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, url FROM gallery_items`)) {
      const rewritten = rewriteSingle(row.url, replacements, report, { table: "gallery_items", id: String(row.id), column: "url" });
      if (rewritten.changed) {
        await updateTextColumn("gallery_items", "id", row.id, "url", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, url FROM hero_slides`)) {
      const rewritten = rewriteSingle(row.url, replacements, report, { table: "hero_slides", id: String(row.id), column: "url" });
      if (rewritten.changed) {
        await updateTextColumn("hero_slides", "id", row.id, "url", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, image_url, about_image_url, features_image_url, cta_image_url, features FROM services`)) {
      for (const column of ["image_url", "about_image_url", "features_image_url", "cta_image_url"]) {
        const rewritten = rewriteSingle(row[column], replacements, report, { table: "services", id: String(row.id), column });
        if (rewritten.changed) {
          await updateTextColumn("services", "id", row.id, column, rewritten.value);
          report.updatedRows += 1;
          report.updatedRefs += rewritten.refsChanged;
        }
      }
      const features = Array.isArray(row.features) ? row.features : [];
      let featuresChanged = false;
      let refsChanged = 0;
      const nextFeatures = features.map((feature: any, index: number) => {
        const before = cleanRef(feature?.image);
        const after = replacementForRef(before, replacements, report, { table: "services", id: String(row.id), column: `features[${index}].image` });
        if (after !== before) {
          featuresChanged = true;
          refsChanged += 1;
        }
        return { ...feature, image: after };
      });
      if (featuresChanged) {
        await updateJsonbColumn("services", "id", row.id, "features", nextFeatures);
        report.updatedRows += 1;
        report.updatedRefs += refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, hero_image_url, accent_image_url, gallery_images FROM why_us_cards`)) {
      for (const column of ["hero_image_url", "accent_image_url"]) {
        const rewritten = rewriteSingle(row[column], replacements, report, { table: "why_us_cards", id: String(row.id), column });
        if (rewritten.changed) {
          await updateTextColumn("why_us_cards", "id", row.id, column, rewritten.value);
          report.updatedRows += 1;
          report.updatedRefs += rewritten.refsChanged;
        }
      }
      const rewrittenGallery = rewriteStringArray(row.gallery_images, replacements, report, { table: "why_us_cards", id: String(row.id), column: "gallery_images" });
      if (rewrittenGallery.changed) {
        await updateJsonbColumn("why_us_cards", "id", row.id, "gallery_images", rewrittenGallery.value);
        report.updatedRows += 1;
        report.updatedRefs += rewrittenGallery.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT key, value FROM site_settings`)) {
      const rewritten = rewriteSingle(row.value, replacements, report, { table: "site_settings", id: String(row.key), column: "value" });
      if (rewritten.changed) {
        await updateTextColumn("site_settings", "key", row.key, "value", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, avatar_url, photos FROM reviews`)) {
      const avatar = rewriteSingle(row.avatar_url, replacements, report, { table: "reviews", id: String(row.id), column: "avatar_url" });
      if (avatar.changed) {
        await updateTextColumn("reviews", "id", row.id, "avatar_url", avatar.value);
        report.updatedRows += 1;
        report.updatedRefs += avatar.refsChanged;
      }
      const photos = rewriteStringArray(row.photos, replacements, report, { table: "reviews", id: String(row.id), column: "photos" });
      if (photos.changed) {
        await updateTextArrayColumn("reviews", "id", row.id, "photos", photos.value);
        report.updatedRows += 1;
        report.updatedRefs += photos.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, avatar, image_url FROM testimonials`)) {
      for (const column of ["avatar", "image_url"]) {
        const rewritten = rewriteSingle(row[column], replacements, report, { table: "testimonials", id: String(row.id), column });
        if (rewritten.changed) {
          await updateTextColumn("testimonials", "id", row.id, column, rewritten.value);
          report.updatedRows += 1;
          report.updatedRefs += rewritten.refsChanged;
        }
      }
    }

    for (const row of await queryRows<any>(`SELECT id, photo_urls FROM booking_reviews`)) {
      const rewritten = rewriteStringArray(row.photo_urls, replacements, report, { table: "booking_reviews", id: String(row.id), column: "photo_urls" });
      if (rewritten.changed) {
        await updateJsonbColumn("booking_reviews", "id", row.id, "photo_urls", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    for (const row of await queryRows<any>(`SELECT id, photo_url FROM customer_photos`)) {
      const rewritten = rewriteSingle(row.photo_url, replacements, report, { table: "customer_photos", id: String(row.id), column: "photo_url" });
      if (rewritten.changed) {
        await updateTextColumn("customer_photos", "id", row.id, "photo_url", rewritten.value);
        report.updatedRows += 1;
        report.updatedRefs += rewritten.refsChanged;
      }
    }

    if (report.missingMappings.length) {
      throw new Error(`Cannot rewrite public media refs: ${report.missingMappings.length} refs have no verified Cloudinary mapping`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    report.finishedAt = new Date().toISOString();
    await writeJson("media-rewrite-public-refs-report.json", report);
    throw error;
  } finally {
    activeRewriteClient = null;
    client.release();
  }

  report.finishedAt = new Date().toISOString();
  await writeJson("media-rewrite-public-refs-report.json", report);
  return report;
}

async function scanActivePublicRefs(): Promise<{ totalActivePublicRefs: number; supabaseRefs: Array<InventoryItem>; nonCloudinaryRefs: Array<InventoryItem> }> {
  const inventory = await collectInventory();
  const active = inventory.filter((item) => item.source === "db" && item.visibility === "public" && !isSensitivePublicItem(item));
  const supabaseRefs = active.filter((item) =>
    item.ref.includes("/storage/v1/object/public")
    || item.ref.startsWith("/objects/")
    || item.ref.startsWith("/uploads/")
    || item.ref.includes("/api/storage/objects"),
  );
  const nonCloudinaryRefs = active.filter((item) => !isCloudinaryRef(item.ref));
  const report = { totalActivePublicRefs: active.length, supabaseRefs, nonCloudinaryRefs };
  await writeJson("media-active-public-ref-scan.json", report);
  return report;
}

async function movePaymentProofsToPrivateStorage(): Promise<{ moved: number; skipped: number; failures: Array<{ id: string; objectPath: string; error: string }> }> {
  await ensureMediaSchema();
  const rows = await queryRows<any>(
    `SELECT id, payment_request_id, object_path, mime_type, original_filename, size_bytes
     FROM payment_request_attachments
     WHERE object_path LIKE '/objects/%'`,
  );
  const report = { moved: 0, skipped: 0, failures: [] as Array<{ id: string; objectPath: string; error: string }> };
  for (const row of rows) {
    const objectPath = cleanRef(row.object_path);
    if (!objectPath.includes("payment-proofs")) {
      report.skipped += 1;
      continue;
    }
    try {
      const read = await fetchSupabaseObject(objectPath);
      const filename = filenameFromRef(row.original_filename || objectPath) || `${row.id}`;
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160) || `${row.id}`;
      const newPath = `/private-objects/payment-proofs/${row.payment_request_id}/${row.id}-${safeName}`;
      await uploadPrivateSupabaseObject({
        objectPath: newPath,
        buffer: read.buffer,
        contentType: row.mime_type || read.contentType || "application/octet-stream",
      });
      await pool.query(`UPDATE payment_request_attachments SET object_path = $1 WHERE id = $2`, [newPath, row.id]);
      report.moved += 1;
    } catch (error) {
      report.failures.push({
        id: String(row.id),
        objectPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await writeJson("media-payment-proofs-private-report.json", report);
  return report;
}

async function buildDeletionDryRunManifest(): Promise<{ generatedAt: string; deleteCandidates: InventoryItem[]; keep: InventoryItem[]; blockers: string[] }> {
  const inventory = await collectInventory();
  const scan = await scanActivePublicRefs();
  const deleteCandidates = inventory.filter((item) =>
    item.source === "supabase-storage"
    && item.visibility === "public"
    && isPublicVisualCandidate(item),
  );
  const keep = inventory.filter((item) =>
    item.source === "supabase-storage"
    && item.visibility === "public"
    && !isPublicVisualCandidate(item),
  );
  const blockers: string[] = [];
  if (scan.supabaseRefs.length) blockers.push(`${scan.supabaseRefs.length} active public DB refs still point to Supabase/local storage`);
  const unverified = await queryRows<any>(
    `SELECT legacy_url, legacy_object_path
     FROM media_assets
     WHERE provider = 'cloudinary'
       AND visibility = 'public'
       AND status = 'active'
       AND migration_status <> 'verified'`,
  );
  if (unverified.length) blockers.push(`${unverified.length} public Cloudinary mappings are not verified`);
  const manifest = { generatedAt: new Date().toISOString(), deleteCandidates, keep, blockers };
  await writeJson("media-deletion-dry-run-manifest.json", manifest);
  return manifest;
}

async function runInventory(): Promise<InventoryItem[]> {
  await ensureMediaSchema();
  const inventory = await collectInventory();
  await writeJson("media-inventory.json", inventory);
  console.log(`[media-migration] inventory complete: ${inventory.length} assets found`);
  return inventory;
}

async function runMigrate(): Promise<void> {
  await ensureMediaSchema();
  const report: MigrationReport = {
    startedAt: new Date().toISOString(),
    totalAssetsFound: 0,
    totalAssetsMigrated: 0,
    totalAssetsVerified: 0,
    totalAssetsOptimized: 0,
    skipped: [],
    failures: [],
  };
  let inventory = await collectInventory();
  const limit = parseLimit();
  if (limit) inventory = inventory.slice(0, limit);
  report.totalAssetsFound = inventory.length;
  await writeJson("media-inventory.json", inventory);

  for (const item of inventory) {
    try {
      if (!isPublicVisualCandidate(item)) {
        report.skipped.push({
          id: item.id,
          ref: item.ref,
          reason: item.visibility !== "public"
            ? "private_or_sensitive_not_cloudinary_public"
            : isSensitivePublicItem(item)
              ? "sensitive_public_object_requires_private_storage"
              : "not_public_image_or_video",
        });
        continue;
      }
      if (await existingMapping(item)) {
        report.skipped.push({ id: item.id, ref: item.ref, reason: "already_mapped" });
        continue;
      }
      const read = await readAsset(item);
      const sourceContentType = read.contentType.split(";")[0]?.trim() || item.contentType || "application/octet-stream";
      if (!read.buffer.byteLength) throw new Error("source asset was empty");
      const prepared = await preparePublicVisualForCloudinary(item, read.buffer, sourceContentType);
      if (prepared.optimized) report.totalAssetsOptimized += 1;
      const uploaded = await uploadToCloudinary(item, prepared.buffer, prepared.contentType);
      await insertMapping(item, prepared.buffer, prepared.contentType, {
        ...uploaded,
        optimized: prepared.optimized,
        originalSizeBytes: prepared.originalSize,
      });
      report.totalAssetsMigrated += 1;
      console.log(`[media-migration] migrated ${report.totalAssetsMigrated}/${inventory.length}: ${item.category} ${item.ref}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.failures.push({ id: item.id, ref: item.ref, error: message });
      console.error(`[media-migration] failed: ${item.ref}: ${message}`);
    }
  }

  const verification = await verifyCloudinaryMappings({ publicOnly: true });
  report.totalAssetsVerified = verification.verified;
  report.failures.push(...verification.failures);
  report.finishedAt = new Date().toISOString();
  await writeJson("media-migration-report.json", report);
  console.log(`[media-migration] migrated=${report.totalAssetsMigrated} verified=${report.totalAssetsVerified} failures=${report.failures.length} skipped=${report.skipped.length}`);
}

async function runVerify(): Promise<void> {
  await ensureMediaSchema();
  const result = await verifyCloudinaryMappings({ publicOnly: true });
  await writeJson("media-verify-report.json", result);
  console.log(`[media-migration] verified=${result.verified} failures=${result.failures.length}`);
}

async function runRewritePublicRefs(): Promise<void> {
  const report = await rewritePublicRefs();
  console.log(`[media-migration] public refs rewritten: rows=${report.updatedRows} refs=${report.updatedRefs} missing=${report.missingMappings.length}`);
}

async function runScanPublicRefs(): Promise<void> {
  const report = await scanActivePublicRefs();
  console.log(`[media-migration] active public refs=${report.totalActivePublicRefs} supabaseRefs=${report.supabaseRefs.length} nonCloudinaryRefs=${report.nonCloudinaryRefs.length}`);
}

async function runMovePaymentProofsPrivate(): Promise<void> {
  const report = await movePaymentProofsToPrivateStorage();
  console.log(`[media-migration] payment proofs moved=${report.moved} skipped=${report.skipped} failures=${report.failures.length}`);
}

async function runDeletionDryRun(): Promise<void> {
  const report = await buildDeletionDryRunManifest();
  console.log(`[media-migration] deletion dry-run candidates=${report.deleteCandidates.length} keep=${report.keep.length} blockers=${report.blockers.length}`);
}

async function main(): Promise<void> {
  const command = process.argv[2] || "inventory";
  if (command === "inventory") await runInventory();
  else if (command === "migrate") await runMigrate();
  else if (command === "verify") await runVerify();
  else if (command === "rewrite-public-refs") await runRewritePublicRefs();
  else if (command === "scan-public-refs") await runScanPublicRefs();
  else if (command === "move-payment-proofs-private") await runMovePaymentProofsPrivate();
  else if (command === "deletion-dry-run") await runDeletionDryRun();
  else throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((error) => {
    console.error("[media-migration] fatal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
