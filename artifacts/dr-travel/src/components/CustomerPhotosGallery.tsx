import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../LanguageContext";
import { apiFetch, storageObjectUrl } from "../lib/api";

interface CustomerPhoto {
  id: number;
  photoUrl: string;
  caption: string | null;
  customerName: string | null;
  packageId: number | null;
  tripDate: string | null;
  featured: number | boolean;
  createdAt: string;
}

interface Props {
  packageId?: number;
  limit?: number;
}

export default function CustomerPhotosGallery({ packageId, limit = 12 }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [photos, setPhotos] = useState<CustomerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const lbTouchX = useRef(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = packageId != null ? `?packageId=${encodeURIComponent(String(packageId))}` : "";
    apiFetch(`/api/customer-photos${qs}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: CustomerPhoto[]) => {
        if (cancelled) return;
        const sorted = Array.isArray(data) ? [...data] : [];
        sorted.sort((a, b) => {
          const af = a.featured ? 1 : 0;
          const bf = b.featured ? 1 : 0;
          if (bf !== af) return bf - af;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setPhotos(sorted.slice(0, limit));
      })
      .catch(() => { if (!cancelled) setPhotos([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [packageId, limit]);

  const open = lightboxIdx !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx(i => (i === null ? null : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setLightboxIdx(i => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos.length]);

  if (loading) return null;
  if (photos.length === 0) return null;

  const resolveUrl = (url: string) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return storageObjectUrl(url) || url;
  };

  const lbPrev = () => setLightboxIdx(i => (i === null ? null : (i - 1 + photos.length) % photos.length));
  const lbNext = () => setLightboxIdx(i => (i === null ? null : (i + 1) % photos.length));

  return (
    <section style={{ padding: "4rem 0", background: "var(--bg-page)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingInline: "1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="section-label">{ar ? "لحظات حقيقية" : "Real Moments"}</div>
          <h2 className="section-title">{ar ? "صور من رحلات عملائنا" : "Photos from Our Travelers"}</h2>
          <p className="section-subtitle">
            {ar ? "لحظات لا تُنسى التقطها مسافرونا خلال رحلاتهم معنا" : "Unforgettable moments captured by our travelers"}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? "0.5rem" : "0.75rem",
        }}>
          {photos.map((p, i) => {
            const url = resolveUrl(p.photoUrl);
            const featured = !!p.featured;
            return (
              <button
                key={p.id}
                onClick={() => setLightboxIdx(i)}
                style={{
                  position: "relative",
                  border: featured ? "2px solid #C9A84C" : "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "zoom-in",
                  padding: 0,
                  aspectRatio: "1 / 1",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <img
                  src={url}
                  alt={p.caption || "Customer photo"}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {featured && (
                  <span style={{
                    position: "absolute", top: 8, insetInlineStart: 8,
                    background: "linear-gradient(135deg,#C9A84C,#9a6e1c)",
                    color: "#0D1B2A", fontSize: "0.65rem", fontWeight: 800,
                    padding: "0.2rem 0.5rem", borderRadius: "50px",
                    fontFamily: "Montserrat, sans-serif", letterSpacing: "0.5px",
                  }}>
                    ★ {ar ? "مميزة" : "FEATURED"}
                  </span>
                )}
                {p.customerName && (
                  <span style={{
                    position: "absolute", bottom: 0, insetInlineStart: 0, insetInlineEnd: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
                    color: "white", fontSize: "0.72rem", fontWeight: 600,
                    padding: "0.5rem 0.6rem 0.4rem", textAlign: "start",
                  }}>
                    {p.customerName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {open && lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          onClick={() => setLightboxIdx(null)}
          onTouchStart={e => { lbTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const diff = lbTouchX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) { if (diff > 0) lbNext(); else lbPrev(); }
          }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(null); }}
            aria-label="Close"
            style={{
              position: "absolute", top: 16, insetInlineEnd: 16,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
              color: "white", width: 42, height: 42, borderRadius: "50%",
              cursor: "pointer", fontSize: "1.1rem", fontWeight: 700,
            }}
          >✕</button>

          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); lbPrev(); }}
                aria-label="Previous"
                style={{
                  position: "absolute", top: "50%", insetInlineStart: 16, transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "white", width: 46, height: 46, borderRadius: "50%",
                  cursor: "pointer", fontSize: "1.4rem",
                }}
              >‹</button>
              <button
                onClick={e => { e.stopPropagation(); lbNext(); }}
                aria-label="Next"
                style={{
                  position: "absolute", top: "50%", insetInlineEnd: 16, transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "white", width: 46, height: 46, borderRadius: "50%",
                  cursor: "pointer", fontSize: "1.4rem",
                }}
              >›</button>
            </>
          )}

          <div
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "min(1100px, 92vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}
          >
            <img
              src={resolveUrl(photos[lightboxIdx].photoUrl)}
              alt={photos[lightboxIdx].caption || "Customer photo"}
              style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            />
            <div style={{ color: "white", textAlign: "center", maxWidth: "640px" }}>
              {photos[lightboxIdx].caption && (
                <div style={{ fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "0.35rem" }}>
                  {photos[lightboxIdx].caption}
                </div>
              )}
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                {photos[lightboxIdx].customerName || ""}
                {photos.length > 1 && (
                  <span style={{ marginInlineStart: "0.6rem" }}>· {lightboxIdx + 1} / {photos.length}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
