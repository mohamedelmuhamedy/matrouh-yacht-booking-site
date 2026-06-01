import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import SeoHead from "../components/SeoHead";
import { apiFetch, apiUrl, resolveApiAssetUrl } from "../lib/api";
import { useSiteData } from "../context/SiteDataContext";

interface ApprovedReview {
  id: string;
  customerName: string;
  rating: number;
  reviewText: string;
  avatarUrl?: string;
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

function uploadReviewImage(file: File, folder: "reviews" | "review-avatars", onProgress: (value: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(`/api/reviews/upload?folder=${encodeURIComponent(folder)}`));
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

function createUploadItem(file: File): UploadItem {
  return {
    id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    localUrl: URL.createObjectURL(file),
    url: "",
    progress: 1,
    status: "uploading",
  };
}

function isValidImage(file: File) {
  return /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 8 * 1024 * 1024;
}

export default function ReviewsPage() {
  const { settings } = useSiteData();
  const [, navigate] = useLocation();
  const [reviews, setReviews] = useState<ApprovedReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [avatar, setAvatar] = useState<UploadItem | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadBusy = uploads.some((item) => item.status === "uploading") || avatar?.status === "uploading";
  const uploadedUrls = uploads.filter((item) => item.status === "done" && item.url).map((item) => item.url);
  const canSubmit = rating > 0 && customerName.trim() && reviewText.trim() && !uploadBusy && !submitting;

  const brandName = settings.brand_name || "DR Travel";
  const logo = settings.logo_url || "https://www.drtravel-matrouh.com/assets/435995000_395786973220549_2208241063212175938_n_1773309907139-rYAs2l-n.jpg";
  const averageRating = reviews.length
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2))
    : 0;

  const reviewSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `صفحة الآراء | ${brandName}`,
      url: "https://www.drtravel-matrouh.com/reviews",
      description: "شارك تجربتك مع دكتور ترافيل واقرأ آراء العملاء الموثوقة عن رحلات اليخت والسفاري في مرسى مطروح.",
      image: logo,
    },
    ...(reviews.length > 0 ? [{
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${brandName} - آراء العملاء`,
      image: logo,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating,
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    }] : []),
  ];

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
    return () => {
      if (avatar) URL.revokeObjectURL(avatar.localUrl);
      uploads.forEach((item) => URL.revokeObjectURL(item.localUrl));
    };
  }, [avatar, uploads]);

  const pickAvatar = (files: FileList | null) => {
    setError("");
    const file = files?.[0];
    if (!file) return;
    if (!isValidImage(file)) {
      setError("اختر صورة JPG أو PNG أو WebP بحجم أقل من 8 MB");
      return;
    }
    if (avatar) URL.revokeObjectURL(avatar.localUrl);
    const item = createUploadItem(file);
    setAvatar(item);
    uploadReviewImage(file, "review-avatars", (progress) => {
      setAvatar((current) => current?.id === item.id ? { ...current, progress } : current);
    })
      .then((url) => setAvatar((current) => current?.id === item.id ? { ...current, url, progress: 100, status: "done" } : current))
      .catch((err) => setAvatar((current) => current?.id === item.id ? { ...current, status: "error", error: err instanceof Error ? err.message : "فشل الرفع" } : current));
  };

  const addFiles = (files: FileList | File[]) => {
    setError("");
    const selected = Array.from(files)
      .filter(isValidImage)
      .slice(0, Math.max(0, MAX_PHOTOS - uploads.length));
    if (selected.length === 0) {
      if (uploads.length >= MAX_PHOTOS) setError("الحد الأقصى 5 صور");
      else setError("اختر صور JPG أو PNG أو WebP بحجم أقل من 8 MB");
      return;
    }

    for (const file of selected) {
      const item = createUploadItem(file);
      setUploads((prev) => [...prev, item]);
      uploadReviewImage(file, "reviews", (progress) => {
        setUploads((prev) => prev.map((x) => x.id === item.id ? { ...x, progress } : x));
      })
        .then((url) => {
          setUploads((prev) => prev.map((x) => x.id === item.id ? { ...x, url, progress: 100, status: "done" } : x));
        })
        .catch((err) => {
          setUploads((prev) => prev.map((x) => x.id === item.id ? { ...x, status: "error", error: err instanceof Error ? err.message : "فشل الرفع" } : x));
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

  const removeAvatar = () => {
    if (avatar) URL.revokeObjectURL(avatar.localUrl);
    setAvatar(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!rating) return setError("اختار تقييم من 1 إلى 5 نجوم");
    if (!customerName.trim()) return setError("اسم العميل مطلوب");
    if (!reviewText.trim()) return setError("نص الرأي مطلوب");
    if (uploadBusy) return setError("انتظر اكتمال رفع الصور");
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          rating,
          reviewText,
          avatarUrl: avatar?.status === "done" ? avatar.url : "",
          photos: uploadedUrls,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "فشل إرسال الرأي");
      setSuccess(true);
      setRating(0);
      setCustomerName("");
      setReviewText("");
      removeAvatar();
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
    <div className="reviews-page" dir="rtl" lang="ar" style={pageStyle}>
      <SeoHead
        title={`صفحة الآراء | ${brandName}`}
        description="شارك تجربتك مع دكتور ترافيل واقرأ آراء العملاء الموثوقة عن رحلات اليخت والسفاري في مرسى مطروح."
        path="/reviews"
        lang="ar"
        image={logo}
        structuredData={reviewSchema}
      />
      <style>{reviewsCss}</style>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "1rem 1rem 3.5rem", position: "relative" }}>
        <button type="button" onClick={() => navigate("/")} className="reviews-back-btn">
          <ArrowLeft size={18} aria-hidden />
          <span>العودة للرئيسية</span>
        </button>

        <header style={{ textAlign: "center", padding: "2.5rem 0 1.35rem" }}>
          <div className="reviews-mark">★</div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.75rem, 7vw, 3rem)", fontWeight: 950, color: "var(--text-primary)" }}>شاركنا رأيك</h1>
          <p style={{ margin: "0.75rem auto 0", maxWidth: 650, color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.98rem" }}>
            رأيك يساعدنا نطوّر التجربة ويساعد مسافرين جدد يختاروا رحلتهم بثقة.
          </p>
        </header>

        <section style={formCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 950, color: "var(--text-primary)" }}>اكتب تقييمك</h2>
              <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.86rem" }}>سيتم نشر الرأي بعد مراجعة الإدارة.</p>
            </div>
            <span className="reviews-soft-pill">QR ready</span>
          </div>

          {success ? (
            <div className="reviews-success">
              <div className="reviews-success-icon">✓</div>
              <h3 style={{ margin: 0, color: "#047857", fontSize: "1.35rem" }}>شكراً! سيتم مراجعة رأيك ونشره قريباً 🙏</h3>
              <button type="button" onClick={() => setSuccess(false)} style={{ ...primaryBtn, marginTop: "1.25rem" }}>إرسال رأي آخر</button>
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
                      className={value <= (hoverRating || rating) ? "review-star active" : "review-star"}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", justifyItems: "center", gap: "0.65rem" }}>
                <label style={label}>صورتك (اختياري)</label>
                <button type="button" onClick={() => avatarRef.current?.click()} className="avatar-picker" aria-label="اختيار صورة شخصية">
                  {avatar ? (
                    <img src={avatar.localUrl} alt="" width={92} height={92} />
                  ) : (
                    <span>{firstLetter(customerName)}</span>
                  )}
                  {avatar?.status === "uploading" && <b>{avatar.progress}%</b>}
                </button>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { pickAvatar(e.target.files); e.currentTarget.value = ""; }} />
                {avatar && (
                  <button type="button" onClick={removeAvatar} className="tiny-link">إزالة الصورة</button>
                )}
                {avatar?.status === "error" && <span style={{ color: "#DC2626", fontWeight: 800, fontSize: "0.8rem" }}>{avatar.error}</span>}
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
                <div style={{ color: reviewText.length > MAX_TEXT - 80 ? "#DC2626" : "var(--text-muted)", fontSize: "0.78rem", textAlign: "left" }}>
                  {reviewText.length}/{MAX_TEXT}
                </div>
              </div>

              <div>
                <label style={label}>صور من الرحلة (اختياري)</label>
                <div
                  className={dragging ? "upload-zone dragging" : "upload-zone"}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
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
                      <div key={item.id} style={previewTile}>
                        <img src={item.localUrl} alt="" width={160} height={160} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeUpload(item.id)} style={removeBtn}>×</button>
                        {item.status !== "done" && (
                          <div style={previewOverlay}>
                            {item.status === "uploading" ? `${item.progress}%` : item.error || "فشل"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={errorBox}>{error}</div>}

              <button type="submit" disabled={!canSubmit} style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                {submitting ? "جارٍ الإرسال..." : uploadBusy ? "جارٍ رفع الصور..." : "إرسال الرأي"}
              </button>
            </form>
          )}
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 950, color: "var(--text-primary)" }}>آراء العملاء</h2>
            <span style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.84rem" }}>{reviews.length} رأي منشور</span>
          </div>

          {loadingReviews ? (
            <div style={emptyBox}>جارٍ تحميل الآراء...</div>
          ) : reviews.length === 0 ? (
            <div style={emptyBox}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.65rem" }}>✦</div>
              كن أول من يشارك تجربته معنا ✨
            </div>
          ) : (
            <div style={{ columns: "270px", columnGap: "1rem" }}>
              {reviews.map((review, index) => (
                <article key={review.id} className="review-card" style={{ animationDelay: `${Math.min(index * 55, 420)}ms` }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
                    {review.avatarUrl ? (
                      <img src={resolveApiAssetUrl(review.avatarUrl) || review.avatarUrl} alt="" width={46} height={46} loading="lazy" style={avatarImage} />
                    ) : (
                      <div style={{ ...avatarFallback, background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>
                        {firstLetter(review.customerName)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 950, color: "var(--text-primary)" }}>{review.customerName}</div>
                      <div style={{ color: "#F59E0B", letterSpacing: 1, direction: "ltr", textAlign: "right" }}>{stars(review.rating)}</div>
                    </div>
                  </div>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.85, whiteSpace: "pre-wrap", margin: "0 0 0.85rem" }}>{review.reviewText}</p>
                  {review.photos?.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: review.photos.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: "0.45rem", marginBottom: "0.85rem" }}>
                      {review.photos.slice(0, 4).map((photo, photoIndex) => (
                        <button key={photo} type="button" onClick={() => setLightbox({ photos: review.photos, index: photoIndex })} style={{ border: "none", padding: 0, background: "transparent", cursor: "zoom-in", position: "relative" }}>
                          <img loading="lazy" src={resolveApiAssetUrl(photo) || photo} alt="" width={340} height={340} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12, display: "block" }} />
                          {photoIndex === 3 && review.photos.length > 4 && (
                            <span style={morePhotosBadge}>+{review.photos.length - 4}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <time style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 800 }}>
                    {new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                  </time>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={lightboxWrap}>
          <button type="button" onClick={() => setLightbox(null)} style={lightboxClose}>×</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.photos.length) % current.photos.length } : null); }} style={lightNav("right")}>‹</button>
          <img src={resolveApiAssetUrl(lightboxPhoto) || lightboxPhoto} alt="" width={1200} height={900} style={{ maxWidth: "100%", maxHeight: "86vh", objectFit: "contain", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.photos.length } : null); }} style={lightNav("left")}>›</button>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, var(--bg-page) 0%, var(--bg-page-2) 100%)",
  backgroundImage: "linear-gradient(180deg, var(--bg-page) 0%, var(--bg-page-2) 100%), repeating-linear-gradient(135deg, rgba(0,170,255,0.055) 0 1px, transparent 1px 18px)",
  backgroundBlendMode: "normal, screen",
  fontFamily: "var(--app-font-sans)",
  color: "var(--text-primary)",
};

const formCard: React.CSSProperties = {
  background: "var(--bg-surface-solid)",
  borderRadius: 24,
  padding: "1.1rem",
  boxShadow: "0 22px 70px rgba(0, 0, 0, 0.14)",
  border: "1px solid var(--border)",
};
const label: React.CSSProperties = { color: "var(--text-primary)", fontWeight: 950, fontSize: "0.9rem" };
const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-strong)",
  borderRadius: 14,
  padding: "0.85rem 0.95rem",
  fontFamily: "Cairo, sans-serif",
  fontSize: "1rem",
  outlineColor: "#00AAFF",
  boxSizing: "border-box",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
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
const previewTile: React.CSSProperties = {
  position: "relative",
  borderRadius: 14,
  overflow: "hidden",
  background: "var(--bg-surface-sunk)",
  aspectRatio: "1/1",
  border: "1px solid var(--border)",
};
const previewOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(15,23,42,0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontWeight: 900,
  fontSize: "0.82rem",
  textAlign: "center",
  padding: "0.35rem",
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
const errorBox: React.CSSProperties = {
  color: "#B91C1C",
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: 12,
  padding: "0.75rem",
  fontWeight: 800,
};
const emptyBox: React.CSSProperties = {
  background: "var(--bg-surface-solid)",
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: "2rem 1rem",
  textAlign: "center",
  color: "var(--text-secondary)",
  fontWeight: 900,
  boxShadow: "0 16px 44px rgba(0,0,0,0.1)",
};
const avatarFallback: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  flexShrink: 0,
};
const avatarImage: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid rgba(0,170,255,0.28)",
  flexShrink: 0,
};
const morePhotosBadge: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 12,
  background: "rgba(15,23,42,0.55)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
};
const lightboxWrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(2,6,23,0.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};
const lightboxClose: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: 16,
  background: "white",
  color: "#0F172A",
  border: "none",
  borderRadius: 999,
  width: 42,
  height: 42,
  fontSize: "1.4rem",
  cursor: "pointer",
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

const reviewsCss = `
.reviews-back-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border);
  background: var(--bg-surface-solid);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.65rem 0.95rem;
  font-family: Cairo, sans-serif;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 12px 34px rgba(0,0,0,0.12);
}
.reviews-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: rgba(0,170,255,0.12);
  color: #00AAFF;
  font-size: 1.6rem;
  font-weight: 900;
  margin-bottom: 0.8rem;
}
.reviews-soft-pill {
  background: rgba(16,185,129,0.12);
  color: #059669;
  border: 1px solid rgba(16,185,129,0.28);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-weight: 900;
  font-size: 0.78rem;
}
.review-star {
  background: transparent;
  border: none;
  color: #CBD5E1;
  font-size: clamp(2.3rem, 12vw, 3.5rem);
  line-height: 1;
  cursor: pointer;
  transform: scale(1);
  transition: transform 0.16s ease, color 0.16s ease, filter 0.16s ease;
  padding: 0.1rem;
}
.review-star.active {
  color: #F59E0B;
  filter: drop-shadow(0 0 10px rgba(245,158,11,0.45));
}
.review-star:hover {
  transform: scale(1.12);
}
.avatar-picker {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 2px dashed rgba(0,170,255,0.45);
  background: var(--bg-surface);
  color: #00AAFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  font-size: 2rem;
  font-weight: 950;
}
.avatar-picker img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-picker b {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,23,42,0.58);
  color: white;
  font-size: 0.9rem;
}
.tiny-link {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: Cairo, sans-serif;
  font-weight: 800;
  cursor: pointer;
}
.upload-zone {
  border: 2px dashed var(--border-strong);
  background: var(--bg-surface);
  border-radius: 18px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  color: var(--text-secondary);
  margin-top: 0.45rem;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.upload-zone.dragging {
  border-color: #00AAFF;
  background: rgba(0,170,255,0.09);
  transform: translateY(-2px);
}
.reviews-success {
  animation: reviewPop 0.35s ease;
  text-align: center;
  padding: 2.2rem 0.5rem;
}
.reviews-success-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(16,185,129,0.14);
  color: #059669;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.6rem;
  font-weight: 950;
  margin-bottom: 0.85rem;
  animation: successPulse 0.65s ease;
}
.review-card {
  display: inline-block;
  width: 100%;
  box-sizing: border-box;
  break-inside: avoid;
  background: var(--bg-surface-solid);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1rem;
  margin: 0 0 1rem;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.12);
  animation: reviewCardIn 0.42s ease both;
}
@keyframes reviewPop {
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to { opacity: 1; transform: none; }
}
@keyframes successPulse {
  0% { transform: scale(.82); opacity: .5; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes reviewCardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
@media (max-width: 560px) {
  .reviews-back-btn {
    position: static;
    margin-top: 0.25rem;
  }
}
`;
