import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { apiFetch, apiUrl } from "../lib/api";

interface BookingInfo {
  bookingId: number; customerName: string; packageName: string; date: string;
  alreadyReviewed: boolean; review: any;
}

export default function ReviewPage() {
  const { token } = useParams() as { token: string };
  const [, navigate] = useLocation();
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hover, setHover] = useState(0);
  const [photos, setPhotos] = useState<{ id: number; photoUrl: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setPhotoMsg("نوع الصورة غير مدعوم (JPG / PNG / WebP فقط)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoMsg("حجم الصورة كبير (الحد 8 MB)");
      return;
    }
    setUploading(true); setPhotoMsg("");
    try {
      const r = await fetch(apiUrl(`/api/customer-photos/upload?token=${encodeURIComponent(token)}`), {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Content-Type": file.type },
        body: file,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "فشل الرفع");
      setPhotos(p => [...p, { id: data.id, photoUrl: data.photoUrl }]);
      setPhotoMsg("✓ تم الرفع بنجاح! ستظهر الصورة بعد الموافقة.");
    } catch (e: any) {
      setPhotoMsg(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    apiFetch(`/api/reviews/by-token/${encodeURIComponent(token)}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || "حدث خطأ");
        return r.json();
      })
      .then(setInfo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/reviews/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "فشل الإرسال");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0a1929 0%,#0d2540 100%)", direction: "rtl", fontFamily: "Cairo,sans-serif", padding: "2rem 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 540, background: "white", borderRadius: 20, padding: "2rem 1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        {loading ? <div style={{ textAlign: "center", color: "#666" }}>⏳ جار التحميل...</div> :
         error ? <div style={{ textAlign: "center", color: "#EF4444", fontWeight: 700 }}>❌ {error}</div> :
         submitted || info?.alreadyReviewed ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🌟</div>
            <h2 style={{ color: "#0D1B2A", margin: "0 0 0.5rem" }}>شكرًا لتقييمك!</h2>
            <p style={{ color: "#666", lineHeight: 1.7 }}>{info?.alreadyReviewed && !submitted ? "لقد قمت بتقييم هذه الرحلة من قبل." : "تم استلام تقييمك بنجاح. سنراجعه قريبًا."}</p>

            {/* Photo upload (after review) */}
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #eee", textAlign: "right" }}>
              <h3 style={{ color: "#0D1B2A", fontSize: "1.1rem", margin: "0 0 .25rem" }}>📸 شارك صورك من الرحلة</h3>
              <p style={{ color: "#666", fontSize: ".85rem", margin: "0 0 .85rem" }}>ساعد المسافرين القادمين برؤية تجربتك الحقيقية! (اختياري)</p>

              {photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: ".75rem" }}>
                  {photos.map(p => (
                    <img key={p.id} src={p.photoUrl} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 8 }} />
                  ))}
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading || photos.length >= 12}
                style={{ width: "100%", background: uploading ? "#94A3B8" : "#10B981", color: "white", border: "none", padding: ".8rem", borderRadius: 10, fontWeight: 700, cursor: uploading ? "wait" : "pointer", fontFamily: "Cairo,sans-serif" }}>
                {uploading ? "⏳ جاري الرفع..." : photos.length >= 12 ? "وصلت الحد الأقصى (12 صورة)" : "📷 إضافة صورة"}
              </button>
              {photoMsg && <div style={{ marginTop: ".5rem", color: photoMsg.startsWith("✓") ? "#10B981" : "#EF4444", fontSize: ".85rem", fontWeight: 700 }}>{photoMsg}</div>}
            </div>

            <button onClick={() => navigate("/")} style={{ marginTop: "1.5rem", background: "#00AAFF", color: "white", border: "none", padding: "0.8rem 2rem", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>العودة للرئيسية</button>
          </div>
        ) : info ? (
          <form onSubmit={submit}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "3rem" }}>⭐</div>
              <h2 style={{ color: "#0D1B2A", margin: "0.5rem 0" }}>كيف كانت رحلتك؟</h2>
              <p style={{ color: "#666", margin: 0 }}>
                مرحبًا <strong>{info.customerName}</strong>،<br />
                نتمنى أن تكون قد استمتعت بـ <strong>{info.packageName}</strong>
              </p>
            </div>

            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "inline-flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} type="button"
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(i)}
                    style={{ background: "none", border: "none", fontSize: "2.5rem", cursor: "pointer", color: i <= (hover || rating) ? "#FFD700" : "#ddd", transition: "transform 0.15s" }}>★</button>
                ))}
              </div>
              <div style={{ marginTop: "0.5rem", color: "#666", fontWeight: 700 }}>
                {rating === 5 ? "ممتاز!" : rating === 4 ? "جيد جدًا" : rating === 3 ? "جيد" : rating === 2 ? "مقبول" : "ضعيف"}
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#0D1B2A", fontWeight: 700, marginBottom: "0.5rem" }}>تعليقك (اختياري)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="شاركنا تجربتك..." maxLength={2000}
                style={{ width: "100%", minHeight: 110, padding: "0.75rem", border: "1px solid #ddd", borderRadius: 10, fontFamily: "Cairo,sans-serif", fontSize: "1rem", resize: "vertical" }} />
            </div>

            <button type="submit" disabled={submitting}
              style={{ width: "100%", background: "linear-gradient(135deg,#00AAFF,#0086C9)", color: "white", border: "none", padding: "1rem", borderRadius: 12, fontSize: "1.05rem", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "Cairo,sans-serif", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "جار الإرسال..." : "✓ إرسال التقييم"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
