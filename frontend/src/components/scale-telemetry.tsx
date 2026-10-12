"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, Check, Clock3, Globe2, Radio, ShieldCheck } from "lucide-react";
import { useMotionSettings } from "@/components/motion-system-provider";
import { useCountUp, useVisibility } from "@/lib/motion/hooks";
import { scaleDemoData } from "@/lib/scale-demo-data";

function Sparkline({ values, color, label }: { values: readonly number[]; color: string; label: string }) {
  const path = useMemo(() => {
    const min = Math.min(...values);
    const range = Math.max(1, Math.max(...values) - min);
    return values.map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 120;
      const y = 30 - ((value - min) / range) * 22;
      return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [values]);

  return <svg aria-label={`${label} sample latency trend`} role="img" viewBox="0 0 120 34" className="cg-scale-sparkline"><path d={path} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}

function RequestGlobe() {
  return <svg className="cg-scale-globe" viewBox="0 0 400 220" role="img" aria-label="Illustrative request paths between sample global regions">
    <defs>
      <radialGradient id="cg-globe-fill" cx="50%" cy="43%"><stop offset="0" stopColor="#102f45" stopOpacity=".8"/><stop offset="1" stopColor="#07111d" stopOpacity=".04"/></radialGradient>
      <linearGradient id="cg-arc-gradient" x1="0" x2="1"><stop stopColor="#15d9ff"/><stop offset=".52" stopColor="#9873ff"/><stop offset="1" stopColor="#38e8ad"/></linearGradient>
    </defs>
    <circle cx="200" cy="110" r="88" fill="url(#cg-globe-fill)" stroke="rgba(93,218,247,.13)" />
    <ellipse cx="200" cy="110" rx="66" ry="88" fill="none" stroke="rgba(93,218,247,.12)" />
    <ellipse cx="200" cy="110" rx="31" ry="88" fill="none" stroke="rgba(93,218,247,.1)" />
    <ellipse cx="200" cy="110" rx="88" ry="27" fill="none" stroke="rgba(93,218,247,.11)" />
    <ellipse cx="200" cy="110" rx="84" ry="57" fill="none" stroke="rgba(93,218,247,.1)" />
    <g className="cg-scale-arcs" fill="none" stroke="url(#cg-arc-gradient)" strokeWidth="1.5">
      {scaleDemoData.arcs.map((arc) => <path key={arc.id} d={arc.path} className="cg-scale-arc" />)}
    </g>
    <g className="cg-scale-regions">
      {scaleDemoData.regions.map((region) => <g key={region.id} className="cg-scale-region">
        <circle cx={region.x} cy={region.y} r="8" className="cg-scale-region-pulse" />
        <circle cx={region.x} cy={region.y} r="3.3" className="cg-scale-region-core" />
        <text x={region.x} y={region.y + 17} textAnchor="middle">{region.label}</text>
      </g>)}
    </g>
    <text x="200" y="211" textAnchor="middle" className="cg-scale-map-caption">SAMPLE ROUTING VISUALIZATION</text>
  </svg>;
}

function DemoEventStream() {
  return <div className="cg-scale-events" role="log" aria-label="Sample scan, finding, and patch events" aria-live="off">
    <div className="cg-scale-events__track">
      {[0, 1].map((copy) => <div key={copy} className="cg-scale-events__group" aria-hidden={copy === 1}>
        {scaleDemoData.events.map((event, index) => <div className="cg-scale-event" key={`${copy}-${index}`}>
          <span className={`cg-scale-event__kind cg-scale-event__kind--${event.tone}`}>{event.kind}</span><span>{event.text}</span><ArrowUpRight size={12} aria-hidden="true" />
        </div>)}
      </div>)}
    </div>
  </div>;
}

export function ScaleTelemetry() {
  const { effectiveIntensity } = useMotionSettings();
  const [sectionRef, isVisible] = useVisibility<HTMLElement>();
  const [sampleIndex, setSampleIndex] = useState(0);
  const requests = useCountUp(scaleDemoData.requestsPerSecond[sampleIndex], { duration: "base", enabled: isVisible });
  const queueCircumference = 2 * Math.PI * 28;

  useEffect(() => {
    if (effectiveIntensity === "minimal" || !isVisible) return;
    const timer = window.setInterval(() => setSampleIndex((index) => (index + 1) % scaleDemoData.requestsPerSecond.length), scaleDemoData.tickerIntervalMs);
    return () => window.clearInterval(timer);
  }, [effectiveIntensity, isVisible]);

  return <section ref={sectionRef} data-scroll-reveal="rise" data-motion-visible={isVisible ? "true" : "false"} className="cg-scale-section relative isolate overflow-hidden border-y border-cyan-200/[.08] bg-[#07101a]/85">
    <div aria-hidden="true" className="cg-scale-aurora" />
    <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="section-kicker"><Globe2 size={12} /> Built for scale</span>
        <h2 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Built for scale. Clear at every signal.</h2>
        <p className="mt-3 text-[13px] leading-6 text-zinc-400 sm:text-[15px]">A sample view of request flow, review latency, and queue health. These values are demo data, not live CodeGuard telemetry or a performance benchmark.</p>
      </div>

      <div className="cg-scale-status mt-9" role="status">
        <span className="cg-scale-status__dot" aria-hidden="true" /><span className="font-medium text-emerald-100">All systems operational</span>
        <span className="cg-scale-status__demo">Sample status</span>
        <span className="ml-auto hidden items-center gap-1.5 font-mono text-[9px] text-zinc-500 sm:inline-flex"><Radio size={11} /> DEMO ENVIRONMENT</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_.92fr]">
        <article className="cg-scale-panel cg-scale-throughput">
          <div className="cg-scale-panel__heading"><span><Activity size={14} /> Throughput profile</span><span className="cg-scale-sample-label">{scaleDemoData.label}</span></div>
          <div className="cg-scale-throughput__content">
            <div className="cg-scale-throughput__number"><span className="cg-scale-demo-kicker">{scaleDemoData.profileLabel}</span><strong>{new Intl.NumberFormat("en-US").format(Math.round(requests))}</strong><span>requests / second <i>· sample data</i></span></div>
            <RequestGlobe />
          </div>
          <div className="cg-scale-panel__foot"><span><span className="cg-scale-legend-dot cg-scale-legend-dot--cyan" /> Requests in transit</span><span><span className="cg-scale-legend-dot cg-scale-legend-dot--green" /> Review regions</span><span className="ml-auto">Illustrative profile</span></div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="cg-scale-panel cg-scale-metric-panel sm:col-span-2">
            <div className="cg-scale-panel__heading"><span><Clock3 size={14} /> Review latency</span><span className="cg-scale-sample-label">Sample data</span></div>
            <div className="cg-scale-latency-grid">{scaleDemoData.latency.map((metric) => <div className="cg-scale-latency" key={metric.label}>
              <div><span>{metric.label}</span><strong>{metric.valueMs}<small>ms</small></strong></div>
              <Sparkline values={metric.samples} color={metric.color} label={metric.label} />
            </div>)}</div>
          </article>
          <article className="cg-scale-panel cg-scale-metric-panel">
            <div className="cg-scale-panel__heading"><span><ShieldCheck size={14} /> Uptime bar</span><span className="cg-scale-sample-label">Demo</span></div>
            <div className="cg-scale-availability"><div className="cg-scale-availability__bar" style={{ gridTemplateColumns: `repeat(${scaleDemoData.availability.segments},minmax(0,1fr))` }} aria-label={`${scaleDemoData.availability.operationalSegments} of ${scaleDemoData.availability.segments} sample status checks operational`}>{Array.from({ length: scaleDemoData.availability.segments }, (_, index) => <span key={index} className={index < scaleDemoData.availability.operationalSegments ? "is-operational" : ""} />)}</div><div className="cg-scale-availability__label"><Check size={12} /> {scaleDemoData.availability.label}</div></div>
          </article>
          <article className="cg-scale-panel cg-scale-metric-panel">
            <div className="cg-scale-panel__heading"><span><Activity size={14} /> Scan queue</span><span className="cg-scale-sample-label">Demo</span></div>
            <div className="cg-scale-queue"><svg viewBox="0 0 68 68" role="img" aria-label={`${scaleDemoData.queue.percent} percent sample scan queue`}><circle cx="34" cy="34" r="28" className="cg-scale-queue__track"/><circle cx="34" cy="34" r="28" className="cg-scale-queue__value" style={{ strokeDasharray: queueCircumference, strokeDashoffset: queueCircumference * (1 - scaleDemoData.queue.percent / 100) }} /><text x="34" y="33">{scaleDemoData.queue.percent}%</text><text x="34" y="43" className="cg-scale-queue__unit">DEMO</text></svg><div><strong>{scaleDemoData.queue.label}</strong><span>{scaleDemoData.queue.capacityLabel}</span></div></div>
          </article>
        </div>
      </div>

      <article className="cg-scale-panel cg-scale-terminal mt-4">
        <div className="cg-scale-panel__heading"><span><span className="cg-scale-terminal__lights"><i /><i /><i /></span> Event stream</span><span className="cg-scale-sample-label">Illustrative events · not live</span></div>
        <DemoEventStream />
      </article>
    </div>
  </section>;
}
