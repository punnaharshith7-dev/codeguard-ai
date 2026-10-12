import type { Transition, Variants } from "framer-motion";

/** Shared motion values for UI, scroll and ambient choreography. Durations are seconds. */
export const MOTION = {
  duration: {
    fast: 0.12,
    base: 0.24,
    slow: 0.48,
    cinematic: 0.9,
  },
  ease: {
    standard: [0.2, 0.72, 0.22, 1] as const,
    enter: [0.17, 0.79, 0.24, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
    linear: [0, 0, 1, 1] as const,
  },
  spring: {
    snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
    responsive: { type: "spring", stiffness: 360, damping: 30, mass: 0.85 },
    soft: { type: "spring", stiffness: 180, damping: 24, mass: 1 },
  },
  stagger: {
    tight: 0.045,
    base: 0.08,
    relaxed: 0.12,
  },
} as const;

export type MotionIntensity = "full" | "balanced" | "minimal";

export const MOTION_STORAGE_KEY = "codeguard-motion-intensity";

export const MOTION_CSS = `:root{--cg-motion-fast:${MOTION.duration.fast * 1000}ms;--cg-motion-base:${MOTION.duration.base * 1000}ms;--cg-motion-slow:${MOTION.duration.slow * 1000}ms;--cg-motion-cinematic:${MOTION.duration.cinematic * 1000}ms;--cg-motion-ease:cubic-bezier(${MOTION.ease.standard.join(",")});--cg-motion-ease-enter:cubic-bezier(${MOTION.ease.enter.join(",")});--cg-motion-stagger-tight:${MOTION.stagger.tight * 1000}ms;--cg-motion-stagger-base:${MOTION.stagger.base * 1000}ms;--cg-motion-stagger-relaxed:${MOTION.stagger.relaxed * 1000}ms}`;

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION.duration.slow, ease: MOTION.ease.standard } },
  exit: { opacity: 0, y: -6, transition: { duration: MOTION.duration.base, ease: MOTION.ease.exit } },
};

export const staggerVariants = (stagger = MOTION.stagger.base): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: MOTION.stagger.tight } },
});

export const springTransition = (name: keyof typeof MOTION.spring): Transition => MOTION.spring[name];

export function intensityDuration(intensity: MotionIntensity): number {
  if (intensity === "minimal") return MOTION.duration.fast;
  if (intensity === "balanced") return MOTION.duration.base;
  return MOTION.duration.slow;
}
