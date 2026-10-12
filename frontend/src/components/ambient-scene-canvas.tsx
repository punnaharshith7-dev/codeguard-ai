"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Grid, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Group } from "three";
import { useReducedMotion } from "framer-motion";

type SceneInput = { x: number; y: number; scroll: number };

function CameraRig({ input, reducedMotion }: { input: RefObject<SceneInput>; reducedMotion: boolean }) {
  const rig = useRef<Group>(null);
  const { camera } = useThree();

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    const targetScroll = input.current.scroll;
    camera.position.x += (input.current.x * 0.28 - camera.position.x) * step * 0.7;
    camera.position.y += (input.current.y * 0.16 + Math.sin(targetScroll * Math.PI) * 0.11 - camera.position.y) * step * 0.7;
    camera.position.z += (10 + Math.sin(targetScroll * Math.PI * 2) * 0.12 - camera.position.z) * step * 0.7;
    camera.lookAt(0, 0, 0);

    if (!rig.current || reducedMotion) return;
    rig.current.rotation.y += (input.current.x * 0.065 - rig.current.rotation.y) * step * 0.8;
    rig.current.rotation.x += (-input.current.y * 0.045 - rig.current.rotation.x) * step * 0.8;
  });

  return null;
}

function OrbitSystem({ reducedMotion, lowPower }: { reducedMotion: boolean; lowPower: boolean }) {
  const orbit = useRef<Group>(null);
  const secondary = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const step = Math.min(delta, 0.05);
    if (orbit.current) orbit.current.rotation.z += step * 0.055;
    if (secondary.current) secondary.current.rotation.z -= step * 0.038;
  });

  return (
    <group position={[2.8, 0.7, -2.6]}>
      <group ref={orbit} rotation={[0.42, 0.18, -0.28]}>
        <mesh>
          <torusGeometry args={[2.25, 0.008, 8, 180]} />
          <meshBasicMaterial color="#15d9ff" transparent opacity={0.48} toneMapped={false} />
        </mesh>
        {!lowPower && <mesh rotation={[0, 0.42, 0.24]}>
          <torusGeometry args={[2.66, 0.005, 6, 180]} />
          <meshBasicMaterial color="#986bff" transparent opacity={0.32} toneMapped={false} />
        </mesh>}
      </group>
      <group ref={secondary} rotation={[-0.56, 0.18, 0.1]}>
        <mesh>
          <torusGeometry args={[1.7, 0.004, 6, 160]} />
          <meshBasicMaterial color="#38e8ad" transparent opacity={0.25} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0, -0.3]}>
        <icosahedronGeometry args={[0.82, 1]} />
        <meshBasicMaterial color="#16d9ff" wireframe transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

function Scene({ input, reducedMotion, lowPower }: { input: RefObject<SceneInput>; reducedMotion: boolean; lowPower: boolean }) {
  return (
    <>
      <CameraRig input={input} reducedMotion={reducedMotion} />
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 2, 1]} color="#0ecdf3" intensity={lowPower ? 1.1 : 1.8} distance={9} />
      <pointLight position={[-4, -1, -2]} color="#7049d8" intensity={0.9} distance={8} />
      <OrbitSystem reducedMotion={reducedMotion} lowPower={lowPower} />
      <Sparkles
        count={lowPower ? 18 : 72}
        scale={[12, 7, 6]}
        size={lowPower ? 1.7 : 2.3}
        speed={reducedMotion ? 0 : lowPower ? 0.18 : 0.34}
        opacity={0.48}
        color="#9ceeff"
        noise={0.6}
      />
      {!lowPower && <Grid
        position={[0, -3.25, -0.5]}
        args={[180, 180]}
        cellSize={0.95}
        cellThickness={0.32}
        cellColor="#164456"
        sectionSize={4.75}
        sectionThickness={0.7}
        sectionColor="#12647b"
        fadeDistance={19}
        fadeStrength={1.25}
        infiniteGrid
      />}
      {!lowPower && !reducedMotion && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.22} luminanceThreshold={0.78} luminanceSmoothing={0.12} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

export default function AmbientSceneCanvas() {
  const reducedPreference = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [visible, setVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);
  const input = useRef<SceneInput>({ x: 0, y: 0, scroll: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hardware = navigator as Navigator & { deviceMemory?: number };
    const updatePreferences = () => {
      setReducedMotion(reduced.matches || reducedPreference === true);
      setLowPower(window.matchMedia("(max-width: 720px), (pointer: coarse)").matches ||
        (hardware.hardwareConcurrency > 0 && hardware.hardwareConcurrency <= 4) ||
        (typeof hardware.deviceMemory === "number" && hardware.deviceMemory <= 4));
    };
    updatePreferences();
    reduced.addEventListener("change", updatePreferences);
    window.addEventListener("resize", updatePreferences, { passive: true });

    const host = hostRef.current;
    const observer = host && "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 })
      : undefined;
    if (host) observer?.observe(host);
    const updateVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);

    const onPointerMove = (event: PointerEvent) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      input.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      input.current.y = -(event.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      input.current.scroll = distance > 0 ? window.scrollY / distance : 0;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer?.disconnect();
      reduced.removeEventListener("change", updatePreferences);
      window.removeEventListener("resize", updatePreferences);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reducedPreference]);

  return (
    <div ref={hostRef} className="cg-scene-canvas-host">
      <Canvas
        aria-hidden="true"
        dpr={lowPower ? 1 : [1, 1.75]}
        frameloop={!visible ? "never" : reducedMotion ? "demand" : "always"}
        camera={{ position: [0, 0, 10], fov: 40, near: 0.1, far: 80 }}
        gl={{ alpha: true, antialias: !lowPower, powerPreference: "low-power", stencil: false }}
        fallback={null}
      >
        <Scene input={input} reducedMotion={reducedMotion} lowPower={lowPower} />
      </Canvas>
    </div>
  );
}
