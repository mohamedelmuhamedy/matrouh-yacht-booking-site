import { useEffect, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useLanguage } from "../LanguageContext";

interface GalleryItem { id: number; url: string; type: string; caption: string; sortOrder: number; }
interface Album {
  id: number; slug: string; titleAr: string; titleEn: string;
  descriptionAr: string; descriptionEn: string; coverImage: string;
  items: GalleryItem[];
}

function isYoutube(url: string) { return /youtube\.com|youtu\.be/.test(url); }
function getYoutubeEmbed(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
}

export default function GalleryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true); setErr("");
    fetch(`/api/gallery/albums/${slug}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setAlbum(d))
      .catch(e => setErr(e.message || "فشل التحميل"))
      .finally(() => setLoading(false));
  }, [slug]);

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prevItem = useCallback(() => { if (lightboxIdx === null || !album) return; setLightboxIdx(i => (i! - 1 + album.items.length) % album.items.length); }, [lightboxIdx, album]);
  const nextItem = useCallback(() => { if (lightboxIdx === null || !album) return; setLightboxIdx(i => (i! + 1) % album.items.length); }, [lightboxIdx, album]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") { ar ? nextItem() : prevItem(); }
      else if (e.key === "ArrowRight") { ar ? prevItem() : nextItem(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, ar, prevItem, nextItem]);

  useEffect(() => {
    document.body.style.overflow = lightboxIdx !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxIdx]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", color: "#00AAFF", fontFamily: "Cairo, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⏳</div>
        <div>{ar ? "جاري التحميل..." : "Loading..."}</div>
      </div>
    </div>
  );

  if (err || !album) return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif", direction: ar ? "rtl" : "ltr" }}>
      <div style={{ textAlign: "center", color: "#ff6b6b" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
        <div style={{ marginBottom: "1.5rem" }}>{ar ? "الألبوم غير موجود" : "Album not found"}</div>
        <button onClick={() => navigate("/gallery")}
          style={{ background: "#00AAFF", color: "white", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
          {ar ? "← المعرض" : "← Gallery"}
        </button>
      </div>
    </div>
  );

  const items = album.items;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0a1520 0%,#0D1B2A 100%)", fontFamily: "Cairo, Montserrat, sans-serif", direction: ar ? "rtl" : "ltr" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: 300, overflow: "hidden" }}>
        {album.coverImage ? (
          <img src={album.coverImage} alt={ar ? album.titleAr : album.titleEn}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#0a1520,#1a2535)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <button onClick={() => navigate("/gallery")}
            style={{ position: "absolute", top: "1.25rem", [ar ? "right" : "left"]: "1.25rem", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", borderRadius: "50px", padding: "0.4rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
            {ar ? "← المعرض" : "← Gallery"}
          </button>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white", textAlign: "center", margin: "0 0 0.5rem", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
            {ar ? album.titleAr : album.titleEn}
          </h1>
          {(ar ? album.descriptionAr : album.descriptionEn) && (
            <p style={{ color: "rgba(255,255,255,0.65)", textAlign: "center", maxWidth: 500, margin: 0, fontSize: "0.9rem", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
              {ar ? album.descriptionAr : album.descriptionEn}
            </p>
          )}
          <div style={{ marginTop: "0.75rem", background: "rgba(0,170,255,0.8)", color: "white", padding: "0.2rem 0.75rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
            {items.length} {ar ? "عنصر" : "items"}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem 5rem" }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.35)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
            <div>{ar ? "لا توجد صور في هذا الألبوم بعد" : "No photos in this album yet"}</div>
          </div>
        ) : (
          <div style={{ columns: "3 220px", gap: "0.75rem" }}>
            {items.map((item, idx) => (
              <GridItem key={item.id} item={item} idx={idx} onClick={() => openLightbox(idx)} />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && items[lightboxIdx] && (
        <Lightbox
          item={items[lightboxIdx]}
          idx={lightboxIdx}
          total={items.length}
          ar={ar}
          onClose={closeLightbox}
          onPrev={prevItem}
          onNext={nextItem}
        />
      )}
    </div>
  );
}

function GridItem({ item, idx, onClick }: { item: GalleryItem; idx: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}
      style={{ display: "inline-block", width: "100%", marginBottom: "0.75rem", borderRadius: 10, overflow: "hidden", cursor: "pointer", position: "relative", boxShadow: hovered ? "0 8px 30px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.3)", transition: "box-shadow 0.3s, transform 0.3s", transform: hovered ? "scale(1.015)" : "scale(1)", breakInside: "avoid" }}>
      {item.type === "video" ? (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg,#0d1824,#1a2535)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {isYoutube(item.url) ? (
            <img src={`https://img.youtube.com/vi/${item.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]}/hqdefault.jpg`}
              alt={item.caption} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.6 }} />
          ) : null}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 56, height: 56, background: "rgba(0,0,0,0.6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", backdropFilter: "blur(4px)", border: "2px solid rgba(255,255,255,0.3)" }}>▶</div>
          </div>
        </div>
      ) : (
        <>
          {!loaded && <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg,#0d1824,#1a2535)", animation: "pulse 1.5s ease-in-out infinite" }} />}
          <img src={item.url} alt={item.caption || `Photo ${idx + 1}`}
            style={{ width: "100%", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
            onLoad={() => setLoaded(true)}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2"; setLoaded(true); }} />
        </>
      )}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", opacity: hovered ? 1 : 0, transition: "opacity 0.25s", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "1.75rem" }}>{item.type === "video" ? "▶" : "🔍"}</span>
      </div>
      {item.caption && (
        <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.8))", padding: "0.75rem 0.65rem 0.5rem", color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", opacity: hovered ? 1 : 0, transition: "opacity 0.25s" }}>
          {item.caption}
        </div>
      )}
    </div>
  );
}

function Lightbox({ item, idx, total, ar, onClose, onPrev, onNext }: {
  item: GalleryItem; idx: number; total: number; ar: boolean;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? (ar ? onPrev() : onNext()) : (ar ? onNext() : onPrev()); }
    setTouchStart(null);
  };

  const btnStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", fontSize: "1.2rem", transition: "all 0.2s", flexShrink: 0,
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, right: 0, left: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", background: "linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)", zIndex: 2 }}>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" }}>
          {idx + 1} / {total}
        </div>
        {item.caption && (
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", maxWidth: "60%", textAlign: "center" }}>{item.caption}</div>
        )}
        <button onClick={onClose}
          style={{ ...btnStyle, width: 36, height: 36, fontSize: "1rem", background: "rgba(255,80,80,0.25)", borderColor: "rgba(255,80,80,0.3)" }}>
          ✕
        </button>
      </div>

      {/* Media */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "4rem 4.5rem", boxSizing: "border-box" }}>
        {item.type === "video" ? (
          <div style={{ width: "100%", maxWidth: 800, aspectRatio: "16/9" }}>
            {isYoutube(item.url) ? (
              <iframe src={getYoutubeEmbed(item.url)} style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <video src={item.url} controls autoPlay style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "contain" }} />
            )}
          </div>
        ) : (
          <img src={item.url} alt={item.caption || ""}
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
        )}
      </div>

      {/* Nav buttons */}
      {total > 1 && (
        <>
          <button onClick={ar ? onNext : onPrev}
            style={{ ...btnStyle, position: "absolute", [ar ? "left" : "right"]: "1rem", top: "50%", transform: "translateY(-50%)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.55)"; }}>
            {ar ? "→" : "←"}
          </button>
          <button onClick={ar ? onPrev : onNext}
            style={{ ...btnStyle, position: "absolute", [ar ? "right" : "left"]: "1rem", top: "50%", transform: "translateY(-50%)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.55)"; }}>
            {ar ? "←" : "→"}
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {total > 1 && (
        <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, display: "flex", overflowX: "auto", gap: "0.35rem", padding: "0.6rem 1rem", background: "linear-gradient(transparent,rgba(0,0,0,0.7))", justifyContent: "center" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} onClick={() => { /* handled by parent */ }}
              style={{ width: 48, height: 36, flexShrink: 0, borderRadius: 4, overflow: "hidden", opacity: i === idx ? 1 : 0.45, border: i === idx ? "2px solid #00AAFF" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
              onClickCapture={e => { e.stopPropagation(); /* set lightbox idx */ }}>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
