export type CurrencyCode = "EGP" | "USD" | "SAR";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbolAr: string;
  symbolEn: string;
  nameAr: string;
  nameEn: string;
  rate: number;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  EGP: {
    code: "EGP",
    symbolAr: "ج.م",
    symbolEn: "EGP",
    nameAr: "جنيه مصري",
    nameEn: "Egyptian Pound",
    rate: 1,
    locale: "ar-EG",
    decimals: 0,
  },
  USD: {
    code: "USD",
    symbolAr: "$",
    symbolEn: "$",
    nameAr: "دولار أمريكي",
    nameEn: "US Dollar",
    rate: 0.021,
    locale: "en-US",
    decimals: 2,
  },
  SAR: {
    code: "SAR",
    symbolAr: "ر.س",
    symbolEn: "SAR",
    nameAr: "ريال سعودي",
    nameEn: "Saudi Riyal",
    rate: 0.079,
    locale: "ar-SA",
    decimals: 0,
  },
};

export const CURRENCY_LIST: CurrencyCode[] = ["EGP", "USD", "SAR"];

export function convertPrice(priceEGP: number, currency: CurrencyCode): number {
  const cfg = CURRENCIES[currency];
  return Math.round(priceEGP * cfg.rate * (currency === "USD" ? 100 : 1)) / (currency === "USD" ? 100 : 1);
}

export function formatPrice(priceEGP: number, currency: CurrencyCode, lang: string): string {
  const cfg = CURRENCIES[currency];
  const converted = convertPrice(priceEGP, currency);
  const symbol = lang === "ar" ? cfg.symbolAr : cfg.symbolEn;
  const locale = lang === "ar" ? cfg.locale : "en-US";
  if (currency === "USD") {
    return `${symbol}${converted.toFixed(cfg.decimals)}`;
  }
  if (lang === "ar") {
    return `${converted.toLocaleString(locale, { maximumFractionDigits: cfg.decimals })} ${symbol}`;
  }
  return `${converted.toLocaleString(locale, { maximumFractionDigits: cfg.decimals })} ${symbol}`;
}
