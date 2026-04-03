import { useEffect, useRef, useState } from "react";

import overviewImg from "@/assets/admin-showcase/admin-overview.png";
import scoresImg from "@/assets/admin-showcase/admin-scores-rankings.png";
import jurorsImg from "@/assets/admin-showcase/admin-jurors.png";
import projectsImg from "@/assets/admin-showcase/admin-projects.png";

const SLIDES = [
  { title: "Overview Dashboard", image: overviewImg, alt: "VERA admin overview ekranı" },
  { title: "Scores & Rankings", image: scoresImg, alt: "VERA admin scores ve rankings ekranı" },
  { title: "Juror Operations", image: jurorsImg, alt: "VERA admin jurors ekranı" },
  { title: "Project Management", image: projectsImg, alt: "VERA admin projects ekranı" },
];

export default function AdminShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % SLIDES.length);
    }, 5500);
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

  const slide = SLIDES[activeIndex];
  const counterStr = `${String(activeIndex + 1).padStart(2, "0")} / ${String(SLIDES.length).padStart(2, "0")}`;

  return (
    <section className="product-showcase" role="region" aria-label="VERA platform product showcase carousel">
      <div className="product-showcase-shell">
        <div className="product-showcase-viewport">
          <div
            className="product-showcase-track"
            style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
          >
            {SLIDES.map((s, i) => (
              <div
                key={s.title}
                className={`product-showcase-slide${i === activeIndex ? " is-active" : ""}`}
              >
                <img
                  src={s.image}
                  alt={s.alt}
                  style={{ width: "100%", display: "block", borderRadius: "12px" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="product-showcase-footer">
        <div className="product-showcase-arrows">
          <button
            type="button"
            className="product-showcase-arrow"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="product-showcase-arrow"
            onClick={goNext}
            aria-label="Next slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="product-showcase-dots" role="tablist" aria-label="Product showcase slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`${s.title} slaytına git`}
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
