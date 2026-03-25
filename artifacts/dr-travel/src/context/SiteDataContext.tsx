import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { PACKAGES_DATA } from "../data/packages";

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
  maxPriceEGP: number;
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

export type SiteSettings = Record<string, string>;

interface SiteDataContextType {
  packages: DBPackage[];
  testimonials: DBTestimonial[];
  settings: SiteSettings;
  packagesLoading: boolean;
  settingsLoading: boolean;
  refetchPackages: () => void;
}

const SiteDataContext = createContext<SiteDataContextType | null>(null);

const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: "01205756024",
  phone_number: "01205756024",
  site_title: "DR Travel",
  meta_description: "أفضل رحلات مرسى مطروح - ركوب بحر وسفاري وأكثر",
  default_currency: "EGP",
  facebook_url: "https://facebook.com/Drtrave",
  instagram_url: "https://instagram.com/drtravel_marsamatrouh",
  tiktok_url: "https://tiktok.com/@drtravel.marsa.matrouh",
  feature_ai_assistant: "true",
  feature_compare: "true",
  feature_testimonials: "true",
  feature_rewards: "true",
};

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<DBPackage[]>([]);
  const [testimonials, setTestimonials] = useState<DBTestimonial[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const r = await fetch("/api/packages");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setPackages(data);
        } else {
          setPackages(PACKAGES_DATA as unknown as DBPackage[]);
        }
      } else {
        setPackages(PACKAGES_DATA as unknown as DBPackage[]);
      }
    } catch {
      setPackages(PACKAGES_DATA as unknown as DBPackage[]);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const fetchTestimonials = async () => {
    try {
      const r = await fetch("/api/testimonials");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setTestimonials(data);
      }
    } catch {}
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const r = await fetch("/api/settings");
      if (r.ok) {
        const data = await r.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch {}
    setSettingsLoading(false);
  };

  useEffect(() => {
    fetchPackages();
    fetchTestimonials();
    fetchSettings();
  }, []);

  return (
    <SiteDataContext.Provider value={{
      packages,
      testimonials,
      settings,
      packagesLoading,
      settingsLoading,
      refetchPackages: fetchPackages,
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
