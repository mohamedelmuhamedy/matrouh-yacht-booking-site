import { Helmet } from "react-helmet-async";

export interface SeoHeadProps {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  lang?: "ar" | "en";
  type?: "website" | "article" | "product";
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

function origin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://www.drtravel-matrouh.com";
}

export default function SeoHead({
  title,
  description,
  image,
  path,
  lang = "ar",
  type = "website",
  noindex = false,
  structuredData,
}: SeoHeadProps) {
  const base = origin();
  const cleanPath = path
    ? path.startsWith("/") ? path : `/${path}`
    : (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonical = `${base}${cleanPath}`;
  const arHref = `${base}${cleanPath}${cleanPath.includes("?") ? "&" : "?"}lang=ar`;
  const enHref = `${base}${cleanPath}${cleanPath.includes("?") ? "&" : "?"}lang=en`;
  const shareImage = image
    ? (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(image) ? image : `${base}${image.startsWith("/") ? image : `/${image}`}`)
    : `${base}/icon-512.png`;

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
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={lang === "ar" ? "ar_EG" : "en_US"} />
      <meta property="og:image" content={shareImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={shareImage} />
      {structuredData ? (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      ) : null}
    </Helmet>
  );
}
