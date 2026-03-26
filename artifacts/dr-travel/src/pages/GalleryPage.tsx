import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";

interface PreviewItem { id: number; url: string; type: string; }
interface Album {
  id: number; slug: string; titleAr: string; titleEn: string;
  descriptionAr: string; descriptionEn: string; coverImage: string;
  isVisible: boolean; sortOrder: number; itemCount: number; previewItems: PreviewItem[];
}

export default function GalleryPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true); setErr("");
    fetch("/api/gallery/albums")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setAlbums(Array.isArray(d) ? d : []))
      .catch(e => setErr(e.message || "فشل التحميل"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0a1520 0%,#0D1B2A 100%)", fontFamily: "Cairo, Montserrat, sans-serif", direction: ar ? "rtl" : "ltr" }}>
      {/* Header */}
      <div style={{ padding: "5rem 1.5rem 3rem", textAlign: "center", background: "linear-gradient(180deg,rgba(0,170,255,0.08) 0%,transparent 100%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "50px", padding: "0.35rem 1.1rem", marginBottom: "1.5rem" }}>
          <span style={{ color: "#C9A84C", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "1px" }}>
            {ar ? "✦ معرض الصور ✦" : "✦ PHOTO GALLERY ✦"}
          </span>
        </div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "white", margin: "0 0 1rem", lineHeight: 1.2 }}>
          {ar ? "معرض DR Travel" : "DR Travel Gallery"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", maxWidth: 520, margin: "0 auto" }}>
          {ar ? "لحظات لا تُنسى من رحلاتنا في مرسى مطروح — يخت، سفاري، وذكريات للأبد"
               : "Unforgettable moments from our trips in Marsa Matruh — yacht, safari and memories forever"}
        </p>
        <button onClick={() => navigate("/")}
          style={{ marginTop: "1.5rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)", borderRadius: "50px", padding: "0.45rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", transition: "all 0.2s" }}>
          {ar ? "← الرئيسية" : "← Home"}
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.25rem 4rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "#00AAFF" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⏳</div>
              <div>{ar ? "جاري التحميل..." : "Loading..."}</div>
            </div>
          </div>
        ) : err ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#ff6b6b" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
            <div>{ar ? "حدث خطأ في تحميل المعرض" : "Failed to load gallery"}</div>
            <button onClick={() => window.location.reload()}
              style={{ marginTop: "1rem", background: "#00AAFF", color: "white", border: "none", padding: "0.5rem 1.5rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        ) : albums.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📷</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.1rem" }}>
              {ar ? "لا توجد ألبومات بعد" : "No albums yet"}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1.25rem" }}>
            {albums.map(album => (
              <AlbumCard key={album.id} album={album} ar={ar} onClick={() => navigate(`/gallery/${album.slug}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlbumCard({ album, ar, onClick }: { album: Album; ar: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const images = album.previewItems.filter(i => i.type === "image").slice(0, 4);

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all 0.3s", transform: hovered ? "translateY(-4px)" : "none", boxShadow: hovered ? "0 12px 40px rgba(0,170,255,0.15)" : "0 2px 12px rgba(0,0,0,0.3)" }}>

      <div style={{ position: "relative", height: 200, background: "#0d1824", overflow: "hidden" }}>
        {album.coverImage ? (
          <img src={album.coverImage} alt={ar ? album.titleAr : album.titleEn}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s", transform: hovered ? "scale(1.06)" : "scale(1)" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : images.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", gap: 2 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ background: "#0d1824", overflow: "hidden" }}>
                {images[i] && <img src={images[i].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)", fontSize: "3.5rem" }}>🏔️</div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%,rgba(8,16,26,0.75))" }} />
        <div style={{ position: "absolute", bottom: "0.75rem", [ar ? "right" : "left"]: "0.85rem" }}>
          <span style={{ background: "rgba(0,170,255,0.85)", color: "white", padding: "0.2rem 0.65rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>
            {album.itemCount} {ar ? "صورة" : "photos"}
          </span>
        </div>
        <div style={{ position: "absolute", top: "0.75rem", [ar ? "left" : "right"]: "0.85rem", opacity: hovered ? 1 : 0, transition: "opacity 0.25s" }}>
          <span style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "white", padding: "0.25rem 0.7rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>
            {ar ? "عرض الألبوم ←" : "View Album →"}
          </span>
        </div>
      </div>

      <div style={{ padding: "1rem 1.1rem" }}>
        <h3 style={{ margin: "0 0 0.3rem", color: "white", fontWeight: 800, fontSize: "1rem" }}>
          {ar ? album.titleAr : album.titleEn}
        </h3>
        {(ar ? album.descriptionAr : album.descriptionEn) && (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {ar ? album.descriptionAr : album.descriptionEn}
          </p>
        )}
      </div>
    </div>
  );
}
