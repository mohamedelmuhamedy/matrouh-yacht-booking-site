import { useEffect, useMemo, useRef, useState } from "react";
import SeoHead from "../components/SeoHead";
import { apiFetch, apiUrl, resolveApiAssetUrl } from "../lib/api";
import { useSiteData } from "../context/SiteDataContext";

interface ApprovedReview {
  id: string;
  customerName: string;
  rating: number;
  reviewText: string;
  photos: string[];
  createdAt: string;
}

interface UploadItem {
  id: string;
  name: string;
  localUrl: string;
  url: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const MAX_TEXT = 1500;
const MAX_PHOTOS = 5;
const AVATAR_COLORS = ["#00AAFF", "#22C55E", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6"];

function stars(count: number) {
  return Array.from({ length: 5 }, (_, i) => i < count ? "★" : "☆").join("");
}

function firstLetter(name: string) {
  return (name.trim()[0] || "؟").toUpperCase();
}

function uploadReviewPhoto(file: File, onProgress: (value: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/reviews/upload"));
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve(String(data.url));
        return;
      }
      reject(new Error(data.error || "فشل رفع الصورة"));
    };
    xhr.onerror = () => reject(new Error("فشل رفع الصورة"));
    xhr.send(file);
  });
}

export default function ReviewsPage() {
  const { settings } = useSiteData();
  const [reviews, setReviews] = useState<ApprovedReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadBusy = uploads.some((item) => item.status === "uploading");
  const uploadedUrls = uploads.filter((item) => item.status === "done" && item.url).map((item) => item.url);
  const canSubmit = rating > 0 && customerName.trim() && reviewText.trim() && !uploadBusy && !submitting;

  const brandName = settings.brand_name || "DR Travel";

  const loadApproved = async () => {
    setLoadingReviews(true);
    try {
      const r = await apiFetch("/api/reviews/approved");
      const data = await r.json();
      if (Array.isArray(data)) setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    void loadApproved();
  }, []);

  useEffect(() => {
    return () => uploads.forEach((item) => URL.revokeObjectURL(item.localUrl));
  }, [uploads]);

  const addFiles = (files: FileList | File[]) => {
    setError("");
    const selected = Array.from(files)
      .filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type))
      .slice(0, Math.max(0, MAX_PHOTOS - uploads.length));
    if (selected.length === 0) {
      if (uploads.length >= MAX_PHOTOS) setError("الحد الأقصى 5 صور");
      else setError("اختر صور JPG أو PNG أو WebP فقط");
      return;
    }

    for (const file of selected) {
      if (file.size > 8 * 1024 * 1024) {
        setError("حجم كل صورة يجب ألا يتجاوز 8 MB");
        continue;
      }
      const id = `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`;
      const localUrl = URL.createObjectURL(file);
      const item: UploadItem = { id, name: file.name, localUrl, url: "", progress: 1, status: "uploading" };
      setUploads((prev) => [...prev, item]);
      uploadReviewPhoto(file, (progress) => {
        setUploads((prev) => prev.map((x) => x.id === id ? { ...x, progress } : x));
      })
        .then((url) => {
          setUploads((prev) => prev.map((x) => x.id === id ? { ...x, url, progress: 100, status: "done" } : x));
        })
        .catch((err) => {
          setUploads((prev) => prev.map((x) => x.id === id ? { ...x, status: "error", error: err instanceof Error ? err.message : "فشل الرفع" } : x));
        });
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.localUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!rating) {
      setError("اختار تقييم من 1 إلى 5 نجوم");
      return;
    }
    if (!customerName.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }
    if (!reviewText.trim()) {
      setError("نص الرأي مطلوب");
      return;
    }
    if (uploadBusy) {
      setError("انتظر اكتمال رفع الصور");
      return;
    }
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          rating,
          reviewText,
          photos: uploadedUrls,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "فشل إرسال الرأي");
      setSuccess(true);
      setRating(0);
      setCustomerName("");
      setReviewText("");
      setUploads((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.localUrl));
        return [];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إرسال الرأي");
    } finally {
      setSubmitting(false);
    }
  };

  const lightboxPhoto = useMemo(() => {
    if (!lightbox) return "";
    return lightbox.photos[lightbox.index] || "";
  }, [lightbox]);

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8FBFF", fontFamily: "Cairo, sans-serif", color: "#0D1B2A" }}>
      <SeoHead
        title={`صفحة الآراء | ${brandName}`}
        description="شارك تجربتك مع دكتور ترافيل واقرأ آراء العملاء."
        path="/reviews"
        lang="ar"
        image={settings.logo_url || undefined}
      />

      <main style={{ maxWidth: 1060, margin: "0 auto", padding: "1rem 1rem 3rem" }}>
        <header style={{ textAlign: "center", padding: "1.75rem 0 1.2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: "50%", background: "#E0F2FE", color: "#0284C7", fontSize: "1.6rem", fontWeight: 900, marginBottom: "0.8rem" }}>
            ★
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.65rem, 7vw, 3rem)", fontWeight: 950, color: "#0D1B2A" }}>شاركنا رأيك</h1>
          <p style={{ margin: "0.65rem auto 0", maxWidth: 620, color: "#526173", lineHeight: 1.8, fontSize: "0.98rem" }}>
            رأيك يساعدنا نطوّر التجربة ويساعد مسافرين جدد يختاروا رحلتهم بثقة.
          </p>
        </header>

        <section style={formCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 950 }}>اكتب تقييمك</h2>
              <p style={{ margin: "0.25rem 0 0", color: "#64748B", fontSize: "0.86rem" }}>سيتم نشر الرأي بعد مراجعة الإدارة.</p>
            </div>
            <span style={{ background: "#ECFDF5", color: "#047857", border: "1px solid #BBF7D0", borderRadius: 999, padding: "0.35rem 0.75rem", fontWeight: 900, fontSize: "0.78rem" }}>
              QR ready
            </span>
          </div>

          {success ? (
            <div style={{ animation: "reviewPop 0.35s ease", textAlign: "center", padding: "2.2rem 0.5rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✓</div>
              <h3 style={{ margin: 0, color: "#047857", fontSize: "1.35rem" }}>شكراً! سيتم مراجعة رأيك ونشره قريباً 🙏</h3>
              <button type="button" onClick={() => setSuccess(false)} style={{ ...primaryBtn, marginTop: "1.25rem" }}>إرسال رأي آخر</button>
              <style>{`@keyframes reviewPop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}`}</style>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={label}>التقييم</label>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", direction: "ltr", padding: "0.35rem 0" }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} stars`}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: value <= (hoverRating || rating) ? "#F59E0B" : "#CBD5E1",
                        fontSize: "clamp(2.3rem, 12vw, 3.5rem)",
                        lineHeight: 1,
                        cursor: "pointer",
                        transform: value === (hoverRating || rating) ? "scale(1.12)" : "scale(1)",
                        transition: "transform 0.16s ease, color 0.16s ease",
                        padding: "0.1rem",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: "0.45rem" }}>
                <label style={label}>اسم العميل</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required maxLength={120} placeholder="اكتب اسمك" style={input} />
              </div>

              <div style={{ display: "grid", gap: "0.45rem" }}>
                <label style={label}>رأيك في التجربة</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value.slice(0, MAX_TEXT))}
                  required
                  maxLength={MAX_TEXT}
                  placeholder="احكي لنا عن رحلتك..."
                  style={{ ...input, minHeight: 135, resize: "vertical", lineHeight: 1.8 }}
                />
                <div style={{ color: reviewText.length > MAX_TEXT - 80 ? "#DC2626" : "#64748B", fontSize: "0.78rem", textAlign: "left" }}>
                  {reviewText.length}/{MAX_TEXT}
                </div>
              </div>

              <div>
                <label style={label}>صور من الرحلة (اختياري)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? "#00AAFF" : "#CBD5E1"}`,
                    background: dragging ? "#EFF6FF" : "#F8FAFC",
                    borderRadius: 18,
                    padding: "1.2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    color: "#475569",
                    marginTop: "0.45rem",
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ""; }}
                  />
                  <div style={{ fontWeight: 950, marginBottom: "0.25rem" }}>اضغط لاختيار الصور</div>
                  <div style={{ fontSize: "0.82rem" }}>حتى 5 صور، JPG / PNG / WebP</div>
                </div>

                {uploads.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: "0.75rem", marginTop: "0.85rem" }}>
                    {uploads.map((item) => (
                      <div key={item.id} style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#E2E8F0", aspectRatio: "1/1", border: "1px solid #E2E8F0" }}>
                        <img src={item.localUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeUpload(item.id)} style={removeBtn}>×</button>
                        {item.status !== "done" && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.58)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "0.82rem", textAlign: "center", padding: "0.35rem" }}>
                            {item.status === "uploading" ? `${item.progress}%` : item.error || "فشل"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={{ color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "0.75rem", fontWeight: 800 }}>{error}</div>}

              <button type="submit" disabled={!canSubmit} style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                {submitting ? "جارٍ الإرسال..." : uploadBusy ? "جارٍ رفع الصور..." : "إرسال الرأي"}
              </button>
            </form>
          )}
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 950 }}>آراء العملاء</h2>
            <span style={{ color: "#64748B", fontWeight: 800, fontSize: "0.84rem" }}>{reviews.length} رأي منشور</span>
          </div>

          {loadingReviews ? (
            <div style={emptyBox}>جارٍ تحميل الآراء...</div>
          ) : reviews.length === 0 ? (
            <div style={emptyBox}>كن أول من يشارك تجربته معنا ✨</div>
          ) : (
            <div style={{ columns: "260px", columnGap: "1rem" }}>
              {reviews.map((review, index) => (
                <article key={review.id} style={reviewCard}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: AVATAR_COLORS[index % AVATAR_COLORS.length], color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950 }}>
                      {firstLetter(review.customerName)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 950 }}>{review.customerName}</div>
                      <div style={{ color: "#F59E0B", letterSpacing: 1, direction: "ltr", textAlign: "right" }}>{stars(review.rating)}</div>
                    </div>
                  </div>
                  <p style={{ color: "#334155", lineHeight: 1.85, whiteSpace: "pre-wrap", margin: "0 0 0.85rem" }}>{review.reviewText}</p>
                  {review.photos?.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: review.photos.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: "0.45rem", marginBottom: "0.85rem" }}>
                      {review.photos.slice(0, 4).map((photo, photoIndex) => (
                        <button key={photo} type="button" onClick={() => setLightbox({ photos: review.photos, index: photoIndex })} style={{ border: "none", padding: 0, background: "transparent", cursor: "zoom-in", position: "relative" }}>
                          <img loading="lazy" src={resolveApiAssetUrl(photo) || photo} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12, display: "block" }} />
                          {photoIndex === 3 && review.photos.length > 4 && (
                            <span style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(15,23,42,0.55)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950 }}>
                              +{review.photos.length - 4}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <time style={{ color: "#94A3B8", fontSize: "0.78rem", fontWeight: 800 }}>
                    {new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                  </time>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(2,6,23,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <button type="button" onClick={() => setLightbox(null)} style={{ position: "fixed", top: 16, left: 16, background: "white", color: "#0F172A", border: "none", borderRadius: 999, width: 42, height: 42, fontSize: "1.4rem", cursor: "pointer" }}>×</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.photos.length) % current.photos.length } : null); }} style={lightNav("right")}>‹</button>
          <img src={resolveApiAssetUrl(lightboxPhoto) || lightboxPhoto} alt="" style={{ maxWidth: "100%", maxHeight: "86vh", objectFit: "contain", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.photos.length } : null); }} style={lightNav("left")}>›</button>
        </div>
      )}
    </div>
  );
}

const formCard: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: "1.1rem",
  boxShadow: "0 18px 60px rgba(15, 23, 42, 0.09)",
  border: "1px solid #E2E8F0",
};
const label: React.CSSProperties = { color: "#0F172A", fontWeight: 950, fontSize: "0.9rem" };
const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid #CBD5E1",
  borderRadius: 14,
  padding: "0.85rem 0.95rem",
  fontFamily: "Cairo, sans-serif",
  fontSize: "1rem",
  outlineColor: "#00AAFF",
  boxSizing: "border-box",
  background: "#FFFFFF",
};
const primaryBtn: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 16,
  padding: "1rem",
  background: "linear-gradient(135deg,#00AAFF,#0066CC)",
  color: "white",
  fontFamily: "Cairo, sans-serif",
  fontWeight: 950,
  fontSize: "1rem",
  boxShadow: "0 14px 32px rgba(0, 170, 255, 0.28)",
};
const removeBtn: React.CSSProperties = {
  position: "absolute",
  top: 6,
  left: 6,
  width: 24,
  height: 24,
  border: "none",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.92)",
  color: "#0F172A",
  fontWeight: 950,
  cursor: "pointer",
};
const emptyBox: React.CSSProperties = {
  background: "white",
  border: "1px solid #E2E8F0",
  borderRadius: 20,
  padding: "2rem 1rem",
  textAlign: "center",
  color: "#64748B",
  fontWeight: 900,
};
const reviewCard: React.CSSProperties = {
  display: "inline-block",
  width: "100%",
  boxSizing: "border-box",
  breakInside: "avoid",
  background: "white",
  border: "1px solid #E2E8F0",
  borderRadius: 20,
  padding: "1rem",
  margin: "0 0 1rem",
  boxShadow: "0 12px 34px rgba(15, 23, 42, 0.07)",
};
function lightNav(side: "left" | "right"): React.CSSProperties {
  return {
    position: "fixed",
    top: "50%",
    [side]: 16,
    transform: "translateY(-50%)",
    width: 46,
    height: 46,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.92)",
    color: "#0F172A",
    fontSize: "2rem",
    cursor: "pointer",
    lineHeight: 1,
  };
}
