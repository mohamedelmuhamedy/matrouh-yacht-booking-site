export type FeatureVisual = { icon: string; image: string; tint: string };

export type FeatureItem = {
  titleAr: string;
  titleEn: string;
  icon: string;
  image: string;
  tint: string;
};

export const FEATURE_VISUAL_MAP: Array<{ keywords: string[] } & FeatureVisual> = [
  { keywords: ["يخت", "قارب", "مركب", "yacht", "boat", "vessel"], icon: "⛵", image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&auto=format&fit=crop&q=80", tint: "#0077B6" },
  { keywords: ["كابن", "كابتن", "طاقم", "بحار", "captain", "crew", "sailor", "skipper", "helm"], icon: "🧭", image: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=600&auto=format&fit=crop&q=80", tint: "#264653" },
  { keywords: ["مشروب", "وجب", "طعام", "قهو", "أكل", "drink", "food", "meal", "snack", "coffee", "refresh", "beverage"], icon: "🥤", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=80", tint: "#E76F51" },
  { keywords: ["غطس", "غوص", "snorkel", "dive", "diving", "scuba"], icon: "🤿", image: "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=600&auto=format&fit=crop&q=80", tint: "#00B4D8" },
  { keywords: ["معد", "أدوات", "تجهيز", "equipment", "gear", "kit"], icon: "🎒", image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80", tint: "#2A9D8F" },
  { keywords: ["مكيف", "تكييف", "راحة", "air condition", "air-condition", "comfort", "cooling"], icon: "❄️", image: "https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=600&auto=format&fit=crop&q=80", tint: "#48CAE4" },
  { keywords: ["صحرا", "سفاري", "كثبان", "desert", "safari", "dune", "sand"], icon: "🏜️", image: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=600&auto=format&fit=crop&q=80", tint: "#E9C46A" },
  { keywords: ["جيب", "سيارة", "دفع", "jeep", "4x4", "suv", "off-road", "offroad"], icon: "🚙", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80", tint: "#bc6c25" },
  { keywords: ["شاطئ", "بحر", "رمال", "beach", "shore", "ocean", "sea"], icon: "🏖️", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80", tint: "#0096C7" },
  { keywords: ["غروب", "شروق", "منظر", "إطلالة", "sunset", "sunrise", "view", "scenic", "panorama"], icon: "🌅", image: "https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=600&auto=format&fit=crop&q=80", tint: "#F4A261" },
  { keywords: ["صيد", "سمك", "fish", "fishing", "catch"], icon: "🎣", image: "https://images.unsplash.com/photo-1545566239-0789ed1f6e3a?w=600&auto=format&fit=crop&q=80", tint: "#1D3557" },
  { keywords: ["موسيق", "حفل", "ترفيه", "أغاني", "music", "party", "entertain", "dj"], icon: "🎶", image: "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=600&auto=format&fit=crop&q=80", tint: "#9D4EDD" },
  { keywords: ["خيم", "مبيت", "مخيم", "نار", "camp", "tent", "overnight", "bonfire"], icon: "⛺", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=80", tint: "#6A994E" },
  { keywords: ["كواد", "بيك", "دراج", "quad", "atv", "buggy", "bike"], icon: "🏍️", image: "https://images.unsplash.com/photo-1571992072039-c6f78fcc7ae6?w=600&auto=format&fit=crop&q=80", tint: "#D62828" },
  { keywords: ["جمل", "خيل", "حصان", "camel", "horse", "ride"], icon: "🐪", image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&auto=format&fit=crop&q=80", tint: "#A0522D" },
  { keywords: ["سعر", "خصم", "عرض", "تخفيض", "price", "discount", "offer", "deal"], icon: "💎", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80", tint: "#C9A84C" },
  { keywords: ["أمان", "تأمين", "حماية", "safe", "safety", "secure", "insurance"], icon: "🛡️", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80", tint: "#2D6A4F" },
  { keywords: ["وقت", "ساعة", "مدة", "time", "hour", "duration", "schedule"], icon: "🕒", image: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=600&auto=format&fit=crop&q=80", tint: "#5E548E" },
  { keywords: ["صور", "تصوير", "كاميرا", "photo", "camera", "shoot", "shot"], icon: "📸", image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&auto=format&fit=crop&q=80", tint: "#7209B7" },
  { keywords: ["دليل", "مرشد", "guide", "tour"], icon: "🧑‍✈️", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80", tint: "#3D348B" },
  { keywords: ["نقل", "مواصلات", "توصيل", "transport", "transfer", "pickup", "shuttle"], icon: "🚐", image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&auto=format&fit=crop&q=80", tint: "#457B9D" },
  { keywords: ["فندق", "إقامة", "غرف", "hotel", "stay", "accommodation", "room", "resort"], icon: "🏨", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80", tint: "#264653" },
  { keywords: ["مسبح", "حمام سباحة", "pool", "swim", "swimming"], icon: "🏊", image: "https://images.unsplash.com/photo-1563299796-17596ed6b017?w=600&auto=format&fit=crop&q=80", tint: "#0096C7" },
  { keywords: ["سبا", "مساج", "استرخاء", "spa", "massage", "relax", "wellness"], icon: "💆", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80", tint: "#B5838D" },
];

export const DEFAULT_FEATURE_VISUAL: FeatureVisual = {
  icon: "✨",
  image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80",
  tint: "#00AAFF",
};

export function getFeatureVisual(text: string): FeatureVisual {
  const lower = (text || "").toLowerCase();
  for (const entry of FEATURE_VISUAL_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return { icon: entry.icon, image: entry.image, tint: entry.tint };
    }
  }
  return DEFAULT_FEATURE_VISUAL;
}

export function buildFeatureFromText(titleAr: string, titleEn: string): FeatureItem {
  const v = getFeatureVisual([titleAr, titleEn].filter(Boolean).join(" "));
  return {
    titleAr: titleAr || "",
    titleEn: titleEn || "",
    icon: v.icon,
    image: v.image,
    tint: v.tint,
  };
}

export function isFeatureItem(x: unknown): x is FeatureItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    (typeof o.titleAr === "string" || typeof o.titleEn === "string") &&
    typeof o.icon === "string" &&
    typeof o.image === "string" &&
    typeof o.tint === "string"
  );
}
