"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Edges, Grid, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { BufferGeometry, CanvasTexture, Color, DoubleSide, ExtrudeGeometry, InstancedMesh, Object3D, Shape, SRGBColorSpace, Vector3 } from "three";
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

function OrbitSystem({ reducedMotion, lowPower, ambient }: { reducedMotion: boolean; lowPower: boolean; ambient: boolean }) {
  const orbit = useRef<Group>(null);
  const secondary = useRef<Group>(null);
  const { viewport } = useThree();

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const step = Math.min(delta, 0.05);
    if (orbit.current) orbit.current.rotation.z += step * 0.055;
    if (secondary.current) secondary.current.rotation.z -= step * 0.038;
  });

  return (
    <group position={[lowPower ? Math.min(1.45, viewport.width * 0.33) : Math.min(3.2, viewport.width * 0.36), 0.7, -2.8]} scale={ambient ? 0.48 : lowPower ? 0.68 : 1}>
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
    </group>
  );
}

function ShieldModel({ reducedMotion, lowPower }: { reducedMotion: boolean; lowPower: boolean }) {
  const shell = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const { viewport } = useThree();
  const scale = lowPower ? 0.68 : 1;
  const centerX = lowPower ? Math.min(1.45, viewport.width * 0.33) : Math.min(3.2, viewport.width * 0.36);
  const shieldGeometry = useMemo(() => {
    const outline = new Shape();
    outline.moveTo(0, 1.48);
    outline.lineTo(1.12, 1.04);
    outline.lineTo(0.94, -0.24);
    outline.quadraticCurveTo(0.75, -1.03, 0, -1.5);
    outline.quadraticCurveTo(-0.75, -1.03, -0.94, -0.24);
    outline.lineTo(-1.12, 1.04);
    outline.closePath();
    return new ExtrudeGeometry(outline, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.045, bevelSegments: 2, curveSegments: 16 });
  }, []);
  const checkGeometry = useMemo(() => new BufferGeometry().setFromPoints([
    new Vector3(-0.42, -0.02, 0.26),
    new Vector3(-0.11, -0.33, 0.26),
    new Vector3(-0.11, -0.33, 0.26),
    new Vector3(0.49, 0.37, 0.26),
  ]), []);
  const particle = useMemo(() => new Object3D(), []);
  const warm = useMemo(() => new Color("#ff506e"), []);
  const clean = useMemo(() => new Color("#42edb2"), []);
  const tint = useMemo(() => new Color(), []);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime;
    const step = Math.min(delta, 0.05);
    if (shell.current) {
      shell.current.position.y += (0.55 + Math.sin(time * 0.62) * 0.085 - shell.current.position.y) * step * 0.8;
      shell.current.rotation.y += (Math.sin(time * 0.43) * 0.105 - shell.current.rotation.y) * step * 0.8;
      shell.current.rotation.z += (Math.sin(time * 0.36) * 0.018 - shell.current.rotation.z) * step * 0.65;
    }
    const instanced = mesh.current;
    if (!instanced) return;
    const count = instanced.count;
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2 + time * 0.18;
      const radius = 1.3 + Math.sin(time * 0.42 + index) * 0.12;
      particle.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.78, Math.sin(angle * 2 + time) * 0.19 - 0.08);
      particle.scale.setScalar(0.035 + (index % 3) * 0.008);
      particle.rotation.z = angle;
      particle.updateMatrix();
      instanced.setMatrixAt(index, particle.matrix);
      const sanitized = Math.max(0, Math.min(1, (Math.sin(angle + time * 0.38) + 1) * 0.5));
      instanced.setColorAt(index, tint.copy(warm).lerp(clean, sanitized));
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[centerX, 0, -2.6]} scale={scale}>
      <group ref={shell} position={[0, 0.55, 0]}>
        <mesh geometry={shieldGeometry}>
          <meshPhysicalMaterial color="#071925" emissive="#052e40" emissiveIntensity={0.42} transparent opacity={0.78} metalness={0.5} roughness={0.24} clearcoat={0.9} side={DoubleSide} />
          <Edges threshold={18} color="#58e7ff" />
        </mesh>
        <lineSegments geometry={checkGeometry} position={[0, 0, 0.03]}>
          <lineBasicMaterial color="#8df2ff" transparent opacity={0.92} toneMapped={false} />
        </lineSegments>
        <instancedMesh ref={mesh} args={[undefined, undefined, lowPower ? 14 : 34]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </instancedMesh>
      </group>
      <pointLight position={[0, 0.35, 0.8]} color="#09d5ff" intensity={lowPower ? 0.65 : 1.15} distance={5.5} />
    </group>
  );
}

function createGlyphTexture(character: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);
  context.clearRect(0, 0, 128, 128);
  context.fillStyle = "#ffffff";
  context.font = "bold 94px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(character, 64, 67);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function GlyphInstancing({ character, offset, lowPower }: { character: string; offset: number; lowPower: boolean }) {
  const instances = useRef<InstancedMesh>(null);
  const count = lowPower ? 4 : 10;
  const texture = useMemo(() => createGlyphTexture(character), [character]);
  const transform = useMemo(() => new Object3D(), []);
  const red = useMemo(() => new Color("#ff4969"), []);
  const cyan = useMemo(() => new Color("#91f4ff"), []);
  const green = useMemo(() => new Color("#54efb5"), []);
  const tint = useMemo(() => new Color(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    const instanced = instances.current;
    if (!instanced) return;
    const time = clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + offset + time * 0.11;
      const orbit = 2.8 + Math.sin(angle * 2 + offset) * 0.16;
      transform.position.set(Math.sin(angle) * orbit, Math.cos(angle) * orbit * 0.74, Math.sin(angle * 2.1 + offset) * 0.45);
      transform.rotation.set(0, 0, Math.sin(time * 0.22 + index) * 0.12);
      const scale = 0.11 + (index % 3) * 0.015;
      transform.scale.setScalar(scale);
      transform.updateMatrix();
      instanced.setMatrixAt(index, transform.matrix);
      const sanitize = Math.max(0, Math.min(1, (Math.sin(angle + time * 0.28) + 1) * 0.5));
      const color = sanitize > 0.55 ? tint.copy(cyan).lerp(green, (sanitize - 0.55) / 0.45) : tint.copy(red).lerp(cyan, sanitize / 0.55);
      instanced.setColorAt(index, color);
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instances} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} color="#ffffff" transparent alphaTest={0.12} toneMapped={false} />
    </instancedMesh>
  );
}

function GlyphCloud({ lowPower }: { lowPower: boolean }) {
  const { viewport } = useThree();
  const x = lowPower ? Math.min(1.45, viewport.width * 0.33) : Math.min(3.2, viewport.width * 0.36);
  return (
    <group position={[x, 0.7, -2.7]} scale={lowPower ? 0.72 : 1}>
      <GlyphInstancing character="{" offset={0} lowPower={lowPower} />
      <GlyphInstancing character="/" offset={1.2} lowPower={lowPower} />
      <GlyphInstancing character="<" offset={2.4} lowPower={lowPower} />
      <GlyphInstancing character="}" offset={3.6} lowPower={lowPower} />
    </group>
  );
}

function Scene({ input, reducedMotion, lowPower, mode }: { input: RefObject<SceneInput>; reducedMotion: boolean; lowPower: boolean; mode: "hero" | "ambient" }) {
  const hero = mode === "hero";
  return (
    <>
      <CameraRig input={input} reducedMotion={reducedMotion} />
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 2, 1]} color="#0ecdf3" intensity={lowPower ? 1.1 : 1.8} distance={9} />
      <pointLight position={[-4, -1, -2]} color="#7049d8" intensity={0.9} distance={8} />
      <OrbitSystem reducedMotion={reducedMotion} lowPower={lowPower} ambient={!hero} />
      {hero && <ShieldModel reducedMotion={reducedMotion} lowPower={lowPower} />}
      {hero && !lowPower && <GlyphCloud lowPower={lowPower} />}
      <Sparkles
        count={hero ? (lowPower ? 18 : 72) : (lowPower ? 8 : 24)}
        scale={[12, 7, 6]}
        size={lowPower ? 1.7 : 2.3}
        speed={reducedMotion ? 0 : lowPower ? 0.18 : 0.34}
        opacity={0.48}
        color="#9ceeff"
        noise={0.6}
      />
      {hero && !lowPower && <Grid
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
      {hero && !lowPower && !reducedMotion && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.22} luminanceThreshold={0.78} luminanceSmoothing={0.12} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

export default function AmbientSceneCanvas({ mode }: { mode: "hero" | "ambient" }) {
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
        <Scene input={input} reducedMotion={reducedMotion} lowPower={lowPower} mode={mode} />
      </Canvas>
    </div>
  );
}
