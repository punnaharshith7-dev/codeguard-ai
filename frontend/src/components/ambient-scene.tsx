"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

function SceneLoading() {
  return <div aria-hidden="true" className="cg-scene-loading" />;
}

const AmbientCanvas = dynamic(() => import("@/components/ambient-scene-canvas").then((module) => module.default), {
  ssr: false,
  loading: SceneLoading,
});

export function AmbientScene({ mode }: { mode: "hero" | "ambient" }) {
  const [loadCanvas, setLoadCanvas] = useState(false);

  useEffect(() => {
    const lightweightScene = window.matchMedia(
      "(max-width: 720px), (pointer: coarse), (prefers-reduced-motion: reduce)",
    );
    if (lightweightScene.matches) return;

    const timer = window.setTimeout(() => setLoadCanvas(true), 3_500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="cg-scene-layer" aria-hidden="true">
      <SceneLoading />
      {loadCanvas && <AmbientCanvas mode={mode} />}
    </div>
  );
}
