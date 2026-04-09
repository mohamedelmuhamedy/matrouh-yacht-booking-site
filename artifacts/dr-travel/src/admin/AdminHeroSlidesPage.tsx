import { useEffect, useRef, useState } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface HeroSlide {
  id: number;
  url: string;
  type: string;
  duration: number;
  sortOrder: number;
  isActive: boolean;
}

const TRANSITIONS = [
  { value: "fade",    label: "Fade",    icon: "🌅", desc: "تلاشي ناعم" },
  { value: "dissolve",label: "Dissolve",icon: "💧", desc: "ذوبان بطيء" },
  { value: "zoom",    label: "Zoom",    icon: "🔍", desc: "تكبير ناعم" },
  { value: "slide",   label: "Slide",   icon: "➡️", desc: "انزلاق أفقي" },
];

const card: React.CSSProperties = {
  background: "white", borderRadius: "14px", border: "1.5px solid #d0dce8",
  padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem",
};

function toImgUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/api/")) return url;
  return `/api/storage/objects?objectPath=${encodeURIComponent(url)}`;
}

async function uploadFile(file: File): Promise<{ url: string } | { error: string }> {
  let reqRes: Response;
  try {
    reqRes = await adminFetch("/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
  } catch {
    return { error: "تعذّر الاتصال بالخادم" };
  }
  if (!reqRes.ok) {
    const body = await reqRes.json().catch(() => ({}));
    return { error: body?.error || "فشل طلب الرفع" };
  }
  const { uploadURL, objectPath } = await reqRes.json();
  try {
    const upRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!upRes.ok) return { error: `فشل رفع الملف (${upRes.status})` };
  } catch {
    return { error: "فشل رفع الملف" };
  }
  return { url: `/api/storage/objects?objectPath=${encodeURIComponent(objectPath)}` };
}

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [transition, setTransition] = useState("fade");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [savingTransition, setSavingTransition] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastErr } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [slidesRes, settingsRes] = await Promise.all([
        adminFetch("/admin/hero-slides"),
        adminFetch("/admin/settings"),
      ]);
      const slidesData = await slidesRes.json();
      const settingsData = await settingsRes.json();
      setSlides(Array.isArray(slidesData) ? slidesData : []);
      if (settingsData?.hero_transition) setTransition(settingsData.hero_transition);
    } catch {
      toastErr("فشل التحميل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video");
      setUploadProgress(`${isVideo ? "⏳ رفع فيديو" : "⏳ رفع صورة"} ${i + 1}/${files.length}...`);
      const result = await uploadFile(file);
      if ("error" in result) { toastErr(result.error); continue; }
      const type = isVideo ? "video" : "image";
      const r = await adminFetch("/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url, type, duration: 6, sortOrder: slides.length + i }),
      });
      if (!r.ok) { toastErr("فشل الحفظ"); }
    }
    setUploading(false);
    setUploadProgress("");
    if (fileRef.current) fileRef.current.value = "";
    load();
    success("✅ تم رفع العناصر");
  };

  const updateDuration = async (slide: HeroSlide, duration: number) => {
    await adminFetch(`/admin/hero-slides/${slide.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration }),
    });
    setSlides(s => s.map(x => x.id === slide.id ? { ...x, duration } : x));
  };

  const moveSlide = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    const order = reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
    setSlides(reordered);
    await adminFetch("/admin/hero-slides/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  };

  const deleteSlide = async (slide: HeroSlide) => {
    const r = await adminFetch(`/admin/hero-slides/${slide.id}`, { method: "DELETE" });
    if (r.ok) { success("تم الحذف"); load(); } else { toastErr("فشل الحذف"); }
    setDeleteTarget(null);
  };

  const saveTransition = async (value: string) => {
    setTransition(value);
    setSavingTransition(true);
    await adminFetch("/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hero_transition: value }),
    });
    setSavingTransition(false);
    success("✅ تم حفظ نوع الانتقال");
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem", color: "#64748b", fontFamily: "Cairo, sans-serif", fontWeight: 600,
  };
  const inputStyle: React.CSSProperties = {
    padding: "0.55rem 0.85rem", borderRadius: "8px", border: "1.5px solid #d0dce8",
    outline: "none", fontSize: "0.92rem", fontFamily: "Cairo, sans-serif",
    color: "#0D1B2A", background: "white", width: "80px",
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.25rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0D1B2A", margin: 0 }}>🎬 خلفية الهيرو — الشرائح</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.35rem" }}>
          ارفع صور أو فيديوهات تظهر كخلفية متحركة في قسم الهيرو
        </p>
      </div>

      {/* Transition selector */}
      <div style={{ ...card, marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0D1B2A" }}>🎭 نوع الانتقال</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          {TRANSITIONS.map(t => (
            <button
              key={t.value}
              onClick={() => saveTransition(t.value)}
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                padding: "0.8rem 1rem", borderRadius: "10px", cursor: "pointer",
                border: `2px solid ${transition === t.value ? "#00AAFF" : "#d0dce8"}`,
                background: transition === t.value ? "rgba(0,170,255,0.06)" : "white",
                fontFamily: "Cairo, sans-serif", textAlign: "right", transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>{t.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: "#0D1B2A", fontSize: "0.9rem" }}>{t.label}</div>
                <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{t.desc}</div>
              </div>
              {transition === t.value && (
                <span style={{ marginRight: "auto", color: "#00AAFF", fontSize: "1.1rem" }}>✓</span>
              )}
            </button>
          ))}
        </div>
        {savingTransition && <div style={{ color: "#64748b", fontSize: "0.82rem" }}>⏳ يتم الحفظ...</div>}
      </div>

      {/* Upload area */}
      <div
        style={{
          ...card, marginBottom: "1.5rem", cursor: "pointer", border: "2px dashed #b0c4de",
          background: "rgba(0,170,255,0.02)", alignItems: "center", textAlign: "center",
          padding: "2rem",
        }}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); }}
        />
        {uploading ? (
          <div style={{ color: "#00AAFF", fontWeight: 700 }}>{uploadProgress || "⏳ جاري الرفع..."}</div>
        ) : (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
            <div style={{ fontWeight: 700, color: "#0D1B2A", fontSize: "1rem" }}>اسحب وأفلت أو اضغط لرفع صور/فيديوهات</div>
            <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "0.35rem" }}>JPG, PNG, WebP, MP4, WebM, MOV</div>
          </>
        )}
      </div>

      {/* Slides list */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>⏳ جاري التحميل...</div>
      ) : slides.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: "0.95rem" }}>
          لا توجد شرائح بعد. ارفع أول صورة أو فيديو ☝️
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {slides.map((slide, i) => (
            <div key={slide.id} style={{ ...card, flexDirection: "row", alignItems: "center", gap: "1rem" }}>
              {/* Thumbnail */}
              <div style={{ width: 90, height: 60, borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#f0f4f8", position: "relative" }}>
                {slide.type === "video" ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1824", color: "white", fontSize: "1.5rem" }}>
                    🎬
                  </div>
                ) : (
                  <img src={toImgUrl(slide.url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                <div style={{ position: "absolute", top: 3, right: 3, background: slide.type === "video" ? "#7c3aed" : "#00AAFF", color: "white", fontSize: "0.62rem", fontWeight: 700, borderRadius: "4px", padding: "1px 5px" }}>
                  {slide.type === "video" ? "فيديو" : "صورة"}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={labelStyle}>الترتيب:</span>
                  <span style={{ fontWeight: 700, color: "#0D1B2A", fontSize: "0.9rem" }}>#{i + 1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={labelStyle}>المدة (ثواني):</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={slide.duration}
                    style={inputStyle}
                    onChange={e => updateDuration(slide, parseInt(e.target.value) || 6)}
                  />
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flexShrink: 0 }}>
                <button
                  onClick={() => moveSlide(i, -1)}
                  disabled={i === 0}
                  style={{ padding: "0.4rem 0.8rem", borderRadius: "7px", border: "1.5px solid #d0dce8", background: "white", cursor: i === 0 ? "not-allowed" : "pointer", opacity: i === 0 ? 0.4 : 1 }}
                  title="تحريك لأعلى"
                >▲</button>
                <button
                  onClick={() => moveSlide(i, 1)}
                  disabled={i === slides.length - 1}
                  style={{ padding: "0.4rem 0.8rem", borderRadius: "7px", border: "1.5px solid #d0dce8", background: "white", cursor: i === slides.length - 1 ? "not-allowed" : "pointer", opacity: i === slides.length - 1 ? 0.4 : 1 }}
                  title="تحريك لأسفل"
                >▼</button>
                <button
                  onClick={() => setDeleteTarget(slide)}
                  style={{ padding: "0.4rem 0.8rem", borderRadius: "7px", border: "1.5px solid #fecaca", background: "#fff5f5", cursor: "pointer", color: "#ef4444" }}
                  title="حذف"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`هل تريد حذف هذه الشريحة؟`}
          onConfirm={() => deleteSlide(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
