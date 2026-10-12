"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--cg-pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--cg-pointer-y", `${event.clientY - bounds.top}px`);
  };
  return <div data-scroll-reveal="rise" onPointerMove={trackPointer} className={cn("cg-card rounded-[22px] border border-cyan-100/[.1] bg-gradient-to-br from-[#0c1b29]/95 to-[#09131f]/95 shadow-[0_18px_56px_rgba(0,5,14,.32)] backdrop-blur-xl", className)} {...props} />;
}
