import { Helmet } from "react-helmet-async";

export interface SeoHeadProps {
  /** Final, fully-localized page title. */
  title: string;
  /** Short meta description (≤ 160 chars recommended). */
  description?: string;
  /** Image URL for OG/Twitter cards. */
  image?: string;
  /** Path-only canonical (e.g. "/trips/x"). Joined to current origin. */
  path?: string;
  /** "ar" (default) or "en". */
  lang?: "ar" | "en";
  /** Override og:type. Defaults to "website". */
  type?: "website" | "article" | "product";
  /** Set to true to discourage indexing (admin pages, drafts, etc.). */
  noindex?: boolean;
}

function origin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/**
 * SEO head — emits canonical URL, hreflang ar/en/x-default, OpenGraph and
 * Twitter card metadata. Safe to use on any page; later mounts override
 * earlier ones via react-helmet-async.
 */
export default function SeoHead({
  title,
  description,
  image,
  path,
  lang = "ar",
  type = "website",
  noindex = false,
}: SeoHeadProps) {
  const base = origin();
  const cleanPath = path
    ? path.startsWith("/") ? path : `/${path}`
    : (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonical = `${base}${cleanPath}`;
  const arHref = `${base}${cleanPath}${cleanPath.includes("?") ? "&" : "?"}lang=ar`;
  const enHref = `${base}${cleanPath}${cleanPath.includes("?") ? "&" : "?"}lang=en`;

  return (
    <Helmet>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={arHref} />
      <link rel="alternate" hrefLang="en" href={enHref} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      {/* OpenGraph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={lang === "ar" ? "ar_EG" : "en_US"} />
      {image ? <meta property="og:image" content={image} /> : null}

      {/* Twitter card */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {image ? <meta name="twitter:image" content={image} /> : null}
    </Helmet>
  );
}
