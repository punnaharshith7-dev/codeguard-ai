import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("flex h-11 w-full rounded-xl border border-violet-100/[.11] bg-[#100d1d]/85 px-3.5 text-sm text-zinc-100 shadow-sm outline-none placeholder:text-zinc-500 transition-colors focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
));
Input.displayName = "Input";

