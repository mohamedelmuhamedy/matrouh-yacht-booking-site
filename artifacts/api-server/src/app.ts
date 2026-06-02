import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import sitemapRouter from "./routes/sitemap";

const app: Express = express();
const isProduction = process.env["NODE_ENV"] === "production";

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "media-src": ["'self'", "data:", "blob:", "https:"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'", "https:"],
            "font-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'", "https:", "wss:"],
            "frame-ancestors": ["'self'"],
            "object-src": ["'none'"],
            "base-uri": ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const rawAllowed = (process.env["ALLOWED_ORIGINS"] ?? "").trim();
const allowedOrigins = rawAllowed
  ? rawAllowed.split(",").map((s) => s.trim()).filter(Boolean)
  : null;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins) {
        return cb(null, allowedOrigins.includes(origin));
      }
      // In production, refuse cross-origin requests when no allowlist set.
      if (isProduction) return cb(null, false);
      return cb(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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
app.use("/api/payments/portal", writeLimiter);
app.use("/api/push/subscribe", writeLimiter);
app.use("/api/push/link-booking", writeLimiter);
app.use("/api/ai/chat", aiLimiter);
app.use("/api/share/scan", scanLimiter);

app.use(sitemapRouter);
app.use("/api", router);

const FRONTEND_TARGET = process.env["FRONTEND_PROXY_TARGET"] ?? "http://localhost:5000";
const ENABLE_FRONTEND_PROXY =
  process.env["ENABLE_FRONTEND_PROXY"] === "true" ||
  (process.env["ENABLE_FRONTEND_PROXY"] !== "false" && !isProduction);

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
