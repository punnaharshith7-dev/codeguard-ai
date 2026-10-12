"use client";

import type { ReactNode } from "react";
import { useMagnetic } from "@/lib/motion/hooks";

export function MagneticLink({ children, strength = 8 }: { children: ReactNode; strength?: number }) {
  const magnetic = useMagnetic<HTMLSpanElement>(strength);
  return <span className="cg-magnetic cg-motion-magnetic" onPointerMove={magnetic.onPointerMove} onPointerLeave={magnetic.onPointerLeave}>{children}</span>;
}
