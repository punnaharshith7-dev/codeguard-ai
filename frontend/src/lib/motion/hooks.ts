"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { intensityDuration, MOTION, type MotionIntensity } from "@/lib/motion/tokens";
import { useMotionSettings } from "@/components/motion-system-provider";
import { subscribeMotionFrame } from "@/lib/motion/frame-loop";

export function useReveal<T extends HTMLElement>(options: { threshold?: number; rootMargin?: string } = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { effectiveIntensity } = useMotionSettings();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.setAttribute("data-scroll-reveal", "rise");
    if (effectiveIntensity === "minimal" || !("IntersectionObserver" in window)) {
      element.classList.add("cg-scroll-visible");
      return;
    }
    element.classList.add("cg-scroll-pending");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      element.classList.remove("cg-scroll-pending");
      element.classList.add("cg-scroll-visible");
      observer.disconnect();
    }, { threshold: options.threshold ?? 0.12, rootMargin: options.rootMargin ?? "0px 0px -8% 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [effectiveIntensity, options.rootMargin, options.threshold]);

  return ref;
}

export function useMagnetic<T extends HTMLElement>(strength = 8) {
  const { effectiveIntensity } = useMotionSettings();
  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== "mouse" || effectiveIntensity === "minimal") return;
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const factor = effectiveIntensity === "balanced" ? 0.55 : 1;
    const x = (event.clientX - bounds.left - bounds.width / 2) / Math.max(bounds.width / 2, 1);
    const y = (event.clientY - bounds.top - bounds.height / 2) / Math.max(bounds.height / 2, 1);
    element.style.setProperty("--cg-magnetic-x", `${x * strength * factor}px`);
    element.style.setProperty("--cg-magnetic-y", `${y * strength * factor}px`);
    element.dataset.magneticActive = "true";
  }, [effectiveIntensity, strength]);
  const onPointerLeave = useCallback((event: PointerEvent<T>) => {
    event.currentTarget.style.setProperty("--cg-magnetic-x", "0px");
    event.currentTarget.style.setProperty("--cg-magnetic-y", "0px");
    delete event.currentTarget.dataset.magneticActive;
  }, []);
  return { onPointerMove, onPointerLeave };
}

export function useTilt<T extends HTMLElement>(maxDegrees = 7) {
  const { effectiveIntensity } = useMotionSettings();
  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== "mouse" || effectiveIntensity === "minimal") return;
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5;
    const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5;
    const factor = effectiveIntensity === "balanced" ? 0.6 : 1;
    surface.style.setProperty("--cg-tilt-x", `${-y * maxDegrees * factor}deg`);
    surface.style.setProperty("--cg-tilt-y", `${x * maxDegrees * factor}deg`);
    surface.dataset.tiltActive = "true";
    surface.style.setProperty("--cg-pointer-x", `${event.clientX - bounds.left}px`);
    surface.style.setProperty("--cg-pointer-y", `${event.clientY - bounds.top}px`);
  }, [effectiveIntensity, maxDegrees]);
  const onPointerLeave = useCallback((event: PointerEvent<T>) => {
    event.currentTarget.style.setProperty("--cg-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--cg-tilt-y", "0deg");
    delete event.currentTarget.dataset.tiltActive;
  }, []);
  return { onPointerMove, onPointerLeave };
}

export function useCountUp(target: number, options: { duration?: keyof typeof MOTION.duration; from?: number } = {}) {
  const { effectiveIntensity } = useMotionSettings();
  const from = options.from ?? 0;
  const durationKey = options.duration ?? "slow";
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (effectiveIntensity === "minimal") {
      setValue(target);
      return;
    }
    const duration = intensityDuration(effectiveIntensity) * (durationKey === "cinematic" ? 1.9 : durationKey === "fast" ? 0.5 : durationKey === "base" ? 0.8 : 1);
    let startedAt: number | undefined;
    let unsubscribe = () => {};
    unsubscribe = subscribeMotionFrame((time) => {
      if (startedAt === undefined) startedAt = time;
      const progress = Math.min(1, (time - startedAt) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress >= 1) unsubscribe();
    });
    return unsubscribe;
  }, [durationKey, effectiveIntensity, from, target]);

  return value;
}

const scrambleAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789<>/{}[]";
export function useScramble(text: string, options: { trigger?: boolean; duration?: keyof typeof MOTION.duration } = {}) {
  const { effectiveIntensity } = useMotionSettings();
  const [value, setValue] = useState(text);
  const trigger = options.trigger ?? true;
  const durationKey = options.duration ?? "cinematic";

  useEffect(() => {
    if (!trigger || effectiveIntensity === "minimal") {
      setValue(text);
      return;
    }
    const duration = intensityDuration(effectiveIntensity) * (durationKey === "cinematic" ? 1.9 : durationKey === "fast" ? 0.5 : durationKey === "base" ? 0.8 : 1);
    let startedAt: number | undefined;
    let lastUpdate = 0;
    let unsubscribe = () => {};
    unsubscribe = subscribeMotionFrame((time) => {
      if (startedAt === undefined) startedAt = time;
      if (time - lastUpdate < 34 && time - startedAt < duration * 1000) return;
      lastUpdate = time;
      const progress = Math.min(1, (time - startedAt) / (duration * 1000));
      const settled = Math.floor(progress * text.length);
      setValue([...text].map((character, index) => {
        if (character === " " || character === "\n" || index < settled) return character;
        return scrambleAlphabet[Math.floor(Math.random() * scrambleAlphabet.length)];
      }).join(""));
      if (progress >= 1) unsubscribe();
    });
    return unsubscribe;
  }, [durationKey, effectiveIntensity, text, trigger]);

  return value;
}

export type { MotionIntensity };
