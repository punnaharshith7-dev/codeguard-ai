"use client";

import * as React from "react";
import { useTilt } from "@/lib/motion/hooks";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & { "data-scroll-reveal"?: string; "data-reveal-delay"?: string | number };

export function Card({ className, onPointerMove, onPointerLeave, ...props }: CardProps) {
  const tilt = useTilt<HTMLDivElement>(2.2);
  return (
    <div
      {...props}
      data-scroll-reveal={props["data-scroll-reveal"] ?? "rise"}
      className={cn("cg-card cg-motion-tilt rounded-[22px] border border-cyan-100/[.1] bg-gradient-to-br from-[#0c1b29]/95 to-[#09131f]/95 shadow-[0_18px_56px_rgba(0,5,14,.32)] backdrop-blur-xl", className)}
      onPointerMove={(event) => { tilt.onPointerMove(event); onPointerMove?.(event); }}
      onPointerLeave={(event) => { tilt.onPointerLeave(event); onPointerLeave?.(event); }}
    />
  );
}
