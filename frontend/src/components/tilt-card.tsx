"use client";

import type { PointerEvent, ReactNode } from "react";

export function TiltCard({ children, className, delay = 1 }: { children: ReactNode; className: string; delay?: number }) {
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const surface = event.currentTarget;
    const card = surface.parentElement;
    const bounds = surface.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const rotateX = ((y / Math.max(bounds.height, 1)) - 0.5) * -7;
    const rotateY = ((x / Math.max(bounds.width, 1)) - 0.5) * 8;
    surface.style.setProperty("--cg-tilt-x", `${rotateX}deg`);
    surface.style.setProperty("--cg-tilt-y", `${rotateY}deg`);
    surface.dataset.tiltActive = "true";
    card?.style.setProperty("--cg-pointer-x", `${x}px`);
    card?.style.setProperty("--cg-pointer-y", `${y}px`);
    card?.classList.add("cg-pointer-active");
  };

  const reset = (event: PointerEvent<HTMLDivElement>) => {
    const surface = event.currentTarget;
    surface.style.setProperty("--cg-tilt-x", "0deg");
    surface.style.setProperty("--cg-tilt-y", "0deg");
    delete surface.dataset.tiltActive;
    surface.parentElement?.classList.remove("cg-pointer-active");
  };

  return (
    <article data-scroll-reveal="rise" data-reveal-delay={delay} className={className}>
      <div className="cg-tilt-card-inner" onPointerMove={move} onPointerLeave={reset}>
        {children}
      </div>
    </article>
  );
}
