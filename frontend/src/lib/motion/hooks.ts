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

export function useVisibility<T extends HTMLElement>(options: { rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)), {
      threshold: 0,
      rootMargin: options.rootMargin ?? "64px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [options.rootMargin]);

  return [ref, isVisible] as const;
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
    element.dataset.active = "true";
  }, [effectiveIntensity, strength]);
  const onPointerLeave = useCallback((event: PointerEvent<T>) => {
    event.currentTarget.style.setProperty("--cg-magnetic-x", "0px");
    event.currentTarget.style.setProperty("--cg-magnetic-y", "0px");
    delete event.currentTarget.dataset.magneticActive;
    delete event.currentTarget.dataset.active;
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
    const card = surface.classList.contains("cg-tilt-card-inner") ? surface.parentElement : surface;
    card?.style.setProperty("--cg-pointer-x", `${event.clientX - bounds.left}px`);
    card?.style.setProperty("--cg-pointer-y", `${event.clientY - bounds.top}px`);
    card?.classList.add("cg-pointer-active");
  }, [effectiveIntensity, maxDegrees]);
  const onPointerLeave = useCallback((event: PointerEvent<T>) => {
    event.currentTarget.style.setProperty("--cg-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--cg-tilt-y", "0deg");
    delete event.currentTarget.dataset.tiltActive;
    const card = event.currentTarget.classList.contains("cg-tilt-card-inner") ? event.currentTarget.parentElement : event.currentTarget;
    card?.classList.remove("cg-pointer-active");
  }, []);
  return { onPointerMove, onPointerLeave };
}

export function useCountUp(target: number, options: { duration?: keyof typeof MOTION.duration; from?: number; resetKey?: string; enabled?: boolean } = {}) {
  const { effectiveIntensity } = useMotionSettings();
  const from = options.from ?? 0;
  const durationKey = options.duration ?? "slow";
  const resetKey = options.resetKey;
  const enabled = options.enabled ?? true;
  const [value, setValue] = useState(from);
  const currentValue = useRef(from);
  const previousResetKey = useRef(resetKey);

  useEffect(() => {
    if (!enabled) return;
    const start = resetKey !== undefined && previousResetKey.current !== resetKey ? from : currentValue.current;
    previousResetKey.current = resetKey;
    if (effectiveIntensity === "minimal") {
      currentValue.current = target;
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
      const next = start + (target - start) * eased;
      currentValue.current = next;
      setValue(next);
      if (progress >= 1) unsubscribe();
    });
    return unsubscribe;
  }, [durationKey, effectiveIntensity, enabled, from, resetKey, target]);

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
