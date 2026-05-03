import { Router } from "express";
import { db, packages, services } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const STATIC_PATHS = ["/", "/trips", "/gallery", "/rewards", "/share"];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
    const origin = `${proto}://${host}`.replace(/\/$/, "");
    const today = new Date().toISOString().slice(0, 10);

    const [pkgRows, svcRows] = await Promise.all([
      db.select({ id: packages.id, updatedAt: packages.updatedAt }).from(packages).where(eq(packages.active, true)),
      db.select({ slug: services.slug, updatedAt: services.updatedAt }).from(services).where(eq(services.isActive, true)),
    ]);

    const urls: { loc: string; lastmod: string; priority: number }[] = [];
    for (const p of STATIC_PATHS) {
      urls.push({ loc: `${origin}${p}`, lastmod: today, priority: p === "/" ? 1.0 : 0.7 });
    }
    for (const r of pkgRows) {
      urls.push({
        loc: `${origin}/package/${r.id}`,
        lastmod: (r.updatedAt instanceof Date ? r.updatedAt : new Date()).toISOString().slice(0, 10),
        priority: 0.8,
      });
    }
    for (const r of svcRows) {
      urls.push({
        loc: `${origin}/services/${encodeURIComponent(r.slug)}`,
        lastmod: (r.updatedAt instanceof Date ? r.updatedAt : new Date()).toISOString().slice(0, 10),
        priority: 0.6,
      });
    }

    const body = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
      ...urls.map(({ loc, lastmod, priority }) => {
        const arHref = `${loc}${loc.includes("?") ? "&" : "?"}lang=ar`;
        const enHref = `${loc}${loc.includes("?") ? "&" : "?"}lang=en`;
        return [
          `<url>`,
          `<loc>${escapeXml(loc)}</loc>`,
          `<lastmod>${lastmod}</lastmod>`,
          `<changefreq>weekly</changefreq>`,
          `<priority>${priority.toFixed(1)}</priority>`,
          `<xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arHref)}"/>`,
          `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enHref)}"/>`,
          `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc)}"/>`,
          `</url>`,
        ].join("");
      }),
      `</urlset>`,
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900");
    return res.send(body);
  } catch (err) {
    console.error("[sitemap] error:", err);
    return res.status(500).send("error");
  }
});

router.get("/robots.txt", (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const origin = `${proto}://${host}`.replace(/\/$/, "");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.send(
    [
      "User-agent: *",
      "Disallow: /admin",
      "Disallow: /ticket/",
      "Disallow: /verify/",
      "Disallow: /api/",
      "",
      `Sitemap: ${origin}/sitemap.xml`,
      "",
    ].join("\n"),
  );
});

export default router;
