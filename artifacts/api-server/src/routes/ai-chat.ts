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
  heroSlides,
  referralCodes,
  referralRewards,
  aiVisitorQuota,
  type Package,
  type Service,
  type Testimonial,
  type WhyUsCard,
} from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import crypto from "crypto";

const AI_VISITOR_DAILY_LIMIT = 100;

function dayKeyUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function visitorKeyFor(req: Request, visitorToken: string): string {
  const base = visitorToken
    ? `vt:${visitorToken}`
    : `ip:${(req.ip ?? "").slice(0, 64)}`;
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 32);
}

async function consumeVisitorQuota(key: string, day: string): Promise<{ ok: boolean; count: number }> {
  const [row] = await db
    .insert(aiVisitorQuota)
    .values({ visitorKey: key, day, count: 1, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [aiVisitorQuota.visitorKey, aiVisitorQuota.day],
      set: { count: sql`${aiVisitorQuota.count} + 1`, updatedAt: new Date() },
    })
    .returning({ count: aiVisitorQuota.count });
  const count = row?.count ?? 0;
  return { ok: count <= AI_VISITOR_DAILY_LIMIT, count };
}
import jwt from "jsonwebtoken";
import { authMiddleware, getJwtSecret } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { DEFAULT_FREE_OPENROUTER_MODEL, fetchOpenRouterChatWithFallback } from "../lib/openrouter-models";

const router = Router();

const DEFAULT_MODEL = DEFAULT_FREE_OPENROUTER_MODEL;
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 600;
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
  temperature: number;
  maxTokens: number;
  promptExtras: string;
  validSlugs: Set<string>;
  pkgIndex: { slug: string; titleEn: string; titleAr: string }[];
}

export function invalidateAiContextCache() {
  cachedContext = null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseTemperature(raw: string | undefined): number {
  const n = Number.parseFloat(raw ?? "");
  if (!Number.isFinite(n)) return DEFAULT_TEMPERATURE;
  return clamp(n, 0, 2);
}

function parseMaxTokens(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MAX_TOKENS;
  return clamp(n, 50, 4000);
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
  const heroCount = await db
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.isActive, true))
    .then((r) => r.length)
    .catch(() => 0);

  const settings: Record<string, string> = {};
  for (const r of setRows) settings[r.key] = r.value;

  const lines: string[] = [];

  lines.push("## ABOUT DR TRAVEL");
  lines.push(
    `Site: ${settings.site_title || "DR Travel"} — Marsa Matruh tourism (safari, yacht, family, all-inclusive).`,
  );
  const locAr = settings.location_ar || "مرسى مطروح، مصر";
  const locEn = settings.location_en || "Marsa Matruh, Egypt";
  lines.push(`Location (AR): ${locAr}`);
  lines.push(`Location (EN): ${locEn}`);
  if (settings.maps_url) lines.push(`Google Maps: ${settings.maps_url}`);
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
      lines.push(`- slug=${s.slug} | EN: ${s.titleEn} | AR: ${s.titleAr}`);
      if (s.descriptionEn) lines.push(`  desc EN: ${trim(s.descriptionEn, 200)}`);
      if (s.descriptionAr) lines.push(`  desc AR: ${trim(s.descriptionAr, 200)}`);
      if (s.longDescriptionEn) lines.push(`  detail EN: ${trim(s.longDescriptionEn, 240)}`);
      if (s.longDescriptionAr) lines.push(`  detail AR: ${trim(s.longDescriptionAr, 240)}`);
      if (s.featuresEn?.length) lines.push(`  features EN: ${s.featuresEn.slice(0, 6).join(" · ")}`);
      if (s.featuresAr?.length) lines.push(`  features AR: ${s.featuresAr.slice(0, 6).join(" · ")}`);
    }
    lines.push("");
  }

  if (whyRows.length) {
    lines.push(`## WHY CHOOSE US (${whyRows.length})`);
    for (const w of whyRows) {
      lines.push(`- slug=${w.slug} | EN: ${w.titleEn} | AR: ${w.titleAr}`);
      if (w.shortDescEn) lines.push(`  short EN: ${trim(w.shortDescEn, 180)}`);
      if (w.shortDescAr) lines.push(`  short AR: ${trim(w.shortDescAr, 180)}`);
      if (w.introEn) lines.push(`  intro EN: ${trim(w.introEn, 220)}`);
      if (w.introAr) lines.push(`  intro AR: ${trim(w.introAr, 220)}`);
      if (w.bodyEn) lines.push(`  body EN: ${trim(w.bodyEn, 280)}`);
      if (w.bodyAr) lines.push(`  body AR: ${trim(w.bodyAr, 280)}`);
      if (w.bullets?.length) {
        const btsEn = w.bullets.slice(0, 4).map((b) => `${b.titleEn}: ${trim(b.descEn, 70)}`).join(" | ");
        const btsAr = w.bullets.slice(0, 4).map((b) => `${b.titleAr}: ${trim(b.descAr, 70)}`).join(" | ");
        if (btsEn) lines.push(`  bullets EN: ${btsEn}`);
        if (btsAr) lines.push(`  bullets AR: ${btsAr}`);
      }
      if (w.stats?.length) {
        const st = w.stats.slice(0, 4).map((s) => `${s.value} ${s.labelEn} / ${s.labelAr}`).join(" · ");
        lines.push(`  stats: ${st}`);
      }
    }
    lines.push("");
  }

  if (tstRows.length) {
    lines.push(`## TESTIMONIALS (${tstRows.length})`);
    for (const t of tstRows.slice(0, 8)) {
      const pkg = t.packageName ? ` · re ${t.packageName}` : "";
      lines.push(`- ${t.nameEn} / ${t.nameAr} ${t.rating}★${pkg}`);
      if (t.textEn) lines.push(`  EN: "${trim(t.textEn, 200)}"`);
      if (t.textAr) lines.push(`  AR: "${trim(t.textAr, 200)}"`);
    }
    lines.push("");
  }

  if (heroCount > 0) {
    const heroTitle = settings.hero_title_en || settings.hero_title || "";
    const heroTitleAr = settings.hero_title_ar || "";
    const heroSubEn = settings.hero_subtitle_en || settings.hero_subtitle || "";
    const heroSubAr = settings.hero_subtitle_ar || "";
    lines.push(`## HERO: ${heroCount} active hero slides on the homepage.`);
    if (heroTitle) lines.push(`  Headline EN: ${trim(heroTitle, 160)}`);
    if (heroTitleAr) lines.push(`  Headline AR: ${trim(heroTitleAr, 160)}`);
    if (heroSubEn) lines.push(`  Subline EN: ${trim(heroSubEn, 200)}`);
    if (heroSubAr) lines.push(`  Subline AR: ${trim(heroSubAr, 200)}`);
    lines.push("");
  }

  if (galCount > 0) {
    lines.push(`## GALLERY: ${galCount} curated photos available on /gallery page.`);
    lines.push("");
  }

  if (
    settings.rewards_enabled === "true" ||
    settings.show_rewards === "true" ||
    settings.referral_enabled === "true"
  ) {
    const rewardsLines: string[] = ["## REWARDS / LOYALTY"];
    rewardsLines.push("- Visitors earn points and referral rewards on /rewards page.");
    if (settings.points_per_egp) rewardsLines.push(`- Earn rate: ${settings.points_per_egp} points per EGP spent.`);
    if (settings.referral_reward_value)
      rewardsLines.push(
        `- Referral reward: ${settings.referral_reward_value}${settings.referral_reward_type === "percent" ? "%" : " EGP"} per successful booking.`,
      );
    if (settings.rewards_min_redeem)
      rewardsLines.push(`- Minimum redemption: ${settings.rewards_min_redeem} points.`);
    if (settings.rewards_terms_en) rewardsLines.push(`- Terms EN: ${trim(settings.rewards_terms_en, 220)}`);
    if (settings.rewards_terms_ar) rewardsLines.push(`- Terms AR: ${trim(settings.rewards_terms_ar, 220)}`);
    lines.push(...rewardsLines, "");
  }

  cachedContext = {
    builtAt: now,
    text: lines.join("\n"),
    settings,
    model: (settings.ai_model || "").trim() || DEFAULT_MODEL,
    temperature: parseTemperature(settings.ai_temperature),
    maxTokens: parseMaxTokens(settings.ai_max_tokens),
    promptExtras: (settings.ai_system_prompt_extras || "").trim().slice(0, 4000),
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

router.post("/ai/refresh-context", authMiddleware, requireRole("admin"), (_req, res) => {
  cachedContext = null;
  return res.json({ ok: true });
});

router.post("/ai/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI not configured" });

    if (!checkRate(readClientIp(req)))
      return res.status(429).json({ error: "Too many requests, try again in a minute." });

    const body = (req.body ?? {}) as {
      message?: unknown;
      messages?: unknown;
      lang?: unknown;
      history?: unknown;
    };

    const lang: "ar" | "en" = body.lang === "en" ? "en" : "ar";

    // Accept two contracts:
    //   A) { message, history?, lang }
    //   B) { messages: [...], lang }   (last user message + earlier history)
    let userMessage = "";
    const history: ChatTurn[] = [];

    const collectTurns = (arr: unknown[]): { role: "user" | "assistant"; content: string }[] => {
      const out: { role: "user" | "assistant"; content: string }[] = [];
      for (const raw of arr) {
        if (!raw || typeof raw !== "object") continue;
        const m = raw as { role?: unknown; content?: unknown };
        if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          out.push({ role: m.role, content: m.content.slice(0, 1200) });
        }
      }
      return out;
    };

    if (Array.isArray(body.messages)) {
      const turns = collectTurns(body.messages);
      const lastUser = [...turns].reverse().find((t) => t.role === "user");
      userMessage = (lastUser?.content ?? "").trim().slice(0, MAX_USER_CHARS);
      const lastUserIdx = lastUser ? turns.lastIndexOf(lastUser) : -1;
      const earlier = lastUserIdx >= 0 ? turns.slice(0, lastUserIdx) : turns;
      for (const t of earlier.slice(-MAX_HISTORY)) history.push(t);
    } else {
      userMessage = String(body.message ?? "").trim().slice(0, MAX_USER_CHARS);
      const historyRaw: unknown[] = Array.isArray(body.history) ? body.history : [];
      for (const t of collectTurns(historyRaw).slice(-MAX_HISTORY)) history.push(t);
    }

    if (!userMessage) return res.status(400).json({ error: "Message required" });
    // Defensive minimum: a single character is almost always abuse / probing.
    if (userMessage.length < 2) {
      return res.status(400).json({ error: "Message too short" });
    }
    // Crude prompt-injection denylist — we cannot block all variants but we
    // can refuse the most common attempts so the assistant stays on-topic.
    const lowered = userMessage.toLowerCase();
    const INJECTION_MARKERS = [
      "ignore previous instructions",
      "ignore the above",
      "disregard previous",
      "system prompt",
      "you are now",
      "act as",
      "jailbreak",
    ];
    if (INJECTION_MARKERS.some((m) => lowered.includes(m))) {
      return res.status(400).json({
        error: lang === "ar"
          ? "عذراً، لا يمكنني تنفيذ هذا الطلب."
          : "Sorry, I can't process that request.",
      });
    }

    const earlyVisitorToken = (() => {
      const b = req.body as { visitor?: { token?: unknown } };
      const t = b?.visitor && typeof b.visitor === "object" ? b.visitor.token : undefined;
      return typeof t === "string" ? t : "";
    })();
    try {
      const quota = await consumeVisitorQuota(visitorKeyFor(req, earlyVisitorToken), dayKeyUTC());
      if (!quota.ok) {
        return res.status(429).json({
          error: lang === "ar"
            ? "تجاوزت الحد اليومي للمحادثات. حاول غداً."
            : "Daily chat limit reached. Try again tomorrow.",
        });
      }
    } catch (err) {
      console.error("[ai-chat] quota check failed:", err);
    }

    const ctx = await buildContext();

    // ── Visitor rewards snapshot ──
    // Requires a server-issued signed token (currently only minted by
    // /api/referral/register, the one moment we know the caller owns the
    // code) that proves ownership of the referral code.
    // We never trust a client-supplied raw code (anyone can know another
    // visitor's shareable code → IDOR risk).
    const visitorToken = (() => {
      const b = req.body as { visitor?: { token?: unknown } };
      const t = b?.visitor && typeof b.visitor === "object" ? b.visitor.token : undefined;
      return typeof t === "string" ? t : "";
    })();

    let visitorBlock = "";
    if (visitorToken) {
      try {
        const decoded = jwt.verify(visitorToken, getJwtSecret()) as { kind?: string; code?: string };
        if (decoded?.kind === "visitor" && typeof decoded.code === "string") {
          const code = decoded.code.toUpperCase();
          const [codeRow] = await db
            .select()
            .from(referralCodes)
            .where(eq(referralCodes.code, code));
          if (codeRow && codeRow.isActive) {
            const rewardRows = await db
              .select()
              .from(referralRewards)
              .where(eq(referralRewards.referralCodeId, codeRow.id));
            let approvedTotal = 0;
            let approvedCount = 0;
            for (const r of rewardRows) {
              if (r.status === "approved") {
                approvedCount += 1;
                const v = parseFloat(r.rewardValue);
                if (!Number.isNaN(v)) approvedTotal += v;
              }
            }
            const tier =
              approvedCount >= 10 ? "Gold" : approvedCount >= 4 ? "Silver" : approvedCount >= 1 ? "Bronze" : "New";
            const lines = [
              "## VISITOR REWARDS (verified — the person you are chatting with)",
              `- Referral code: ${codeRow.code}`,
              `- Tier: ${tier}`,
              `- Code uses: ${codeRow.usedCount ?? 0}`,
              `- Approved rewards: ${approvedCount}`,
              `- Approved rewards total value: ${approvedTotal} (EGP or % per reward_type setting)`,
              `Privacy: do NOT reveal personal name, phone, or any other visitor's code.`,
            ];
            visitorBlock = "\n\n" + lines.join("\n");
          }
        }
      } catch (e) {
        // Invalid/expired token → silently omit the block (assistant will
        // direct the visitor to /rewards per the prompt rule).
      }
    }

    const slugRule =
      lang === "ar"
        ? `إذا اقترحت باقة معينة، أنهِ ردك بسطر منفصل بالشكل التالي بالضبط: [[slugs:slug1,slug2]] حيث slug1 من قائمة الـ slugs أعلاه. لا تذكر هذا السطر في النص العادي.`
        : `If you suggest specific packages, end your reply with one separate line in this exact format: [[slugs:slug1,slug2]] where slug1 is from the slugs list above. Do not mention this tag in the prose.`;

    const extrasBlock = ctx.promptExtras
      ? (lang === "ar"
          ? `\n\n=== توجيهات إضافية من الإدارة ===\n${ctx.promptExtras}\n=== انتهت التوجيهات ===`
          : `\n\n=== ADDITIONAL ADMIN INSTRUCTIONS ===\n${ctx.promptExtras}\n=== END ADDITIONAL INSTRUCTIONS ===`)
      : "";

    const systemPrompt =
      lang === "ar"
        ? `أنت "مساعد DR Travel" — مساعد سفر ودود ومحترف لشركة DR Travel في مرسى مطروح. أجب دائماً بالعربية الفصحى السهلة (اللهجة المصرية الودودة مرحب بها) وبشكل موجز ومفيد.

قواعد صارمة:
- استخدم فقط البيانات الموجودة أدناه. لا تخترع باقات أو أسعار أو ميزات.
- إذا سأل المستخدم عن شيء غير موجود، قل ذلك بصراحة واقترح التواصل عبر واتساب: ${ctx.settings.whatsapp_number || "01205756024"}.
- اقترح باقات محددة بأسمائها عند المناسبة، واذكر السعر بالجنيه المصري.
- أجب في 2–4 جمل قصيرة في معظم الأحيان. استخدم القوائم النقطية فقط عند مقارنة 2+ باقات.
- إذا انحرف المستخدم عن السياحة، أعده برفق إلى موضوع رحلات مطروح.
- إذا سأل المستخدم عن نقاطه أو مستواه أو مكافآته أو كود الإحالة الخاص به، استخدم قسم "VISITOR REWARDS" أدناه إن وجد، وأخبره بالأرقام بصراحة. إن لم يوجد القسم، أخبره أنه لم يسجّل في برنامج الإحالة بعد ووجّهه لصفحة /rewards.
- لا تكشف اسماً أو رقم هاتف أو كود إحالة شخص آخر.
- ${slugRule}

=== بيانات الموقع المباشرة ===
${ctx.text}${visitorBlock}
=== انتهت البيانات ===${extrasBlock}`
        : `You are "DR Travel Assistant" — a friendly, professional travel assistant for DR Travel in Marsa Matruh, Egypt. Respond concisely and helpfully in clear English.

Strict rules:
- Use ONLY the data below. Never invent packages, prices, or features.
- If the user asks about something not listed, say so honestly and suggest contacting WhatsApp: ${ctx.settings.whatsapp_number || "01205756024"}.
- Recommend specific packages by name when appropriate, mention price in EGP.
- Keep replies to 2–4 short sentences usually. Use bullet points only when comparing 2+ packages.
- If the user goes off-topic, gently steer back to Marsa Matruh trips.
- If the user asks about their points, tier, rewards, or referral code, use the "VISITOR REWARDS" section below if present and tell them the numbers plainly. If that section is missing, tell them they haven't registered in the referral program yet and point them to the /rewards page.
- Never reveal another person's name, phone, or referral code.
- ${slugRule}

=== LIVE SITE DATA ===
${ctx.text}${visitorBlock}
=== END DATA ===${extrasBlock}`;

    const upstreamMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];

    const referer = String(req.headers.origin ?? req.headers.referer ?? "https://drtravel.local");
    const wantsStream = String(req.headers.accept ?? "").toLowerCase().includes("text/event-stream");

    if (wantsStream) {
      let upstream: Response;
      let activeModel = ctx.model;
      try {
        const resolved = await fetchOpenRouterChatWithFallback({
          apiKey,
          preferredModel: ctx.model,
          referer,
          stream: true,
          body: {
            messages: upstreamMessages,
            temperature: ctx.temperature,
            max_tokens: ctx.maxTokens,
          },
        });
        upstream = resolved.response;
        activeModel = resolved.model;
      } catch (err) {
        console.error("OpenRouter stream model fallback exhausted:", err instanceof Error ? err.message : String(err));
        return res.status(503).json({ error: "No working free AI model is currently available" });
      }

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const sendEvent = (obj: unknown) => {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      };

      const reader = (upstream.body as unknown as ReadableStream<Uint8Array>).getReader();
      let aborted = false;
      const cleanupUpstream = () => {
        try { reader.cancel().catch(() => {}); } catch {}
      };
      req.on("close", () => { aborted = true; cleanupUpstream(); });
      res.on("close", () => { aborted = true; cleanupUpstream(); });

      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      // Tail buffer: hold back text that *might* be the start of a
      // `[[slugs:...]]` control tag so users never see it flash mid-stream.
      // Once we see `[[` we swallow everything after it (the tag must be
      // last per the system prompt). Without `[[`, we keep the last few
      // chars buffered until we can prove they aren't `[[`.
      let pending = "";
      const TAIL_HOLD = 4; // longer than "[[" so partial brackets aren't emitted
      let tagSeen = false;

      const emitFromBuffer = (final = false) => {
        if (tagSeen) { pending = ""; return; }
        const idx = pending.indexOf("[[");
        if (idx !== -1) {
          const safe = pending.slice(0, idx);
          if (safe) sendEvent({ type: "delta", text: safe });
          pending = "";
          tagSeen = true;
          return;
        }
        if (final) {
          if (pending) sendEvent({ type: "delta", text: pending });
          pending = "";
          return;
        }
        if (pending.length > TAIL_HOLD) {
          const releaseLen = pending.length - TAIL_HOLD;
          const safe = pending.slice(0, releaseLen);
          pending = pending.slice(releaseLen);
          if (safe) sendEvent({ type: "delta", text: safe });
        }
      };

      try {
        while (!aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines: each event ends with \n\n
          let nlIdx: number;
          while ((nlIdx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nlIdx).replace(/\r$/, "");
            buffer = buffer.slice(nlIdx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") { buffer = ""; break; }
            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                full += delta;
                pending += delta;
                emitFromBuffer(false);
              }
            } catch {
              // ignore unparseable keep-alives / comments
            }
          }
        }
        emitFromBuffer(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("AI stream read error:", msg);
        if (!aborted) sendEvent({ type: "error", error: "AI stream interrupted" });
      }

      const rawReply = full.trim();
      if (!rawReply) {
        if (!aborted) sendEvent({ type: "error", error: "Empty AI response" });
        res.end();
        return;
      }

      const { cleaned, slugs } = extractSlugs(rawReply, ctx);
      sendEvent({
        type: "done",
        reply: cleaned || rawReply,
        suggestedPackageSlugs: slugs,
        model: activeModel,
      });
      res.end();
      return;
    }

    let upstream: Response;
    let activeModel = ctx.model;
    try {
      const resolved = await fetchOpenRouterChatWithFallback({
        apiKey,
        preferredModel: ctx.model,
        referer,
        body: {
          messages: upstreamMessages,
          temperature: ctx.temperature,
          max_tokens: ctx.maxTokens,
        },
      });
      upstream = resolved.response;
      activeModel = resolved.model;
    } catch (err) {
      console.error("OpenRouter model fallback exhausted:", err instanceof Error ? err.message : String(err));
      return res.status(503).json({ error: "No working free AI model is currently available" });
    }

    const data = (await upstream.json()) as OpenRouterResponse;
    const rawReply = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (!rawReply) return res.status(502).json({ error: "Empty AI response" });

    const { cleaned, slugs } = extractSlugs(rawReply, ctx);

    return res.json({
      reply: cleaned || rawReply,
      suggestedPackageSlugs: slugs,
      model: activeModel,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /ai/chat error:", msg);
    return res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
