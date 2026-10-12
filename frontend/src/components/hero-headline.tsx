"use client";

import type { CSSProperties } from "react";
import { useScramble } from "@/lib/motion/hooks";

function LetterLine({ text, tone }: { text: string; tone?: "accent" }) {
  const decodedText = useScramble(text, { duration: "cinematic" });
  return (
    <span aria-hidden="true" className={`cg-hero-title-line${tone ? " cg-hero-title-line--accent" : ""}`}>
      {Array.from(decodedText).map((character, index) => (
        <span
          key={index}
          className="cg-hero-letter"
          style={{ animationDelay: `${120 + index * 22}ms` } as CSSProperties}
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
