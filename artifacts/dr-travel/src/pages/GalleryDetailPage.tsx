import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useLanguage } from "../LanguageContext";

interface GalleryItem {
  id: number; url: string; type: string; caption: string;
  size: string; sortOrder: number;
}
interface Album {
  id: number; slug: string; titleAr: string; titleEn: string;
  descriptionAr: string; descriptionEn: string; coverImage: string;
  items: GalleryItem[];
}

function isYoutube(url: string) { return /youtube\.com|youtu\.be/.test(url); }
function getYoutubeEmbed(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : url;
}
function getYoutubeThumbnail(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ items, startIdx, ar, onClose }: { items: GalleryItem[]; startIdx: number; ar: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") { ar ? next() : prev(); }
      else if (e.key === "ArrowRight") { ar ? prev() : next(); }
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [ar, onClose, prev, next]);

  const item = items[idx];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.96)", display: "flex", flexDirection: "column" }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? (ar ? prev() : next()) : (ar ? next() : prev()); }
        touchStartX.current = null;
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", background: "linear-gradient(to bottom,rgba(0,0,0,0.8),transparent)", flexShrink: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", fontFamily: "Cairo,sans-serif" }}>{idx + 1} / {items.length}</div>
        {item.caption && (
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.88rem", fontFamily: "Cairo,sans-serif", maxWidth: "55%", textAlign: "center" }}>{item.caption}</div>
        )}
        <button onClick={onClose}
          style={{ background: "rgba(220,38,38,0.25)", border: "1px solid rgba(220,38,38,0.4)", color: "white", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>
          ✕
        </button>
      </div>

      {/* Main media */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "0 4rem", overflow: "hidden" }}>
        {item.type === "video" ? (
          <div style={{ width: "100%", maxWidth: 820, aspectRatio: "16/9" }}>
            {isYoutube(item.url) ? (
              <iframe src={getYoutubeEmbed(item.url)} style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <video src={item.url} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }} />
            )}
          </div>
        ) : (
          <img key={item.id} src={item.url} alt={item.caption || `photo-${idx + 1}`}
            style={{ maxWidth: "100%", maxHeight: "calc(100vh - 180px)", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 48px rgba(0,0,0,0.7)", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
        )}
        {items.length > 1 && (
          <>
            <button onClick={ar ? next : prev}
              style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [ar ? "right" : "left"]: "0.75rem", zIndex: 10, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)", color: "white", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.25rem" }}>
              {ar ? "›" : "‹"}
            </button>
            <button onClick={ar ? prev : next}
              style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [ar ? "left" : "right"]: "0.75rem", zIndex: 10, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)", color: "white", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.25rem" }}>
              {ar ? "‹" : "›"}
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0.6rem 1rem", flexShrink: 0, background: "linear-gradient(to top,rgba(0,0,0,0.8),transparent)", justifyContent: items.length <= 6 ? "center" : "flex-start", scrollbarWidth: "none" }}>
          {items.map((t, i) => (
            <div key={t.id} onClick={() => setIdx(i)}
              style={{ flexShrink: 0, width: 54, height: 40, borderRadius: 6, overflow: "hidden", cursor: "pointer", border: i === idx ? "2px solid #00AAFF" : "2px solid transparent", opacity: i === idx ? 1 : 0.5, transition: "all 0.2s", background: "#0d1824" }}>
              {t.type === "video" ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>▶</div>
              ) : (
                <img src={t.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Size helpers ─────────────────────────────────────────────────────────────
/*
  Masonry layout uses CSS columns. To achieve size variety we control:
  - normal  → breakInside:avoid, auto height (fits image)
  - square  → breakInside:avoid, aspectRatio 1/1, objectFit:cover
  - wide    → columnSpan:all  (stretches across ALL columns), auto height
  - large   → columnSpan:all, taller / max-height:560px
*/
function getItemStyle(size: string, hovered: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "relative", overflow: "hidden", borderRadius: 12, cursor: "pointer",
    background: "#0d1824", marginBottom: "0.75rem",
    border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: hovered ? "0 10px 40px rgba(0,0,0,0.55)" : "0 2px 12px rgba(0,0,0,0.35)",
    transform: hovered ? "scale(1.012)" : "scale(1)",
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
  };
  if (size === "wide" || size === "large") {
    return { ...base, columnSpan: "all", breakInside: "avoid" };
  }
  return { ...base, breakInside: "avoid" };
}

function getImgStyle(size: string): React.CSSProperties {
  if (size === "square") return { width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" };
  if (size === "large") return { width: "100%", maxHeight: 520, objectFit: "cover", display: "block" };
  if (size === "wide") return { width: "100%", maxHeight: 380, objectFit: "cover", display: "block" };
  return { width: "100%", display: "block" };
}

// ─── Grid Item ─────────────────────────────────────────────────────────────────
function GridItem({ item, idx, onClick }: { item: GalleryItem; idx: number; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const size = item.size || "normal";
  const youtubeThumbnail = item.type === "video" && isYoutube(item.url) ? getYoutubeThumbnail(item.url) : "";
  const isNativeVideo = item.type === "video" && !isYoutube(item.url);

  const aspectStyle = size === "square" ? "1/1" : "16/9";

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={getItemStyle(size, hovered)}>
      {item.type === "video" ? (
        <div style={{ position: "relative", aspectRatio: aspectStyle, background: "linear-gradient(135deg,#0d1824,#1a2535)", overflow: "hidden" }}>
          {/* YouTube: show thumbnail image */}
          {youtubeThumbnail && (
            <img src={youtubeThumbnail} alt={item.caption || `video-${idx + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.75)" }} />
          )}
          {/* Native uploaded video: show first frame via <video preload="metadata"> */}
          {isNativeVideo && (
            <video src={item.url} preload="metadata" muted playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.8)" }}
              onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1; }} />
          )}
          {/* Play button overlay */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", border: "2px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", transform: hovered ? "scale(1.12)" : "scale(1)", transition: "transform 0.2s" }}>▶</div>
          </div>
          <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "white", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: "Cairo,sans-serif" }}>فيديو</div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {!loaded && !errored && (
            <div style={{ width: "100%", ...(size === "square" ? { aspectRatio: "1/1" } : size === "large" ? { height: 320 } : size === "wide" ? { height: 260 } : { aspectRatio: "4/3" }), background: "linear-gradient(135deg,#0d1824,#1a2535)" }} />
          )}
          <img src={item.url} alt={item.caption || `photo-${idx + 1}`}
            style={{ ...getImgStyle(size), opacity: loaded ? 1 : 0, transition: "opacity 0.35s ease", display: errored ? "none" : undefined }}
            onLoad={() => setLoaded(true)}
            onError={() => { setErrored(true); setLoaded(true); }} />
          {errored && (
            <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.25)", fontSize: "2rem", gap: "0.5rem" }}>
              <span>🖼️</span>
              <span style={{ fontSize: "0.7rem", fontFamily: "Cairo,sans-serif" }}>تعذّر التحميل</span>
            </div>
          )}
        </div>
      )}

      {/* Hover overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.32)", opacity: hovered ? 1 : 0, transition: "opacity 0.25s", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: item.type === "video" ? "1.8rem" : "1.6rem" }}>{item.type === "video" ? "▶" : "🔍"}</div>
      </div>

      {/* Caption */}
      {item.caption && (
        <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.82))", padding: "1.25rem 0.75rem 0.6rem", color: "rgba(255,255,255,0.9)", fontSize: "0.75rem", fontFamily: "Cairo,sans-serif", lineHeight: 1.4, opacity: hovered ? 1 : 0, transition: "opacity 0.25s" }}>
          {item.caption}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo,sans-serif", direction: ar ? "rtl" : "ltr" }}>
      <div style={{ textAlign: "center", color: "#00AAFF" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
        <div>{ar ? "جاري التحميل..." : "Loading..."}</div>
      </div>
    </div>
  );

  if (err || !album) return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo,sans-serif", direction: ar ? "rtl" : "ltr" }}>
      <div style={{ textAlign: "center", color: "#ff6b6b" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
        <div style={{ marginBottom: "1.5rem" }}>{ar ? "الألبوم غير موجود" : "Album not found"}</div>
        <button onClick={() => navigate("/gallery")}
          style={{ background: "#00AAFF", color: "white", border: "none", padding: "0.65rem 1.75rem", borderRadius: 10, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 700 }}>
          {ar ? "العودة للمعرض" : "Back to Gallery"}
        </button>
      </div>
    </div>
  );

  const items = album.items || [];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#080f18 0%,#0D1B2A 100%)", fontFamily: "Cairo,Montserrat,sans-serif", direction: ar ? "rtl" : "ltr" }}>

      {/* Hero banner */}
      <div style={{ position: "relative", minHeight: 260, overflow: "hidden" }}>
        {album.coverImage ? (
          <img src={album.coverImage} alt={ar ? album.titleAr : album.titleEn}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.35)", transform: "scale(1.05)" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#0a1520,#1a2535)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(8,15,24,0.4) 0%,rgba(8,15,24,0.85) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ← Navigation row — sits below the fixed navbar (65px) with no overlap */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: ar ? "flex-end" : "flex-start",
            padding: "calc(65px + 0.75rem) 1rem 0",
          }}>
            <button onClick={() => navigate("/gallery")}
              style={{
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)", color: "white",
                borderRadius: "50px", padding: "0.45rem 1.1rem", cursor: "pointer",
                fontFamily: "Cairo,sans-serif", fontSize: "0.82rem",
                display: "flex", alignItems: "center", gap: "0.4rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.5)"; }}>
              {ar ? "جميع الألبومات ›" : "‹ All Albums"}
            </button>
          </div>

          {/* Centered content */}
          <div style={{ padding: "1.25rem 1.5rem 2.5rem", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,170,255,0.12)", border: "1px solid rgba(0,170,255,0.25)", borderRadius: 50, padding: "0.25rem 1rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.7rem" }}>📸</span>
            <span style={{ color: "#00AAFF", fontSize: "0.75rem", fontWeight: 700 }}>
              {items.length} {ar ? (items.length === 1 ? "عنصر" : "عناصر") : (items.length === 1 ? "item" : "items")}
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)", fontWeight: 900, color: "white", margin: "0 0 0.6rem", textShadow: "0 2px 16px rgba(0,0,0,0.8)", letterSpacing: "-0.5px" }}>
            {ar ? album.titleAr : album.titleEn}
          </h1>

          {(ar ? album.descriptionAr : album.descriptionEn) && (
            <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 520, margin: "0 auto", fontSize: "0.92rem", lineHeight: 1.7, textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}>
              {ar ? album.descriptionAr : album.descriptionEn}
            </p>
          )}
          </div>{/* end centered content */}
        </div>{/* end zIndex wrapper */}
      </div>{/* end hero banner */}

      {/* Gallery grid */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📷</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.05rem" }}>
              {ar ? "لا توجد وسائط بعد" : "No media yet"}
            </div>
          </div>
        ) : (
          <>
            <div style={{ columns: "3 230px", gap: "0.75rem" }}>
              {items.map((item, i) => (
                <GridItem key={item.id} item={item} idx={i} onClick={() => setLightboxIdx(i)} />
              ))}
            </div>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: "0.72rem", marginTop: "1.5rem", fontFamily: "Cairo,sans-serif" }}>
              {ar ? "انقر على أي صورة لعرضها بملء الشاشة" : "Click any photo to view fullscreen"}
            </p>
          </>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox items={items} startIdx={lightboxIdx} ar={ar} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}
