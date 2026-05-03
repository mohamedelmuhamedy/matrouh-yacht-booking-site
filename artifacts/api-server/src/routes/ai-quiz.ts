import { Router } from "express";
import { db, packages, promoCodes } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const router = Router();

interface QuizInput {
  budget?: "low" | "mid" | "high"; // < 2000 / 2000-5000 / > 5000
  vibe?: "relax" | "adventure" | "family" | "romantic" | "party";
  groupSize?: number;
  durationDays?: number; // 0.5, 1, 2, 3+
  prefersWater?: boolean;
  prefersDesert?: boolean;
}

interface ScoredPackage {
  id: number;
  slug: string;
  titleAr: string;
  titleEn: string;
  priceEGP: number;
  durationAr: string;
  imageUrl: string | null;
  score: number;
  reasons: string[];
}

router.post("/ai/quiz", async (req, res) => {
  try {
    const input: QuizInput = req.body ?? {};
    const groupSize = Math.max(1, Math.min(50, Number.parseInt(String(input.groupSize ?? 2), 10) || 2));

    const all = await db.select().from(packages).where(eq(packages.active, true));
    if (all.length === 0) return res.json({ matches: [], promo: null });

    const budgetMax = input.budget === "low" ? 2000 : input.budget === "mid" ? 5000 : input.budget === "high" ? 999999 : 999999;
    const budgetMin = input.budget === "high" ? 5000 : 0;

    const scored: ScoredPackage[] = all.map(p => {
      const reasons: string[] = [];
      let score = 50;
      const price = p.priceEGP || 0;

      // Budget fit
      if (price <= budgetMax && price >= budgetMin) {
        score += 25;
        reasons.push("ضمن ميزانيتك");
      } else if (price <= budgetMax * 1.2) {
        score += 5;
      } else {
        score -= 20;
      }

      // Vibe matching by title/category keywords
      const titleAll = `${p.titleAr || ""} ${p.titleEn || ""} ${p.descriptionAr || ""} ${p.descriptionEn || ""}`.toLowerCase();
      const vibeKeywords: Record<string, string[]> = {
        relax: ["استرخاء", "هدوء", "spa", "relax", "يخت", "yacht"],
        adventure: ["مغامرة", "سفاري", "غوص", "safari", "diving", "snorkel"],
        family: ["عائل", "family", "أطفال"],
        romantic: ["رومانس", "romantic", "couple", "شهر عسل"],
        party: ["حفل", "party", "dj", "سهرة"],
      };
      if (input.vibe && vibeKeywords[input.vibe]) {
        const hit = vibeKeywords[input.vibe].some(kw => titleAll.includes(kw));
        if (hit) {
          score += 30;
          reasons.push(`يناسب "${input.vibe === "relax" ? "الاسترخاء" : input.vibe === "adventure" ? "المغامرة" : input.vibe === "family" ? "العائلة" : input.vibe === "romantic" ? "الرومانسية" : "السهر"}"`);
        }
      }

      // Water vs desert
      const isWater = /يخت|بحر|غوص|snork|yacht|sea|dive/i.test(titleAll);
      const isDesert = /سفاري|صحراء|safari|desert/i.test(titleAll);
      if (input.prefersWater && isWater) { score += 15; reasons.push("نشاط بحري"); }
      if (input.prefersDesert && isDesert) { score += 15; reasons.push("نشاط صحراوي"); }

      // Group size
      if (groupSize >= 6 && /عائل|family|group|مجموع/i.test(titleAll)) {
        score += 10;
        reasons.push("مناسب للمجموعات");
      }

      return {
        id: p.id,
        slug: p.slug,
        titleAr: p.titleAr,
        titleEn: p.titleEn,
        priceEGP: price,
        durationAr: p.durationAr || "",
        imageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        score,
        reasons,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const matches = scored.slice(0, 3);

    // Try to find an active promo to surface (prefer one without packageId restriction)
    let promo: { code: string; discountType: string; discountValue: number } | null = null;
    try {
      const activePromos = await db.select().from(promoCodes).where(and(
        eq(promoCodes.active, true),
      )).limit(20);
      const now = new Date();
      const candidate = activePromos.find(p => {
        if (p.maxUses > 0 && p.usedCount >= p.maxUses) return false;
        if (p.validFrom && p.validFrom > now) return false;
        if (p.validTo && p.validTo < now) return false;
        return true;
      });
      if (candidate) {
        promo = {
          code: candidate.code,
          discountType: candidate.discountType,
          discountValue: candidate.discountValue,
        };
      }
    } catch {}

    return res.json({ matches, promo });
  } catch (err) {
    console.error("[ai-quiz] error:", err);
    return res.status(500).json({ error: "Quiz failed" });
  }
});

export default router;
