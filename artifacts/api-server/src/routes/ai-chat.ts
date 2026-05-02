import { Router, type Request } from "express";
import {
  db,
  packages,
  services,
  whyUsCards,
  testimonials,
  siteSettings,
  galleryItems,
  categories,
  type Package,
  type Service,
  type Testimonial,
  type WhyUsCard,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const CONTEXT_TTL_MS = 30_000;
const MAX_USER_CHARS = 1500;
const MAX_HISTORY = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

interface ContextSnapshot {
  builtAt: number;
  text: string;
  settings: Record<string, string>;
  model: string;
  validSlugs: Set<string>;
  pkgIndex: { slug: string; titleEn: string; titleAr: string }[];
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
}

let cachedContext: ContextSnapshot | null = null;

const ipHits = new Map<string, number[]>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, arr);
    return false;
  }
  arr.push(now);
  ipHits.set(ip, arr);
  return true;
}

function trim(s: string | null | undefined, max = 220): string {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v.length > max ? v.slice(0, max) + "…" : v;
}

async function buildContext(): Promise<ContextSnapshot> {
  const now = Date.now();
  if (cachedContext && now - cachedContext.builtAt < CONTEXT_TTL_MS) return cachedContext;

  const pkgRows: Package[] = await db
    .select()
    .from(packages)
    .where(and(eq(packages.status, "published"), eq(packages.active, true)))
    .orderBy(asc(packages.sortOrder));
  const svcRows: Service[] = await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.sortOrder));
  const whyRows: WhyUsCard[] = await db
    .select()
    .from(whyUsCards)
    .where(eq(whyUsCards.isActive, true))
    .orderBy(asc(whyUsCards.sortOrder));
  const tstRows: Testimonial[] = await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isVisible, true))
    .orderBy(asc(testimonials.sortOrder));
  const setRows = await db.select().from(siteSettings);
  const catRows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const galCount = await db.select().from(galleryItems).then((r) => r.length).catch(() => 0);

  const settings: Record<string, string> = {};
  for (const r of setRows) settings[r.key] = r.value;

  const lines: string[] = [];

  lines.push("## ABOUT DR TRAVEL");
  lines.push(
    `Site: ${settings.site_title || "DR Travel"} — Marsa Matruh tourism (safari, yacht, family, all-inclusive).`,
  );
  lines.push(
    `Contact: WhatsApp ${settings.whatsapp_number || "01205756024"} · Phone ${settings.phone_number || "01205756024"}`,
  );
  if (settings.facebook_url) lines.push(`Facebook: ${settings.facebook_url}`);
  if (settings.instagram_url) lines.push(`Instagram: ${settings.instagram_url}`);
  if (settings.tiktok_url) lines.push(`TikTok: ${settings.tiktok_url}`);
  lines.push(
    `Currency: default=${settings.default_currency || "EGP"} | 1 USD ≈ ${settings.usd_rate || "50"} EGP | 1 SAR ≈ ${settings.sar_rate || "13.3"} EGP`,
  );
  lines.push("");

  if (catRows.length) {
    lines.push(
      `## CATEGORIES: ${catRows.map((c) => `${c.slug} (${c.nameEn} | ${c.nameAr})`).join(", ")}`,
    );
    lines.push("");
  }

  lines.push(`## PACKAGES (${pkgRows.length}) — exact slugs you may reference:`);
  for (const p of pkgRows) {
    const price =
      p.maxPriceEGP && p.maxPriceEGP > p.priceEGP ? `${p.priceEGP}–${p.maxPriceEGP} EGP` : `${p.priceEGP} EGP`;
    const tags: string[] = [];
    if (p.featured) tags.push("featured");
    if (p.popular) tags.push("popular");
    if (p.familyFriendly) tags.push("family-friendly");
    if (p.foreignerFriendly) tags.push("foreigner-friendly");
    if (p.childrenFriendly) tags.push("children-friendly");
    lines.push(
      `- slug=${p.slug} | EN: ${p.titleEn} | AR: ${p.titleAr} | ${price}/person | ${p.durationEn} | category=${p.category} | ${p.rating}★ (${p.reviewCount} reviews)${tags.length ? " | " + tags.join(", ") : ""}`,
    );
    if (p.descriptionEn) lines.push(`  desc EN: ${trim(p.descriptionEn, 200)}`);
    if (p.descriptionAr) lines.push(`  desc AR: ${trim(p.descriptionAr, 200)}`);
    if (p.longDescriptionEn) lines.push(`  long EN: ${trim(p.longDescriptionEn, 320)}`);
    if (p.longDescriptionAr) lines.push(`  long AR: ${trim(p.longDescriptionAr, 320)}`);
    if (p.includesEn?.length) lines.push(`  includes EN: ${p.includesEn.slice(0, 8).join(" · ")}`);
    if (p.includesAr?.length) lines.push(`  includes AR: ${p.includesAr.slice(0, 8).join(" · ")}`);
    if (p.excludesEn?.length) lines.push(`  excludes EN: ${p.excludesEn.slice(0, 6).join(" · ")}`);
    if (p.itineraryEn?.length) {
      const it = p.itineraryEn.slice(0, 5).map((s) => `${s.title}: ${trim(s.desc, 80)}`).join(" | ");
      lines.push(`  itinerary EN: ${it}`);
    }
    lines.push(
      `  group=${p.minGroupSize}-${p.maxGroupSize} | meals=${p.includesMeals} | transport=${p.includesTransport} | stay=${p.includesAccommodation}`,
    );
    if (p.cancellationEn) lines.push(`  cancellation: ${trim(p.cancellationEn, 200)}`);
  }
  lines.push("");

  if (svcRows.length) {
    lines.push(`## SERVICES (${svcRows.length})`);
    for (const s of svcRows) {
      lines.push(`- slug=${s.slug} | EN: ${s.titleEn} | AR: ${s.titleAr} — ${trim(s.descriptionEn, 160)}`);
      if (s.longDescriptionEn) lines.push(`  detail EN: ${trim(s.longDescriptionEn, 220)}`);
      if (s.featuresEn?.length) lines.push(`  features: ${s.featuresEn.slice(0, 6).join(" · ")}`);
    }
    lines.push("");
  }

  if (whyRows.length) {
    lines.push(`## WHY CHOOSE US (${whyRows.length})`);
    for (const w of whyRows) {
      lines.push(`- slug=${w.slug} | EN: ${w.titleEn} | AR: ${w.titleAr}`);
      if (w.shortDescEn) lines.push(`  short EN: ${trim(w.shortDescEn, 160)}`);
      if (w.introEn) lines.push(`  intro EN: ${trim(w.introEn, 200)}`);
      if (w.bodyEn) lines.push(`  body EN: ${trim(w.bodyEn, 260)}`);
      if (w.bullets?.length) {
        const bts = w.bullets.slice(0, 4).map((b) => `${b.titleEn}: ${trim(b.descEn, 70)}`).join(" | ");
        lines.push(`  bullets: ${bts}`);
      }
      if (w.stats?.length) {
        const st = w.stats.slice(0, 4).map((s) => `${s.value} ${s.labelEn}`).join(" · ");
        lines.push(`  stats: ${st}`);
      }
    }
    lines.push("");
  }

  if (tstRows.length) {
    lines.push(`## TESTIMONIALS (${tstRows.length})`);
    for (const t of tstRows.slice(0, 8)) {
      const pkg = t.packageName ? ` · re ${t.packageName}` : "";
      lines.push(`- ${t.nameEn} ${t.rating}★${pkg}: "${trim(t.textEn, 180)}"`);
    }
    lines.push("");
  }

  if (galCount > 0) {
    lines.push(`## GALLERY: ${galCount} curated photos available on /gallery page.`);
    lines.push("");
  }

  if (settings.rewards_enabled === "true" || settings.show_rewards === "true") {
    lines.push(
      "## REWARDS: Loyalty program is active — visitors visit /rewards page to earn points and redeem perks on bookings.",
    );
    lines.push("");
  }

  cachedContext = {
    builtAt: now,
    text: lines.join("\n"),
    settings,
    model: settings.ai_model || DEFAULT_MODEL,
    validSlugs: new Set(pkgRows.map((p) => p.slug)),
    pkgIndex: pkgRows.map((p) => ({ slug: p.slug, titleEn: p.titleEn, titleAr: p.titleAr })),
  };
  return cachedContext;
}

function extractSlugs(reply: string, ctx: ContextSnapshot): { cleaned: string; slugs: string[] } {
  const slugs: string[] = [];
  let cleaned = reply;
  const tag = /\[\[\s*slugs?\s*:\s*([^\]]*)\]\]/i.exec(reply);
  if (tag) {
    cleaned = reply.replace(tag[0], "").trim();
    for (const raw of tag[1].split(/[,\s]+/)) {
      const s = raw.trim().toLowerCase();
      if (ctx.validSlugs.has(s) && !slugs.includes(s)) slugs.push(s);
    }
  }
  if (slugs.length === 0) {
    const haystack = (cleaned + " " + reply).toLowerCase();
    for (const p of ctx.pkgIndex) {
      const tEn = p.titleEn.toLowerCase();
      if ((tEn && haystack.includes(tEn)) || (p.titleAr && reply.includes(p.titleAr))) {
        if (!slugs.includes(p.slug)) slugs.push(p.slug);
      }
    }
  }
  return { cleaned, slugs: slugs.slice(0, 3) };
}

function readClientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

router.post("/ai/refresh-context", (_req, res) => {
  cachedContext = null;
  return res.json({ ok: true });
});

router.post("/ai/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI not configured" });

    if (!checkRate(readClientIp(req)))
      return res.status(429).json({ error: "Too many requests, try again in a minute." });

    const body = (req.body ?? {}) as { message?: unknown; lang?: unknown; history?: unknown };
    const userMessage = String(body.message ?? "").trim().slice(0, MAX_USER_CHARS);
    if (!userMessage) return res.status(400).json({ error: "Message required" });

    const lang: "ar" | "en" = body.lang === "en" ? "en" : "ar";
    const historyRaw: unknown[] = Array.isArray(body.history) ? body.history : [];
    const history: ChatTurn[] = [];
    for (const raw of historyRaw.slice(-MAX_HISTORY)) {
      if (!raw || typeof raw !== "object") continue;
      const m = raw as { role?: unknown; content?: unknown };
      if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        history.push({ role: m.role, content: m.content.slice(0, 1200) });
      }
    }

    const ctx = await buildContext();

    const slugRule =
      lang === "ar"
        ? `إذا اقترحت باقة معينة، أنهِ ردك بسطر منفصل بالشكل التالي بالضبط: [[slugs:slug1,slug2]] حيث slug1 من قائمة الـ slugs أعلاه. لا تذكر هذا السطر في النص العادي.`
        : `If you suggest specific packages, end your reply with one separate line in this exact format: [[slugs:slug1,slug2]] where slug1 is from the slugs list above. Do not mention this tag in the prose.`;

    const systemPrompt =
      lang === "ar"
        ? `أنت "مساعد DR Travel" — مساعد سفر ودود ومحترف لشركة DR Travel في مرسى مطروح. أجب دائماً بالعربية الفصحى السهلة (اللهجة المصرية الودودة مرحب بها) وبشكل موجز ومفيد.

قواعد صارمة:
- استخدم فقط البيانات الموجودة أدناه. لا تخترع باقات أو أسعار أو ميزات.
- إذا سأل المستخدم عن شيء غير موجود، قل ذلك بصراحة واقترح التواصل عبر واتساب: ${ctx.settings.whatsapp_number || "01205756024"}.
- اقترح باقات محددة بأسمائها عند المناسبة، واذكر السعر بالجنيه المصري.
- أجب في 2–4 جمل قصيرة في معظم الأحيان. استخدم القوائم النقطية فقط عند مقارنة 2+ باقات.
- إذا انحرف المستخدم عن السياحة، أعده برفق إلى موضوع رحلات مطروح.
- ${slugRule}

=== بيانات الموقع المباشرة ===
${ctx.text}
=== انتهت البيانات ===`
        : `You are "DR Travel Assistant" — a friendly, professional travel assistant for DR Travel in Marsa Matruh, Egypt. Respond concisely and helpfully in clear English.

Strict rules:
- Use ONLY the data below. Never invent packages, prices, or features.
- If the user asks about something not listed, say so honestly and suggest contacting WhatsApp: ${ctx.settings.whatsapp_number || "01205756024"}.
- Recommend specific packages by name when appropriate, mention price in EGP.
- Keep replies to 2–4 short sentences usually. Use bullet points only when comparing 2+ packages.
- If the user goes off-topic, gently steer back to Marsa Matruh trips.
- ${slugRule}

=== LIVE SITE DATA ===
${ctx.text}
=== END DATA ===`;

    const upstreamMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];

    const referer = String(req.headers.origin ?? req.headers.referer ?? "https://drtravel.local");
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "DR Travel Assistant",
      },
      body: JSON.stringify({
        model: ctx.model,
        messages: upstreamMessages,
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("OpenRouter error:", upstream.status, errText.slice(0, 300));
      return res.status(502).json({ error: "AI upstream error", status: upstream.status });
    }

    const data = (await upstream.json()) as OpenRouterResponse;
    const rawReply = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (!rawReply) return res.status(502).json({ error: "Empty AI response" });

    const { cleaned, slugs } = extractSlugs(rawReply, ctx);

    return res.json({
      reply: cleaned || rawReply,
      suggestedPackageSlugs: slugs,
      model: ctx.model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /ai/chat error:", msg);
    return res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
