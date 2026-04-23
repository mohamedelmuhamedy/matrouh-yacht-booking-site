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

export interface CurrencyRateOverrides {
  usd_rate?: string | number | null;
  sar_rate?: string | number | null;
}

function parsePositiveRate(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getExchangeRate(priceCurrency: CurrencyCode, overrides?: CurrencyRateOverrides): number {
  if (priceCurrency === "EGP") return 1;

  if (priceCurrency === "USD") {
    return parsePositiveRate(overrides?.usd_rate) ?? (1 / CURRENCIES.USD.rate);
  }

  return parsePositiveRate(overrides?.sar_rate) ?? (1 / CURRENCIES.SAR.rate);
}

export function convertPrice(
  priceEGP: number,
  currency: CurrencyCode,
  overrides?: CurrencyRateOverrides,
): number {
  const cfg = CURRENCIES[currency];
  if (currency === "EGP") {
    return Math.round(priceEGP);
  }

  const exchangeRate = getExchangeRate(currency, overrides);
  const precision = cfg.decimals > 0 ? 10 ** cfg.decimals : 1;
  return Math.round((priceEGP / exchangeRate) * precision) / precision;
}

export function formatPrice(
  priceEGP: number,
  currency: CurrencyCode,
  lang: string,
  overrides?: CurrencyRateOverrides,
): string {
  const cfg = CURRENCIES[currency];
  const converted = convertPrice(priceEGP, currency, overrides);
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
