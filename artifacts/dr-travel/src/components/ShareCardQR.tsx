import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLanguage } from "../LanguageContext";
import { resolveApiAssetUrl } from "../lib/api";
import logoFallback from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";

interface QRBaseProps {
  url: string;
  fg: string;
  bg: string;
  logoSrc?: string;
  size: number;
  margin?: number;
}

interface ClipboardItemCtor {
  new (items: Record<string, Blob>): unknown;
}
interface NavigatorWithClipboardWrite {
  clipboard?: { write?: (items: unknown[]) => Promise<void> };
}
interface NavigatorWithShare {
  share?: (data: { files?: File[]; title?: string; text?: string; url?: string }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
}

function getClipboardItem(): ClipboardItemCtor | null {
  const w = window as unknown as { ClipboardItem?: ClipboardItemCtor };
  return typeof w.ClipboardItem === "function" ? w.ClipboardItem : null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function fetchAsDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("read fail"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generatePngDataUrl(opts: QRBaseProps): Promise<string> {
  const { url, fg, bg, size, margin = 2, logoSrc } = opts;
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url || " ", {
    errorCorrectionLevel: "H",
    margin,
    width: size,
    color: { dark: fg, light: bg },
  });
  if (logoSrc) {
    try {
      const img = await loadImage(logoSrc);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const w = canvas.width;
        const logoSize = Math.round(w * 0.22);
        const x = Math.round((w - logoSize) / 2);
        const pad = Math.round(logoSize * 0.12);
        const bgSize = logoSize + pad * 2;
        const bx = Math.round((w - bgSize) / 2);
        const radius = Math.round(bgSize * 0.18);
        ctx.fillStyle = bg;
        roundRect(ctx, bx, bx, bgSize, bgSize, radius);
        ctx.fill();
        ctx.save();
        roundRect(ctx, x, x, logoSize, logoSize, Math.round(logoSize * 0.18));
        ctx.clip();
        ctx.drawImage(img, x, x, logoSize, logoSize);
        ctx.restore();
      }
    } catch {
      /* ignore logo overlay failure */
    }
  }
  return canvas.toDataURL("image/png");
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, ch => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  }[ch] || ch));
}

export async function generateSvg(opts: QRBaseProps): Promise<string> {
  const { url, fg, bg, size, margin = 2, logoSrc } = opts;
  const baseSvg = await QRCode.toString(url || " ", {
    type: "svg",
    errorCorrectionLevel: "H",
    margin,
    width: size,
    color: { dark: fg, light: bg },
  });

  if (!logoSrc) return baseSvg;

  // Embed brand logo at the center of the SVG using a base64-encoded raster.
  const logoDataUrl = await fetchAsDataUrl(logoSrc);
  if (!logoDataUrl) return baseSvg;

  // The QR svg has a viewBox that spans the modules grid (including margin).
  const viewBoxMatch = baseSvg.match(/viewBox="([\d.\s-]+)"/);
  if (!viewBoxMatch) return baseSvg;
  const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
  if (parts.length < 4 || parts.some(n => Number.isNaN(n))) return baseSvg;
  const [vx, vy, vw, vh] = parts;
  const logoSize = vw * 0.22;
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  const lx = cx - logoSize / 2;
  const ly = cy - logoSize / 2;
  const pad = logoSize * 0.12;
  const bgSize = logoSize + pad * 2;
  const bxs = cx - bgSize / 2;
  const bys = cy - bgSize / 2;
  const bgRadius = bgSize * 0.18;
  const lgRadius = logoSize * 0.18;
  const clipId = `qr-logo-clip-${Math.random().toString(36).slice(2, 8)}`;

  const overlay =
    `<defs><clipPath id="${clipId}">` +
    `<rect x="${lx}" y="${ly}" width="${logoSize}" height="${logoSize}" rx="${lgRadius}" ry="${lgRadius}"/>` +
    `</clipPath></defs>` +
    `<rect x="${bxs}" y="${bys}" width="${bgSize}" height="${bgSize}" rx="${bgRadius}" ry="${bgRadius}" fill="${escapeXml(bg)}"/>` +
    `<image x="${lx}" y="${ly}" width="${logoSize}" height="${logoSize}" ` +
    `clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice" ` +
    `href="${escapeXml(logoDataUrl)}" xlink:href="${escapeXml(logoDataUrl)}"/>`;

  // Inject overlay just before the closing </svg> and ensure xlink namespace is present.
  let svg = baseSvg.replace(/<\/svg>\s*$/, overlay + "</svg>");
  if (!/xmlns:xlink=/.test(svg)) {
    svg = svg.replace("<svg ", `<svg xmlns:xlink="http://www.w3.org/1999/xlink" `);
  }
  return svg;
}

export type { QRBaseProps };

export async function downloadQrPng(opts: QRBaseProps & { filename: string }): Promise<void> {
  const dataUrl = await generatePngDataUrl(opts);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(u);
}

export function useQrPng(opts: QRBaseProps): string {
  const [src, setSrc] = useState("");
  const stableLogo = opts.logoSrc;
  useEffect(() => {
    let cancelled = false;
    if (!opts.url) { setSrc(""); return; }
    generatePngDataUrl(opts)
      .then(d => { if (!cancelled) setSrc(d); })
      .catch(() => { if (!cancelled) setSrc(""); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.url, opts.fg, opts.bg, opts.size, opts.margin, stableLogo]);
  return src;
}

/** Embedded badge for the public share card */
export function ShareCardQRBadge({
  url, fg, bg, accent, logoSrc, label,
}: { url: string; fg: string; bg: string; accent: string; logoSrc?: string; label: string }) {
  const png = useQrPng({ url, fg, bg, logoSrc, size: 320, margin: 2 });
  if (!png) return null;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      padding: "0.85rem 0.85rem 0.7rem",
      borderRadius: "16px",
      background: "rgba(255,255,255,0.95)",
      border: `1px solid ${accent}40`,
      boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
      width: "fit-content", margin: "0 auto",
    }}>
      <img src={png} alt="QR" style={{ width: 130, height: 130, display: "block", borderRadius: 8 }} />
      <div style={{ color: "#0D1B2A", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.5px" }}>{label}</div>
    </div>
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function relLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const conv = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = (hex || "").trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

interface AdminQRSectionProps {
  url: string;
  fg: string;
  bg: string;
  embedOnCard: boolean;
  logoUrl?: string;
  filenameBase?: string;
  brandAccent: string;
  source?: string;
  sourcePresets?: { value: string; labelAr: string; labelEn: string }[];
  onChange: (patch: { fg?: string; bg?: string; embedOnCard?: boolean; source?: string }) => void;
}

export function sanitizeSourceTag(raw: string): string {
  return (raw || "").trim().slice(0, 32).replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

export function withSourceParam(baseUrl: string, source: string): string {
  const clean = sanitizeSourceTag(source);
  if (!clean) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}s=${encodeURIComponent(clean)}`;
}

const SIZE_OPTIONS: { key: "small" | "medium" | "large" | "print"; px: number }[] = [
  { key: "small",  px: 256 },
  { key: "medium", px: 512 },
  { key: "large",  px: 1024 },
  { key: "print",  px: 2048 },
];

export function AdminQRSection({
  url, fg, bg, embedOnCard, logoUrl, filenameBase, brandAccent, source = "", sourcePresets = [], onChange,
}: AdminQRSectionProps) {
  const { t, lang } = useLanguage();
  const tx = t.shareCardQr;
  const ar = lang === "ar";

  const [size, setSize] = useState<"small" | "medium" | "large" | "print">("medium");
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [busy, setBusy] = useState<"download" | "copy" | "share" | null>(null);
  const [feedback, setFeedback] = useState("");

  const logoSrc = resolveApiAssetUrl(logoUrl) || logoFallback;
  const cleanSource = sanitizeSourceTag(source);
  const taggedUrl = withSourceParam(url, cleanSource);
  const previewPng = useQrPng({ url: taggedUrl, fg, bg, logoSrc, size: 360, margin: 2 });

  const ratio = contrastRatio(fg, bg);
  const lowContrast = ratio < 3;
  const sizePx = SIZE_OPTIONS.find(s => s.key === size)?.px || 512;
  const baseName = (filenameBase || "share").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  const sourceSuffix = cleanSource ? `-${cleanSource}` : "";
  const filename = `${baseName}${sourceSuffix}-qr.${format}`;

  const showFeedback = (m: string) => {
    setFeedback(m);
    window.setTimeout(() => setFeedback(""), 2200);
  };

  const buildBlob = async (chosenFormat: "png" | "svg"): Promise<Blob> => {
    if (chosenFormat === "svg") {
      const svg = await generateSvg({ url: taggedUrl, fg, bg, size: sizePx, margin: 2, logoSrc });
      return new Blob([svg], { type: "image/svg+xml" });
    }
    const dataUrl = await generatePngDataUrl({ url: taggedUrl, fg, bg, size: sizePx, margin: 2, logoSrc });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const onDownload = async () => {
    if (lowContrast) return;
    setBusy("download");
    try {
      const blob = await buildBlob(format);
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
      showFeedback(tx.feedbackDownload);
    } catch {
      showFeedback(tx.feedbackDownloadFail);
    } finally {
      setBusy(null);
    }
  };

  const onCopy = async () => {
    if (lowContrast) return;
    setBusy("copy");
    try {
      // Always copy the PNG — clipboard image support is PNG-only across browsers.
      const blob = await buildBlob("png");
      const ClipboardItemImpl = getClipboardItem();
      const nav = navigator as NavigatorWithClipboardWrite;
      if (ClipboardItemImpl && nav.clipboard?.write) {
        await nav.clipboard.write([new ClipboardItemImpl({ "image/png": blob })]);
        showFeedback(tx.feedbackCopy);
      } else {
        showFeedback(tx.feedbackCopyUnsupported);
      }
    } catch {
      showFeedback(tx.feedbackCopyFail);
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (lowContrast) return;
    setBusy("share");
    try {
      // Web Share API only reliably handles raster images; share PNG.
      const blob = await buildBlob("png");
      const file = new File([blob], `${baseName}${sourceSuffix}-qr.png`, { type: "image/png" });
      const nav = navigator as NavigatorWithShare;
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "QR", text: taggedUrl });
        showFeedback(tx.feedbackShare);
      } else {
        await onDownload();
      }
    } catch {
      /* user cancel */
    } finally {
      setBusy(null);
    }
  };

  const swatch = (color: string, onPick: (c: string) => void, presets: string[]) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
      {presets.map(c => (
        <button key={c} type="button" onClick={() => onPick(c)} title={c}
          style={{
            width: 28, height: 28, borderRadius: 8, background: c,
            border: color.toLowerCase() === c.toLowerCase() ? "3px solid #0D1B2A" : "2px solid white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)", cursor: "pointer", padding: 0,
          }} />
      ))}
      <input type="color" value={color} onChange={e => onPick(e.target.value)}
        style={{ width: 44, height: 32, border: "1.5px solid #d0dce8", borderRadius: 8, padding: 0, background: "white", cursor: "pointer" }} />
      <input type="text" value={color} onChange={e => onPick(e.target.value)}
        style={{
          width: 100, padding: "0.4rem 0.55rem", borderRadius: 8,
          border: "1.5px solid #d0dce8", outline: "none", fontSize: "0.78rem",
          fontFamily: "Cairo, sans-serif", direction: "ltr", color: "#0D1B2A", background: "white",
        }} />
    </div>
  );

  const btn = (label: string, onClick: () => void, primary: boolean, disabled: boolean, busyMatch: typeof busy) => (
    <button type="button" onClick={onClick} disabled={disabled || busy !== null}
      style={{
        padding: "0.65rem 1rem", borderRadius: 10,
        border: primary ? "none" : "1.5px solid #d0dce8",
        background: primary ? brandAccent : "white",
        color: primary ? "var(--bg-page-2)" : "#0D1B2A",
        fontWeight: 800, fontFamily: "Cairo, sans-serif",
        cursor: disabled ? "not-allowed" : (busy ? "wait" : "pointer"),
        opacity: disabled ? 0.5 : 1, fontSize: "0.85rem",
        boxShadow: primary ? `0 6px 14px ${brandAccent}55` : "none",
      }}>
      {busy === busyMatch ? "⏳ ..." : label}
    </button>
  );

  return (
    <div style={{
      background: "white", borderRadius: 14, border: "1.5px solid #e0e8f0",
      padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem",
      direction: ar ? "rtl" : "ltr",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 style={{ margin: 0, color: "#0D1B2A", fontWeight: 900, fontSize: "1.05rem" }}>📱 {tx.sectionTitle}</h3>
        <a href={taggedUrl} target="_blank" rel="noreferrer"
          style={{ color: "var(--section-subtitle)", fontSize: "0.78rem", direction: "ltr", textDecoration: "none", wordBreak: "break-all", textAlign: "right" }}>
          {taggedUrl}
        </a>
      </div>
      <p style={{ margin: 0, color: "var(--section-subtitle)", fontSize: "0.78rem" }}>{tx.description}</p>

      {sourcePresets.length > 0 && (
        <div style={{
          background: "#f8fafc", border: "1.5px solid #e0e8f0", borderRadius: 12,
          padding: "0.75rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          <div style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.78rem" }}>
            {tx.sourceLabel}
          </div>
          <div style={{ color: "var(--section-subtitle)", fontSize: "0.74rem", lineHeight: 1.6 }}>
            {tx.sourceHelp}
          </div>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => onChange({ source: "" })}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: 8,
                border: `2px solid ${cleanSource === "" ? "#00AAFF" : "#e0e8f0"}`,
                background: cleanSource === "" ? "rgba(0,170,255,0.08)" : "white",
                color: "#0D1B2A", fontWeight: 700, fontSize: "0.78rem",
                fontFamily: "Cairo, sans-serif", cursor: "pointer",
              }}>
              {tx.sourceNone}
            </button>
            {sourcePresets.map(p => {
              const active = cleanSource === sanitizeSourceTag(p.value);
              return (
                <button key={p.value} type="button" onClick={() => onChange({ source: p.value })}
                  style={{
                    padding: "0.4rem 0.75rem", borderRadius: 8,
                    border: `2px solid ${active ? "#00AAFF" : "#e0e8f0"}`,
                    background: active ? "rgba(0,170,255,0.08)" : "white",
                    color: "#0D1B2A", fontWeight: 700, fontSize: "0.78rem",
                    fontFamily: "Cairo, sans-serif", cursor: "pointer",
                  }}>
                  {ar ? p.labelAr : p.labelEn}
                  <span style={{ color: "var(--section-subtitle)", fontWeight: 500, marginInlineStart: "0.35rem", direction: "ltr" }}>
                    · {p.value}
                  </span>
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={source}
            onChange={e => onChange({ source: e.target.value })}
            placeholder={tx.sourceCustomPlaceholder}
            style={{
              padding: "0.5rem 0.7rem", borderRadius: 8,
              border: "1.5px solid #d0dce8", outline: "none", fontSize: "0.82rem",
              fontFamily: "Cairo, sans-serif", direction: "ltr",
              color: "#0D1B2A", background: "white",
            }}
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1.2rem", alignItems: "start" }}
        className="qr-section-grid">
        <style>{`
          @media (max-width: 720px) {
            .qr-section-grid { grid-template-columns: 1fr !important; }
            .qr-section-grid > div:first-child { justify-self: center; }
          }
        `}</style>
        <div style={{
          width: 200, height: 200, borderRadius: 14,
          background: bg, padding: 8,
          border: "1.5px solid #e0e8f0",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {previewPng ? (
            <img src={previewPng} alt="QR preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ color: "#888", fontSize: "0.8rem" }}>...</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <div style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.78rem", marginBottom: "0.35rem" }}>{tx.foreground}</div>
            {swatch(fg, c => onChange({ fg: c }), ["#0D1B2A", "#000000", "#1a3a5c", brandAccent, "#16a34a", "#7c3aed"])}
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.78rem", marginBottom: "0.35rem" }}>{tx.background}</div>
            {swatch(bg, c => onChange({ bg: c }), ["#FFFFFF", "#F5F5F5", "#FFF7E6", "#E0F2FE", "#0D1B2A"])}
          </div>

          {lowContrast && (
            <div style={{
              color: "#b91c1c", background: "#fee2e2",
              padding: "0.55rem 0.7rem", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700,
            }}>
              {tx.contrastWarning} ({ratio.toFixed(2)})
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.78rem", marginBottom: "0.35rem" }}>{tx.size}</div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {SIZE_OPTIONS.map(s => {
                  const active = size === s.key;
                  return (
                    <button key={s.key} type="button" onClick={() => setSize(s.key)}
                      style={{
                        padding: "0.45rem 0.7rem", borderRadius: 8,
                        border: `2px solid ${active ? "#00AAFF" : "#e0e8f0"}`,
                        background: active ? "rgba(0,170,255,0.08)" : "white",
                        color: "#0D1B2A", fontWeight: 700, fontSize: "0.78rem",
                        fontFamily: "Cairo, sans-serif", cursor: "pointer",
                      }}>
                      {tx.sizes[s.key]} · {s.px}px
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.78rem", marginBottom: "0.35rem" }}>{tx.format}</div>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {(["png", "svg"] as const).map(f => {
                  const active = format === f;
                  return (
                    <button key={f} type="button" onClick={() => setFormat(f)}
                      style={{
                        padding: "0.45rem 0.85rem", borderRadius: 8,
                        border: `2px solid ${active ? "#00AAFF" : "#e0e8f0"}`,
                        background: active ? "rgba(0,170,255,0.08)" : "white",
                        color: "#0D1B2A", fontWeight: 800, fontSize: "0.78rem",
                        fontFamily: "Cairo, sans-serif", cursor: "pointer", textTransform: "uppercase",
                      }}>
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            {btn(tx.download, onDownload, true, lowContrast, "download")}
            {btn(tx.copy, onCopy, false, lowContrast, "copy")}
            {btn(tx.share, onShare, false, lowContrast, "share")}
            {feedback && <span style={{ color: "#16a34a", fontSize: "0.82rem", fontWeight: 700 }}>{feedback}</span>}
          </div>

          <label style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            padding: "0.6rem 0.7rem", borderRadius: 10,
            background: "#f8fafc", border: "1.5px solid #e0e8f0", cursor: "pointer",
          }}>
            <input type="checkbox" checked={embedOnCard}
              onChange={e => onChange({ embedOnCard: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: brandAccent }} />
            <span style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.86rem" }}>
              {tx.embedToggle}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
