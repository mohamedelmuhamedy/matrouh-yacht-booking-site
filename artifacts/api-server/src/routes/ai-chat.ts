import { Router } from "express";
import { db, packages, services, whyUsCards, testimonials, siteSettings, galleryItems } from "@workspace/db";
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

function trim(s: unknown, max = 220): string {
  const v = String(s ?? "").replace(/\s+/g, " ").trim();
  return v.length > max ? v.slice(0, max) + "…" : v;
}

async function buildContext(): Promise<ContextSnapshot> {
  const now = Date.now();
  if (cachedContext && now - cachedContext.builtAt < CONTEXT_TTL_MS) return cachedContext;

  const [pkgRows, svcRows, whyRows, tstRows, setRows, galRows] = await Promise.all([
    db.select().from(packages).where(and(eq(packages.status, "published"), eq(packages.active, true))).orderBy(asc(packages.sortOrder)),
    db.select().from(services).where(eq(services.isActive, true)).orderBy(asc(services.sortOrder)),
    db.select().from(whyUsCards).where(eq(whyUsCards.isActive, true)).orderBy(asc(whyUsCards.sortOrder)),
    db.select().from(testimonials).where(eq(testimonials.isVisible, true)).orderBy(asc(testimonials.sortOrder)),
    db.select().from(siteSettings),
    db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder)).limit(12).catch(() => [] as any[]),
  ]);

  const settings: Record<string, string> = {};
  for (const r of setRows) settings[r.key] = r.value;

  const lines: string[] = [];

  lines.push("## ABOUT DR TRAVEL");
  lines.push(`Site: ${settings.site_title || "DR Travel"} — Marsa Matruh tourism (safari, yacht, family, all-inclusive).`);
  lines.push(`WhatsApp: ${settings.whatsapp_number || "01205756024"} | Phone: ${settings.phone_number || "01205756024"}`);
  if (settings.facebook_url) lines.push(`Facebook: ${settings.facebook_url}`);
  if (settings.instagram_url) lines.push(`Instagram: ${settings.instagram_url}`);
  if (settings.tiktok_url) lines.push(`TikTok: ${settings.tiktok_url}`);
  lines.push(`Default currency: ${settings.default_currency || "EGP"} | USD rate: ${settings.usd_rate || "50"} | SAR rate: ${settings.sar_rate || "13.3"}`);
  lines.push("");

  lines.push(`## PACKAGES (${pkgRows.length})`);
  for (const p of pkgRows) {
    const price = p.maxPriceEGP && p.maxPriceEGP > p.priceEGP ? `${p.priceEGP}–${p.maxPriceEGP} EGP` : `${p.priceEGP} EGP`;
    const tags: string[] = [];
    if (p.featured) tags.push("featured");
    if (p.popular) tags.push("popular");
    if (p.familyFriendly) tags.push("family-friendly");
    if (p.foreignerFriendly) tags.push("foreigner-friendly");
    if (p.childrenFriendly) tags.push("children-friendly");
    lines.push(`- [${p.slug}] ${p.titleEn} | ${p.titleAr} — ${price}/person, ${p.durationEn}, category=${p.category}, rating=${p.rating}★ (${p.reviewCount}). ${tags.join(", ")}`);
    lines.push(`  EN: ${trim(p.descriptionEn, 180)}`);
    lines.push(`  AR: ${trim(p.descriptionAr, 180)}`);
    if (Array.isArray(p.includesEn) && p.includesEn.length) lines.push(`  Includes: ${p.includesEn.slice(0, 6).join(" · ")}`);
  }
  lines.push("");

  if (svcRows.length) {
    lines.push(`## SERVICES (${svcRows.length})`);
    for (const s of svcRows) {
      lines.push(`- [${s.slug}] ${s.titleEn} | ${s.titleAr} — ${trim(s.descriptionEn, 140)}`);
    }
    lines.push("");
  }

  if (whyRows.length) {
    lines.push(`## WHY CHOOSE US (${whyRows.length})`);
    for (const w of whyRows) {
      lines.push(`- [${w.slug}] ${w.titleEn} | ${w.titleAr} — ${trim(w.shortDescEn, 140)}`);
    }
    lines.push("");
  }

  if (tstRows.length) {
    lines.push(`## TESTIMONIALS (${tstRows.length})`);
    for (const t of tstRows.slice(0, 6)) {
      lines.push(`- ${t.nameEn} (${t.locationEn}) ${t.rating}★: "${trim(t.textEn, 160)}"`);
    }
    lines.push("");
  }

  if (Array.isArray(galRows) && galRows.length) {
    lines.push(`## GALLERY: ${galRows.length} curated photos available on /gallery page.`);
    lines.push("");
  }

  if (settings.rewards_enabled === "true" || settings.show_rewards === "true") {
    lines.push("## REWARDS: Loyalty program is active — visit /rewards page to earn points and redeem perks on bookings.");
    lines.push("");
  }

  const text = lines.join("\n");
  cachedContext = {
    builtAt: now,
    text,
    settings,
    model: settings.ai_model || DEFAULT_MODEL,
  };
  return cachedContext;
}

router.post("/ai/refresh-context", async (_req, res) => {
  cachedContext = null;
  return res.json({ ok: true });
});

router.post("/ai/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI not configured" });

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkRate(ip)) return res.status(429).json({ error: "Too many requests, try again in a minute." });

    const body = req.body || {};
    const userMessage = String(body.message || "").trim().slice(0, MAX_USER_CHARS);
    if (!userMessage) return res.status(400).json({ error: "Message required" });

    const lang: "ar" | "en" = body.lang === "en" ? "en" : "ar";
    const historyRaw = Array.isArray(body.history) ? body.history : [];
    const history = historyRaw
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_HISTORY)
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 1200) }));

    const ctx = await buildContext();

    const systemPrompt = lang === "ar"
      ? `أنت "مساعد DR Travel" — مساعد سفر ودود ومحترف لشركة DR Travel في مرسى مطروح. أجب دائماً بالعربية الفصحى السهلة (اللهجة المصرية الودودة مرحب بها) وبشكل موجز ومفيد.

قواعد صارمة:
- استخدم فقط البيانات الموجودة أدناه. لا تخترع باقات أو أسعار أو ميزات.
- إذا سأل المستخدم عن شيء غير موجود، قل ذلك بصراحة واقترح التواصل عبر واتساب.
- اقترح باقات محددة بأسمائها عندما يكون ذلك مناسباً، واذكر السعر بالجنيه المصري.
- إذا أراد المستخدم الحجز، وجهه إلى صفحة الباقة أو واتساب: ${ctx.settings.whatsapp_number || "01205756024"}.
- أجب في 2–4 جمل قصيرة في معظم الأحيان. استخدم القوائم النقطية فقط عند مقارنة 2+ باقات.
- لا تعرض روابط طويلة، فقط أسماء الباقات (المستخدم سيرى بطاقاتها أسفل الرسالة).
- إذا انحرف المستخدم عن السياحة، أعده برفق إلى موضوع رحلات مطروح.

=== بيانات الموقع المباشرة ===
${ctx.text}
=== انتهت البيانات ===`
      : `You are "DR Travel Assistant" — a friendly, professional travel assistant for DR Travel in Marsa Matruh, Egypt. Respond concisely and helpfully in clear English.

Strict rules:
- Use ONLY the data below. Never invent packages, prices, or features.
- If the user asks about something not listed, say so honestly and suggest contacting WhatsApp.
- Recommend specific packages by name when appropriate, mention price in EGP.
- If the user wants to book, direct them to the package page or WhatsApp: ${ctx.settings.whatsapp_number || "01205756024"}.
- Keep replies to 2–4 short sentences usually. Use bullet points only when comparing 2+ packages.
- Do not paste long URLs — just package names (the user sees the package cards below your message).
- If the user goes off-topic, gently steer back to Marsa Matruh trips.

=== LIVE SITE DATA ===
${ctx.text}
=== END DATA ===`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      { role: "user" as const, content: userMessage },
    ];

    const referer = req.headers.origin || req.headers.referer || "https://drtravel.local";
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": String(referer),
        "X-Title": "DR Travel Assistant",
      },
      body: JSON.stringify({
        model: ctx.model,
        messages,
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("OpenRouter error:", upstream.status, errText.slice(0, 300));
      return res.status(502).json({ error: "AI upstream error", status: upstream.status });
    }

    const data: any = await upstream.json();
    const reply = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!reply) return res.status(502).json({ error: "Empty AI response" });

    const lower = (userMessage + " " + reply).toLowerCase();
    const suggestedSlugs: string[] = [];
    try {
      const pkgRows = await db.select().from(packages).where(and(eq(packages.status, "published"), eq(packages.active, true))).orderBy(asc(packages.sortOrder));
      for (const p of pkgRows) {
        const tEn = (p.titleEn || "").toLowerCase();
        const tAr = p.titleAr || "";
        if ((tEn && lower.includes(tEn)) || (tAr && (userMessage + " " + reply).includes(tAr))) {
          suggestedSlugs.push(p.slug);
        }
      }
    } catch {}

    return res.json({
      reply,
      suggestedPackageSlugs: suggestedSlugs.slice(0, 3),
      model: ctx.model,
    });
  } catch (err: any) {
    console.error("POST /ai/chat error:", err?.message || err);
    return res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
