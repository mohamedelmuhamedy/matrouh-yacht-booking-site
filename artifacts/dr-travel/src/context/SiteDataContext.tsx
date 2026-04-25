import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { PACKAGES_DATA } from "../data/packages";
import { apiFetch } from "../lib/api";

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

export type SiteSettings = Record<string, string>;

interface SiteDataContextType {
  packages: DBPackage[];
  testimonials: DBTestimonial[];
  settings: SiteSettings;
  categories: DBCategory[];
  packagesLoading: boolean;
  settingsLoading: boolean;
  refetchPackages: () => void;
  refetchSettings: () => void;
  refetchCategories: () => void;
}

const SiteDataContext = createContext<SiteDataContextType | null>(null);

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
};

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<DBPackage[]>([]);
  const [testimonials, setTestimonials] = useState<DBTestimonial[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  const fetchPackages = useCallback(async (retryCount = 0) => {
    setPackagesLoading(true);
    try {
      const r = await apiFetch("/api/packages");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) {
          setPackages(data);
          setApiFailed(false);
        } else {
          // API returned non-array data, treat as failure
          if (retryCount < 3) {
            setTimeout(() => fetchPackages(retryCount + 1), 3000);
            return; // Keep loading true while retrying
          }
          setPackages(PACKAGES_DATA as unknown as DBPackage[]);
          setApiFailed(true);
        }
      } else {
        // API returned error status
        if (retryCount < 3) {
          setTimeout(() => fetchPackages(retryCount + 1), 3000);
          return; // Keep loading true while retrying
        }
        setPackages(PACKAGES_DATA as unknown as DBPackage[]);
        setApiFailed(true);
      }
    } catch {
      // Network error
      if (retryCount < 3) {
        setTimeout(() => fetchPackages(retryCount + 1), 3000);
        return; // Keep loading true while retrying
      }
      setPackages(PACKAGES_DATA as unknown as DBPackage[]);
      setApiFailed(true);
    } finally {
      if (retryCount >= 3) {
        setPackagesLoading(false);
      }
    }
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

  useEffect(() => {
    fetchPackages();
    fetchTestimonials();
    fetchSettings();
    fetchCategories();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      fetchPackages();
      fetchSettings();
      fetchCategories();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPackages, fetchSettings, fetchCategories]);

  return (
    <SiteDataContext.Provider value={{
      packages,
      testimonials,
      settings,
      categories,
      packagesLoading,
      settingsLoading,
      refetchPackages: fetchPackages,
      refetchSettings: fetchSettings,
      refetchCategories: fetchCategories,
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
