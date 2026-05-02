import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "../LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { useSiteData, type DBPackage } from "../context/SiteDataContext";
import { apiFetch, storageObjectUrl } from "../lib/api";
import { formatPrice } from "../data/currencies";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  packages?: DBPackage[];
  ts: number;
}

const WELCOME_DISMISS_KEY = "drtravel_ai_welcome_dismissed_v1";

const AssistantIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ai-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00AAFF" />
        <stop offset="1" stopColor="#C9A84C" />
      </linearGradient>
    </defs>
    <path d="M16 3.2 19 11l8 3-8 3-3 8-3-8-8-3 8-3 3-7.8Z" fill="url(#ai-grad)" />
    <circle cx="25.5" cy="6.5" r="1.8" fill="#FFFFFF" opacity="0.9" />
    <circle cx="6.5" cy="24.5" r="1.2" fill="#FFFFFF" opacity="0.7" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
);

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

export default function AIAssistant() {
  const { lang } = useLanguage();
  const { currency } = useCurrency();
  const { settings, packages, packagesLoading } = useSiteData();
  const ar = lang === "ar";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const T = {
    title: ar ? "مساعد DR Travel" : "DR Travel Assistant",
    subtitle: ar ? "متصل الآن • يجاوب فوراً" : "Online now · instant replies",
    placeholder: ar ? "اسأل عن أي رحلة أو خدمة…" : "Ask about any trip or service…",
    send: ar ? "إرسال" : "Send",
    greeting: ar
      ? "أهلاً! 👋 أنا مساعد DR Travel، أقدر أساعدك تختار أنسب رحلة، أقارن باقات، وأجاوب على أي سؤال."
      : "Hi! 👋 I'm the DR Travel assistant. I can help you pick the perfect trip, compare packages, and answer any question.",
    welcomeBubble: ar ? "محتاج مساعدة في اختيار رحلتك؟" : "Need help picking your trip?",
    bookNow: ar ? "احجز الآن" : "Book Now",
    askWhatsApp: ar ? "واتساب" : "WhatsApp",
    typing: ar ? "يكتب…" : "typing…",
    stop: ar ? "إيقاف" : "Stop",
    clear: ar ? "مسح المحادثة" : "Clear chat",
    copy: ar ? "نسخ" : "Copy",
    copied: ar ? "تم النسخ" : "Copied",
    aborted: ar ? "تم إيقاف الرد." : "Reply stopped.",
    errMsg: ar ? "حصل خطأ، حاول تاني." : "Something went wrong, please try again.",
    rateLimit: ar ? "أسئلة كتير في وقت قصير. استنى دقيقة." : "Too many messages, please wait a moment.",
    notReady: ar ? "المساعد غير مفعّل حالياً." : "Assistant is not configured yet.",
    suggestions: ar
      ? ["إيه أفضل رحلة عائلية؟", "أرخص باقة عندكم؟", "عايز أزور بمفردي", "إيه الفرق بين السفاري واليخت؟"]
      : ["Best family trip?", "Cheapest package?", "I'm visiting solo", "Safari vs yacht?"],
  };

  const whatsapp = settings.whatsapp_number || "01205756024";

  // Auto-show welcome bubble after 3s if not previously dismissed
  useEffect(() => {
    if (open) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(WELCOME_DISMISS_KEY) === "1") return;
    const tm = window.setTimeout(() => setShowWelcomeBubble(true), 3000);
    return () => window.clearTimeout(tm);
  }, [open]);

  const dismissWelcome = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowWelcomeBubble(false);
    try { localStorage.setItem(WELCOME_DISMISS_KEY, "1"); } catch {}
  }, []);

  // Seed with greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: T.greeting, ts: Date.now() }]);
    }
    if (open) setShowWelcomeBubble(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const matchPackages = useCallback((slugs: string[]): DBPackage[] => {
    if (!slugs?.length || packagesLoading) return [];
    const found: DBPackage[] = [];
    for (const s of slugs) {
      const p = packages.find((x) => x.slug === s);
      if (p && !found.includes(p)) found.push(p);
      if (found.length >= 3) break;
    }
    return found;
  }, [packages, packagesLoading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput("");
    const newUser: ChatMessage = { role: "user", content: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, newUser]);
    setSending(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const history = [...messages, newUser]
        .slice(-9, -1)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, lang, history }),
        signal: ctrl.signal,
      });
      if (res.status === 429) { setError(T.rateLimit); return; }
      if (res.status === 503) { setError(T.notReady); return; }
      if (!res.ok) { setError(T.errMsg); return; }
      const data = await res.json();
      const reply = String(data?.reply || "").trim();
      const slugs: string[] = Array.isArray(data?.suggestedPackageSlugs) ? data.suggestedPackageSlugs : [];
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: reply || T.errMsg,
        packages: matchPackages(slugs),
        ts: Date.now(),
      }]);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        setError(T.aborted);
      } else {
        setError(T.errMsg);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [sending, messages, lang, matchPackages, T.errMsg, T.rateLimit, T.notReady, T.aborted]);

  const stopReply = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([{ role: "assistant", content: T.greeting, ts: Date.now() }]);
    setError(null);
  }, [T.greeting]);

  const copyReply = useCallback(async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1400);
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const showSuggestions = messages.length <= 1 && !sending;

  return (
    <>
      <style>{`
        @keyframes drtai-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,170,255,0.55), 0 8px 28px rgba(0,170,255,0.45); } 50% { box-shadow: 0 0 0 14px rgba(0,170,255,0), 0 8px 32px rgba(201,168,76,0.55); } }
        @keyframes drtai-pop { from { opacity:0; transform: translateY(8px) scale(0.92);} to { opacity:1; transform: translateY(0) scale(1);} }
        @keyframes drtai-typing { 0%,60%,100% { opacity:0.25; transform: translateY(0);} 30% { opacity:1; transform: translateY(-3px);} }
        .drtai-launch { animation: drtai-pulse 2.4s ease-in-out infinite; }
        .drtai-bubble, .drtai-panel, .drtai-msg { animation: drtai-pop 0.25s ease-out; }
        .drtai-typing-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#C9A84C; margin:0 2px; animation: drtai-typing 1.2s infinite ease-in-out; }
        .drtai-typing-dot:nth-child(2){ animation-delay:0.15s; }
        .drtai-typing-dot:nth-child(3){ animation-delay:0.3s; }
        .drtai-chip { transition: all 0.2s; }
        .drtai-chip:hover { background: rgba(0,170,255,0.18); border-color: rgba(0,170,255,0.55); transform: translateY(-1px); }
      `}</style>

      {/* Welcome bubble */}
      {!open && showWelcomeBubble && (
        <div
          className="drtai-bubble"
          onClick={() => { dismissWelcome(); setOpen(true); }}
          style={{
            position: "fixed", bottom: "6.5rem", right: "1.5rem", zIndex: 999,
            background: "white", color: "#0D1B2A",
            padding: "0.7rem 2.2rem 0.7rem 0.95rem", borderRadius: "16px 16px 4px 16px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
            maxWidth: "240px", fontSize: "0.85rem", fontWeight: 600,
            cursor: "pointer", lineHeight: 1.4,
            fontFamily: "inherit",
          }}
        >
          {T.welcomeBubble}
          <button
            onClick={dismissWelcome}
            aria-label="Dismiss"
            style={{
              position: "absolute", top: 4, right: 4,
              width: 22, height: 22, borderRadius: "50%",
              background: "rgba(13,27,42,0.08)", border: "none", color: "#0D1B2A",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, lineHeight: 1, padding: 0,
            }}
          >×</button>
        </div>
      )}

      {/* Floating launcher */}
      <button
        onClick={() => { setOpen((o) => !o); dismissWelcome(); }}
        aria-label={T.title}
        title={T.title}
        className={open ? "" : "drtai-launch"}
        style={{
          position: "fixed", bottom: "2rem", right: "1.5rem", zIndex: 998,
          width: 60, height: 60, borderRadius: "50%",
          background: open ? "#0D1B2A" : "linear-gradient(135deg,#0D1B2A 0%,#0a3550 60%,#00AAFF 130%)",
          border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.25s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      >
        {open ? (
          <span style={{ color: "white", fontSize: "1.5rem", fontWeight: 300 }}>×</span>
        ) : (
          <>
            <AssistantIcon size={30} />
            <span style={{
              position: "absolute", bottom: 4, right: 4,
              width: 12, height: 12, borderRadius: "50%",
              background: "#22c55e", border: "2px solid #0D1B2A",
            }} />
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="drtai-panel"
          style={{
            position: "fixed", bottom: "5.5rem", right: "1.5rem", zIndex: 997,
            width: "min(380px, calc(100vw - 2rem))", maxHeight: "min(620px, calc(100vh - 7rem))",
            background: "#0a1520",
            border: "1px solid rgba(0,170,255,0.25)", borderRadius: "20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "0.9rem 1.1rem",
            background: "linear-gradient(135deg, rgba(0,170,255,0.18), rgba(201,168,76,0.12))",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: "0.7rem",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg,#0D1B2A,#00AAFF)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.15)",
            }}>
              <AssistantIcon size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 800, fontSize: "0.92rem" }}>{T.title}</div>
              <div style={{ color: "#8db5d6", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                {T.subtitle}
              </div>
            </div>
            <button
              onClick={clearChat}
              title={T.clear}
              aria-label={T.clear}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#cbd5e1", borderRadius: 999, padding: "0.3rem 0.65rem",
                fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >{T.clear}</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "1rem",
            display: "flex", flexDirection: "column", gap: "0.7rem",
          }}>
            {messages.map((m, i) => (
              <div key={i} className="drtai-msg" style={{
                display: "flex", flexDirection: "column",
                alignItems: m.role === "assistant" ? "flex-start" : "flex-end",
                gap: "0.5rem",
              }}>
                <div style={{
                  background: m.role === "assistant" ? "rgba(0,170,255,0.10)" : "rgba(201,168,76,0.18)",
                  border: `1px solid ${m.role === "assistant" ? "rgba(0,170,255,0.25)" : "rgba(201,168,76,0.35)"}`,
                  borderRadius: m.role === "assistant" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                  padding: "0.6rem 0.85rem", maxWidth: "88%",
                  color: m.role === "assistant" ? "#d8ecff" : "#fff8e1",
                  fontSize: "0.85rem", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  position: "relative",
                }}>
                  {m.content}
                  {m.role === "assistant" && i > 0 && (
                    <button
                      onClick={() => void copyReply(i, m.content)}
                      title={T.copy}
                      aria-label={T.copy}
                      style={{
                        position: "absolute", bottom: -10, [ar ? "left" : "right"]: 6,
                        background: "rgba(13,27,42,0.95)", border: "1px solid rgba(255,255,255,0.18)",
                        color: copiedIdx === i ? "#22c55e" : "#9fd4ff",
                        borderRadius: 999, padding: "2px 8px",
                        fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      } as React.CSSProperties}
                    >{copiedIdx === i ? T.copied : T.copy}</button>
                  )}
                </div>
                {m.packages && m.packages.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", width: "100%" }}>
                    {m.packages.map((pkg) => (
                      <div key={pkg.id} style={{
                        background: `${pkg.color}12`, border: `1px solid ${pkg.color}40`,
                        borderRadius: "12px", padding: "0.7rem", overflow: "hidden",
                      }}>
                        {pkg.images && pkg.images[0] && (
                          <div style={{
                            width: "100%", height: 90, borderRadius: 8, overflow: "hidden",
                            marginBottom: "0.55rem",
                            backgroundImage: `url(${storageObjectUrl(pkg.images[0])})`,
                            backgroundSize: "cover", backgroundPosition: "center",
                          }} />
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                          <span style={{ fontSize: "1.1rem" }}>{pkg.icon}</span>
                          <span style={{ color: pkg.color, fontWeight: 800, fontSize: "0.85rem", flex: 1 }}>
                            {ar ? pkg.titleAr : pkg.titleEn}
                          </span>
                        </div>
                        <div style={{ color: pkg.color, fontWeight: 800, fontSize: "0.88rem", marginBottom: "0.55rem" }}>
                          {formatPrice(pkg.priceEGP, currency, lang, settings)} / {ar ? "فرد" : "person"}
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <a
                            href={`/packages/${pkg.slug}`}
                            onClick={() => setOpen(false)}
                            style={{
                              flex: 1, background: pkg.color,
                              color: pkg.color === "#C9A84C" ? "#0D1B2A" : "white",
                              padding: "0.45rem 0.55rem", borderRadius: "8px",
                              fontWeight: 700, fontSize: "0.75rem", textDecoration: "none",
                              textAlign: "center", fontFamily: "inherit",
                            }}
                          >{T.bookNow}</a>
                          <a
                            href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(ar ? `استفسار عن ${pkg.titleAr}` : `Inquiry about ${pkg.titleEn}`)}`}
                            target="_blank" rel="noreferrer"
                            style={{
                              background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.4)",
                              color: "#25D366", padding: "0.45rem 0.6rem", borderRadius: "8px",
                              fontWeight: 700, fontSize: "0.72rem", textDecoration: "none",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                            }}
                          ><WhatsAppIcon />{T.askWhatsApp}</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  background: "rgba(0,170,255,0.10)", border: "1px solid rgba(0,170,255,0.25)",
                  borderRadius: "4px 14px 14px 14px", padding: "0.6rem 0.85rem",
                  color: "#8db5d6", fontSize: "0.78rem",
                }}>
                  <span className="drtai-typing-dot" /><span className="drtai-typing-dot" /><span className="drtai-typing-dot" />
                </div>
                <button
                  onClick={stopReply}
                  style={{
                    background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.45)",
                    color: "#fca5a5", borderRadius: 999, padding: "0.3rem 0.75rem",
                    fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >■ {T.stop}</button>
              </div>
            )}

            {error && (
              <div style={{
                alignSelf: "stretch", background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.35)", color: "#fca5a5",
                padding: "0.5rem 0.75rem", borderRadius: 10, fontSize: "0.78rem", textAlign: "center",
              }}>{error}</div>
            )}

            {showSuggestions && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
                {T.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => void sendMessage(s)}
                    className="drtai-chip"
                    style={{
                      background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.3)",
                      color: "#9fd4ff", padding: "0.4rem 0.7rem", borderRadius: 999,
                      fontSize: "0.74rem", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >{s}</button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{
            padding: "0.7rem 0.8rem",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.25)",
            display: "flex", gap: "0.5rem", alignItems: "center",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={T.placeholder}
              disabled={sending}
              dir={ar ? "rtl" : "ltr"}
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999,
                padding: "0.55rem 0.95rem", color: "white", fontSize: "0.85rem",
                outline: "none", fontFamily: "inherit",
              }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,170,255,0.5)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label={T.send}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: input.trim() && !sending ? "linear-gradient(135deg,#00AAFF,#C9A84C)" : "rgba(255,255,255,0.08)",
                border: "none",
                color: "white", cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            ><SendIcon /></button>
          </form>
        </div>
      )}
    </>
  );
}
