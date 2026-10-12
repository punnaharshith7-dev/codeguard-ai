"use client";

import type { PointerEvent, ReactNode } from "react";

export function MagneticLink({ children, strength = 8 }: { children: ReactNode; strength?: number }) {
  const move = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - bounds.left - bounds.width / 2) / Math.max(bounds.width / 2, 1);
    const dy = (event.clientY - bounds.top - bounds.height / 2) / Math.max(bounds.height / 2, 1);
    event.currentTarget.style.setProperty("--cg-magnetic-x", `${dx * strength}px`);
    event.currentTarget.style.setProperty("--cg-magnetic-y", `${dy * strength}px`);
    event.currentTarget.dataset.active = "true";
  };

  const reset = (event: PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.style.setProperty("--cg-magnetic-x", "0px");
    event.currentTarget.style.setProperty("--cg-magnetic-y", "0px");
    delete event.currentTarget.dataset.active;
  };

  return <span className="cg-magnetic" onPointerMove={move} onPointerLeave={reset}>{children}</span>;
}
