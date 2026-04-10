import { useEffect, useRef, useState, useCallback } from "react";

export interface HeroSlide {
  id: number;
  url: string;
  type: string;
  duration: number;
  sortOrder: number;
}

type Transition = "fade" | "slide" | "zoom" | "dissolve";

interface HeroSliderProps {
  slides: HeroSlide[];
  transition: Transition;
  fallbackBgUrl?: string;
  showPagination?: boolean;
  onActiveChange?: (active: number, total: number) => void;
  goToRef?: React.MutableRefObject<((i: number) => void) | null>;
}

const OVERLAY = "linear-gradient(135deg, rgba(13,27,42,0.88) 0%, rgba(13,27,42,0.42) 50%, rgba(13,27,42,0.88) 100%)";

export default function HeroSlider({ slides, transition, fallbackBgUrl, showPagination = true, onActiveChange, goToRef }: HeroSliderProps) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number>(-1);
  const [videoReady, setVideoReady] = useState<Record<number, boolean>>({});
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

  // Expose goTo externally via ref
  useEffect(() => {
    if (goToRef) {
      goToRef.current = (i: number) => { setPrev(active); setActive(i); };
    }
  }, [active, goToRef]);

  // Report active state to parent
  useEffect(() => {
    if (onActiveChange) onActiveChange(active, slides.length);
  }, [active, slides.length, onActiveChange]);

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
    scheduleAdvance(active, slide.duration || 6);
    return clearTimers;
  }, [active, slides, scheduleAdvance]);

  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === active) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [active]);

  const handleVideoCanPlay = (index: number) => {
    setVideoReady(r => ({ ...r, [index]: true }));
    if (index === active) {
      videoRefs.current[index]?.play().catch(() => {});
    }
  };

  const getStyle = (i: number): React.CSSProperties => {
    const isActive = i === active;
    const isPrev = i === prev;
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

  if (slides.length === 0) {
    if (!fallbackBgUrl) return null;
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `${OVERLAY}, url('${fallbackBgUrl}') center/cover no-repeat`,
      }} />
    );
  }

  if (slides.length === 1) {
    const slide = slides[0];
    if (slide.type === "video") {
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, background: OVERLAY, zIndex: 1 }} />
          <video
            autoPlay muted loop playsInline preload="auto"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            src={slide.url}
          />
        </div>
      );
    }
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `${OVERLAY}, url('${slide.url}') center/cover no-repeat`,
      }} />
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {slides.map((slide, i) => {
        const style = getStyle(i);

        if (slide.type === "video") {
          return (
            <div key={slide.id} style={style} aria-hidden={i !== active}>
              <div style={{ position: "absolute", inset: 0, background: OVERLAY, zIndex: 1 }} />
              <video
                ref={el => { videoRefs.current[i] = el; }}
                muted playsInline preload="auto"
                loop={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                src={slide.url}
                onCanPlay={() => handleVideoCanPlay(i)}
                onLoadedData={() => handleVideoCanPlay(i)}
              />
            </div>
          );
        }

        return (
          <div
            key={slide.id}
            style={{
              ...style,
              background: `${OVERLAY}, url('${slide.url}') center/cover no-repeat`,
            }}
            aria-hidden={i !== active}
          />
        );
      })}

      {/* Inline dots — only rendered when NOT using external onActiveChange */}
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
