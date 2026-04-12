import { useEffect, useRef, useState } from "react";
import "@/styles/showcase-slides.css";
import { SLIDES } from "./showcase/showcaseData";
import SlideAnalytics from "./showcase/SlideAnalytics";
import SlideJuryFlow from "./showcase/SlideJuryFlow";
import SlideEntryControl from "./showcase/SlideEntryControl";
import SlideCriteria from "./showcase/SlideCriteria";
import SlideManagement from "./showcase/SlideManagement";

import { Icon } from "lucide-react";

const VISUAL_MAP = {
  analytics: SlideAnalytics,
  juryflow: SlideJuryFlow,
  entrycontrol: SlideEntryControl,
  criteria: SlideCriteria,
  management: SlideManagement,
};

const INTERVAL = 5500;

export default function ProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (index) => {
    setActiveIndex(index);
    startTimer();
  };

  const goPrev = () => goTo((activeIndex - 1 + SLIDES.length) % SLIDES.length);
  const goNext = () => goTo((activeIndex + 1) % SLIDES.length);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const counterStr = `${String(activeIndex + 1).padStart(2, "0")} / ${String(SLIDES.length).padStart(2, "0")}`;
  const slide = SLIDES[activeIndex];

  return (
    <section className="product-showcase" role="region" aria-label="VERA platform product showcase carousel">
      <div className="product-showcase-shell">
        <div className="product-showcase-viewport">
          <div
            className="product-showcase-track"
            style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
          >
            {SLIDES.map((s, i) => {
              const Visual = VISUAL_MAP[s.theme];
              return (
                <div
                  key={s.theme}
                  className={`product-showcase-slide${i === activeIndex ? " is-active" : ""}`}
                >
                  <div className="ps-card-shell">
                    <div className="ps-card-meta">
                      <div className="ps-card-eyebrow">
                        <span className="ps-eyebrow-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}66` }} />
                        {s.eyebrow}
                      </div>
                      <h3 className="ps-card-title">{s.title}</h3>
                      <p className="ps-card-desc">{s.desc}</p>
                      {s.features && (
                        <div className="ps-card-features">
                          {s.features.map((f) => (
                            <div key={f.label} className="ps-card-feature">
                              <span className="ps-feature-icon" style={{ background: f.bg, color: f.color }}>◆</span>
                              {f.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ps-card-visual">
                      <Visual />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Footer controls */}
      <div className="product-showcase-footer">
        <div className="product-showcase-arrows">
          <button type="button" className="product-showcase-arrow" onClick={goPrev} aria-label="Previous slide">
            <Icon
              iconNode={[]}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"><path d="m15 18-6-6 6-6" /></Icon>
          </button>
          <button type="button" className="product-showcase-arrow" onClick={goNext} aria-label="Next slide">
            <Icon
              iconNode={[]}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"><path d="m9 18 6-6-6-6" /></Icon>
          </button>
        </div>

        <div className="product-showcase-dots" role="tablist" aria-label="Product showcase slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.theme}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Go to ${s.title}`}
              className={`product-showcase-dot${i === activeIndex ? " is-active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="product-showcase-meta">
          <span className="product-showcase-counter">{counterStr}</span>
          <span className="product-showcase-caption">{slide.title}</span>
          <div className="product-showcase-progress">
            <span
              className="product-showcase-progress-fill"
              style={{ width: `${((activeIndex + 1) / SLIDES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
