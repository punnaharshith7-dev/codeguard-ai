"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MOTION_CSS, MOTION_STORAGE_KEY, type MotionIntensity } from "@/lib/motion/tokens";

type MotionSettings = {
  intensity: MotionIntensity;
  effectiveIntensity: MotionIntensity;
  reducedMotion: boolean;
  setIntensity: (intensity: MotionIntensity) => void;
};

const MotionSettingsContext = createContext<MotionSettings | null>(null);
const validIntensity = (value: string | null): value is MotionIntensity => value === "full" || value === "balanced" || value === "minimal";

function getDeviceDefault(): MotionIntensity {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "minimal";
  const device = navigator as Navigator & { deviceMemory?: number };
  if (window.matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4 || (device.deviceMemory ?? 8) <= 4) return "balanced";
  return "full";
}

export function MotionSystemProvider({ children }: { children: React.ReactNode }) {
  const [intensity, setIntensityState] = useState<MotionIntensity>("full");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readPreference = () => {
      setReducedMotion(preference.matches);
      try {
        const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
        setIntensityState(validIntensity(stored) ? stored : getDeviceDefault());
      } catch {
        setIntensityState(getDeviceDefault());
      }
    };
    readPreference();
    preference.addEventListener?.("change", readPreference);
    window.addEventListener("storage", readPreference);
    return () => {
      preference.removeEventListener?.("change", readPreference);
      window.removeEventListener("storage", readPreference);
    };
  }, []);

  const setIntensity = useCallback((value: MotionIntensity) => {
    setIntensityState(value);
    try { window.localStorage.setItem(MOTION_STORAGE_KEY, value); } catch { /* Storage can be unavailable in private contexts. */ }
  }, []);

  const effectiveIntensity = reducedMotion ? "minimal" : intensity;
  const value = useMemo(() => ({ intensity, effectiveIntensity, reducedMotion, setIntensity }), [intensity, effectiveIntensity, reducedMotion, setIntensity]);

  return (
    <MotionSettingsContext.Provider value={value}>
      <style>{MOTION_CSS}</style>
      <div className="cg-motion-root" data-motion-intensity={effectiveIntensity} data-motion-preference={intensity}>
        {children}
      </div>
    </MotionSettingsContext.Provider>
  );
}

export function useMotionSettings(): MotionSettings {
  const value = useContext(MotionSettingsContext);
  if (!value) throw new Error("useMotionSettings must be used inside MotionSystemProvider");
  return value;
}
