"use client";

import type { ReactNode } from "react";
import { useTilt } from "@/lib/motion/hooks";

export function TiltCard({ children, className, delay = 1 }: { children: ReactNode; className: string; delay?: number }) {
  const tilt = useTilt<HTMLDivElement>(7);

  return (
    <article data-scroll-reveal="rise" data-reveal-delay={delay} className={className}>
      <div className="cg-tilt-card-inner cg-motion-tilt" onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
        {children}
      </div>
    </article>
  );
}
