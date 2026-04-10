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
// How long to wait before force-showing the video (slow connection fallback)
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
  // videoBuffered[slideId] = true once the video is ready to play
  const [videoBuffered, setVideoBuffered] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
  };
  const clearBufferTimer = () => {
    if (bufferTimerRef.current) { clearTimeout(bufferTimerRef.current); bufferTimerRef.current = null; }
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

  // Is the active video still waiting to be shown?
  const activeSlide = slides[active];
  const activeVideoWaiting =
    !!activeSlide && activeSlide.type === "video" && !videoBuffered[activeSlide.id];

  // ── Mark a video slide as ready to display ──
  const markBuffered = useCallback((slideId: number, vidEl: HTMLVideoElement | null, videoStart: number) => {
    setVideoBuffered(b => {
      if (b[slideId]) return b; // already done
      return { ...b, [slideId]: true };
    });
    if (vidEl) {
      // Snap to trim start before fade-in
      if (Math.abs(vidEl.currentTime - videoStart) > 0.3) {
        vidEl.currentTime = videoStart;
      }
      vidEl.play().catch(() => {});
    }
    clearBufferTimer();
  }, []);

  // ── canplay fires when readyState >= 3 (enough to start playing) ──
  const handleVideoCanPlay = useCallback((index: number) => {
    const slide = slides[index];
    if (!slide || slide.type !== "video") return;
    const vid = videoRefs.current[index];
    markBuffered(slide.id, vid ?? null, slide.videoStart ?? 0);
  }, [slides, markBuffered]);

  // ── video error: skip to next slide instead of getting stuck ──
  const handleVideoError = useCallback((index: number) => {
    const slide = slides[index];
    if (!slide || index !== active) return;
    clearBufferTimer();
    if (slides.length > 1) {
      const next = (index + 1) % slides.length;
      goTo(next, index);
    } else {
      // Single slide with broken video — just mark as done so UI clears
      setVideoBuffered(b => ({ ...b, [slide.id]: true }));
    }
  }, [slides, active, goTo]);

  // ── scheduleAdvance: only after video is buffered; skip trimmed videos ──
  const scheduleAdvance = useCallback((fromIndex: number, durationSec: number) => {
    clearTimers();
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

  useEffect(() => {
    if (slides.length <= 1) return;
    const slide = slides[active];
    if (!slide) return;
    if (slide.type === "video" && slide.videoEnd != null) return; // timeupdate drives it
    if (slide.type === "video" && !videoBuffered[slide.id]) return; // wait for buffer first
    scheduleAdvance(active, slide.duration || 6);
    return clearTimers;
  }, [active, slides, scheduleAdvance, videoBuffered]);

  // ── When active changes: start loading, check readyState, set fallback timeout ──
  useEffect(() => {
    clearBufferTimer();
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === active) {
        const slide = slides[i];
        if (!slide || slide.type !== "video") return;
        // Already buffered enough? Show immediately (handles cached / preloaded videos)
        if (vid.readyState >= 3) {
          markBuffered(slide.id, vid, slide.videoStart ?? 0);
        } else {
          // Ensure browser starts loading (important on iOS/Safari where preload may be ignored)
          vid.load();
          vid.play().catch(() => {});
          // Fallback: force show after timeout even if canplay never fires
          bufferTimerRef.current = setTimeout(() => {
            markBuffered(slide.id, vid, slide.videoStart ?? 0);
          }, BUFFER_TIMEOUT_MS);
        }
      } else {
        vid.pause();
      }
    });
    return clearBufferTimer;
  }, [active, slides, markBuffered]);

  // ── timeupdate: advance when videoEnd reached (trim mode) ──
  const handleTimeUpdate = useCallback((index: number) => {
    if (index !== active) return;
    const slide = slides[index];
    if (!slide?.videoEnd) return;
    const vid = videoRefs.current[index];
    if (!vid) return;
    if (vid.currentTime >= slide.videoEnd) {
      clearTimers();
      if (slides.length <= 1) {
        vid.currentTime = slide.videoStart ?? 0;
        vid.play().catch(() => {});
      } else {
        const next = (index + 1) % slides.length;
        goTo(next, index);
      }
    }
  }, [active, slides, goTo]);

  // ── Slide visibility styles ──
  const getStyle = (i: number): React.CSSProperties => {
    const isActive = i === active;
    const isPrev = i === prev;

    // Buffering hold: keep prev slide fully visible; hide active video
    if (activeVideoWaiting && slides.length > 1) {
      if (isActive) return { position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" };
      if (isPrev) return { position: "absolute", inset: 0, opacity: 1 };
    }

    const showing = isActive || isPrev;
    if (!showing) return { opacity: 0, pointerEvents: "none", position: "absolute", inset: 0 };

    const baseStyle: React.CSSProperties = { position: "absolute", inset: 0 };
    if (slides.length <= 1) return { ...baseStyle, opacity: 1 };

    switch (transition) {
      case "fade":
      case "dissolve": {
        const dur = transition === "dissolve" ? 1.8 : 1.2;
        return { ...baseStyle, opacity: isActive ? 1 : 0, transition: `opacity ${dur}s ease` };
      }
      case "zoom":
        return {
          ...baseStyle,
          opacity: isActive ? 1 : 0,
          transform: isActive ? "scale(1)" : "scale(1.06)",
          transition: isActive ? "opacity 1.2s ease, transform 6s ease" : "opacity 1.2s ease",
        };
      case "slide":
        return {
          ...baseStyle,
          opacity: 1,
          transform: `translateX(${isActive ? "0%" : "-100%"})`,
          transition: "transform 1.1s cubic-bezier(0.77,0,0.18,1)",
        };
      default:
        return { ...baseStyle, opacity: isActive ? 1 : 0, transition: "opacity 1.2s ease" };
    }
  };

  const getVideoPreload = (i: number): "auto" | "metadata" | "none" => {
    if (i === active) return "auto";
    if (slides.length > 1) {
      const next = (active + 1) % slides.length;
      const prevIdx = (active - 1 + slides.length) % slides.length;
      if (i === next || i === prevIdx) return "metadata";
    }
    return "none";
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute", inset: 0, background: OVERLAY, zIndex: 1,
    opacity: overlayOpacity, pointerEvents: "none",
  };

  // ── 0 slides ──
  if (slides.length === 0) {
    if (!fallbackBgUrl) return null;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `url('${fallbackBgUrl}') center/cover no-repeat` }}>
        <div style={overlayStyle} />
      </div>
    );
  }

  // ── Single slide ──
  if (slides.length === 1) {
    const slide = slides[0];
    if (slide.type === "video") {
      const hasEnd = slide.videoEnd != null;
      const buffered = !!videoBuffered[slide.id];
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          {/* Background shown while video buffers */}
          <div style={{
            position: "absolute", inset: 0,
            background: fallbackBgUrl
              ? `url('${fallbackBgUrl}') center/cover no-repeat`
              : "#0D1B2A",
            zIndex: 0, opacity: buffered ? 0 : 1, transition: "opacity 1.2s ease",
          }}>
            <div style={overlayStyle} />
          </div>
          {/* Video — fades in when ready */}
          <div style={{ position: "absolute", inset: 0, opacity: buffered ? 1 : 0, transition: "opacity 1.2s ease", zIndex: 1 }}>
            <div style={overlayStyle} />
            <video
              ref={el => { videoRefs.current[0] = el; }}
              autoPlay muted loop={!hasEnd} playsInline preload="auto"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              src={slide.url}
              onCanPlay={() => handleVideoCanPlay(0)}
              onCanPlayThrough={() => handleVideoCanPlay(0)}
              onLoadedData={() => handleVideoCanPlay(0)}
              onError={() => handleVideoError(0)}
              onTimeUpdate={hasEnd ? () => handleTimeUpdate(0) : undefined}
            />
          </div>
          {!buffered && <BufferingIndicator />}
        </div>
      );
    }
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `url('${slide.url}') center/cover no-repeat` }}>
        <div style={overlayStyle} />
      </div>
    );
  }

  // ── Multi-slide ──
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {slides.map((slide, i) => {
        const style = getStyle(i);
        if (slide.type === "video") {
          const hasEnd = slide.videoEnd != null;
          return (
            <div key={slide.id} style={style} aria-hidden={i !== active}>
              <div style={overlayStyle} />
              <video
                ref={el => { videoRefs.current[i] = el; }}
                muted playsInline preload={getVideoPreload(i)} loop={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                src={slide.url}
                onCanPlay={() => handleVideoCanPlay(i)}
                onCanPlayThrough={() => handleVideoCanPlay(i)}
                onLoadedData={() => handleVideoCanPlay(i)}
                onError={() => handleVideoError(i)}
                onTimeUpdate={hasEnd ? () => handleTimeUpdate(i) : undefined}
              />
            </div>
          );
        }
        return (
          <div
            key={slide.id}
            style={{ ...style, background: `url('${slide.url}') center/cover no-repeat` }}
            aria-hidden={i !== active}
          >
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
            <button
              key={i}
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

// ── Buffering indicator ──
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
