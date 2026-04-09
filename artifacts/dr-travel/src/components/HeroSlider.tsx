import { useEffect, useRef, useState } from "react";

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
}

const OVERLAY = "linear-gradient(135deg, rgba(13,27,42,0.88) 0%, rgba(13,27,42,0.42) 50%, rgba(13,27,42,0.88) 100%)";

function getTransitionStyle(
  index: number,
  active: number,
  prev: number,
  transition: Transition,
  entering: boolean,
  total: number
): React.CSSProperties {
  const isActive = index === active;
  const isPrev = index === prev;

  if (!isActive && !isPrev) return { opacity: 0, pointerEvents: "none" };

  switch (transition) {
    case "fade":
      return {
        opacity: isActive ? 1 : 0,
        transition: isActive ? "opacity 1.2s ease" : "opacity 1.2s ease",
      };
    case "dissolve":
      return {
        opacity: isActive ? 1 : 0,
        transition: isActive ? "opacity 1.8s ease" : "opacity 0.9s ease 0.9s",
      };
    case "zoom":
      return {
        opacity: isActive ? 1 : 0,
        transform: isActive ? "scale(1)" : "scale(1.06)",
        transition: isActive
          ? "opacity 1.2s ease, transform 6s ease"
          : "opacity 1.2s ease",
      };
    case "slide": {
      const dir = isActive ? (entering ? "100%" : "0%") : "-100%";
      return {
        opacity: 1,
        transform: `translateX(${isActive ? (entering ? "0%" : "0%") : "-100%"})`,
        transition: "transform 1.1s cubic-bezier(0.77,0,0.18,1)",
      };
    }
    default:
      return { opacity: isActive ? 1 : 0, transition: "opacity 1.2s ease" };
  }
}

export default function HeroSlider({ slides, transition, fallbackBgUrl }: HeroSliderProps) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number>(-1);
  const [entering, setEntering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const advance = () => {
    setActive(cur => {
      const next = (cur + 1) % slides.length;
      setPrev(cur);
      setEntering(true);
      // reset entering flag after transition
      setTimeout(() => setEntering(false), 1200);
      return next;
    });
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    const slide = slides[active];
    if (!slide) return;

    if (slide.type === "video") {
      // For videos, advance after duration or let video events handle it
      const vid = videoRefs.current[active];
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
      timerRef.current = setTimeout(advance, (slide.duration || 6) * 1000);
    } else {
      timerRef.current = setTimeout(advance, (slide.duration || 6) * 1000);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, slides]);

  // Play/pause videos on active change
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

  // Single slide — fixed background, no transition
  if (slides.length === 1) {
    const slide = slides[0];
    if (slide.type === "video") {
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, background: OVERLAY, zIndex: 1 }} />
          <video
            autoPlay muted loop playsInline
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

  // Zero slides — use fallback
  if (slides.length === 0) {
    if (!fallbackBgUrl) return null;
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `${OVERLAY}, url('${fallbackBgUrl}') center/cover no-repeat`,
      }} />
    );
  }

  // Multi-slide slider
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {slides.map((slide, i) => {
        const style = getTransitionStyle(i, active, prev, transition, entering, slides.length);
        const base: React.CSSProperties = {
          position: "absolute", inset: 0,
          willChange: "opacity, transform",
          ...style,
        };

        if (slide.type === "video") {
          return (
            <div key={slide.id} style={base}>
              <div style={{ position: "absolute", inset: 0, background: OVERLAY, zIndex: 1 }} />
              <video
                ref={el => { videoRefs.current[i] = el; }}
                muted playsInline loop={slides.length === 1}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                src={slide.url}
              />
            </div>
          );
        }

        return (
          <div
            key={slide.id}
            style={{
              ...base,
              background: `${OVERLAY}, url('${slide.url}') center/cover no-repeat`,
            }}
          />
        );
      })}

      {/* Slide dots */}
      {slides.length > 1 && (
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
