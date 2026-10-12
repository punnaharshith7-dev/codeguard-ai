"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCountUp, useScramble } from "@/lib/motion/hooks";

export function MotionShowcase() {
  const count = useCountUp(80_000);
  const decoded = useScramble("Motion system initialized");

  return <main className="cg-motion-lab min-h-screen px-5 py-16 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-10 max-w-2xl">
        <span className="section-kicker">Developer QA</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.06em]">Motion system</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">A local component preview for motion, focus, and reduced-motion checks.</p>
      </header>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Button states</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button>Primary <ArrowRight size={14} /></Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Risk</Button>
            <Button size="icon" variant="outline" aria-label="Security status"><ShieldCheck size={15} /></Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button loading statusLabel="Scanning">Run review</Button>
            <Button motionStatus="success" statusLabel="Saved"><Check size={14} /> Save</Button>
            <Button motionStatus="error" statusLabel="Try again">Save</Button>
            <Button disabled>Disabled</Button>
          </div>
          <Link href="/pricing" className="cg-motion-lab-link mt-5 inline-flex items-center gap-2 text-xs text-cyan-100">Animated link <ArrowRight size={13} /></Link>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Input and focus states</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-xs text-zinc-300">Email address<Input type="email" placeholder="you@company.com" required /></label>
            <label className="grid gap-2 text-xs text-zinc-300">Search<Input placeholder="Filter findings" aria-invalid="true" /></label>
            <label className="grid gap-2 text-xs text-zinc-300">Motion setting<select className="cg-motion-lab-select" defaultValue="balanced"><option value="full">Full motion</option><option value="balanced">Balanced</option><option value="minimal">Minimal</option></select></label>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Card, counters, and decode</h2>
          <p className="mt-2 text-xs text-zinc-500">Hover this card to inspect spotlight and tilt.</p>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div><span className="block font-mono text-[9px] uppercase tracking-[.14em] text-cyan-200">Sample counter</span><strong className="mt-1 block text-3xl tabular-nums">{Math.round(count).toLocaleString("en-US")}</strong></div>
            <Sparkles size={18} className="text-cyan-200" />
          </div>
          <p className="mt-5 rounded-lg border border-cyan-200/10 bg-cyan-200/[.03] p-3 font-mono text-xs text-cyan-100" aria-label="Motion system initialized">{decoded}</p>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Accordion and progress</h2>
          <details className="cg-motion-lab-details mt-4">
            <summary>Open and close this panel</summary>
            <p>Check spring timing, focus visibility, and the open-item glow.</p>
          </details>
          <div className="mt-5 flex items-center gap-3"><span className="cg-motion-lab-ring" aria-label="Sample progress: 68 percent"/><span className="text-xs text-zinc-400">Progress ring · sample value</span></div>
        </Card>
      </div>
    </div>
  </main>;
}
