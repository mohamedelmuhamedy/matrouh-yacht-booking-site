import { useEffect, useRef, useState } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { apiUrl, resolveApiAssetUrl } from "../lib/api";

function isYoutubeUrl(url: string) { return /youtube\.com|youtu\.be/.test(url); }
function getYoutubeThumbnailUrl(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

interface GalleryItem { id: number; albumId: number; url: string; type: string; caption: string; size: string; sortOrder: number; }

const SIZES = [
  { value: "normal", label: "طبيعي" },
  { value: "wide",   label: "عريض"  },
  { value: "square", label: "مربع"  },
  { value: "large",  label: "كبير"  },
];
interface GalleryAlbum { id: number; slug: string; titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; coverImage: string; isVisible: boolean; sortOrder: number; items?: GalleryItem[]; }

const dark = {
  card: "#1a2535", input: "#0d1824", border: "rgba(255,255,255,0.12)",
  label: "rgba(255,255,255,0.75)", text: "#ffffff", sub: "rgba(255,255,255,0.45)",
};

const EMPTY_ALBUM = { slug: "", titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", coverImage: "", isVisible: true, sortOrder: 0 };

function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);
  const [albumForm, setAlbumForm] = useState({ ...EMPTY_ALBUM });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [confirmDelAlbum, setConfirmDelAlbum] = useState<GalleryAlbum | null>(null);
  const [openAlbum, setOpenAlbum] = useState<GalleryAlbum | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadErr, setUploadErr] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [confirmDelItem, setConfirmDelItem] = useState<GalleryItem | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [pendingSize, setPendingSize] = useState("normal");
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const { success, error: toastErr } = useToast();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.7rem 0.9rem", borderRadius: "8px",
    border: `1.5px solid ${dark.border}`, outline: "none", fontSize: "0.9rem",
    fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
    background: dark.input, color: dark.text,
  };

  const load = () => {
    setLoading(true); setErr("");
    adminFetch("/admin/gallery/albums")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setAlbums(Array.isArray(d) ? d : []))
      .catch(e => setErr(e.message || "فشل التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAlbumItems = (album: GalleryAlbum) => {
    setOpenAlbum(album);
    setItemsLoading(true);
    adminFetch(`/admin/gallery/albums/${album.id}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  };

  const openNew = () => { setEditingAlbum(null); setAlbumForm({ ...EMPTY_ALBUM }); setSaveErr(""); setShowAlbumForm(true); };
  const openEdit = (a: GalleryAlbum) => { setEditingAlbum(a); setAlbumForm({ slug: a.slug, titleAr: a.titleAr, titleEn: a.titleEn, descriptionAr: a.descriptionAr, descriptionEn: a.descriptionEn, coverImage: a.coverImage, isVisible: a.isVisible, sortOrder: a.sortOrder }); setSaveErr(""); setShowAlbumForm(true); };

  const saveAlbum = async () => {
    if (!albumForm.titleAr.trim() || !albumForm.titleEn.trim() || !albumForm.slug.trim()) { setSaveErr("العنوان (عربي وإنجليزي) والمعرف مطلوبة"); return; }
    setSaving(true); setSaveErr("");
    try {
      const method = editingAlbum ? "PUT" : "POST";
      const url = editingAlbum ? `/admin/gallery/albums/${editingAlbum.id}` : "/admin/gallery/albums";
      const r = await adminFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(albumForm) });
      const d = await r.json();
      if (!r.ok) { setSaveErr(d.error || "فشل الحفظ"); return; }
      success(editingAlbum ? "تم تحديث الألبوم" : "تم إنشاء الألبوم");
      setShowAlbumForm(false); load();
    } catch { setSaveErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  const deleteAlbum = async (a: GalleryAlbum) => {
    const r = await adminFetch(`/admin/gallery/albums/${a.id}`, { method: "DELETE" });
    if (r.ok) { success("تم حذف الألبوم"); load(); } else { toastErr("فشل الحذف"); }
  };

  const toggleVisible = async (a: GalleryAlbum) => {
    const r = await adminFetch(`/admin/gallery/albums/${a.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, isVisible: !a.isVisible }),
    });
    if (r.ok) { success(a.isVisible ? "أُخفي الألبوم" : "أُظهر الألبوم"); load(); }
    else { toastErr("فشل التحديث"); }
  };

  const uploadFile = (file: File, onProgress?: (pct: number) => void): Promise<{ url: string } | { error: string }> => {
    return new Promise((resolve) => {
      const token = localStorage.getItem("admin_token");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", apiUrl("/api/admin/storage/upload"));
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("X-Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { publicUrl, url } = JSON.parse(xhr.responseText);
            resolve({ url: publicUrl || url });
          }
          catch { resolve({ error: "خطأ في استجابة الخادم" }); }
        } else {
          try { resolve({ error: JSON.parse(xhr.responseText)?.error || `فشل الرفع (${xhr.status})` }); }
          catch { resolve({ error: `فشل الرفع (${xhr.status})` }); }
        }
      };
      xhr.onerror = () => resolve({ error: "خطأ في الاتصال بالخادم" });
      xhr.send(file);
    });
  };

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    const result = await uploadFile(file);
    if ("url" in result) setAlbumForm(f => ({ ...f, coverImage: result.url }));
    else toastErr(result.error);
    setCoverUploading(false);
  };

  const uploadItemFile = async (file: File) => {
    if (!openAlbum) return;
    const isVideo = file.type.startsWith("video");
    setUploading(true); setUploadErr("");
    setUploadProgress(isVideo ? "⏳ جاري رفع الفيديو... 0%" : "⏳ جاري رفع الصورة... 0%");
    const result = await uploadFile(file, (pct) => {
      setUploadProgress(isVideo ? `⏳ جاري رفع الفيديو... ${pct}%` : `⏳ جاري رفع الصورة... ${pct}%`);
    });
    if ("error" in result) { setUploadErr(result.error); setUploading(false); setUploadProgress(""); return; }
    setUploadProgress("💾 جاري الحفظ...");
    const type = isVideo ? "video" : "image";
    const r = await adminFetch(`/admin/gallery/albums/${openAlbum.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: result.url, type, caption: "", size: pendingSize, sortOrder: items.length }),
    });
    if (r.ok) { success(type === "video" ? "✅ تم رفع الفيديو بنجاح" : "✅ تمت إضافة الصورة"); openAlbumItems(openAlbum); }
    else { setUploadErr("فشل حفظ العنصر في الألبوم"); }
    setUploading(false); setUploadProgress("");
  };

  const addVideoUrl = async () => {
    if (!openAlbum || !videoUrl.trim()) return;
    setAddingVideo(true);
    const r = await adminFetch(`/admin/gallery/albums/${openAlbum.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl.trim(), type: "video", caption: videoCaption.trim(), size: pendingSize, sortOrder: items.length }),
    });
    if (r.ok) { success("تمت الإضافة"); setVideoUrl(""); setVideoCaption(""); openAlbumItems(openAlbum); }
    else { toastErr("فشل الإضافة"); }
    setAddingVideo(false);
  };

  const deleteItem = async (item: GalleryItem) => {
    const r = await adminFetch(`/admin/gallery/items/${item.id}`, { method: "DELETE" });
    if (r.ok && openAlbum) { success("تم الحذف"); openAlbumItems(openAlbum); } else { toastErr("فشل الحذف"); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "#00AAFF", fontFamily: "Cairo, sans-serif" }}>
      <div>⏳ جاري التحميل...</div>
    </div>
  );

  if (err) return (
    <div style={{ padding: "2rem", color: "#ff6b6b", fontFamily: "Cairo, sans-serif", textAlign: "center" }}>
      <div>{err}</div>
      <button onClick={load} style={{ marginTop: "1rem", background: "#00AAFF", color: "white", border: "none", padding: "0.5rem 1.5rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>إعادة المحاولة</button>
    </div>
  );

  if (openAlbum) return (
    <div style={{ maxWidth: 900, margin: "0 auto", direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => { setOpenAlbum(null); setItems([]); }}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
          ← رجوع
        </button>
        <h2 style={{ margin: 0, color: "#00AAFF", fontSize: "1.2rem" }}>{openAlbum.titleAr}</h2>
      </div>

      <div style={{ background: dark.card, borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem", border: `1px solid ${dark.border}` }}>
        <div style={{ color: dark.label, fontWeight: 700, marginBottom: "1rem", fontSize: "0.95rem" }}>➕ إضافة صور / فيديو</div>

        {/* Size selector */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ color: dark.sub, fontSize: "0.8rem", marginBottom: "0.5rem" }}>📐 حجم العرض في المعرض</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {SIZES.map(s => (
              <button key={s.value} onClick={() => setPendingSize(s.value)}
                style={{ padding: "0.35rem 0.9rem", borderRadius: 20, fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", border: pendingSize === s.value ? "none" : `1px solid ${dark.border}`, background: pendingSize === s.value ? "#00AAFF" : "rgba(255,255,255,0.04)", color: pendingSize === s.value ? "white" : dark.sub }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <input ref={fileRef} type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { uploadItemFile(f); e.target.value = ""; } }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ background: uploading ? "#334155" : "#00AAFF", color: "white", border: "none", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", transition: "background 0.2s" }}>
            {uploading ? "جاري الرفع..." : "📁 رفع صورة / فيديو"}
          </button>
        </div>
        <div style={{ fontSize: "0.75rem", color: dark.sub, marginBottom: "0.75rem" }}>
          الصور: JPEG, PNG, WebP, GIF (حتى 15 MB) · الفيديو: MP4, WebM, MOV (حتى 300 MB)
        </div>
        {uploadProgress && <div style={{ color: "#00AAFF", fontSize: "0.82rem", marginBottom: "0.5rem", fontWeight: 700 }}>{uploadProgress}</div>}
        {uploadErr && (
          <div style={{ color: "#ff6b6b", fontSize: "0.82rem", marginBottom: "0.75rem", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
            ⚠️ {uploadErr}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${dark.border}`, paddingTop: "1rem" }}>
          <div style={{ color: dark.sub, fontSize: "0.82rem", marginBottom: "0.5rem" }}>أو أضف رابط فيديو (YouTube / مباشر)</div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/embed/..."
              style={{ ...inputStyle, flex: "1 1 220px" }} />
            <input value={videoCaption} onChange={e => setVideoCaption(e.target.value)}
              placeholder="وصف الفيديو (اختياري)"
              style={{ ...inputStyle, flex: "1 1 160px" }} />
            <button onClick={addVideoUrl} disabled={addingVideo || !videoUrl.trim()}
              style={{ background: "#C9A84C", color: "white", border: "none", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", whiteSpace: "nowrap" }}>
              {addingVideo ? "..." : "إضافة"}
            </button>
          </div>
        </div>
      </div>

      {itemsLoading ? (
        <div style={{ color: "#00AAFF", textAlign: "center", padding: "2rem" }}>⏳ جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: dark.sub, background: dark.card, borderRadius: 12, border: `1px dashed ${dark.border}` }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🖼️</div>
          <div>لا توجد صور في هذا الألبوم بعد</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "0.85rem" }}>
          {items.map(item => {
            const currentSize = item.size || "normal";
            const isUpdating = updatingItemId === item.id;

            const changeSize = async (newSize: string) => {
              setUpdatingItemId(item.id);
              await adminFetch(`/admin/gallery/items/${item.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caption: item.caption, size: newSize, sortOrder: item.sortOrder }),
              });
              setItems(prev => prev.map(it => it.id === item.id ? { ...it, size: newSize } : it));
              setUpdatingItemId(null);
            };

            return (
              <div key={item.id} style={{ background: dark.card, borderRadius: 10, overflow: "hidden", border: `1px solid ${dark.border}`, position: "relative" }}>
                {/* Preview */}
                <div style={{ aspectRatio: "1", overflow: "hidden", background: "#0d1824", position: "relative" }}>
                  {item.type === "video" ? (
                    isYoutubeUrl(item.url) ? (
                      <>
                        <img src={getYoutubeThumbnailUrl(item.url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "1.75rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.7))" }}>▶</span>
                        </div>
                      </>
                    ) : (
                      <video src={resolveApiAssetUrl(item.url)} preload="metadata" muted playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                    )
                  ) : (
                    <img src={resolveApiAssetUrl(item.url)} alt={item.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>

                {/* Size pills */}
                <div style={{ padding: "0.5rem 0.45rem 0.45rem", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {SIZES.map(s => (
                    <button key={s.value} onClick={() => changeSize(s.value)} disabled={isUpdating}
                      title={`تغيير الحجم إلى ${s.label}`}
                      style={{ padding: "0.18rem 0.5rem", borderRadius: 20, fontFamily: "Cairo, sans-serif", fontSize: "0.68rem", fontWeight: 700, cursor: isUpdating ? "wait" : "pointer", transition: "all 0.15s", border: currentSize === s.value ? "none" : `1px solid rgba(255,255,255,0.15)`, background: currentSize === s.value ? "#00AAFF" : "rgba(255,255,255,0.04)", color: currentSize === s.value ? "white" : "rgba(255,255,255,0.4)", opacity: isUpdating ? 0.5 : 1 }}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Delete */}
                <button onClick={() => setConfirmDelItem(item)}
                  style={{ position: "absolute", top: 4, left: 4, background: "rgba(220,38,38,0.85)", border: "none", borderRadius: 6, color: "white", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>
                  ✕
                </button>
                {item.type === "video" && (
                  <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(201,168,76,0.9)", borderRadius: 6, padding: "2px 6px", fontSize: "0.65rem", color: "white", fontWeight: 700 }}>
                    فيديو
                  </div>
                )}
                {isUpdating && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#00AAFF", fontSize: "1.2rem" }}>⏳</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelItem !== null}
        title={confirmDelItem?.type === "video" ? "حذف الفيديو" : "حذف الصورة"}
        message={`هل أنت متأكد من حذف ${confirmDelItem?.type === "video" ? "هذا الفيديو" : "هذه الصورة"}؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={() => { if (confirmDelItem) { deleteItem(confirmDelItem); setConfirmDelItem(null); } }}
        onCancel={() => setConfirmDelItem(null)}
        danger
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0D1B2A" }}>🖼️ المعرض</h1>
        <button onClick={openNew}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", padding: "0.65rem 1.5rem", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(0,170,255,0.3)" }}>
          + ألبوم جديد
        </button>
      </div>

      {albums.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: 12, border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🖼️</div>
          <div style={{ color: "#64748b", fontSize: "1.05rem", marginBottom: "1.5rem" }}>لا توجد ألبومات بعد. أنشئ ألبومك الأول!</div>
          <button onClick={openNew} style={{ background: "#00AAFF", color: "white", border: "none", padding: "0.75rem 2rem", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
            + إنشاء ألبوم
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" }}>
          {albums.map(album => (
            <div key={album.id} style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0", transition: "box-shadow 0.2s" }}>
              <div style={{ position: "relative", height: 160, background: "#f1f5f9", overflow: "hidden", cursor: "pointer" }}
                onClick={() => openAlbumItems(album)}>
                {album.coverImage ? (
                  <img src={resolveApiAssetUrl(album.coverImage)} alt={album.titleAr} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { (e.target as HTMLImageElement).src = ""; }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: "3rem" }}>🏔️</div>
                )}
                {!album.isVisible && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ background: "#0D1B2A", color: "rgba(255,255,255,0.7)", padding: "0.3rem 0.75rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700 }}>مخفي</span>
                  </div>
                )}
              </div>
              <div style={{ padding: "0.9rem 1rem" }}>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0D1B2A", marginBottom: "0.2rem" }}>{album.titleAr}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem" }}>{album.titleEn}</div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button onClick={() => openAlbumItems(album)}
                    style={{ flex: 1, background: "#00AAFF", color: "white", border: "none", padding: "0.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                    📂 الصور
                  </button>
                  <button onClick={() => openEdit(album)}
                    style={{ background: "#f1f5f9", color: "#0D1B2A", border: "1px solid #e2e8f0", padding: "0.5rem 0.75rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                    ✏️
                  </button>
                  <button onClick={() => toggleVisible(album)}
                    style={{ background: album.isVisible ? "#dcfce7" : "#f1f5f9", color: album.isVisible ? "#166534" : "#64748b", border: `1px solid ${album.isVisible ? "#86efac" : "#e2e8f0"}`, padding: "0.5rem 0.75rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                    {album.isVisible ? "👁️" : "🙈"}
                  </button>
                  <button onClick={() => setConfirmDelAlbum(album)}
                    style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "0.5rem 0.75rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAlbumForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setShowAlbumForm(false); }}>
          <div style={{ background: dark.card, borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, color: "#00AAFF", fontSize: "1.15rem" }}>{editingAlbum ? "تعديل الألبوم" : "ألبوم جديد"}</h2>
              <button onClick={() => setShowAlbumForm(false)} style={{ background: "none", border: "none", color: dark.sub, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>العنوان بالعربية *</label>
                <input value={albumForm.titleAr} onChange={e => {
                  const v = e.target.value;
                  setAlbumForm(f => ({ ...f, titleAr: v, slug: editingAlbum ? f.slug : slugify(v) }));
                }} style={inputStyle} placeholder="رحلات اليخت الفاخرة" />
              </div>
              <div>
                <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>Title in English *</label>
                <input value={albumForm.titleEn} onChange={e => setAlbumForm(f => ({ ...f, titleEn: e.target.value }))} style={{ ...inputStyle, direction: "ltr" }} placeholder="Luxury Yacht Trips" />
              </div>
              <div>
                <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>Slug *</label>
                <input value={albumForm.slug} onChange={e => setAlbumForm(f => ({ ...f, slug: slugify(e.target.value) }))} style={{ ...inputStyle, direction: "ltr" }} placeholder="luxury-yacht-trips" />
              </div>
              <div>
                <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>الوصف بالعربية</label>
                <textarea value={albumForm.descriptionAr} onChange={e => setAlbumForm(f => ({ ...f, descriptionAr: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="وصف الألبوم..." />
              </div>
              <div>
                <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>Description in English</label>
                <textarea value={albumForm.descriptionEn} onChange={e => setAlbumForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={2} style={{ ...inputStyle, direction: "ltr", resize: "vertical" }} placeholder="Album description..." />
              </div>
              <div>
                <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>صورة الغلاف</label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  {albumForm.coverImage && (
                    <img src={resolveApiAssetUrl(albumForm.coverImage)} alt="cover" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: `1px solid ${dark.border}` }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { uploadCover(f); e.target.value = ""; } }} />
                  <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
                    style={{ background: coverUploading ? "#555" : "rgba(0,170,255,0.15)", border: "1px solid rgba(0,170,255,0.3)", color: "#00AAFF", padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", fontWeight: 700 }}>
                    {coverUploading ? "جاري الرفع..." : "📁 رفع صورة"}
                  </button>
                  <input value={albumForm.coverImage} onChange={e => setAlbumForm(f => ({ ...f, coverImage: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, fontSize: "0.78rem", direction: "ltr" }} placeholder="أو أدخل URL الصورة" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: dark.label, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>ترتيب العرض</label>
                  <input type="number" value={albumForm.sortOrder} onChange={e => setAlbumForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} style={{ ...inputStyle, direction: "ltr" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
                  <label style={{ color: dark.label, fontSize: "0.85rem", fontWeight: 700 }}>ظاهر للزوار</label>
                  <button type="button" onClick={() => setAlbumForm(f => ({ ...f, isVisible: !f.isVisible }))}
                    style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: albumForm.isVisible ? "#22c55e" : "#64748b", position: "relative", transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 3, width: 18, height: 18, background: "white", borderRadius: "50%", transition: "right 0.2s, left 0.2s", right: albumForm.isVisible ? 3 : "auto", left: albumForm.isVisible ? "auto" : 3 }} />
                  </button>
                </div>
              </div>

              {saveErr && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", background: "rgba(220,38,38,0.1)", padding: "0.6rem 0.9rem", borderRadius: 8 }}>{saveErr}</div>}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-start", paddingTop: "0.5rem" }}>
                <button onClick={saveAlbum} disabled={saving}
                  style={{ background: saving ? "#555" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", padding: "0.75rem 2rem", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.9rem" }}>
                  {saving ? "جاري الحفظ..." : (editingAlbum ? "حفظ التعديلات" : "إنشاء الألبوم")}
                </button>
                <button onClick={() => setShowAlbumForm(false)}
                  style={{ background: "transparent", border: `1px solid ${dark.border}`, color: dark.label, padding: "0.75rem 1.5rem", borderRadius: 10, cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelAlbum !== null}
        title="حذف الألبوم"
        message={`هل أنت متأكد من حذف ألبوم "${confirmDelAlbum?.titleAr}" وجميع صوره وفيديوهاته؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف الألبوم"
        cancelLabel="إلغاء"
        onConfirm={() => { if (confirmDelAlbum) { deleteAlbum(confirmDelAlbum); setConfirmDelAlbum(null); } }}
        onCancel={() => setConfirmDelAlbum(null)}
        danger
      />
    </div>
  );
}
