"use client";

import dynamic from "next/dynamic";

function SceneLoading() {
  return <div aria-hidden="true" className="cg-scene-loading" />;
}

const AmbientCanvas = dynamic(() => import("@/components/ambient-scene-canvas").then((module) => module.default), {
  ssr: false,
  loading: SceneLoading,
});

export function AmbientScene({ mode }: { mode: "hero" | "ambient" }) {
  return (
    <div className="cg-scene-layer" aria-hidden="true">
      <SceneLoading />
      <AmbientCanvas mode={mode} />
    </div>
  );
}
