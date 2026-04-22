import { useEffect, useRef, useState, useCallback } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { apiUrl, storageObjectUrl } from "../lib/api";

interface HeroSlide {
  id: number;
  url: string;
  type: string;
  duration: number;
  sortOrder: number;
  isActive: boolean;
  videoStart?: number | null;
  videoEnd?: number | null;
}

function fmtSec(s: number | null | undefined): string {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}`;
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
  return storageObjectUrl(url);
}

async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string } | { error: string }> {
  const token = localStorage.getItem("admin_token");
  const uploadResult = await new Promise<{ ok: boolean; status: number; response: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/admin/storage/upload"));
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, response: xhr.responseText });
    xhr.onerror = () => resolve({ ok: false, status: 0, response: "" });
    xhr.send(file);
  });

  if (!uploadResult.ok) {
    const body = JSON.parse(uploadResult.response || "{}");
    return { error: body?.error || `فشل رفع الملف (${uploadResult.status || "خطأ في الشبكة"})` };
  }
  const { url } = JSON.parse(uploadResult.response);
  return { url };
}

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [transition, setTransition] = useState("fade");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [savingTransition, setSavingTransition] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Trim state: { [slideId]: { start: string, end: string, saving: bool } }
  const [trimEdits, setTrimEdits] = useState<Record<number, { start: string; end: string; saving: boolean }>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const videoPreviewRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const { success, error: toastErr } = useToast();

  const getTrim = useCallback((slide: HeroSlide) => {
    if (trimEdits[slide.id]) return trimEdits[slide.id];
    return {
      start: slide.videoStart != null ? String(slide.videoStart) : "",
      end: slide.videoEnd != null ? String(slide.videoEnd) : "",
      saving: false,
    };
  }, [trimEdits]);

  const setTrimField = (id: number, field: "start" | "end", value: string) => {
    setTrimEdits(prev => {
      const slide = slides.find(s => s.id === id);
      const cur = prev[id] ?? {
        start: slide?.videoStart != null ? String(slide.videoStart) : "",
        end: slide?.videoEnd != null ? String(slide.videoEnd) : "",
        saving: false,
      };
      return { ...prev, [id]: { ...cur, [field]: value } };
    });
  };

  const useCurrentTime = (id: number, field: "start" | "end") => {
    const vid = videoPreviewRefs.current[id];
    if (!vid) return;
    const t = Math.round(vid.currentTime * 10) / 10;
    setTrimField(id, field, String(t));
  };

  const saveTrim = async (slide: HeroSlide) => {
    const trim = getTrim(slide);
    const startVal = trim.start.trim() === "" ? null : parseFloat(trim.start);
    const endVal = trim.end.trim() === "" ? null : parseFloat(trim.end);
    if (endVal != null && startVal != null && endVal <= startVal) {
      toastErr("نهاية التشغيل يجب أن تكون بعد البداية");
      return;
    }
    setTrimEdits(prev => ({ ...prev, [slide.id]: { ...getTrim(slide), saving: true } }));
    const r = await adminFetch(`/admin/hero-slides/${slide.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoStart: startVal, videoEnd: endVal }),
    });
    if (r.ok) {
      setSlides(s => s.map(x => x.id === slide.id ? { ...x, videoStart: startVal, videoEnd: endVal } : x));
      setTrimEdits(prev => {
        const n = { ...prev };
        delete n[slide.id];
        return n;
      });
      success("✅ تم حفظ إعدادات القص");
    } else {
      toastErr("فشل حفظ القص");
    }
    setTrimEdits(prev => prev[slide.id] ? { ...prev, [slide.id]: { ...prev[slide.id], saving: false } } : prev);
  };

  const clearTrim = async (slide: HeroSlide) => {
    const r = await adminFetch(`/admin/hero-slides/${slide.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoStart: null, videoEnd: null }),
    });
    if (r.ok) {
      setSlides(s => s.map(x => x.id === slide.id ? { ...x, videoStart: null, videoEnd: null } : x));
      setTrimEdits(prev => {
        const n = { ...prev };
        delete n[slide.id];
        return n;
      });
      success("تم إزالة القص");
    } else {
      toastErr("فشل إزالة القص");
    }
  };

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
    setUploadPct(0);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video");
      const label = isVideo ? "فيديو" : "صورة";
      setUploadProgress(`${label} ${i + 1}/${files.length}`);
      setUploadPct(0);
      const result = await uploadFile(file, (pct) => setUploadPct(pct));
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
    setUploadPct(0);
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

  const restoreDefaults = async () => {
    setRestoring(true);
    const r = await adminFetch("/admin/hero-slides/restore-defaults", { method: "POST" });
    if (r.ok) { success("✅ تم استعادة الصورة الافتراضية"); load(); } else { toastErr("فشل الاستعادة"); }
    setRestoring(false);
    setRestoreConfirm(false);
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
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0D1B2A", margin: 0 }}>🎬 خلفية الهيرو — الشرائح</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.35rem" }}>
            ارفع صور أو فيديوهات تظهر كخلفية متحركة في قسم الهيرو
          </p>
        </div>
        <button
          onClick={() => setRestoreConfirm(true)}
          disabled={restoring}
          style={{
            display: "flex", alignItems: "center", gap: "0.45rem",
            padding: "0.6rem 1.2rem", borderRadius: "10px",
            border: "1.5px solid #fbbf24", background: "#fffbeb",
            color: "#92400e", cursor: restoring ? "not-allowed" : "pointer",
            fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.88rem",
            opacity: restoring ? 0.6 : 1, transition: "all 0.2s", flexShrink: 0,
          }}
          title="حذف جميع الشرائح واستعادة الصورة الافتراضية"
        >
          🔄 {restoring ? "جاري الاستعادة..." : "استعادة الافتراضي"}
        </button>
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
          <div style={{ width: "100%", textAlign: "center" }}>
            <div style={{ color: "#00AAFF", fontWeight: 700, marginBottom: "0.75rem" }}>
              ⏳ جاري رفع {uploadProgress}... {uploadPct}%
            </div>
            <div style={{ width: "100%", height: "10px", background: "#e2eaf2", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "99px",
                background: "linear-gradient(90deg, #00AAFF, #0066cc)",
                width: `${uploadPct}%`, transition: "width 0.3s ease",
              }} />
            </div>
            <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              لا تغلق الصفحة أثناء الرفع
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
            <div style={{ fontWeight: 700, color: "#0D1B2A", fontSize: "1rem" }}>اسحب وأفلت أو اضغط لرفع صور/فيديوهات</div>
            <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "0.35rem" }}>JPG, PNG, WebP — حتى 15MB · MP4, WebM, MOV — حتى 300MB</div>
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
          {slides.map((slide, i) => {
            const isVideo = slide.type === "video";
            const trim = getTrim(slide);
            const clipLen = trim.start !== "" && trim.end !== ""
              ? Math.max(0, parseFloat(trim.end) - parseFloat(trim.start))
              : null;
            const hasSavedTrim = slide.videoStart != null || slide.videoEnd != null;

            return (
              <div key={slide.id} style={{ ...card, flexDirection: "column", gap: "0.85rem" }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {/* Thumbnail / video preview */}
                  {isVideo ? (
                    <div style={{ width: 140, height: 90, borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#0d1824", position: "relative" }}>
                      <video
                        ref={el => { videoPreviewRefs.current[slide.id] = el; }}
                        src={slide.url}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        muted
                        preload="metadata"
                        controls
                      />
                      <div style={{ position: "absolute", top: 3, right: 3, background: "#7c3aed", color: "white", fontSize: "0.62rem", fontWeight: 700, borderRadius: "4px", padding: "1px 5px", pointerEvents: "none" }}>
                        فيديو
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 90, height: 60, borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#f0f4f8", position: "relative" }}>
                      <img src={toImgUrl(slide.url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", top: 3, right: 3, background: "#00AAFF", color: "white", fontSize: "0.62rem", fontWeight: 700, borderRadius: "4px", padding: "1px 5px" }}>
                        صورة
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={labelStyle}>الترتيب:</span>
                      <span style={{ fontWeight: 700, color: "#0D1B2A", fontSize: "0.9rem" }}>#{i + 1}</span>
                    </div>
                    {!isVideo && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <label style={labelStyle}>المدة (ثواني):</label>
                        <input
                          type="number" min={2} max={60} value={slide.duration}
                          style={inputStyle}
                          onChange={e => updateDuration(slide, parseInt(e.target.value) || 6)}
                        />
                      </div>
                    )}
                    {isVideo && hasSavedTrim && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: "0.72rem", fontWeight: 700, borderRadius: "6px", padding: "2px 8px" }}>
                          ✂️ {fmtSec(slide.videoStart)}ث → {slide.videoEnd != null ? fmtSec(slide.videoEnd) + "ث" : "النهاية"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={() => moveSlide(i, -1)} disabled={i === 0}
                      style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.45rem 0.9rem", borderRadius: "8px", border: "1.5px solid #b0c4de", background: i === 0 ? "#f8fafc" : "#eef4fb", color: i === 0 ? "#b0bec5" : "#1565c0", cursor: i === 0 ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", transition: "all 0.15s" }}
                      title="تحريك لأعلى">▲ أعلى</button>
                    <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}
                      style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.45rem 0.9rem", borderRadius: "8px", border: "1.5px solid #b0c4de", background: i === slides.length - 1 ? "#f8fafc" : "#eef4fb", color: i === slides.length - 1 ? "#b0bec5" : "#1565c0", cursor: i === slides.length - 1 ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", transition: "all 0.15s" }}
                      title="تحريك لأسفل">▼ أسفل</button>
                    <button onClick={() => setDeleteTarget(slide)}
                      style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.45rem 0.9rem", borderRadius: "8px", border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", transition: "all 0.15s" }}
                      title="حذف">🗑️ حذف</button>
                  </div>
                </div>

                {/* Video trim section */}
                {isVideo && (
                  <div style={{ borderTop: "1px solid #e8f0f8", paddingTop: "0.85rem" }}>
                    <div style={{ fontWeight: 700, color: "#4c1d95", fontSize: "0.85rem", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      ✂️ قص الفيديو
                      <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.75rem" }}>— اختر جزءاً محدداً يتكرر في الهيرو</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "flex-end" }}>
                      {/* Start */}
                      <div>
                        <div style={{ ...labelStyle, marginBottom: "0.25rem" }}>البداية (ثواني)</div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <input
                            type="number" min={0} step={0.1} placeholder="0"
                            value={trim.start}
                            style={{ ...inputStyle, width: "80px" }}
                            onChange={e => setTrimField(slide.id, "start", e.target.value)}
                          />
                          <button
                            onClick={() => useCurrentTime(slide.id, "start")}
                            style={{ padding: "0.45rem 0.7rem", borderRadius: "8px", border: "1.5px solid #c4b5fd", background: "#f5f3ff", color: "#7c3aed", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                            title="استخدم الوقت الحالي من المشغّل"
                          >⏱ الوقت الحالي</button>
                        </div>
                      </div>
                      {/* End */}
                      <div>
                        <div style={{ ...labelStyle, marginBottom: "0.25rem" }}>النهاية (ثواني)</div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <input
                            type="number" min={0} step={0.1} placeholder="اتركه فارغاً للنهاية"
                            value={trim.end}
                            style={{ ...inputStyle, width: "80px" }}
                            onChange={e => setTrimField(slide.id, "end", e.target.value)}
                          />
                          <button
                            onClick={() => useCurrentTime(slide.id, "end")}
                            style={{ padding: "0.45rem 0.7rem", borderRadius: "8px", border: "1.5px solid #c4b5fd", background: "#f5f3ff", color: "#7c3aed", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                            title="استخدم الوقت الحالي من المشغّل"
                          >⏱ الوقت الحالي</button>
                        </div>
                      </div>
                      {/* Clip length */}
                      {clipLen != null && (
                        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                          <span style={{ background: "#ecfdf5", color: "#059669", fontSize: "0.8rem", fontWeight: 700, borderRadius: "6px", padding: "0.4rem 0.75rem", border: "1px solid #a7f3d0" }}>
                            مدة الكليب: {clipLen.toFixed(1)} ث
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Save / clear buttons */}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.65rem" }}>
                      <button
                        onClick={() => saveTrim(slide)}
                        disabled={trim.saving}
                        style={{ padding: "0.5rem 1.1rem", borderRadius: "8px", border: "none", background: trim.saving ? "#e5e7eb" : "linear-gradient(135deg, #7c3aed, #4f46e5)", color: trim.saving ? "#9ca3af" : "white", cursor: trim.saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}
                      >{trim.saving ? "⏳ جاري الحفظ..." : "💾 حفظ القص"}</button>
                      {hasSavedTrim && (
                        <button
                          onClick={() => clearTrim(slide)}
                          style={{ padding: "0.5rem 1.1rem", borderRadius: "8px", border: "1.5px solid #d0dce8", background: "white", color: "#64748b", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}
                        >🔄 إزالة القص (فيديو كامل)</button>
                      )}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.73rem", marginTop: "0.4rem" }}>
                      شغّل الفيديو أعلاه ← اضغط "الوقت الحالي" عند اللحظة المطلوبة ← احفظ
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="حذف الشريحة"
        message="هل أنت متأكد من حذف هذه الشريحة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => deleteTarget && deleteSlide(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={restoreConfirm}
        title="استعادة الصورة الافتراضية"
        message="سيتم حذف جميع الشرائح الحالية واستبدالها بالصورة الافتراضية الأصلية. هل أنت متأكد؟"
        confirmLabel="نعم، استعادة"
        cancelLabel="إلغاء"
        danger
        onConfirm={restoreDefaults}
        onCancel={() => setRestoreConfirm(false)}
      />
    </div>
  );
}
