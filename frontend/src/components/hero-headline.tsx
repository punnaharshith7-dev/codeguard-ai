import type { CSSProperties } from "react";
import { MOTION } from "@/lib/motion/tokens";

function LetterLine({ text, tone }: { text: string; tone?: "accent" }) {
  return (
    <span
      aria-hidden="true"
      className={`cg-hero-title-line${tone ? " cg-hero-title-line--accent" : ""}`}
      data-glitch={text}
    >
      {Array.from(text).map((character, index) => (
        <span
          key={index}
          className="cg-hero-letter"
          style={{ animationDelay: `${(MOTION.duration.fast + index * MOTION.stagger.character) * 1000}ms` } as CSSProperties}
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </span>
  );
}

export function HeroHeadline() {
  return (
    <h1
      aria-label="Find risk early. Ship with confidence."
      className="cg-hero-title cg-drop max-w-5xl text-[clamp(3rem,8.5vw,7.25rem)] font-semibold leading-[.93] tracking-[-.078em] text-[#edfaff]"
    >
      <LetterLine text="Find risk early." />
      <br aria-hidden="true" />
      <LetterLine text="Ship with confidence." tone="accent" />
    </h1>
  );
}
