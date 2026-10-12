"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useMotionSettings } from "@/components/motion-system-provider";
import { MOTION, type MotionIntensity } from "@/lib/motion/tokens";

function SceneLoading() {
  return <div aria-hidden="true" className="cg-scene-loading" />;
}

const AmbientCanvas = dynamic(() => import("@/components/ambient-scene-canvas").then((module) => module.default), {
  ssr: false,
  loading: SceneLoading,
});

export function AmbientScene({ mode }: { mode: "hero" | "ambient" }) {
  const [loadCanvas, setLoadCanvas] = useState(false);
  const { effectiveIntensity } = useMotionSettings();

  useEffect(() => {
    const lightweightScene = window.matchMedia(
      "(max-width: 720px), (pointer: coarse), (prefers-reduced-motion: reduce)",
    );
    if (lightweightScene.matches || effectiveIntensity === "minimal") {
      setLoadCanvas(false);
      return;
    }

    const delay = mode === "hero" ? MOTION.defer.heroSceneMs : MOTION.defer.ambientSceneMs;
    const timer = window.setTimeout(() => setLoadCanvas(true), delay);
    return () => window.clearTimeout(timer);
  }, [effectiveIntensity, mode]);

  return (
    <div className="cg-scene-layer" aria-hidden="true">
      <SceneLoading />
      {loadCanvas && <AmbientCanvas mode={mode} intensity={effectiveIntensity} />}
    </div>
  );
}
