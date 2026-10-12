import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-50", {
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

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";

