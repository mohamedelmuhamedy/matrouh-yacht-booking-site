import { useEffect, useState, useRef } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import Ticket, { formatPhoneIntl, type TicketData } from "../components/Ticket";
import { apiFetch, apiUrl, resolveApiAssetUrl } from "../lib/api";
import { downloadQrPng } from "../components/ShareCardQR";
import logoFallback from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";
import "./bookings.css";

// Heavy libraries (jspdf ≈ 350 kB gz, html2canvas ≈ 50 kB, html-to-image ≈ 25 kB)
// are loaded on demand the first time the admin actually exports a ticket.
// This keeps the admin bundle small for routine workflows like reading
// bookings or updating statuses.
async function loadHtml2Canvas() {
  const m = await import("html2canvas");
  return m.default;
}
async function loadHtmlToImage() {
  return await import("html-to-image");
}
async function loadJsPDF() {
  const m = await import("jspdf");
  return m.default;
}

interface Booking {
  id: number;
  name: string;
  phone: string;
  packageId: number | null;
  packageName: string;
  packageNameAr: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  notes: string;
  adminNotes: string;
  currency: string;
  priceAtBooking: number | null;
  status: string;
  referralCode: string;
  ticketToken: string | null;
  ticketNumber?: string | null;
  ticketUsedAt?: string | null;
  ticketUsedBy?: string | null;
  meetingTime?: string;
  pickupLocation?: string;
  pickupLocationAr?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  remainingBalance?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketFieldsForm {
  meetingTime: string;
  pickupLocation: string;
  pickupLocationAr: string;
  supervisorName: string;
  supervisorPhone: string;
  remainingBalance: string;
}

const EMPTY_TICKET_FIELDS: TicketFieldsForm = {
  meetingTime: "", pickupLocation: "", pickupLocationAr: "", supervisorName: "", supervisorPhone: "", remainingBalance: "",
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const num = parseInt(full, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * (percent / 100))));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * (percent / 100))));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(255 * (percent / 100))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `منذ ${diffH} س`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `منذ ${diffD} يوم`;
  if (diffD < 30) return `منذ ${Math.floor(diffD / 7)} أسبوع`;
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

const STATUS_OPTIONS = [
  { value: "new", label: "جديد", color: "#3B82F6" },
  { value: "contacted", label: "تم التواصل", color: "#F59E0B" },
  { value: "confirmed", label: "مؤكد", color: "#10B981" },
  { value: "client_confirmed", label: "مؤكد عن طريق العميل", color: "#14B8A6" },
  { value: "completed", label: "مكتمل", color: "var(--text-secondary)" },
  { value: "cancelled", label: "ملغي", color: "#EF4444" },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [noteBooking, setNoteBooking] = useState<Booking | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpanded = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const expandAll = () => setExpanded(new Set(bookings.map(b => b.id)));
  const collapseAll = () => setExpanded(new Set());
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [ticketLang, setTicketLang] = useState<"ar" | "en">("ar");
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketDownloading, setTicketDownloading] = useState(false);
  const [ticketBusy, setTicketBusy] = useState<string>("");
  const [ticketFields, setTicketFields] = useState<TicketFieldsForm>(EMPTY_TICKET_FIELDS);
  const [ticketFieldsDirty, setTicketFieldsDirty] = useState(false);
  const [autoTicketAction, setAutoTicketAction] = useState<"whatsapp" | "download" | "image" | "image-send" | null>(null);
  // Small lang-picker dialog state for row shortcuts that need an AR/EN choice.
  const [langChooser, setLangChooser] = useState<{ booking: Booking; action: "image" | "image-send" } | null>(null);
  const pendingWhatsAppPopupRef = useRef<Window | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const { success, error: toastError } = useToast();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prepareWhatsAppPopup = (): Window | null => {
    let popup = pendingWhatsAppPopupRef.current;
    if (!popup || popup.closed) {
      popup = window.open("about:blank", "_blank");
      pendingWhatsAppPopupRef.current = popup;
    }
    if (popup && !popup.closed) {
      try {
        popup.document.title = "Preparing ticket";
        popup.document.body.dir = "rtl";
        popup.document.body.style.cssText = "margin:0;font-family:Cairo,Arial,sans-serif;background:#0D1B2A;color:#fff;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px;";
        popup.document.body.innerHTML = '<div><div style="font-size:32px;margin-bottom:12px">...</div><strong>جاري تجهيز التذكرة</strong><p style="opacity:.75;margin:.5rem 0 0">سيتم فتح واتساب تلقائيا بعد ثوان.</p></div>';
      } catch {
        /* Cross-browser popup documents may be inaccessible; redirect still works. */
      }
    }
    return popup;
  };

  const load = (q?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (q !== undefined ? q : search) params.set("search", q !== undefined ? q : search);
    adminFetch(`/admin/bookings?${params}`).then(r => r.json()).then(data => {
      setBookings(Array.isArray(data) ? data : []);
    }).catch(() => { toastError("فشل تحميل الحجوزات"); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  // Auto-run download / WhatsApp once the ticket is fully loaded after a row
  // shortcut click ("⬇️ تنزيل PDF" / "📤 إرسال للعميل").
  useEffect(() => {
    if (!autoTicketAction) return;
    if (!ticketData || ticketLoading) return;
    const action = autoTicketAction;
    setAutoTicketAction(null);
    (async () => {
      // Give the off-screen Ticket a frame to mount + fonts/images to settle.
      await new Promise(r => setTimeout(r, 350));
      try {
        if (action === "download") await downloadTicketPdf();
        else if (action === "image") await downloadTicketImage();
        else if (action === "image-send") await sendTicketImageWhatsApp();
        else if (action === "whatsapp") await sendTicketWhatsApp();
      } finally {
        // Auto-close the modal so the row-shortcut feels like a one-click op.
        setTimeout(() => closeTicket(), 600);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketData, ticketLoading, autoTicketAction]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(val), 400);
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const r = await adminFetch(`/admin/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error();
      const updated = await r.json() as Partial<Booking>;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated, status } : b));
      success("تم تحديث الحالة");
    } catch { toastError("فشل تحديث الحالة"); }
    setUpdating(null);
  };

  const saveNote = async () => {
    if (!noteBooking) return;
    try {
      const r = await adminFetch(`/admin/bookings/${noteBooking.id}/notes`, { method: "PUT", body: JSON.stringify({ adminNotes: noteText }) });
      if (!r.ok) throw new Error();
      setBookings(prev => prev.map(b => b.id === noteBooking.id ? { ...b, adminNotes: noteText } : b));
      setNoteBooking(null);
      success("تم حفظ الملاحظة");
    } catch { toastError("فشل حفظ الملاحظة"); }
  };

  const deleteBooking = async (id: number) => {
    try {
      const r = await adminFetch(`/admin/bookings/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setBookings(prev => prev.filter(b => b.id !== id));
      success("تم حذف الحجز");
    } catch { toastError("فشل حذف الحجز"); }
    setConfirmDelete(null);
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await adminFetch("/admin/bookings/export/csv");
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success("تم تصدير الحجوزات");
    } catch { toastError("فشل تصدير الحجوزات"); }
    setExporting(false);
  };

  const counts: Record<string, number> = {};
  bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });

  const whatsappLink = (phone: string, name: string) => {
    const msg = encodeURIComponent(`أهلاً ${name}، شكراً لتواصلك مع DR Travel. نحن سعداء بخدمتك 😊`);
    const num = phone.replace(/\D/g, "");
    const intl = num.startsWith("0") ? "2" + num : num.startsWith("20") ? num : "20" + num;
    return `https://api.whatsapp.com/send?phone=${intl}&text=${msg}`;
  };

  const ticketPublicUrl = (token: string, signature?: string | null) =>
    `${window.location.origin}/verify/${token}${signature ? `?sig=${encodeURIComponent(signature)}` : ""}`;

  const downloadTicketQr = async () => {
    if (!ticketData || !ticketData.ticketToken) return;
    setTicketBusy("qr");
    try {
      const s = ticketData.settings || {};
      const url = ticketPublicUrl(ticketData.ticketToken, ticketData.ticketSignature);
      const fg = s.card_qr_fg || "#0D1B2A";
      const bg = s.card_qr_bg || "#ffffff";
      const logoSrc = resolveApiAssetUrl(s.logo_url) || logoFallback;
      const baseName = (s.brand_short_name || s.brand_name || "dr-travel")
        .replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
      const ticketNo = ticketData.ticketNumber || `DRT-${String(ticketData.id).padStart(5, "0")}`;
      const safeNo = ticketNo.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
      await downloadQrPng({
        url, fg, bg, logoSrc, size: 1024, margin: 2,
        filename: `${baseName}-ticket-${safeNo}-qr.png`,
      });
      success("تم تنزيل QR التذكرة");
    } catch {
      toastError("فشل توليد QR");
    } finally {
      setTicketBusy("");
    }
  };

  const ticketPdfAbsoluteUrl = (token: string) => {
    const u = apiUrl(`/api/tickets/${token}.pdf`);
    return /^https?:\/\//i.test(u) ? u : `${window.location.origin}${u}`;
  };

  const reloadTicket = async (token: string): Promise<TicketData | null> => {
    const dr = await apiFetch(`/api/tickets/${encodeURIComponent(token)}`);
    if (!dr.ok) return null;
    const data = await dr.json() as TicketData;
    setTicketData(data);
    setTicketFields({
      meetingTime: data.meetingTime || "",
      pickupLocation: data.pickupLocation || "",
      pickupLocationAr: data.pickupLocationAr || "",
      supervisorName: data.supervisorName || "",
      supervisorPhone: data.supervisorPhone || "",
      remainingBalance: data.remainingBalance || "",
    });
    setTicketFieldsDirty(false);
    return data;
  };

  const openTicket = async (
    booking: Booking,
    autoAction?: "whatsapp" | "download" | "image" | "image-send",
    forcedLang?: "ar" | "en",
  ) => {
    // For auto-WhatsApp from a row click we must open the popup synchronously
    // inside the gesture so popup-blockers do not swallow it after the async
    // ticket-load + PDF upload chain.
    if (autoAction === "whatsapp" || autoAction === "image-send") {
      // Do NOT pass "noopener" here — we need to keep the popup reference so
      // we can redirect it to wa.me after the async upload/capture finishes.
      prepareWhatsAppPopup();
    }
    setTicketBooking(booking);
    setAutoTicketAction(autoAction || null);
    setTicketData(null);
    setTicketLoading(true);
    const initialLang: "ar" | "en" = forcedLang
      || (booking.packageNameAr && booking.packageNameAr.length > 0 ? "ar" : "en");
    setTicketLang(initialLang);
    try {
      const tr = await adminFetch(`/admin/bookings/${booking.id}/issue-ticket`, { method: "POST" });
      if (!tr.ok) {
        const j = await tr.clone().json().catch(() => ({} as { error?: string }));
        throw new Error(j.error || "issue-ticket failed");
      }
      const { token } = await tr.json() as { token: string };
      const data = await reloadTicket(token);
      if (!data) throw new Error("reload-ticket failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      console.error("[openTicket]", err);
      toastError(msg ? `فشل تجهيز التذكرة: ${msg}` : "فشل تجهيز التذكرة");
      setTicketBooking(null);
      // Close any popup pre-opened for an autoAction so it doesn't orphan.
      if (pendingWhatsAppPopupRef.current && !pendingWhatsAppPopupRef.current.closed) {
        pendingWhatsAppPopupRef.current.close();
      }
      pendingWhatsAppPopupRef.current = null;
      setAutoTicketAction(null);
    } finally {
      setTicketLoading(false);
    }
  };

  const closeTicket = () => {
    if (pendingWhatsAppPopupRef.current && !pendingWhatsAppPopupRef.current.closed) {
      pendingWhatsAppPopupRef.current.close();
    }
    pendingWhatsAppPopupRef.current = null;
    setTicketBooking(null);
    setTicketData(null);
    setTicketFields(EMPTY_TICKET_FIELDS);
    setTicketFieldsDirty(false);
    setTicketBusy("");
    setAutoTicketAction(null);
  };

  const saveTicketFields = async (): Promise<boolean> => {
    if (!ticketBooking) return false;
    try {
      const r = await adminFetch(`/admin/bookings/${ticketBooking.id}/ticket-fields`, {
        method: "PUT", body: JSON.stringify(ticketFields),
      });
      if (!r.ok) throw new Error();
      setBookings(prev => prev.map(b => b.id === ticketBooking.id ? { ...b, ...ticketFields } : b));
      if (ticketData?.ticketToken) await reloadTicket(ticketData.ticketToken);
      setTicketFieldsDirty(false);
      return true;
    } catch {
      toastError("فشل حفظ بيانات التذكرة");
      return false;
    }
  };

  const updateTicketField = <K extends keyof TicketFieldsForm>(key: K, value: TicketFieldsForm[K]) => {
    setTicketFields(prev => ({ ...prev, [key]: value }));
    setTicketFieldsDirty(true);
    setTicketData(prev => prev ? { ...prev, [key]: value } : prev);
  };

  // Capture the off-screen ticket node to a canvas. Shared by PDF + image flows.
  const generateTicketCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!ticketRef.current || !ticketData) {
      console.error("[generateTicketCanvas] missing ticketRef or ticketData");
      return null;
    }
    const node = ticketRef.current.querySelector("[data-ticket-root]") as HTMLElement | null;
    if (!node) {
      console.error("[generateTicketCanvas] [data-ticket-root] not found in ticketRef");
      return null;
    }
    try {
      const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
      if (fonts?.ready) await fonts.ready;
    } catch { /* ignore */ }
    // Wait for any <img> inside the ticket to finish loading. html2canvas
    // hangs/fails silently if an image is mid-load when capture starts.
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        // Fail-safe timeout so we never hang forever.
        setTimeout(done, 4000);
      });
    }));
    await new Promise(r => setTimeout(r, 200));
    // Sanitize the cloned document to avoid html2canvas createPattern errors:
    // strip SVG-data-URL backgrounds, replace linear/radial gradients with the
    // first color stop (or a fallback), and remove rotations on the watermark.
    const sanitizeForHtml2Canvas = (clonedDoc: Document) => {
      const els = clonedDoc.querySelectorAll<HTMLElement>("[style]");
      const firstColor = (str: string): string => {
        const m = str.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
        return m ? m[0] : "#ffffff";
      };
      els.forEach(el => {
        const bgImg = el.style.backgroundImage;
        if (bgImg) {
          if (/data:image\/svg\+xml|gradient/i.test(bgImg)) {
            // If it's a gradient and there's no explicit background-color, pick the first stop.
            if (/gradient/i.test(bgImg) && !el.style.backgroundColor) {
              el.style.backgroundColor = firstColor(bgImg);
            }
            el.style.backgroundImage = "none";
          }
        }
        // Inline `background:` shorthand carrying a gradient.
        const bgShorthand = el.style.background;
        if (bgShorthand && /gradient/i.test(bgShorthand)) {
          el.style.background = firstColor(bgShorthand);
        }
        // Remove rotations on the decorative watermark to keep capture math sane.
        if (el.style.transform && /rotate\(/i.test(el.style.transform)) {
          el.style.transform = "none";
        }
      });
    };
    // Use intrinsic layout dimensions, not getBoundingClientRect, because the
    // ticket preview is rendered inside a `transform: scale(0.78)` wrapper —
    // the bounding rect would be ~624x881 and crop the captured PDF.
    const captureWidth = Math.ceil(node.offsetWidth || 800);
    const captureHeight = Math.ceil(node.offsetHeight || 1130);
    let canvas: HTMLCanvasElement;
    const html2canvas = await loadHtml2Canvas();
    try {
      canvas = await html2canvas(node, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true, allowTaint: false, logging: false,
        width: captureWidth, height: captureHeight,
        windowWidth: captureWidth, windowHeight: captureHeight,
        onclone: sanitizeForHtml2Canvas,
      });
    } catch (err) {
      console.error("[generateTicketCanvas] html2canvas (useCORS) failed:", err);
      try {
        canvas = await html2canvas(node, {
          scale: 2, backgroundColor: "#ffffff", useCORS: false, allowTaint: true, logging: false,
          width: captureWidth, height: captureHeight,
          windowWidth: captureWidth, windowHeight: captureHeight,
          onclone: sanitizeForHtml2Canvas,
        });
      } catch (err2) {
        console.error("[generateTicketCanvas] html2canvas retry failed:", err2);
        throw err2;
      }
    }
    return canvas;
  };

  const generateTicketBlob = async (): Promise<Blob | null> => {
    const canvas = await generateTicketCanvas();
    if (!canvas) return null;
    let imgData: string;
    try {
      imgData = canvas.toDataURL("image/png");
    } catch (err) {
      console.error("[generateTicketBlob] canvas tainted, cannot toDataURL:", err);
      throw err;
    }
    const jsPDF = await loadJsPDF();
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    pdf.addImage(imgData, "PNG", x, y, w, h);
    return pdf.output("blob");
  };

  // Capture the off-screen ticket as a high-fidelity PNG blob using
  // html-to-image (SVG foreignObject — preserves gradients & SVG patterns).
  const generateTicketImageBlob = async (): Promise<Blob | null> => {
    if (!ticketData || !ticketRef.current) return null;
    const node = ticketRef.current.querySelector("[data-ticket-root]") as HTMLElement | null;
    if (!node) return null;
    try {
      const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
      if (fonts?.ready) await fonts.ready;
    } catch { /* ignore */ }
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 4000);
      });
    }));
    await new Promise(r => setTimeout(r, 150));
    const w = Math.ceil(node.offsetWidth || 800);
    const h = Math.ceil(node.offsetHeight || 1130);
    const htmlToImage = await loadHtmlToImage();
    try {
      return await htmlToImage.toBlob(node, {
        pixelRatio: 3, cacheBust: true, backgroundColor: "#ffffff",
        width: w, height: h, style: { transform: "none", margin: "0" },
      });
    } catch (err) {
      console.warn("[generateTicketImageBlob] html-to-image failed, retrying with html2canvas:", err);
      const canvas = await generateTicketCanvas();
      if (!canvas) return null;
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    }
  };

  const ticketImageFilename = (): string => {
    const safeName = (ticketData?.name || "ticket").replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "ticket";
    return `dr-travel-ticket-${ticketBooking?.id || ""}-${safeName}.png`;
  };

  const downloadTicketImage = async () => {
    if (!ticketData) return;
    setTicketDownloading(true);
    try {
      if (ticketFieldsDirty) {
        const ok = await saveTicketFields();
        if (!ok) return;
      }
      const blob = await generateTicketImageBlob();
      if (!blob) { toastError("فشل تجهيز الصورة"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ticketImageFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      success("تم تنزيل صورة التذكرة");
    } catch (err) {
      console.error("[downloadTicketImage]", err);
      toastError("فشل تنزيل صورة التذكرة");
    } finally {
      setTicketDownloading(false);
    }
  };

  // Build the customizable WhatsApp message text from the admin-defined
  // template stored in site settings (fallback to a sensible default).
  const buildTicketImageMessage = (lang: "ar" | "en"): string => {
    if (!ticketData) return "";
    const s = ticketData.settings || {};
    const ticketNo = ticketData.ticketNumber || `DRT-${String(ticketData.id).padStart(5, "0")}`;
    const pkg = lang === "ar"
      ? (ticketData.packageNameAr || ticketData.packageName || "")
      : (ticketData.packageName || ticketData.packageNameAr || "");
    const sig = ticketData.ticketSignature ? `?sig=${encodeURIComponent(ticketData.ticketSignature)}` : "";
    const verifyUrl = ticketData.ticketToken
      ? `${window.location.origin}/verify/${ticketData.ticketToken}${sig}`
      : "";
    const defaultAr = `أهلاً {name} 🌟\nمعاك صورة تذكرتك مع DR Travel.\n\n📌 الباقة: {package}\n📅 التاريخ: {date}\n🎫 رقم التذكرة: {ticket_no}\n\n🔗 صفحة التحقق:\n{verify_url}\n\nبرجاء التواجد قبل ٣٠ دقيقة من موعد الانطلاق. لأي استفسار راسلنا هنا.`;
    const defaultEn = `Hi {name} 🌟\nHere is your DR Travel ticket image.\n\n📌 Package: {package}\n📅 Date: {date}\n🎫 Ticket No.: {ticket_no}\n\n🔗 Verify page:\n{verify_url}\n\nPlease arrive 30 minutes before departure. Reply here for any questions.`;
    const tpl = (lang === "ar" ? s.wa_image_message_ar : s.wa_image_message_en)
      || (lang === "ar" ? defaultAr : defaultEn);
    return tpl
      .replace(/\{name\}/g, ticketData.name || "")
      .replace(/\{package\}/g, pkg)
      .replace(/\{date\}/g, ticketData.date || "")
      .replace(/\{ticket_no\}/g, ticketNo)
      .replace(/\{price\}/g, ticketData.priceAtBooking ? `${ticketData.priceAtBooking} ${ticketData.currency || "EGP"}` : "—")
      .replace(/\{remaining_balance\}/g, ticketData.remainingBalance || "—")
      .replace(/\{verify_url\}/g, verifyUrl);
  };

  // Send the ticket as an image directly into the customer's WhatsApp chat.
  // Strategy:
  //   1. Web Share API (level 2 — supports files): on mobile this opens the
  //      native share sheet pre-filled with the PNG + admin's text; the admin
  //      taps WhatsApp → contact, image is attached.
  //   2. Desktop fallback: copy the PNG to clipboard via ClipboardItem +
  //      open wa.me/<phone>?text=... for the customer; admin pastes (Ctrl+V).
  const sendTicketImageWhatsApp = async () => {
    if (!ticketData) return;
    // Reuse a popup that was opened earlier inside a click gesture.
    const popup = pendingWhatsAppPopupRef.current || prepareWhatsAppPopup();
    pendingWhatsAppPopupRef.current = null;
    setTicketBusy("image-send");
    try {
      if (ticketFieldsDirty) {
        const ok = await saveTicketFields();
        if (!ok) { popup?.close(); return; }
      }
      const blob = await generateTicketImageBlob();
      if (!blob) { popup?.close(); toastError("فشل تجهيز الصورة"); return; }
      const filename = ticketImageFilename();
      const file = new File([blob], filename, { type: "image/png" });
      const text = buildTicketImageMessage(ticketLang);
      const intl = formatPhoneIntl(ticketData.phone);

      // 1) Web Share API with files (best UX — image attaches directly to WA).
      type ShareData = { files?: File[]; text?: string; title?: string };
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        // Keep the placeholder popup until share succeeds; fallback can reuse it.
        try {
          await nav.share({ files: [file], text, title: filename });
          popup?.close();
          success("تم فتح قائمة المشاركة");
          return;
        } catch (err) {
          // User aborted or share failed — fall through to clipboard fallback.
          console.warn("[sendTicketImageWhatsApp] navigator.share aborted/failed:", err);
        }
      }

      // 2) Fallback: copy image to clipboard, open wa.me chat, instruct admin.
      let clipboardOk = false;
      try {
        const ClipItem = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
        if (navigator.clipboard && ClipItem) {
          await navigator.clipboard.write([new ClipItem({ "image/png": blob })]);
          clipboardOk = true;
        }
      } catch (err) {
        console.warn("[sendTicketImageWhatsApp] clipboard image write failed:", err);
      }
      // Always also save the image so the admin has a copy if paste fails.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const waUrl = `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(text)}`;
      if (popup && !popup.closed) {
        try { (popup as Window & { opener: Window | null }).opener = null; } catch { /* ignore */ }
        popup.location.href = waUrl;
      } else {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      if (clipboardOk) {
        success("الصورة في الحافظة — افتح شات العميل والصق (Ctrl+V) ثم أرسل");
      } else {
        success("تم فتح شات العميل — أرفق الصورة المُنزَّلة يدويًا");
      }
    } catch (err) {
      console.error("[sendTicketImageWhatsApp]", err);
      popup?.close();
      toastError("فشل إرسال صورة الواتساب");
    } finally {
      setTicketBusy("");
    }
  };

  const downloadTicketPdf = async () => {
    if (!ticketData) return;
    setTicketDownloading(true);
    try {
      if (ticketFieldsDirty) {
        const ok = await saveTicketFields();
        if (!ok) return;
      }
      const blob = await generateTicketBlob();
      if (!blob) throw new Error("blob_null");
      if (ticketBooking) {
        try {
          await adminFetch(`/admin/bookings/${ticketBooking.id}/ticket-pdf`, {
            method: "POST", headers: { "Content-Type": "application/pdf" }, body: blob,
          });
          if (ticketData.ticketToken) await reloadTicket(ticketData.ticketToken);
        } catch (err) { console.warn("[downloadTicketPdf] upload failed (non-blocking):", err); }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = ticketData.name.replace(/[^\u0600-\u06FFa-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "guest";
      a.download = `dr-travel-ticket-${ticketData.id}-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      success("تم تنزيل التذكرة");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      console.error("[downloadTicketPdf]", err);
      toastError(msg ? `فشل تنزيل التذكرة: ${msg}` : "فشل تنزيل التذكرة");
    } finally {
      setTicketDownloading(false);
    }
  };

  const uploadTicketPdfToServer = async (): Promise<string | null> => {
    if (!ticketBooking || !ticketData) return null;
    if (ticketFieldsDirty) {
      const ok = await saveTicketFields();
      if (!ok) return null;
    }
    const blob = await generateTicketBlob();
    if (!blob) { toastError("فشل توليد ملف PDF"); return null; }
    const r = await adminFetch(`/admin/bookings/${ticketBooking.id}/ticket-pdf`, {
      method: "POST", headers: { "Content-Type": "application/pdf" }, body: blob,
    });
    if (!r.ok) { toastError("فشل رفع ملف PDF"); return null; }
    const j = await r.json() as { token: string; url: string };
    if (ticketData.ticketToken) await reloadTicket(ticketData.ticketToken);
    return ticketPdfAbsoluteUrl(j.token);
  };

  const sendTicketWhatsApp = async () => {
    if (!ticketData || !ticketData.ticketToken) return;
    // Reuse a popup that was opened earlier inside a click gesture (e.g. from
    // the row "إرسال للعميل" button); otherwise open one now.
    const popup = pendingWhatsAppPopupRef.current || prepareWhatsAppPopup();
    pendingWhatsAppPopupRef.current = null;
    setTicketBusy("whatsapp");
    try {
      const pdfUrl = await uploadTicketPdfToServer();
      if (!pdfUrl) { popup?.close(); return; }
      const sig = ticketData.ticketSignature ? `?sig=${encodeURIComponent(ticketData.ticketSignature)}` : "";
      const verifyUrl = `${window.location.origin}/verify/${ticketData.ticketToken}${sig}`;
      const intl = formatPhoneIntl(ticketData.phone);
      const ar = ticketLang === "ar";
      const pkg = ar ? ticketData.packageNameAr || ticketData.packageName : ticketData.packageName || ticketData.packageNameAr;
      const ticketNo = ticketData.ticketNumber || `DRT-${String(ticketData.id).padStart(5, "0")}`;
      const priceStr = ticketData.priceAtBooking ? `${ticketData.priceAtBooking} ${ticketData.currency || "EGP"}` : "—";
      const remainingBalanceStr = ticketData.remainingBalance || priceStr;
      const msg = ar
        ? `أهلاً ${ticketData.name} 🌟\nتم تأكيد حجزك مع DR Travel.\n\n📌 الباقة: ${pkg}\n📅 التاريخ: ${ticketData.date}\n🎫 رقم التذكرة: ${ticketNo}\n💰 المبلغ المتبقي: ${remainingBalanceStr}\n\n📄 تذكرتك (PDF):\n${pdfUrl}\n\n🔗 صفحة التحقق:\n${verifyUrl}\n\nبرجاء التواجد قبل ٣٠ دقيقة من موعد الانطلاق. لأي استفسار راسلنا هنا.`
        : `Hi ${ticketData.name} 🌟\nYour DR Travel booking is confirmed.\n\n📌 Package: ${pkg}\n📅 Date: ${ticketData.date}\n🎫 Ticket No.: ${ticketNo}\n💰 Remaining Balance: ${remainingBalanceStr}\n\n📄 Your ticket (PDF):\n${pdfUrl}\n\n🔗 Verify page:\n${verifyUrl}\n\nPlease arrive 30 minutes before departure. Reply here for any questions.`;
      const waUrl = `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`;
      if (popup && !popup.closed) {
        // Sever opener BEFORE navigating cross-origin to prevent reverse-tabnabbing.
        try { (popup as Window & { opener: Window | null }).opener = null; } catch { /* ignore */ }
        popup.location.href = waUrl;
      } else {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      success("تم تجهيز رسالة الواتساب");
    } catch (err) {
      console.error("[sendTicketWhatsApp]", err);
      popup?.close();
      toastError("فشل إرسال رسالة الواتساب");
    } finally {
      setTicketBusy("");
    }
  };

  const writeToClipboardWithFallback = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };

  const copyTicketLink = async () => {
    if (!ticketData || !ticketData.ticketToken) return;
    setTicketBusy("copy");
    try {
      const pdfUrl = await uploadTicketPdfToServer();
      if (!pdfUrl) return;
      const ok = await writeToClipboardWithFallback(pdfUrl);
      if (ok) success("تم نسخ رابط ملف PDF");
      else toastError(`تعذر نسخ الرابط — ${pdfUrl}`);
    } catch (err) {
      console.error("[copyTicketLink]", err);
      toastError("تعذر نسخ الرابط");
    } finally {
      setTicketBusy("");
    }
  };

  const allOpen = bookings.length > 0 && bookings.every(b => expanded.has(b.id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
        <h2 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>
          إدارة الحجوزات <span style={{ color: "#00AAFF" }}>({bookings.length})</span>
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {bookings.length > 0 && (
            <button onClick={allOpen ? collapseAll : expandAll}
              style={{ background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem 0.9rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem" }}>
              {allOpen ? "🔼 طي الكل" : "🔽 توسيع الكل"}
            </button>
          )}
          <button onClick={() => load()} style={{ background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem 0.9rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            🔄 تحديث
          </button>
          <button onClick={exportCSV} disabled={exporting}
            style={{ background: "linear-gradient(135deg, #10B981, #0d9668)", border: "none", borderRadius: "10px", padding: "0.5rem 0.95rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 800, color: "white", opacity: exporting ? 0.7 : 1, fontSize: "0.85rem", boxShadow: "0 8px 20px -10px #10B981" }}>
            📥 {exporting ? "جاري التصدير..." : "تصدير CSV"}
          </button>
        </div>
      </div>

      {/* Sticky toolbar: search + filters */}
      <div className="bk-toolbar">
        <div style={{ marginBottom: "0.65rem" }}>
          <input
            type="text" value={search} onChange={e => handleSearchChange(e.target.value)}
            placeholder="🔍 بحث بالاسم أو الهاتف أو الباقة..."
            style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "12px", border: "1.5px solid var(--border)", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", direction: "rtl", background: "var(--bg-surface-solid)" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin", paddingBottom: 4 }}>
          <FilterTab value="all" current={filter} count={bookings.length} label="الكل" color="var(--text-secondary)" onClick={v => setFilter(v)} />
          {STATUS_OPTIONS.map(s => (
            <FilterTab key={s.value} value={s.value} current={filter} count={counts[s.value] || 0} label={s.label} color={s.color} onClick={v => setFilter(v)} />
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: "var(--bg-surface-solid)", borderRadius: "18px", padding: "1.1rem 1.25rem", display: "flex", gap: "0.85rem", alignItems: "center", boxShadow: "0 1px 3px rgba(13,27,42,0.04)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(90deg,#eef2f7,#f8fafc,#eef2f7)", backgroundSize: "200% 100%", animation: "bk-pulse 1.4s ease-in-out infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: "40%", height: 14, borderRadius: 6, background: "#eef2f7", marginBottom: 8 }} />
                <div style={{ width: "70%", height: 10, borderRadius: 5, background: "var(--bg-surface-2)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ background: "var(--bg-surface-solid)", borderRadius: "18px", padding: "3.5rem 1.5rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed #e2e8f0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.85rem" }}>📭</div>
          <p style={{ fontWeight: 700, color: "var(--text-secondary)", margin: 0 }}>لا توجد حجوزات {search ? "تطابق البحث" : "في هذا التصنيف"}</p>
          {search && (
            <button onClick={() => handleSearchChange("")} style={{ marginTop: "1rem", background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "var(--text-primary)" }}>
              ✕ مسح البحث
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {bookings.map(b => {
            const sObj = STATUS_OPTIONS.find(s => s.value === b.status) || STATUS_OPTIONS[0];
            const isOpen = expanded.has(b.id);
            const isPulse = b.status === "new";
            const partyTotal = (b.adults || 0) + (b.children || 0) + (b.infants || 0);
            const initials = b.name.trim().split(/\s+/).slice(0,2).map(s => s[0] || "").join("").toUpperCase() || "?";
            const created = new Date(b.createdAt);
            const cssVars = {
              ["--bk-color" as string]: sObj.color,
              ["--bk-color2" as string]: shade(sObj.color, -22),
              ["--bk-pill-bg" as string]: hexToRgba(sObj.color, 0.10),
              ["--bk-color-soft" as string]: hexToRgba(sObj.color, 0.22),
            } as React.CSSProperties;
            return (
              <div key={b.id} className={`bk-card ${isOpen ? "is-open" : ""}`} style={cssVars}>
                <div className="bk-head" role="button" tabIndex={0}
                  onClick={() => toggleExpanded(b.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(b.id); } }}
                  aria-expanded={isOpen}>
                  <div className={`bk-avatar ${b.status === "confirmed" ? "bk-confirmed-ring" : ""}`}>{initials}</div>
                  <div className="bk-meta">
                    <div className="bk-name-row">
                      <span className="bk-name">{b.name}</span>
                      <span className="bk-status-pill">
                        <span className={`bk-status-dot ${isPulse ? "is-pulse" : ""}`} />
                        {sObj.label}
                      </span>
                      {b.ticketUsedAt && (
                        <span className="bk-chip" style={{ background: "#dcfce7", color: "#166534" }}>✓ تذكرة مُستخدمة</span>
                      )}
                    </div>
                    <div className="bk-sub">
                      {b.packageNameAr && <span className="bk-chip is-pkg">📌 {b.packageNameAr}</span>}
                      <span className="bk-sub-item is-strong">📅 {b.date}</span>
                      <span className="bk-sub-item">👥 {partyTotal}</span>
                      {b.priceAtBooking != null && (
                        <span className="bk-chip is-price">💰 {b.priceAtBooking.toLocaleString("ar-EG")} {b.currency}</span>
                      )}
                      <span className="bk-sub-item" style={{ color: "var(--text-muted)" }} title={created.toLocaleString("ar-EG")}>
                        🕒 {timeAgo(created)}
                      </span>
                    </div>
                  </div>
                  <div className="bk-trail" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                    <a href={whatsappLink(b.phone, b.name)} target="_blank" rel="noreferrer" className="bk-icon-btn is-wa" title="واتساب">💬</a>
                    {b.status === "completed" && b.ticketToken && (
                      <a
                        href={(() => {
                          const url = `${window.location.origin}/review/${b.ticketToken}`;
                          const num = b.phone.replace(/\D/g, "");
                          const intl = num.startsWith("0") ? "2" + num : num.startsWith("20") ? num : "20" + num;
                          const msg = encodeURIComponent(`أهلاً ${b.name} 🌟\nسعدنا برحلتك معنا في ${b.packageNameAr || b.packageName}.\nنرجو تخصيص دقيقة لتقييم تجربتك من هنا:\n${url}\nشكرًا لك! - DR Travel`);
                          return `https://wa.me/${intl}?text=${msg}`;
                        })()}
                        target="_blank" rel="noreferrer"
                        className="bk-icon-btn is-wa" title="إرسال رابط تقييم الرحلة">🌟</a>
                    )}
                    <button className="bk-icon-btn is-chevron" title={isOpen ? "طي" : "توسيع"} onClick={() => toggleExpanded(b.id)}>
                      <span className="bk-chev">▾</span>
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="bk-body">
                    <div className="bk-body-grid">
                      <div className="bk-info">
                        <span className="bk-info-label">📞 الهاتف</span>
                        <span className="bk-info-val is-mono">{b.phone}</span>
                      </div>
                      <div className="bk-info">
                        <span className="bk-info-label">👥 المجموعة</span>
                        <span className="bk-info-val">
                          {b.adults} كبار{b.children > 0 ? ` · ${b.children} أطفال` : ""}{b.infants > 0 ? ` · ${b.infants} رضّع` : ""}
                        </span>
                      </div>
                      {b.priceAtBooking != null && (
                        <div className="bk-info">
                          <span className="bk-info-label">💰 السعر</span>
                          <span className="bk-info-val">{b.priceAtBooking.toLocaleString("ar-EG")} {b.currency}</span>
                        </div>
                      )}
                      {b.referralCode && (
                        <div className="bk-info">
                          <span className="bk-info-label">🎟️ كود إحالة</span>
                          <span className="bk-info-val is-mono">{b.referralCode}</span>
                        </div>
                      )}
                      {b.ticketNumber && (
                        <div className="bk-info">
                          <span className="bk-info-label">🎫 رقم التذكرة</span>
                          <span className="bk-info-val is-mono">{b.ticketNumber}</span>
                        </div>
                      )}
                      {b.meetingTime && (
                        <div className="bk-info">
                          <span className="bk-info-label">⏰ وقت الانطلاق</span>
                          <span className="bk-info-val">{b.meetingTime}</span>
                        </div>
                      )}
                      {b.pickupLocationAr && (
                        <div className="bk-info">
                          <span className="bk-info-label">📍 نقطة التجمع</span>
                          <span className="bk-info-val">{b.pickupLocationAr}</span>
                        </div>
                      )}
                    </div>

                    {b.notes && (
                      <div className="bk-note is-customer">
                        <span className="bk-note-icon">📝</span>
                        <div><strong>ملاحظة العميل:</strong> {b.notes}</div>
                      </div>
                    )}
                    {b.adminNotes && (
                      <div className="bk-note is-admin">
                        <span className="bk-note-icon">🔒</span>
                        <div><strong>ملاحظة داخلية:</strong> {b.adminNotes}</div>
                      </div>
                    )}

                    <div className="bk-actions" data-mobile-actions="true">
                      <select value={b.status} disabled={updating === b.id} onChange={e => updateStatus(b.id, e.target.value)} className="bk-status-select">
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <button className="bk-btn is-ticket" onClick={() => openTicket(b)} title="تذكرة الحجز">
                        🎫 تذكرة
                      </button>
                      <button className="bk-btn is-ticket"
                        onClick={() => {
                          setLangChooser({ booking: b, action: "image-send" });
                        }}
                        title="فتح شات واتساب العميل مع الرسالة الجاهزة + صورة التذكرة">
                        📤 إرسال للعميل
                      </button>
                      <button className="bk-btn is-ticket" onClick={() => setLangChooser({ booking: b, action: "image" })} title="تحميل التذكرة كصورة (يختار اللغة)">
                        🖼️ صورة
                      </button>
                      <button className="bk-btn is-ticket" onClick={() => openTicket(b, "download")} title="تنزيل تذكرة PDF">
                        ⬇️ تنزيل PDF
                      </button>
                      <a href={whatsappLink(b.phone, b.name)} target="_blank" rel="noreferrer" className="bk-btn is-wa">
                        💬 واتساب
                      </a>
                      <button className="bk-btn is-warn" onClick={() => { setNoteBooking(b); setNoteText(b.adminNotes || ""); }}>
                        📌 ملاحظة
                      </button>
                      <button className="bk-btn is-danger" onClick={() => setConfirmDelete(b.id)}>
                        🗑️ حذف
                      </button>
                    </div>

                    <div className="bk-audit">
                      <span>#{b.id}</span>
                      <span>أُنشئ {created.toLocaleString("ar-EG")}</span>
                      {b.updatedAt && b.updatedAt !== b.createdAt && (
                        <span>تحديث {new Date(b.updatedAt).toLocaleString("ar-EG")}</span>
                      )}
                      {b.ticketUsedAt && (
                        <span>اُستخدمت {new Date(b.ticketUsedAt).toLocaleString("ar-EG")}{b.ticketUsedBy ? ` · ${b.ticketUsedBy}` : ""}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

{/* Note modal */}
      {noteBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setNoteBooking(null)}>
          <div style={{ background: "var(--bg-surface-solid)", borderRadius: "16px", padding: "1.75rem", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)", fontFamily: "Cairo, sans-serif" }}>
              ملاحظة داخلية — {noteBooking.name}
            </h3>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
              placeholder="أضف ملاحظة داخلية للأدمن..."
              style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1.5px solid var(--border)", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", outline: "none", resize: "vertical", boxSizing: "border-box", direction: "rtl" }} />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button onClick={() => setNoteBooking(null)} style={{ background: "var(--bg-surface-2)", border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600 }}>إلغاء</button>
              <button onClick={saveNote} style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Language chooser for image / image-send row shortcuts */}
      {langChooser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => {
            // Cancel: close any popup we pre-opened for image-send.
            if (pendingWhatsAppPopupRef.current && !pendingWhatsAppPopupRef.current.closed) {
              pendingWhatsAppPopupRef.current.close();
            }
            pendingWhatsAppPopupRef.current = null;
            setLangChooser(null);
          }}>
          <div style={{ background: "var(--bg-surface-solid)", borderRadius: 16, padding: "1.5rem", maxWidth: 380, width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontFamily: "Cairo, sans-serif", fontSize: "1.05rem", fontWeight: 800, textAlign: "center" }}>
              {langChooser.action === "image" ? "اختر لغة الصورة" : "اختر لغة صورة الإرسال"}
            </h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", textAlign: "center" }}>
              {langChooser.booking.name} — {langChooser.booking.phone}
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  const { booking, action } = langChooser;
                  setLangChooser(null);
                  if (action === "image-send") prepareWhatsAppPopup();
                  openTicket(booking, action, "ar");
                }}
                style={{ flex: 1, background: "linear-gradient(135deg,#0D1B2A,#14253a)", color: "white", border: "none", borderRadius: 12, padding: "0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "1rem", fontWeight: 800 }}>
                🇪🇬 عربي
              </button>
              <button
                onClick={() => {
                  const { booking, action } = langChooser;
                  setLangChooser(null);
                  if (action === "image-send") prepareWhatsAppPopup();
                  openTicket(booking, action, "en");
                }}
                style={{ flex: 1, background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: 12, padding: "0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "1rem", fontWeight: 800 }}>
                🇬🇧 English
              </button>
            </div>
            <button
              onClick={() => {
                if (pendingWhatsAppPopupRef.current && !pendingWhatsAppPopupRef.current.closed) {
                  pendingWhatsAppPopupRef.current.close();
                }
                pendingWhatsAppPopupRef.current = null;
                setLangChooser(null);
              }}
              style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.5rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Ticket modal */}
      {ticketBooking && (
        <div className="admin-ticket-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem 0.75rem", overflowY: "auto" }}
          onClick={closeTicket}>
          <div className="admin-ticket-modal" style={{ background: "var(--bg-surface-sunk)", borderRadius: 18, padding: "1.25rem", maxWidth: 880, width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", fontFamily: "Cairo, sans-serif", fontSize: "1.1rem", fontWeight: 800 }}>
                🎫 تذكرة #{ticketBooking.id} — {ticketBooking.name}
              </h3>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <div style={{ display: "inline-flex", background: "var(--border)", borderRadius: 8, padding: 2 }}>
                  {(["ar", "en"] as const).map(lng => (
                    <button key={lng} onClick={() => setTicketLang(lng)}
                      style={{ background: ticketLang === lng ? "var(--text-primary)" : "transparent", color: ticketLang === lng ? "var(--bg-surface-solid)" : "var(--text-secondary)", border: "none", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.75rem", fontWeight: 700 }}>
                      {lng === "ar" ? "AR" : "EN"}
                    </button>
                  ))}
                </div>
                <button onClick={closeTicket}
                  style={{ background: "var(--bg-surface-solid)", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0.4rem 0.7rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Editable trip operations */}
            <div style={{ background: "var(--bg-surface-solid)", borderRadius: 12, padding: "0.85rem 1rem", border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
              <FieldInput label="وقت الانطلاق" placeholder="مثال: 8:00 صباحاً" value={ticketFields.meetingTime}
                onChange={v => updateTicketField("meetingTime", v)} />
              <FieldInput label="نقطة التجمع (عربي)" placeholder="مثال: مرسى مطروح، أمام الفندق" value={ticketFields.pickupLocationAr}
                onChange={v => updateTicketField("pickupLocationAr", v)} />
              <FieldInput label="Pickup (English)" placeholder="ex: Marsa Matruh, hotel lobby" value={ticketFields.pickupLocation}
                onChange={v => updateTicketField("pickupLocation", v)} />
              <FieldInput label="اسم المشرف" placeholder="مثال: أحمد سيد" value={ticketFields.supervisorName}
                onChange={v => updateTicketField("supervisorName", v)} />
              <FieldInput label="هاتف المشرف" placeholder="01XXXXXXXXX" value={ticketFields.supervisorPhone}
                onChange={v => updateTicketField("supervisorPhone", v)} />
              <FieldInput label="المبلغ المتبقي" placeholder="مثال: 500 EGP" value={ticketFields.remainingBalance}
                onChange={v => updateTicketField("remainingBalance", v)} />
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={saveTicketFields} disabled={!ticketFieldsDirty}
                  style={{ background: ticketFieldsDirty ? "linear-gradient(135deg,#00AAFF,#0066cc)" : "var(--text-secondary)", color: "white", border: "none", borderRadius: 8, padding: "0.5rem 0.9rem", cursor: ticketFieldsDirty ? "pointer" : "not-allowed", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 700, width: "100%" }}>
                  💾 حفظ بيانات الرحلة
                </button>
              </div>
            </div>

            {/* Action bar */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={downloadTicketImage} disabled={!ticketData || ticketDownloading || !!ticketBusy}
                title={`تحميل التذكرة كصورة بالـ${ticketLang === "ar" ? "عربي" : "إنجليزي"} (أسرع — ثوانٍ)`}
                style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: 10, padding: "0.55rem 1rem", cursor: ticketData && !ticketDownloading && !ticketBusy ? "pointer" : "not-allowed", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700, opacity: !ticketData || ticketDownloading || !!ticketBusy ? 0.6 : 1 }}>
                🖼️ {ticketDownloading ? "جاري التنزيل..." : `تنزيل صورة (${ticketLang === "ar" ? "AR" : "EN"})`}
              </button>
              <button onClick={sendTicketImageWhatsApp} disabled={!ticketData || !!ticketBusy || ticketDownloading}
                title="فتح شات واتساب العميل مع الرسالة الجاهزة + صورة التذكرة (يمكن تخصيص النص من الإعدادات)"
                style={{ background: "#25D366", color: "white", border: "none", borderRadius: 10, padding: "0.55rem 1rem", cursor: ticketData && !ticketBusy && !ticketDownloading ? "pointer" : "not-allowed", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700, opacity: !ticketData || !!ticketBusy || ticketDownloading ? 0.6 : 1 }}>
                📤 {ticketBusy === "image-send" ? "جاري التجهيز..." : `إرسال للعميل (${ticketLang === "ar" ? "AR" : "EN"})`}
              </button>
              <button onClick={downloadTicketPdf} disabled={!ticketData || ticketDownloading || !!ticketBusy}
                style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.55rem 1rem", cursor: ticketData && !ticketDownloading && !ticketBusy ? "pointer" : "not-allowed", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700, opacity: !ticketData || ticketDownloading || !!ticketBusy ? 0.6 : 1 }}>
                ⬇️ {ticketDownloading ? "جاري التنزيل..." : "تنزيل PDF"}
              </button>
              <button onClick={copyTicketLink} disabled={!ticketData || !!ticketBusy || ticketDownloading}
                style={{ background: "var(--bg-surface-solid)", color: "var(--text-primary)", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0.55rem 1rem", cursor: ticketData && !ticketBusy && !ticketDownloading ? "pointer" : "not-allowed", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700, opacity: !ticketData || !!ticketBusy || ticketDownloading ? 0.6 : 1 }}>
                🔗 {ticketBusy === "copy" ? "جاري التجهيز..." : "نسخ رابط PDF"}
              </button>
              <button onClick={downloadTicketQr} disabled={!ticketData || !ticketData.ticketToken || !!ticketBusy || ticketDownloading} title="تنزيل QR لصفحة التذكرة"
                style={{ background: "var(--bg-surface-solid)", color: "var(--text-primary)", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0.55rem 1rem", cursor: ticketData && ticketData.ticketToken && !ticketBusy && !ticketDownloading ? "pointer" : "not-allowed", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700, opacity: !ticketData || !ticketData.ticketToken || !!ticketBusy || ticketDownloading ? 0.6 : 1 }}>
                📱 {ticketBusy === "qr" ? "جاري التجهيز..." : "تنزيل QR"}
              </button>
              {ticketData && ticketData.ticketToken && (
                <a href={`/verify/${ticketData.ticketToken}${ticketData.ticketSignature ? `?sig=${encodeURIComponent(ticketData.ticketSignature)}` : ""}`} target="_blank" rel="noreferrer"
                  style={{ background: "var(--bg-surface-solid)", color: "var(--text-primary)", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0.55rem 1rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  ↗️ صفحة التحقق
                </a>
              )}
              {ticketData?.pdfUrl && ticketData.ticketToken && (
                <>
                  <a href={ticketPdfAbsoluteUrl(ticketData.ticketToken)} target="_blank" rel="noreferrer"
                    style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74", borderRadius: 10, padding: "0.55rem 1rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700 }}>
                    📄 فتح PDF
                  </a>
                  <a href={`${ticketPdfAbsoluteUrl(ticketData.ticketToken)}?download=1`} target="_blank" rel="noreferrer"
                    style={{ background: "var(--bg-surface-solid)", color: "var(--text-primary)", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0.55rem 1rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", fontWeight: 700 }}>
                    ⬇️ تحميل PDF من السيرفر
                  </a>
                </>
              )}
            </div>

            {/* Preview */}
            <div ref={ticketRef} className="admin-ticket-preview" style={{ background: "var(--border)", borderRadius: 14, padding: "1rem", display: "flex", justifyContent: "center", overflow: "auto" }}>
              {ticketLoading || !ticketData ? (
                <div style={{ padding: "3rem", color: "var(--text-secondary)", fontFamily: "Cairo, sans-serif" }}>⏳ جاري تجهيز التذكرة...</div>
              ) : (
                <div className="admin-ticket-preview-scale" style={{ transform: "scale(0.78)", transformOrigin: "top center", width: 800 }}>
                  <Ticket
                    data={ticketData}
                    lang={ticketLang}
                    publicUrl={ticketData.ticketToken ? `${window.location.origin}/verify/${ticketData.ticketToken}` : ""}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="حذف الحجز"
        message="هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => confirmDelete !== null && deleteBooking(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function FilterTab({ value, current, count, label, color, onClick }: { value: string; current: string; count: number; label: string; color: string; onClick: (v: string) => void; }) {
  const active = value === current;
  return (
    <button onClick={() => onClick(value)}
      style={{ background: active ? color : "var(--bg-surface-solid)", color: active ? "white" : color, border: `1.5px solid ${color}`, borderRadius: "50px", padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.82rem", fontFamily: "Cairo, sans-serif", fontWeight: 700, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}>
      {label} {count > 0 && <span style={{ background: active ? "var(--text-muted)" : `${color}20`, borderRadius: "50px", padding: "0.1rem 0.4rem", marginRight: "0.25rem" }}>{count}</span>}
    </button>
  );
}

function FieldInput({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>{label}</span>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ padding: "0.45rem 0.65rem", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem", outline: "none", background: "var(--bg-surface-solid)" }}
      />
    </label>
  );
}
