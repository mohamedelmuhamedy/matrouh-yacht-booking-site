const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

const apiBaseUrl = trimTrailingSlashes(
  typeof import.meta.env.VITE_API_URL === "string"
    ? import.meta.env.VITE_API_URL.trim()
    : "",
);

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function apiUrl(path: string): string {
  if (!path) return apiBaseUrl || "/";
  if (ABSOLUTE_URL_PATTERN.test(path) || path.startsWith("//")) return path;

  const normalizedPath = normalizePath(path);
  if (!apiBaseUrl) return normalizedPath;

  if (apiBaseUrl.endsWith("/api") && normalizedPath === "/api") {
    return apiBaseUrl;
  }

  if (apiBaseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${apiBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${apiBaseUrl}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}

export function resolveApiAssetUrl(path?: string | null): string {
  if (!path) return "";
  if (ABSOLUTE_URL_PATTERN.test(path) || path.startsWith("//")) return path;
  if (path.startsWith("/api/")) return apiUrl(path);

  const normalizedPath = normalizePath(path);
  if (normalizedPath.startsWith("/objects/") || normalizedPath.startsWith("/uploads/")) {
    return apiUrl(`/api/storage/objects?objectPath=${encodeURIComponent(normalizedPath)}`);
  }

  return normalizedPath;
}

export function storageObjectApiPath(objectPath?: string | null): string {
  if (!objectPath) return "";
  if (ABSOLUTE_URL_PATTERN.test(objectPath) || objectPath.startsWith("//")) return objectPath;
  if (objectPath.startsWith("/api/")) return objectPath;

  const normalizedPath = normalizePath(objectPath);
  return `/api/storage/objects?objectPath=${encodeURIComponent(normalizedPath)}`;
}

export function storageObjectUrl(objectPath?: string | null): string {
  const path = storageObjectApiPath(objectPath);
  if (!path || ABSOLUTE_URL_PATTERN.test(path) || path.startsWith("//")) return path;
  return path.startsWith("/api/") ? apiUrl(path) : path;
}
