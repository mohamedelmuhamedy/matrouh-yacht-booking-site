import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface RewardSettings {
  rewards_enabled: string;
  reward_type: string;
  reward_value: string;
  reward_after_x: string;
  reward_description_ar: string;
  reward_description_en: string;
}

interface ReferralCode {
  id: number; code: string; nameAr: string; nameEn: string;
  phone: string; email: string; isActive: boolean;
  usedCount: number; approvedCount: number; notes: string; createdAt: string;
}

interface ReferralReward {
  id: number; referralCode: string; bookingName: string; bookingPackage: string;
  rewardType: string; rewardValue: string; status: string;
  adminNotes: string; createdAt: string; reviewedAt?: string; bookingId?: number;
}

const REWARD_TYPES = [
  { value: "fixed", label: "خصم بمبلغ ثابت (جنيه)" },
  { value: "percentage", label: "خصم نسبة مئوية (%)" },
  { value: "upgrade", label: "ترقية مجانية / مزية خاصة" },
  { value: "custom", label: "مكافأة مخصصة (نصية)" },
];

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "⏳ معلّق", color: "#F59E0B", bg: "#FEF3C7" },
  approved: { label: "✅ موافق", color: "#10B981", bg: "#D1FAE5" },
  rejected: { label: "❌ مرفوض", color: "#EF4444", bg: "#FEE2E2" },
};

const S = {
  card: { background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.5rem" },
  h3: { color: "#0D1B2A", fontWeight: 900, fontSize: "1.05rem", margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" } as React.CSSProperties,
  input: { width: "100%", padding: "0.65rem 0.9rem", borderRadius: "8px", border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.9rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box", color: "#0D1B2A" } as React.CSSProperties,
  label: { display: "block", color: "#374151", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.3rem" } as React.CSSProperties,
  btn: (color: string, bg: string) => ({ padding: "0.5rem 1rem", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", background: bg, color }) as React.CSSProperties,
};

function F({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom: "1rem", gridColumn: half ? "span 1" : "span 2" }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminRewardsPage() {
  const { success, error: toastError } = useToast();

  const [tab, setTab] = useState<"settings" | "codes" | "rewards">("settings");

  /* ── Settings ─── */
  const [settings, setSettings] = useState<RewardSettings>({
    rewards_enabled: "false", reward_type: "fixed",
    reward_value: "200", reward_after_x: "1",
    reward_description_ar: "", reward_description_en: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  /* ── Codes ─── */
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [editingCode, setEditingCode] = useState<ReferralCode | null>(null);
  const [codeForm, setCodeForm] = useState({ nameAr: "", nameEn: "", phone: "", email: "", notes: "", code: "" });
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [confirmDelCode, setConfirmDelCode] = useState<ReferralCode | null>(null);

  /* ── Rewards ─── */
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [rewardNotes, setRewardNotes] = useState<Record<number, string>>({});

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => {
    if (tab === "codes") loadCodes();
    if (tab === "rewards") loadRewards();
  }, [tab]);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const r = await adminFetch("/admin/reward-settings");
      if (r.ok) setSettings(await r.json());
    } catch {}
    setLoadingSettings(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const r = await adminFetch("/admin/reward-settings", { method: "PUT", body: JSON.stringify(settings) });
      if (!r.ok) throw new Error();
      success("تم حفظ إعدادات المكافآت ✅");
    } catch { toastError("فشل حفظ الإعدادات"); }
    setSavingSettings(false);
  };

  const loadCodes = async () => {
    setLoadingCodes(true);
    try {
      const r = await adminFetch("/admin/referral-codes");
      if (r.ok) setCodes(await r.json());
    } catch {}
    setLoadingCodes(false);
  };

  const loadRewards = async () => {
    setLoadingRewards(true);
    try {
      const r = await adminFetch("/admin/referral-rewards");
      if (r.ok) setRewards(await r.json());
    } catch {}
    setLoadingRewards(false);
  };

  const openNewCode = () => {
    setEditingCode(null);
    setCodeForm({ nameAr: "", nameEn: "", phone: "", email: "", notes: "", code: "" });
    setCodeError("");
    setShowCodeForm(true);
  };

  const openEditCode = (c: ReferralCode) => {
    setEditingCode(c);
    setCodeForm({ nameAr: c.nameAr, nameEn: c.nameEn, phone: c.phone, email: c.email, notes: c.notes, code: c.code });
    setCodeError("");
    setShowCodeForm(true);
  };

  const saveCode = async () => {
    if (!codeForm.nameAr.trim()) { setCodeError("الاسم (عربي) مطلوب"); return; }
    setSavingCode(true);
    setCodeError("");
    try {
      const r = editingCode
        ? await adminFetch(`/admin/referral-codes/${editingCode.id}`, { method: "PUT", body: JSON.stringify(codeForm) })
        : await adminFetch("/admin/referral-codes", { method: "POST", body: JSON.stringify(codeForm) });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setCodeError(err.error || "فشل الحفظ");
        return;
      }
      setShowCodeForm(false);
      success(editingCode ? "تم تحديث الكود ✅" : "تم إنشاء الكود ✅");
      loadCodes();
    } catch (e: any) { setCodeError(e.message || "خطأ في الاتصال"); }
    setSavingCode(false);
  };

  const deleteCode = async (c: ReferralCode) => {
    try {
      const r = await adminFetch(`/admin/referral-codes/${c.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      success("تم حذف الكود");
      loadCodes();
    } catch { toastError("فشل الحذف"); }
    setConfirmDelCode(null);
  };

  const toggleCodeActive = async (c: ReferralCode) => {
    try {
      const r = await adminFetch(`/admin/referral-codes/${c.id}`, {
        method: "PUT", body: JSON.stringify({ ...c, isActive: !c.isActive }),
      });
      if (!r.ok) throw new Error();
      setCodes(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !c.isActive } : x));
      success(c.isActive ? "تم تعطيل الكود" : "تم تفعيل الكود");
    } catch { toastError("فشل التحديث"); }
  };

  const approveReward = async (id: number) => {
    try {
      const r = await adminFetch(`/admin/referral-rewards/${id}/approve`, {
        method: "PUT", body: JSON.stringify({ adminNotes: rewardNotes[id] || "" }),
      });
      if (!r.ok) throw new Error();
      success("تم الموافقة على المكافأة ✅");
      loadRewards();
    } catch { toastError("فشل الموافقة"); }
  };

  const rejectReward = async (id: number) => {
    try {
      const r = await adminFetch(`/admin/referral-rewards/${id}/reject`, {
        method: "PUT", body: JSON.stringify({ adminNotes: rewardNotes[id] || "" }),
      });
      if (!r.ok) throw new Error();
      success("تم رفض المكافأة");
      loadRewards();
    } catch { toastError("فشل الرفض"); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success("تم نسخ الكود 📋");
  };

  const filteredRewards = filterStatus === "all" ? rewards : rewards.filter(r => r.status === filterStatus);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.25rem" }}>
            🎁 المكافآت والإحالة
          </h2>
          <p style={{ color: "#667788", fontSize: "0.85rem", margin: 0 }}>إدارة نظام الإحالة وأكواد المكافآت</p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", background: "#f1f5f9", borderRadius: "12px", padding: "0.3rem" }}>
          {[
            { key: "settings", label: "⚙️ الإعدادات" },
            { key: "codes", label: "🔑 الأكواد" },
            { key: "rewards", label: "🏆 المكافآت" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.85rem", background: tab === t.key ? "white" : "transparent", color: tab === t.key ? "#0D1B2A" : "#667788", boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div>
          {loadingSettings ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>⏳ جاري التحميل...</div>
          ) : (
            <>
              <div style={S.card}>
                <h3 style={S.h3}>⚙️ إعدادات نظام المكافآت</h3>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", background: settings.rewards_enabled === "true" ? "#D1FAE5" : "#F1F5F9", borderRadius: "12px", marginBottom: "1.5rem", border: `2px solid ${settings.rewards_enabled === "true" ? "#10B981" : "#e0e8f0"}` }}>
                  <input type="checkbox" id="rewards-enabled" checked={settings.rewards_enabled === "true"}
                    onChange={e => setSettings(s => ({ ...s, rewards_enabled: e.target.checked ? "true" : "false" }))}
                    style={{ width: 20, height: 20, accentColor: "#10B981", cursor: "pointer" }} />
                  <label htmlFor="rewards-enabled" style={{ color: settings.rewards_enabled === "true" ? "#065F46" : "#374151", fontWeight: 800, cursor: "pointer", fontSize: "1rem" }}>
                    {settings.rewards_enabled === "true" ? "✅ نظام المكافآت مُفعَّل" : "⭕ نظام المكافآت معطَّل"}
                  </label>
                  <span style={{ marginRight: "auto", color: settings.rewards_enabled === "true" ? "#10B981" : "#9CA3AF", fontSize: "0.82rem" }}>
                    {settings.rewards_enabled === "true" ? "يتلقى المحيلون مكافأة عند كل حجز ناجح" : "لا تُمنح مكافآت حالياً"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={S.label}>نوع المكافأة</label>
                    <select value={settings.reward_type}
                      onChange={e => setSettings(s => ({ ...s, reward_type: e.target.value }))}
                      style={{ ...S.input }}>
                      {REWARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>
                      {settings.reward_type === "fixed" ? "قيمة الخصم (جنيه)" :
                        settings.reward_type === "percentage" ? "نسبة الخصم (%)" :
                        settings.reward_type === "upgrade" ? "وصف الترقية" : "وصف المكافأة"}
                    </label>
                    <input style={S.input} value={settings.reward_value}
                      placeholder={settings.reward_type === "fixed" ? "مثال: 200" : settings.reward_type === "percentage" ? "مثال: 10" : "مثال: ترقية VIP"}
                      onChange={e => setSettings(s => ({ ...s, reward_value: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={S.label}>منح المكافأة بعد كم حجز ناجح عبر الإحالة؟</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <input type="number" min={1} max={20} style={{ ...S.input, width: 120 }} value={settings.reward_after_x}
                      onChange={e => setSettings(s => ({ ...s, reward_after_x: e.target.value }))} />
                    <span style={{ color: "#667788", fontSize: "0.88rem" }}>
                      {settings.reward_after_x === "1" ? "مكافأة فورية عند أول حجز" : `مكافأة بعد ${settings.reward_after_x} حجوزات`}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={S.label}>وصف المكافأة (عربي) للعرض للمحيل</label>
                    <input style={S.input} placeholder="مثال: خصم ٢٠٠ جنيه على الحجز القادم" value={settings.reward_description_ar}
                      onChange={e => setSettings(s => ({ ...s, reward_description_ar: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.label}>وصف المكافأة (English)</label>
                    <input style={{ ...S.input, direction: "ltr" }} placeholder="e.g. 200 EGP discount on next booking" value={settings.reward_description_en}
                      onChange={e => setSettings(s => ({ ...s, reward_description_en: e.target.value }))} />
                  </div>
                </div>

                <div style={{ background: "#EFF6FF", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem", border: "1px solid #BFDBFE" }}>
                  <div style={{ color: "#1D4ED8", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.5rem" }}>💡 كيف تعمل آلية الإحالة؟</div>
                  <ol style={{ color: "#374151", fontSize: "0.83rem", lineHeight: 2, margin: 0, paddingRight: "1.25rem" }}>
                    <li>تنشئ كوداً لكل شخص تريد منحه صلاحية الإحالة (من تبويب الأكواد)</li>
                    <li>يشارك الشخص كوده مع أصدقائه عند الحجز</li>
                    <li>عند الحجز يدخل العميل الكود في نموذج الحجز</li>
                    <li>تظهر المكافأة في تبويب "المكافآت" وتوافق أو ترفض يدوياً</li>
                  </ol>
                </div>

                <button onClick={saveSettings} disabled={savingSettings}
                  style={{ background: savingSettings ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.75rem 2rem", cursor: savingSettings ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
                  {savingSettings ? "⏳ جاري الحفظ..." : "💾 حفظ الإعدادات"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CODES TAB ── */}
      {tab === "codes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ color: "#667788", fontSize: "0.88rem" }}>
              {codes.length} كود إحالة | {codes.filter(c => c.isActive).length} نشط
            </div>
            <button onClick={openNewCode}
              style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}>
              + إنشاء كود جديد
            </button>
          </div>

          {showCodeForm && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
              onClick={() => setShowCodeForm(false)}>
              <div style={{ background: "#1a2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "520px", direction: "rtl", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ color: "white", fontWeight: 900, margin: 0 }}>{editingCode ? "✏️ تعديل الكود" : "➕ كود إحالة جديد"}</h3>
                  <button onClick={() => setShowCodeForm(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: "8px", padding: "0.35rem 0.75rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { key: "nameAr", label: "الاسم (عربي) *", placeholder: "مثال: أحمد محمد" },
                    { key: "nameEn", label: "Name (English)", placeholder: "Ahmed Mohamed", ltr: true },
                    { key: "phone", label: "رقم الهاتف", placeholder: "01xxxxxxxxx" },
                    { key: "email", label: "البريد الإلكتروني", placeholder: "email@example.com", ltr: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: "block", color: "rgba(255,255,255,0.65)", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.3rem" }}>{f.label}</label>
                      <input
                        style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.12)", background: "#0d1824", color: "white", fontFamily: "Cairo, sans-serif", fontSize: "0.88rem", outline: "none", boxSizing: "border-box", direction: f.ltr ? "ltr" : "rtl" }}
                        placeholder={f.placeholder}
                        value={(codeForm as any)[f.key]}
                        onChange={e => setCodeForm(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", color: "rgba(255,255,255,0.65)", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.3rem" }}>الكود (اتركه فارغاً للتوليد التلقائي)</label>
                    <input
                      style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.12)", background: "#0d1824", color: "#00AAFF", fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, outline: "none", boxSizing: "border-box", letterSpacing: "2px", direction: "ltr" }}
                      placeholder="DRT-XXXXXX"
                      value={codeForm.code}
                      onChange={e => setCodeForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      disabled={!!editingCode}
                    />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", color: "rgba(255,255,255,0.65)", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.3rem" }}>ملاحظات داخلية</label>
                    <input
                      style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.12)", background: "#0d1824", color: "white", fontFamily: "Cairo, sans-serif", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }}
                      placeholder="ملاحظة للأدمن"
                      value={codeForm.notes}
                      onChange={e => setCodeForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>
                {codeError && (
                  <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", padding: "0.65rem 1rem", marginTop: "1rem", color: "#FCA5A5", fontSize: "0.85rem" }}>
                    ⚠️ {codeError}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button onClick={saveCode} disabled={savingCode}
                    style={{ flex: 1, background: savingCode ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.8rem", cursor: savingCode ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
                    {savingCode ? "⏳..." : editingCode ? "💾 حفظ التعديلات" : "✅ إنشاء الكود"}
                  </button>
                  <button onClick={() => setShowCodeForm(false)}
                    style={{ padding: "0.8rem 1.25rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingCodes ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>⏳ جاري التحميل...</div>
          ) : codes.length === 0 ? (
            <div style={{ background: "white", borderRadius: "16px", padding: "3rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔑</div>
              <div style={{ color: "#0D1B2A", fontWeight: 700, marginBottom: "0.5rem" }}>لا توجد أكواد إحالة</div>
              <div style={{ color: "#667788", fontSize: "0.88rem" }}>أنشئ أول كود إحالة لبدء نظام المكافآت</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {codes.map(c => (
                <div key={c.id} style={{ background: "white", borderRadius: "14px", padding: "1.1rem 1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", opacity: c.isActive ? 1 : 0.55 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "1.1rem", color: "#00AAFF", letterSpacing: "2px", background: "#EFF6FF", padding: "0.4rem 0.85rem", borderRadius: "8px", cursor: "pointer", userSelect: "all" }}
                    onClick={() => copyCode(c.code)} title="اضغط للنسخ">
                    {c.code}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "0.92rem" }}>{c.nameAr} {c.nameEn && <span style={{ color: "#667788", fontWeight: 400 }}>· {c.nameEn}</span>}</div>
                    <div style={{ color: "#99aabb", fontSize: "0.78rem", marginTop: "0.15rem" }}>
                      {c.phone && <span>📞 {c.phone} </span>}
                      {c.email && <span>✉️ {c.email} </span>}
                      {c.notes && <span>· {c.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>استُخدم {c.usedCount}×</span>
                    <span style={{ background: "#D1FAE5", color: "#065F46", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>✅ {c.approvedCount} موافق</span>
                    <button onClick={() => toggleCodeActive(c)}
                      style={S.btn(c.isActive ? "#6B7280" : "#10B981", c.isActive ? "#F3F4F6" : "#D1FAE5")}>
                      {c.isActive ? "⏸ تعطيل" : "▶ تفعيل"}
                    </button>
                    <button onClick={() => openEditCode(c)} style={S.btn("#2563EB", "#EFF6FF")}>✏️ تعديل</button>
                    <button onClick={() => copyCode(c.code)} style={S.btn("#374151", "#F1F5F9")}>📋 نسخ</button>
                    <button onClick={() => setConfirmDelCode(c)} style={S.btn("#EF4444", "#FEE2E2")}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REWARDS TAB ── */}
      {tab === "rewards" && (
        <div>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[
              { key: "all", label: "الكل" },
              { key: "pending", label: "⏳ معلّق" },
              { key: "approved", label: "✅ موافق" },
              { key: "rejected", label: "❌ مرفوض" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                style={{ padding: "0.45rem 0.9rem", border: `1.5px solid ${filterStatus === f.key ? "#00AAFF" : "#e0e8f0"}`, borderRadius: "8px", cursor: "pointer", background: filterStatus === f.key ? "#EFF6FF" : "white", color: filterStatus === f.key ? "#2563EB" : "#667788", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}>
                {f.label} {f.key !== "all" && rewards.filter(r => f.key === "all" || r.status === f.key).length > 0 && (
                  <span style={{ background: "#00AAFF", color: "white", borderRadius: "50px", padding: "0.1rem 0.4rem", fontSize: "0.68rem", marginRight: "0.3rem" }}>
                    {rewards.filter(r => r.status === f.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loadingRewards ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>⏳ جاري التحميل...</div>
          ) : filteredRewards.length === 0 ? (
            <div style={{ background: "white", borderRadius: "16px", padding: "3rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏆</div>
              <div style={{ color: "#0D1B2A", fontWeight: 700, marginBottom: "0.5rem" }}>لا توجد مكافآت {filterStatus !== "all" ? "بهذه الحالة" : "بعد"}</div>
              <div style={{ color: "#667788", fontSize: "0.88rem" }}>ستظهر هنا المكافآت عند حجز العملاء بأكواد الإحالة</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredRewards.map(r => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                const rewardLabel = r.rewardType === "fixed" ? `${r.rewardValue} جنيه` :
                  r.rewardType === "percentage" ? `${r.rewardValue}%` : r.rewardValue;
                return (
                  <div key={r.id} style={{ background: "white", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderRight: `4px solid ${st.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#00AAFF", fontSize: "0.95rem" }}>{r.referralCode}</span>
                          <span style={{ background: st.bg, color: st.color, padding: "0.2rem 0.65rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>{st.label}</span>
                        </div>
                        <div style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.92rem" }}>👤 {r.bookingName}</div>
                        {r.bookingPackage && <div style={{ color: "#667788", fontSize: "0.82rem" }}>📦 {r.bookingPackage}</div>}
                        <div style={{ color: "#667788", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                          📅 {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                          {r.bookingId && <span> · حجز #{r.bookingId}</span>}
                        </div>
                      </div>
                      <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "10px", padding: "0.5rem 1rem", textAlign: "center" }}>
                        <div style={{ color: "#92400E", fontWeight: 900, fontSize: "1.1rem" }}>{rewardLabel}</div>
                        <div style={{ color: "#B45309", fontSize: "0.72rem", fontWeight: 600 }}>
                          {r.rewardType === "fixed" ? "خصم ثابت" : r.rewardType === "percentage" ? "نسبة خصم" : "مكافأة خاصة"}
                        </div>
                      </div>
                    </div>

                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          style={{ flex: 1, minWidth: 150, padding: "0.5rem 0.8rem", borderRadius: "8px", border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.82rem", fontFamily: "Cairo, sans-serif", color: "#0D1B2A" }}
                          placeholder="ملاحظة (اختياري)"
                          value={rewardNotes[r.id] || ""}
                          onChange={e => setRewardNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                        />
                        <button onClick={() => approveReward(r.id)} style={S.btn("white", "#10B981")}>✅ موافقة</button>
                        <button onClick={() => rejectReward(r.id)} style={S.btn("white", "#EF4444")}>❌ رفض</button>
                      </div>
                    )}

                    {r.adminNotes && (
                      <div style={{ marginTop: "0.5rem", color: "#667788", fontSize: "0.8rem", background: "#F9FAFB", borderRadius: "6px", padding: "0.4rem 0.75rem" }}>
                        💬 {r.adminNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelCode !== null}
        title="حذف كود الإحالة"
        message={`هل تريد حذف كود "${confirmDelCode?.code}" الخاص بـ "${confirmDelCode?.nameAr}"؟ لا يمكن التراجع عن هذا.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => confirmDelCode && deleteCode(confirmDelCode)}
        onCancel={() => setConfirmDelCode(null)}
      />
    </div>
  );
}
