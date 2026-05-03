import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { PACKAGES_DATA } from "../data/packages";
import { apiFetch } from "../lib/api";
import { DEFAULT_ARABIC_FONT, DEFAULT_ENGLISH_FONT } from "../lib/siteFonts";

export interface DBPackage {
  id: number;
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  longDescriptionAr: string;
  longDescriptionEn: string;
  category: string;
  priceEGP: number;
  maxPriceEGP: number | null;
  durationAr: string;
  durationEn: string;
  color: string;
  badgeAr: string | null;
  badgeEn: string | null;
  badgeColor: string | null;
  featured: boolean;
  popular: boolean;
  familyFriendly: boolean;
  foreignerFriendly: boolean;
  childrenFriendly: boolean;
  experienceLevel: string;
  rating: number;
  reviewCount: number;
  images: string[];
  includesAr: string[];
  includesEn: string[];
  excludesAr: string[];
  excludesEn: string[];
  itineraryAr: { title: string; desc: string }[];
  itineraryEn: { title: string; desc: string }[];
  whyThisTripAr: { icon: string; text: string }[];
  whyThisTripEn: { icon: string; text: string }[];
  suitableFor: string[];
  whatToBringAr: string[];
  whatToBringEn: string[];
  hasCancellationPolicy: boolean;
  cancellationAr: string;
  cancellationEn: string;
  faq: { questionAr: string; questionEn: string; answerAr: string; answerEn: string }[];
  includesMeals: boolean;
  includesTransport: boolean;
  includesAccommodation: boolean;
  minGroupSize: number;
  maxGroupSize: number;
  active: boolean;
  status: string;
  sortOrder: number;
}

export interface DBTestimonial {
  id: number;
  nameAr: string;
  nameEn: string;
  locationAr: string;
  locationEn: string;
  rating: number;
  textAr: string;
  textEn: string;
  avatar: string;
  packageName: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface DBCategory {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

export interface DBService {
  id: number;
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  longDescriptionAr: string;
  longDescriptionEn: string;
  imageUrl: string | null;
  aboutImageUrl: string | null;
  featuresImageUrl: string | null;
  ctaImageUrl: string | null;
  color: string;
  featuresAr: string[];
  featuresEn: string[];
  features?: Array<{
    titleAr: string;
    titleEn: string;
    icon: string;
    image: string;
    tint: string;
  }>;
  ctaTextAr: string;
  ctaTextEn: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

export interface DBWhyUsCard {
  id: number;
  slug: string;
  icon: string;
  color: string;
  titleAr: string; titleEn: string;
  shortDescAr: string; shortDescEn: string;
  heroImageUrl: string | null;
  accentImageUrl: string | null;
  introAr: string; introEn: string;
  bodyAr: string; bodyEn: string;
  bullets: { icon: string; titleAr: string; titleEn: string; descAr: string; descEn: string }[];
  stats: { icon: string; value: string; labelAr: string; labelEn: string }[];
  galleryImages: string[];
  ctaTextAr: string; ctaTextEn: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

export type SiteSettings = Record<string, string>;

interface SiteDataContextType {
  packages: DBPackage[];
  testimonials: DBTestimonial[];
  settings: SiteSettings;
  categories: DBCategory[];
  services: DBService[];
  whyUsCards: DBWhyUsCard[];
  packagesLoading: boolean;
  settingsLoading: boolean;
  isInitializing: boolean;
  refetchPackages: (options?: { silent?: boolean }) => Promise<boolean>;
  refetchSettings: () => void;
  refetchCategories: () => void;
  refetchServices: () => void;
  refetchWhyUsCards: () => void;
}

const SiteDataContext = createContext<SiteDataContextType | null>(null);
const STATIC_PACKAGES = PACKAGES_DATA as unknown as DBPackage[];
const PACKAGE_RETRY_INTERVAL_MS = 5_000;

const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: "01205756024",
  phone_number: "01205756024",
  site_title: "DR Travel",
  meta_description: "أفضل رحلات مرسى مطروح - ركوب بحر وسفاري وأكثر",
  default_currency: "EGP",
  usd_rate: "50",
  sar_rate: "13.3",
  facebook_url: "https://facebook.com/Drtrave",
  instagram_url: "https://instagram.com/drtravel_marsamatrouh",
  tiktok_url: "https://tiktok.com/@drtravel.marsa.matrouh",
  show_ai_assistant: "true",
  show_compare_feature: "true",
  show_testimonials: "true",
  services_link_to_trips: "false",
  services_detail_pages_enabled: "true",
  uniform_home_cards: "false",
  show_footer_map: "false",
  brand_name: "DR TRAVEL",
  brand_short_name: "DR Travel",
  brand_tagline_ar: "يخت سياحة وسفاري · مرسى مطروح",
  brand_tagline_en: "Yacht Tourism & Safari",
  dev_name: "Yousef Mostafa",
  dev_contact_url: "https://wa.me/201007752842",
  font_arabic: DEFAULT_ARABIC_FONT,
  font_en: DEFAULT_ENGLISH_FONT,
};

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<DBPackage[]>(STATIC_PACKAGES);
  const [testimonials, setTestimonials] = useState<DBTestimonial[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [services, setServices] = useState<DBService[]>([]);
  const [whyUsCards, setWhyUsCards] = useState<DBWhyUsCard[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  const fetchPackages = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setPackagesLoading(true);
    let succeeded = false;

    try {
      const r = await apiFetch("/api/packages");
      if (!r.ok) throw new Error(`Package API responded with ${r.status}`);

      const data = await r.json();
      if (Array.isArray(data)) {
        setPackages(data);
        setApiFailed(false);
        succeeded = true;
      } else {
        throw new Error("Package API returned an invalid payload");
      }
    } catch {
      setPackages((current) => current.length > 0 ? current : STATIC_PACKAGES);
      setApiFailed(true);
    } finally {
      if (!options.silent) setPackagesLoading(false);
    }

    return succeeded;
  }, []);

  const fetchTestimonials = useCallback(async () => {
    try {
      const r = await apiFetch("/api/testimonials");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setTestimonials(data);
      }
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const r = await apiFetch("/api/settings");
      if (r.ok) {
        const data = await r.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch {}
    setSettingsLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const r = await apiFetch("/api/categories");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setCategories(data);
      }
    } catch {}
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const r = await apiFetch("/api/services");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setServices(data);
      }
    } catch {}
  }, []);

  const fetchWhyUsCards = useCallback(async () => {
    try {
      const r = await apiFetch("/api/why-us");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setWhyUsCards(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeSiteData() {
      await Promise.allSettled([
        fetchPackages(),
        fetchTestimonials(),
        fetchSettings(),
        fetchCategories(),
        fetchServices(),
        fetchWhyUsCards(),
      ]);

      if (isMounted) setIsInitializing(false);
    }

    void initializeSiteData();

    return () => {
      isMounted = false;
    };
  }, [fetchPackages, fetchTestimonials, fetchSettings, fetchCategories, fetchServices, fetchWhyUsCards]);

  useEffect(() => {
    if (!apiFailed) return;

    const retryId = window.setInterval(() => {
      void fetchPackages({ silent: true });
    }, PACKAGE_RETRY_INTERVAL_MS);

    return () => window.clearInterval(retryId);
  }, [apiFailed, fetchPackages]);

  useEffect(() => {
    const onFocus = () => {
      void fetchPackages({ silent: true });
      fetchSettings();
      fetchCategories();
      fetchServices();
      fetchWhyUsCards();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPackages, fetchSettings, fetchCategories, fetchServices, fetchWhyUsCards]);

  return (
    <SiteDataContext.Provider value={{
      packages,
      testimonials,
      settings,
      categories,
      services,
      whyUsCards,
      packagesLoading,
      settingsLoading,
      isInitializing,
      refetchPackages: fetchPackages,
      refetchSettings: fetchSettings,
      refetchCategories: fetchCategories,
      refetchServices: fetchServices,
      refetchWhyUsCards: fetchWhyUsCards,
    }}>
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error("useSiteData must be used inside SiteDataProvider");
  return ctx;
}
