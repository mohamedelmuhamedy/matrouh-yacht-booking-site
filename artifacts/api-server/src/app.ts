import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";

const app: Express = express();

// Behind Replit's proxy / production CDN; trust one hop so req.ip is the real
// client IP (used by rate limiters) and Secure cookies work properly.
app.set("trust proxy", 1);

// ── Security headers ────────────────────────────────────────────────────────
// Conservative defaults; CSP is disabled because the API also proxies the
// frontend dev server in development. The frontend ships its own CSP via
// index.html / hosting provider in production.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ── CORS allowlist ──────────────────────────────────────────────────────────
// Comma-separated origin list via ALLOWED_ORIGINS. Empty / unset => allow all
// (dev convenience). Same-origin and tooling requests have no Origin header
// and are always allowed.
const rawAllowed = (process.env["ALLOWED_ORIGINS"] ?? "").trim();
const allowedOrigins = rawAllowed
  ? rawAllowed.split(",").map((s) => s.trim()).filter(Boolean)
  : null;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!allowedOrigins) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);

// ── Body parsers (with explicit cap; default is 100kb but we want to be
// loud about the limit so large payloads fail fast and clearly).
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Body-parser errors → JSON 400 (otherwise Express returns HTML stack traces).
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === "object" && "type" in err) {
    const e = err as { type?: string; message?: string; status?: number };
    if (
      e.type === "entity.too.large" ||
      e.type === "entity.parse.failed" ||
      e.type === "request.aborted"
    ) {
      return res.status(e.status ?? 400).json({ error: e.message ?? "Bad request" });
    }
  }
  return next(err);
});

// ── Rate limiters ───────────────────────────────────────────────────────────
// Generous global limiter to absorb traffic spikes without locking real users
// out, plus tighter limiters mounted on abuse-prone endpoints.
const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many AI requests. Try again shortly." },
});

const scanLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api", globalLimiter);
app.use("/api/admin/login", loginLimiter);
app.use("/api/bookings", writeLimiter);
app.use("/api/push/subscribe", writeLimiter);
app.use("/api/push/link-booking", writeLimiter);
app.use("/api/ai/chat", aiLimiter);
app.use("/api/share/scan", scanLimiter);

app.use("/api", router);

const FRONTEND_TARGET = process.env["FRONTEND_PROXY_TARGET"] ?? "http://localhost:5000";
const ENABLE_FRONTEND_PROXY =
  process.env["ENABLE_FRONTEND_PROXY"] === "true" ||
  (process.env["ENABLE_FRONTEND_PROXY"] !== "false" && process.env["NODE_ENV"] !== "production");

if (ENABLE_FRONTEND_PROXY) {
  app.use(
    createProxyMiddleware({
      target: FRONTEND_TARGET,
      changeOrigin: true,
      ws: true,
      logger: console,
      pathFilter: (path) => !/^\/api(?:\/|$)/.test(path),
    }),
  );
}

export default app;
