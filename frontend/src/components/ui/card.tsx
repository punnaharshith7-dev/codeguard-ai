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
  return <div data-scroll-reveal="rise" onPointerMove={trackPointer} className={cn("cg-card rounded-[22px] border border-violet-100/[.09] bg-gradient-to-br from-[#131026]/95 to-[#0c0a17]/95 shadow-[0_18px_56px_rgba(3,0,18,.28)] backdrop-blur-xl", className)} {...props} />;
}
