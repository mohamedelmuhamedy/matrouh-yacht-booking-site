export type SiteFontOption = {
  value: string;
  label: string;
  weights: string;
  sample: string;
};

export const DEFAULT_ARABIC_FONT = "Cairo";
export const DEFAULT_ENGLISH_FONT = "Montserrat";

export const ARABIC_FONT_OPTIONS: SiteFontOption[] = [
  { value: "Cairo", label: "Cairo", weights: "300;400;500;600;700;800;900", sample: "رحلة لا تُنسى في مرسى مطروح" },
  { value: "Tajawal", label: "Tajawal", weights: "300;400;500;700;800;900", sample: "رحلة لا تُنسى في مرسى مطروح" },
  { value: "Almarai", label: "Almarai", weights: "300;400;700;800", sample: "رحلة لا تُنسى في مرسى مطروح" },
  { value: "Noto Kufi Arabic", label: "Noto Kufi Arabic", weights: "300;400;500;600;700;800;900", sample: "رحلة لا تُنسى في مرسى مطروح" },
  { value: "Amiri", label: "Amiri", weights: "400;700", sample: "رحلة لا تُنسى في مرسى مطروح" },
];

export const ENGLISH_FONT_OPTIONS: SiteFontOption[] = [
  { value: "Montserrat", label: "Montserrat", weights: "300;400;500;600;700;800;900", sample: "A beautiful Marsa Matruh escape" },
  { value: "Poppins", label: "Poppins", weights: "300;400;500;600;700;800;900", sample: "A beautiful Marsa Matruh escape" },
  { value: "Inter", label: "Inter", weights: "300;400;500;600;700;800;900", sample: "A beautiful Marsa Matruh escape" },
  { value: "Roboto", label: "Roboto", weights: "300;400;500;700;900", sample: "A beautiful Marsa Matruh escape" },
  { value: "Playfair Display", label: "Playfair Display", weights: "400;500;600;700;800;900", sample: "A beautiful Marsa Matruh escape" },
];

function findFont(options: SiteFontOption[], value: string | undefined, fallback: string) {
  return options.find(option => option.value === value)?.value ?? fallback;
}

export function resolveArabicFont(value: string | undefined) {
  return findFont(ARABIC_FONT_OPTIONS, value, DEFAULT_ARABIC_FONT);
}

export function resolveEnglishFont(value: string | undefined) {
  return findFont(ENGLISH_FONT_OPTIONS, value, DEFAULT_ENGLISH_FONT);
}

export function getFontStack(font: string, type: "arabic" | "english") {
  const fallback = type === "arabic" ? DEFAULT_ARABIC_FONT : DEFAULT_ENGLISH_FONT;
  return font === fallback
    ? `"${fallback}", sans-serif`
    : `"${font}", "${fallback}", sans-serif`;
}

function getFontOption(font: string) {
  return [...ARABIC_FONT_OPTIONS, ...ENGLISH_FONT_OPTIONS].find(option => option.value === font);
}

function buildGoogleFontsHref(fonts: string[]) {
  const uniqueFonts = Array.from(new Set(fonts))
    .map(getFontOption)
    .filter((font): font is SiteFontOption => Boolean(font));

  if (uniqueFonts.length === 0) return "";

  const families = uniqueFonts
    .map(font => `family=${font.value.replaceAll(" ", "+")}:wght@${font.weights}`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export function loadGoogleFonts(fonts: string[], linkId = "dr-travel-selected-fonts") {
  if (typeof document === "undefined") return;

  const href = buildGoogleFontsHref(fonts);
  if (!href) return;

  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  if (link.href !== href) {
    link.href = href;
  }
}
