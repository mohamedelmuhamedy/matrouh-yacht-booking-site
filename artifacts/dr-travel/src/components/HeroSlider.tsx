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
  // videoBuffered[slideId] = true when canplaythrough fired for that slide
  const [videoBuffered, setVideoBuffered] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
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

  // Is the active video still buffering? (holds prev slide visible until ready)
  const activeSlide = slides[active];
  const activeVideoWaiting =
    activeSlide?.type === "video" && !videoBuffered[activeSlide.id];

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

  // Schedule advance — only after video is buffered; skip trimmed videos (timeupdate drives them)
  useEffect(() => {
    if (slides.length <= 1) return;
    const slide = slides[active];
    if (!slide) return;
    if (slide.type === "video" && slide.videoEnd != null) return;
    if (slide.type === "video" && !videoBuffered[slide.id]) return; // wait for buffer
    scheduleAdvance(active, slide.duration || 6);
    return clearTimers;
  }, [active, slides, scheduleAdvance, videoBuffered]);

  // When active changes: start loading/playing active video (invisible until buffered)
  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === active) {
        // Always start loading. Video stays invisible until canplaythrough fires.
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [active]);

  // canplaythrough: video has enough data to play without pausing → show it
  const handleCanPlayThrough = useCallback((index: number) => {
    const slide = slides[index];
    if (!slide) return;
    setVideoBuffered(b => {
      if (b[slide.id]) return b; // already marked
      return { ...b, [slide.id]: true };
    });
    if (index === active) {
      const vid = videoRefs.current[index];
      if (vid) {
        // Reset to trim start before making visible
        const startTime = slide.videoStart ?? 0;
        if (Math.abs(vid.currentTime - startTime) > 0.3) vid.currentTime = startTime;
        vid.play().catch(() => {});
      }
    }
  }, [slides, active]);

  // canplay / loadeddata: still useful to start playing for iOS
  const handleVideoReady = useCallback((index: number) => {
    if (index !== active) return;
    const vid = videoRefs.current[index];
    const slide = slides[index];
    if (vid && slide) {
      const startTime = slide.videoStart ?? 0;
      if (startTime > 0 && Math.abs(vid.currentTime - startTime) > 0.5) {
        vid.currentTime = startTime;
      }
      vid.play().catch(() => {});
    }
  }, [active, slides]);

  // timeupdate: advance when videoEnd is reached (trim mode)
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

  const getStyle = (i: number): React.CSSProperties => {
    const isActive = i === active;
    const isPrev = i === prev;

    // ── Buffering hold: keep prev visible; hide active video until ready ──
    if (activeVideoWaiting && slides.length > 1) {
      if (isActive) return { position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" };
      if (isPrev) return { position: "absolute", inset: 0, opacity: 1 }; // hold fully visible
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

  // Smart preload: active = auto, neighbors = metadata, rest = none
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
    position: "absolute", inset: 0, background: OVERLAY, zIndex: 1, opacity: overlayOpacity, pointerEvents: "none",
  };

  // ── Single-slide case ──
  if (slides.length === 0) {
    if (!fallbackBgUrl) return null;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `url('${fallbackBgUrl}') center/cover no-repeat` }}>
        <div style={overlayStyle} />
      </div>
    );
  }

  if (slides.length === 1) {
    const slide = slides[0];
    if (slide.type === "video") {
      const hasEnd = slide.videoEnd != null;
      const buffered = !!videoBuffered[slide.id];
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          {/* Fallback shown while video buffers */}
          {!buffered && fallbackBgUrl && (
            <div style={{ position: "absolute", inset: 0, background: `url('${fallbackBgUrl}') center/cover no-repeat`, zIndex: 0 }}>
              <div style={overlayStyle} />
            </div>
          )}
          {/* Buffering shimmer if no fallback */}
          {!buffered && !fallbackBgUrl && (
            <div style={{ position: "absolute", inset: 0, background: "#0D1B2A", zIndex: 0 }}>
              <div style={overlayStyle} />
            </div>
          )}
          {/* Video — hidden until buffered */}
          <div style={{ position: "absolute", inset: 0, opacity: buffered ? 1 : 0, transition: "opacity 1.2s ease", zIndex: 1 }}>
            <div style={overlayStyle} />
            <video
              ref={el => { videoRefs.current[0] = el; }}
              autoPlay muted loop={!hasEnd} playsInline preload="auto"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              src={slide.url}
              onCanPlay={() => handleVideoReady(0)}
              onLoadedData={() => handleVideoReady(0)}
              onCanPlayThrough={() => handleCanPlayThrough(0)}
              onTimeUpdate={hasEnd ? () => handleTimeUpdate(0) : undefined}
            />
          </div>
          {/* Buffering spinner */}
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

  // ── Multi-slide case ──
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
                onCanPlay={() => handleVideoReady(i)}
                onLoadedData={() => handleVideoReady(i)}
                onCanPlayThrough={() => handleCanPlayThrough(i)}
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

      {/* Buffering indicator — shows while waiting for video to buffer */}
      {activeVideoWaiting && <BufferingIndicator />}

      {/* Inline pagination dots */}
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
                cursor: "pointer", padding: 0,
                transition: "all 0.4s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small buffering indicator (bottom-center of hero) ──
function BufferingIndicator() {
  return (
    <div style={{
      position: "absolute", bottom: 110, left: "50%", transform: "translateX(-50%)",
      zIndex: 20, display: "flex", alignItems: "center", gap: "8px",
      background: "rgba(13,27,42,0.55)", backdropFilter: "blur(8px)",
      borderRadius: "20px", padding: "6px 14px",
      border: "1px solid rgba(0,170,255,0.2)",
    }}>
      <span style={{ display: "flex", gap: "5px" }}>
        {[0, 0.18, 0.36].map((delay, k) => (
          <span key={k} style={{
            display: "block", width: 6, height: 6, borderRadius: "50%",
            background: "#00AAFF",
            animation: `bufferDot 1.1s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </span>
      <span style={{
        color: "rgba(255,255,255,0.75)", fontSize: "0.72rem",
        fontFamily: "Cairo, sans-serif", fontWeight: 600, whiteSpace: "nowrap",
      }}>
        جاري تحميل الفيديو...
      </span>
      <style>{`
        @keyframes bufferDot {
          0%,60%,100% { transform: translateY(0); opacity:.5 }
          30% { transform: translateY(-5px); opacity:1 }
        }
      `}</style>
    </div>
  );
}
