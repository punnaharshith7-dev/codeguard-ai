"use client";

import * as React from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { useMagnetic } from "@/lib/motion/hooks";
import { cn } from "@/lib/utils";

const buttonVariants = cva("cg-button relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-gradient-to-r from-[#0fb7d8] via-[#168fe4] to-[#5667e7] text-[#04121b] shadow-[0_8px_30px_rgba(18,174,219,.24)] hover:brightness-110 active:scale-[.98]",
      secondary: "border border-cyan-200/15 bg-white/[.045] text-zinc-100 hover:border-cyan-200/25 hover:bg-white/[.08]",
      ghost: "text-zinc-400 hover:bg-white/[.05] hover:text-white",
      danger: "border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15",
      outline: "border border-white/[.12] bg-transparent text-zinc-200 hover:border-white/25 hover:bg-white/[.04]",
    },
    size: { default: "h-11 px-5 py-2", sm: "h-9 rounded-lg px-4 text-xs", lg: "h-12 rounded-lg px-6", icon: "size-9 rounded-lg" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  motionStatus?: "success" | "error";
  statusLabel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant, size, children, loading, motionStatus, statusLabel, onPointerMove, onPointerLeave, onPointerDown, disabled, ...props
}, ref) => {
  const magnetic = useMagnetic<HTMLButtonElement>(3.5);
  const iconOnly = size === "icon";

  const pointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && event.button === 0) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "cg-button__ripple";
      ripple.setAttribute("aria-hidden", "true");
      ripple.style.left = `${event.clientX - bounds.left}px`;
      ripple.style.top = `${event.clientY - bounds.top}px`;
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      event.currentTarget.appendChild(ripple);
    }
    onPointerDown?.(event);
  };

  const visual = loading
    ? <><LoaderCircle className="cg-button__status cg-button__spinner" size={15} aria-hidden="true" /><span>{statusLabel ?? "Loading"}</span></>
    : motionStatus === "success"
      ? <><Check className="cg-button__status" size={15} aria-hidden="true" /><span>{statusLabel ?? children}</span></>
      : motionStatus === "error"
        ? <><X className="cg-button__status" size={15} aria-hidden="true" /><span>{statusLabel ?? children}</span></>
        : children;

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }), "cg-motion-magnetic", iconOnly && "cg-button--icon")}
      data-motion-status={loading ? "loading" : motionStatus}
      aria-busy={loading || props["aria-busy"] || undefined}
      disabled={disabled || loading}
      onPointerMove={(event) => { magnetic.onPointerMove(event); onPointerMove?.(event); }}
      onPointerLeave={(event) => { magnetic.onPointerLeave(event); onPointerLeave?.(event); }}
      onPointerDown={pointerDown}
      {...props}
    >
      <span className="cg-button__label">{visual}</span>
      <span className="cg-button__shine" aria-hidden="true" />
      <span className="cg-button__border" aria-hidden="true" />
    </button>
  );
});
Button.displayName = "Button";
