#!/usr/bin/env tsx
/**
 * One-time / idempotent: assign tasteful default images to every service
 * for the four "section cover" fields on the public detail page:
 *   imageUrl (header), aboutImageUrl, featuresImageUrl, ctaImageUrl.
 *
 * Only fills fields that are currently NULL or empty — admin uploads are preserved.
 * Safe to run repeatedly.
 */
import { db, services } from "@workspace/db";
import { eq } from "drizzle-orm";

const W = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&auto=format&fit=crop&q=80`;

type Quad = {
  imageUrl: string;
  aboutImageUrl: string;
  featuresImageUrl: string;
  ctaImageUrl: string;
};

const DEFAULTS_BY_SLUG: Record<string, Quad> = {
  "desert-safari": {
    imageUrl:         W("1509316975850-ff9c5deb0cd9"),
    aboutImageUrl:    W("1547234935-80c7145ec969", 1200),
    featuresImageUrl: W("1518684079-3c830dcef090", 1200),
    ctaImageUrl:      W("1473580044384-7ba9967e16a0", 1200),
  },
  "yacht-trips": {
    imageUrl:         W("1567899378494-47b22a2ae96a"),
    aboutImageUrl:    W("1540541338287-41700207dee6", 1200),
    featuresImageUrl: W("1502933691298-84fc14542831", 1200),
    ctaImageUrl:      W("1562281302-809108fd533c", 1200),
  },
  "water-sports": {
    imageUrl:         W("1530549387789-4c1017266635"),
    aboutImageUrl:    W("1437846972679-9e6e537be46e", 1200),
    featuresImageUrl: W("1502680390469-be75c86b636f", 1200),
    ctaImageUrl:      W("1530541930197-ff16ac917b0e", 1200),
  },
  "parasailing": {
    imageUrl:         W("1601058268499-e52658b8bb88"),
    aboutImageUrl:    W("1579952363873-27f3bade9f55", 1200),
    featuresImageUrl: W("1540202404-a2f29016b523", 1200),
    ctaImageUrl:      W("1505761671935-60b3a7427bad", 1200),
  },
  "aqua-park": {
    imageUrl:         W("1543353071-873f17a7a088"),
    aboutImageUrl:    W("1601758228041-f3b2795255f1", 1200),
    featuresImageUrl: W("1437846972679-9e6e537be46e", 1200),
    ctaImageUrl:      W("1530549387789-4c1017266635", 1200),
  },
  "apartments": {
    imageUrl:         W("1502672260266-1c1ef2d93688"),
    aboutImageUrl:    W("1522708323590-d24dbb6b0267", 1200),
    featuresImageUrl: W("1505693416388-ac5ce068fe85", 1200),
    ctaImageUrl:      W("1560448204-e02f11c3d0e2", 1200),
  },
  "safety-equipment": {
    imageUrl:         W("1571902943202-507ec2618e8f"),
    aboutImageUrl:    W("1565301660306-29e08751cc53", 1200),
    featuresImageUrl: W("1583744946564-b52ac1c389c8", 1200),
    ctaImageUrl:      W("1571902943202-507ec2618e8f", 1200),
  },
  "private-events": {
    imageUrl:         W("1530103862676-de8c9debad1d"),
    aboutImageUrl:    W("1519671482749-fd09be7ccebf", 1200),
    featuresImageUrl: W("1492684223066-81342ee5ff30", 1200),
    ctaImageUrl:      W("1464366400600-7168b8af9bc3", 1200),
  },
};

async function main() {
  console.log("🖼️   Seeding default service section images...");
  const all = await db.select().from(services);
  let touched = 0;
  for (const svc of all) {
    const defaults = DEFAULTS_BY_SLUG[svc.slug];
    if (!defaults) continue;
    const patch: Partial<Quad> = {};
    if (!svc.imageUrl)         patch.imageUrl         = defaults.imageUrl;
    if (!svc.aboutImageUrl)    patch.aboutImageUrl    = defaults.aboutImageUrl;
    if (!svc.featuresImageUrl) patch.featuresImageUrl = defaults.featuresImageUrl;
    if (!svc.ctaImageUrl)      patch.ctaImageUrl      = defaults.ctaImageUrl;
    if (Object.keys(patch).length === 0) continue;
    await db.update(services).set({ ...patch, updatedAt: new Date() }).where(eq(services.id, svc.id));
    touched++;
    console.log(`  • ${svc.slug}: filled ${Object.keys(patch).join(", ")}`);
  }
  console.log(`✅  Done. Updated ${touched} services.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
