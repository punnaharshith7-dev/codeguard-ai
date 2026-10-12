import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("cg-input-motion flex h-11 w-full rounded-xl border border-cyan-100/[.14] bg-[#08131e]/90 px-3.5 text-sm text-zinc-100 shadow-sm outline-none placeholder:text-zinc-500 focus:border-cyan-300/65 focus:ring-2 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
));
Input.displayName = "Input";

