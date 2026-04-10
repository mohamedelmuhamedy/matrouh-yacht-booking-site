import { useEffect, useRef, useState, useCallback } from "react";

export interface HeroSlide {
  id: number;
  url: string;
  type: string;
  duration: number;
  sortOrder: number;
  videoStart?: number | null;
  videoEnd?: number | null;
}

type Transition = "fade" | "slide" | "zoom" | "dissolve";

interface HeroSliderProps {
  slides: HeroSlide[];
  transition: Transition;
  fallbackBgUrl?: string;
  showPagination?: boolean;
  onActiveChange?: (active: number, total: number) => void;
  goToRef?: React.MutableRefObject<((i: number) => void) | null>;
  overlayOpacity?: number;
}

const OVERLAY = "linear-gradient(135deg, rgba(13,27,42,0.88) 0%, rgba(13,27,42,0.42) 50%, rgba(13,27,42,0.88) 100%)";
// How long to wait before force-showing the video if canplay never fires
const BUFFER_TIMEOUT_MS = 10_000;

export default function HeroSlider({
  slides,
  transition,
  fallbackBgUrl,
  showPagination = true,
  onActiveChange,
  goToRef,
  overlayOpacity = 0.65,
}: HeroSliderProps) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number>(-1);

  // UI state: videoShown[slideId] = true means the video wrapper is visible (opacity 1)
  // Reset to false each time that slide becomes active, so the buffer indicator re-shows.
  const [videoShown, setVideoShown] = useState<Record<number, boolean>>({});

  // Ref: has the current activation of the active slide already done its first-play seek?
  // Reset to false every time `active` changes.
  // Prevents canplay (fired on buffering recovery) from re-seeking to videoStart mid-play.
  const activationStarted = useRef(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs   = useRef<(HTMLVideoElement | null)[]>([]);

  const clearSlideTimers = () => {
    if (timerRef.current)  { clearTimeout(timerRef.current);  timerRef.current  = null; }
    if (retryRef.current)  { clearTimeout(retryRef.current);  retryRef.current  = null; }
  };
  const clearBufTimer = () => {
    if (bufTimerRef.current) { clearTimeout(bufTimerRef.current); bufTimerRef.current = null; }
  };

  const goTo = useCallback((next: number, cur: number) => {
    setPrev(cur);
    setActive(next);
  }, []);

  useEffect(() => {
    if (goToRef) {
      goToRef.current = (i: number) => { setPrev(active); setActive(i); };
    }
  }, [active, goToRef]);

  useEffect(() => {
    if (onActiveChange) onActiveChange(active, slides.length);
  }, [active, slides.length, onActiveChange]);

  // Derived: is the current active video still waiting to be revealed?
  const activeSlide = slides[active];
  const activeVideoWaiting =
    !!activeSlide && activeSlide.type === "video" && !videoShown[activeSlide.id];

  // ────────────────────────────────────────────────────────────────────
  // First-play: called ONCE per activation (not on buffering recovery).
  // Seeks to videoStart and reveals the video wrapper.
  // ────────────────────────────────────────────────────────────────────
  const firstPlay = useCallback((vid: HTMLVideoElement, slideId: number, videoStart: number) => {
    clearBufTimer();
    // Snap to trim-start only here, once.
    if (Math.abs(vid.currentTime - videoStart) > 0.3) {
      vid.currentTime = videoStart;
    }
    vid.play().catch(() => {});
    setVideoShown(s => ({ ...s, [slideId]: true }));
    activationStarted.current = true;
  }, []);

  // ────────────────────────────────────────────────────────────────────
  // canplay / canplaythrough / loadeddata handler
  // ────────────────────────────────────────────────────────────────────
  const handleVideoCanPlay = useCallback((index: number) => {
    if (index !== active) return; // ignore preloading neighbour slides
    const slide = slides[index];
    if (!slide || slide.type !== "video") return;
    const vid = videoRefs.current[index];
    if (!vid) return;

    if (!activationStarted.current) {
      // ── First time this video is ready in this activation ──
      firstPlay(vid, slide.id, slide.videoStart ?? 0);
    } else {
      // ── Mid-playback buffering recovery ──
      // Simply resume from wherever currentTime is. Do NOT seek or reload.
      vid.play().catch(() => {});
    }
  }, [active, slides, firstPlay]);

  // ────────────────────────────────────────────────────────────────────
  // Video element error: skip to next slide
  // ────────────────────────────────────────────────────────────────────
  const handleVideoError = useCallback((index: number) => {
    if (index !== active) return;
    const slide = slides[index];
    if (!slide) return;
    clearBufTimer();
    if (slides.length > 1) {
      goTo((index + 1) % slides.length, index);
    } else {
      // Single broken slide — clear buffering indicator at least
      setVideoShown(s => ({ ...s, [slide.id]: true }));
    }
  }, [active, slides, goTo]);

  // ────────────────────────────────────────────────────────────────────
  // Advance timer
  // ────────────────────────────────────────────────────────────────────
  const scheduleAdvance = useCallback((fromIndex: number, durationSec: number) => {
    clearSlideTimers();
    timerRef.current = setTimeout(() => {
      if (slides.length <= 1) return;
      const next = (fromIndex + 1) % slides.length;
      const nextSlide = slides[next];
      if (!nextSlide) return;
      if (nextSlide.type === "video") {
        const vid = videoRefs.current[next];
        if (vid && vid.readyState >= 3) {
          goTo(next, fromIndex);
        } else {
          retryRef.current = setTimeout(() => goTo(next, fromIndex), 3000);
        }
      } else {
        goTo(next, fromIndex);
      }
    }, durationSec * 1000);
  }, [slides, goTo]);

  // Kick off advance timer — only after video is shown; trimmed videos use timeupdate.
  useEffect(() => {
    if (slides.length <= 1) return;
    const slide = slides[active];
    if (!slide) return;
    if (slide.type === "video" && slide.videoEnd != null) return;
    if (slide.type === "video" && !videoShown[slide.id]) return;
    scheduleAdvance(active, slide.duration || 6);
    return clearSlideTimers;
  }, [active, slides, scheduleAdvance, videoShown]);

  // ────────────────────────────────────────────────────────────────────
  // When `active` changes:
  //   1. Reset per-activation tracking.
  //   2. Reset videoShown for the new active slide (re-trigger buffering indicator).
  //   3. Start loading the active video — but NEVER call vid.load() (that resets currentTime).
  //   4. Pause all other videos.
  //   5. Set a fallback timeout in case canplay never fires.
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Per-activation reset
    activationStarted.current = false;
    clearBufTimer();

    const slide = slides[active];

    // Reset the shown flag for the new active slide so the buffer indicator appears.
    if (slide?.type === "video") {
      setVideoShown(s => (s[slide.id] === false ? s : { ...s, [slide.id]: false }));
    }

    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;

      if (i === active) {
        const s = slides[i];
        if (!s || s.type !== "video") return;

        if (vid.readyState >= 3) {
          // Already buffered — go straight to first-play.
          firstPlay(vid, s.id, s.videoStart ?? 0);
        } else {
          // NOT calling vid.load() — that resets currentTime to 0 and discards buffer.
          // play() alone triggers the browser to start/continue downloading.
          vid.play().catch(() => {});

          // Hard fallback: reveal after timeout even if canplay never fires.
          bufTimerRef.current = setTimeout(() => {
            if (!activationStarted.current) {
              firstPlay(vid, s.id, s.videoStart ?? 0);
            }
          }, BUFFER_TIMEOUT_MS);
        }
      } else {
        vid.pause();
        // Do NOT reset other videos' currentTime — they may be preloading.
      }
    });

    return clearBufTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]); // intentionally only [active] — slides/firstPlay are stable after mount

  // ────────────────────────────────────────────────────────────────────
  // timeupdate — trim enforcement (videoEnd reached → loop or advance)
  // ────────────────────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback((index: number) => {
    if (index !== active) return;
    const slide = slides[index];
    if (!slide?.videoEnd) return;
    const vid = videoRefs.current[index];
    if (!vid || vid.currentTime < slide.videoEnd) return;

    clearSlideTimers();
    if (slides.length <= 1) {
      // Single trimmed video: loop back to trim-start
      vid.currentTime = slide.videoStart ?? 0;
      vid.play().catch(() => {});
    } else {
      goTo((index + 1) % slides.length, index);
    }
  }, [active, slides, goTo]);

  // ────────────────────────────────────────────────────────────────────
  // Visibility styles
  // ────────────────────────────────────────────────────────────────────
  const getStyle = (i: number): React.CSSProperties => {
    const isActive = i === active;
    const isPrev   = i === prev;

    // While the active video is buffering: keep prev fully visible, hide active
    if (activeVideoWaiting && slides.length > 1) {
      if (isActive) return { position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" };
      if (isPrev)   return { position: "absolute", inset: 0, opacity: 1 };
    }

    if (!isActive && !isPrev) return { opacity: 0, pointerEvents: "none", position: "absolute", inset: 0 };

    const base: React.CSSProperties = { position: "absolute", inset: 0 };
    if (slides.length <= 1) return { ...base, opacity: 1 };

    switch (transition) {
      case "fade":
      case "dissolve": {
        const dur = transition === "dissolve" ? 1.8 : 1.2;
        return { ...base, opacity: isActive ? 1 : 0, transition: `opacity ${dur}s ease` };
      }
      case "zoom":
        return {
          ...base,
          opacity: isActive ? 1 : 0,
          transform: isActive ? "scale(1)" : "scale(1.06)",
          transition: isActive
            ? "opacity 1.2s ease, transform 6s ease"
            : "opacity 1.2s ease",
        };
      case "slide":
        return {
          ...base, opacity: 1,
          transform: `translateX(${isActive ? "0%" : "-100%"})`,
          transition: "transform 1.1s cubic-bezier(0.77,0,0.18,1)",
        };
      default:
        return { ...base, opacity: isActive ? 1 : 0, transition: "opacity 1.2s ease" };
    }
  };

  const getVideoPreload = (i: number): "auto" | "metadata" | "none" => {
    if (i === active) return "auto";
    if (slides.length > 1) {
      const next    = (active + 1) % slides.length;
      const prevIdx = (active - 1 + slides.length) % slides.length;
      if (i === next || i === prevIdx) return "metadata";
    }
    return "none";
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute", inset: 0, background: OVERLAY,
    zIndex: 1, opacity: overlayOpacity, pointerEvents: "none",
  };

  const videoEvents = (i: number) => ({
    onCanPlay:        () => handleVideoCanPlay(i),
    onCanPlayThrough: () => handleVideoCanPlay(i),
    onLoadedData:     () => handleVideoCanPlay(i),
    onError:          () => handleVideoError(i),
  });

  // ── 0 slides ──────────────────────────────────────────────────────
  if (slides.length === 0) {
    if (!fallbackBgUrl) return null;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0,
        background: `url('${fallbackBgUrl}') center/cover no-repeat` }}>
        <div style={overlayStyle} />
      </div>
    );
  }

  // ── Single slide ──────────────────────────────────────────────────
  if (slides.length === 1) {
    const slide  = slides[0];
    const hasEnd = slide.videoEnd != null;
    const shown  = !!videoShown[slide.id];

    if (slide.type === "video") {
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          {/* Fallback shown while video buffers */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: fallbackBgUrl
              ? `url('${fallbackBgUrl}') center/cover no-repeat`
              : "#0D1B2A",
            opacity: shown ? 0 : 1, transition: "opacity 1.2s ease",
          }}>
            <div style={overlayStyle} />
          </div>
          {/* Video — fades in on firstPlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            opacity: shown ? 1 : 0, transition: "opacity 1.2s ease",
          }}>
            <div style={overlayStyle} />
            <video
              ref={el => { videoRefs.current[0] = el; }}
              autoPlay muted playsInline preload="auto" loop={!hasEnd}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              src={slide.url}
              {...videoEvents(0)}
              onTimeUpdate={hasEnd ? () => handleTimeUpdate(0) : undefined}
            />
          </div>
          {!shown && <BufferingIndicator />}
        </div>
      );
    }

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0,
        background: `url('${slide.url}') center/cover no-repeat` }}>
        <div style={overlayStyle} />
      </div>
    );
  }

  // ── Multi-slide ───────────────────────────────────────────────────
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {slides.map((slide, i) => {
        const style  = getStyle(i);
        const hasEnd = slide.videoEnd != null;

        if (slide.type === "video") {
          return (
            <div key={slide.id} style={style} aria-hidden={i !== active}>
              <div style={overlayStyle} />
              <video
                ref={el => { videoRefs.current[i] = el; }}
                muted playsInline preload={getVideoPreload(i)} loop={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                src={slide.url}
                {...videoEvents(i)}
                onTimeUpdate={hasEnd ? () => handleTimeUpdate(i) : undefined}
              />
            </div>
          );
        }

        return (
          <div key={slide.id} style={{ ...style, background: `url('${slide.url}') center/cover no-repeat` }}
            aria-hidden={i !== active}>
            <div style={overlayStyle} />
          </div>
        );
      })}

      {activeVideoWaiting && <BufferingIndicator />}

      {!onActiveChange && showPagination && slides.length > 1 && (
        <div style={{
          position: "absolute", bottom: 72, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: "8px", zIndex: 10,
        }}>
          {slides.map((_, i) => (
            <button key={i}
              onClick={() => { setPrev(active); setActive(i); }}
              style={{
                width: i === active ? 24 : 8, height: 8, borderRadius: 4, border: "none",
                background: i === active ? "#00AAFF" : "rgba(255,255,255,0.4)",
                cursor: "pointer", padding: 0, transition: "all 0.4s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Buffering indicator ───────────────────────────────────────────────
function BufferingIndicator() {
  return (
    <div style={{
      position: "absolute", bottom: 110, left: "50%", transform: "translateX(-50%)",
      zIndex: 20, display: "flex", alignItems: "center", gap: "8px",
      background: "rgba(13,27,42,0.6)", backdropFilter: "blur(8px)",
      borderRadius: "20px", padding: "6px 14px",
      border: "1px solid rgba(0,170,255,0.2)",
    }}>
      <span style={{ display: "flex", gap: "5px" }}>
        {[0, 0.18, 0.36].map((delay, k) => (
          <span key={k} style={{
            display: "block", width: 6, height: 6, borderRadius: "50%",
            background: "#00AAFF",
            animation: `bufDot 1.1s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </span>
      <span style={{
        color: "rgba(255,255,255,0.75)", fontSize: "0.72rem",
        fontFamily: "Cairo, sans-serif", fontWeight: 600, whiteSpace: "nowrap",
      }}>
        جاري تحميل الفيديو...
      </span>
      <style>{`@keyframes bufDot{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  );
}
