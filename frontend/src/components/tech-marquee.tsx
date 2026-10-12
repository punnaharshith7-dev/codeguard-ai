"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";

const labels = ["Static analysis", "Secret detection", "Dependency checks", "GitHub pull requests", "AI-assisted fixes"];

export function TechMarquee() {
  const [paused, setPaused] = useState(false);

  return (
    <div className={`cg-marquee${paused ? " cg-marquee--paused" : ""}`}>
      <div className="cg-marquee__track" aria-hidden="true">
        {[0, 1].map((copy) => <div key={copy} className="cg-marquee__group">
          {labels.map((label) => <span key={label} className="cg-marquee__item"><i />{label}</span>)}
        </div>)}
      </div>
      <ul className="sr-only">{labels.map((label) => <li key={label}>{label}</li>)}</ul>
      <button
        type="button"
        className="cg-marquee__toggle"
        aria-label={paused ? "Resume technology list animation" : "Pause technology list animation"}
        aria-pressed={paused}
        onClick={() => setPaused((wasPaused) => !wasPaused)}
      >
        {paused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
      </button>
    </div>
  );
}
