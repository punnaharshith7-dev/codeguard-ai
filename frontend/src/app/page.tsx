import Link from "next/link";
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, Bot, Braces, Check, ChevronDown, CircleDot, FileCode2, Github, LockKeyhole, ScanLine, Shield, ShieldCheck, Sparkles, TerminalSquare, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroHeadline } from "@/components/hero-headline";
import { MagneticLink } from "@/components/magnetic-link";
import { TiltCard } from "@/components/tilt-card";
import { TechMarquee } from "@/components/tech-marquee";
import { ScaleTelemetry } from "@/components/scale-telemetry";

const featureCards = [
  { icon: ScanLine, title: "Find risks in code and infrastructure", text: "Review source, dependencies, Terraform, Docker, and Kubernetes with findings tied to exact lines.", href: "/register" },
  { icon: ShieldCheck, title: "Track findings across releases", text: "Connect repositories, compare scans, set a baseline, and schedule recurring reviews.", href: "/dashboard/projects" },
  { icon: WandSparkles, title: "Move from finding to fix", text: "Triage risk, export SARIF, and inspect an AI-generated patch before downloading it.", href: "/register" },
  { icon: Bot, title: "Work together safely", text: "Assign findings to teammates and collaborate in role-based shared workspaces.", href: "/dashboard/projects" },
];

const workflow = [
  { number: "01", title: "Bring your code", text: "Upload source files or connect the GitHub workflow you already use." },
  { number: "02", title: "Understand the signal", text: "Review severity, evidence, and a plain-English explanation for each finding." },
  { number: "03", title: "Choose the next step", text: "Generate a patch, ask the agent, or send a security check to a pull request." },
];

const faqs = [
  { question: "What can I review with CodeGuard?", answer: "Start with source files in the dashboard. CodeGuard can also check supported dependency manifests and, when configured, review changed files in GitHub pull requests." },
  { question: "Are uploaded source files stored?", answer: "Source files are processed in memory for analysis. Scan findings and selected redacted snippets can be kept in your review history according to your Trust Center settings." },
  { question: "Can CodeGuard generate a fix?", answer: "Yes. You can request a patch for a finding and inspect the proposed diff before downloading it. Generated code should still be reviewed and tested by your team." },
  { question: "Does the AI agent change my repository?", answer: "Agent edits are returned as proposals in the browser workspace. You review the changes and choose whether to download them; the preview agent does not write to your repository." },
  { question: "How do GitHub pull request scans work?", answer: "GitHub sign-in identifies your account. A separately configured GitHub App can read pull request changes and publish a CodeGuard check on repositories where you install it." },
];

export default function HomePage() {
  return (
    <main className="cg-landing relative min-h-screen text-white">
      <div aria-hidden className="cg-aurora pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(ellipse_54%_58%_at_50%_0%,rgba(106,33,220,.38),transparent_78%)]" />
      <div aria-hidden className="cg-grid-drift grid-noise pointer-events-none absolute inset-x-0 top-0 h-[780px] opacity-30" />

      <header data-cg-header className="cg-site-header sticky top-0 z-30 border-b border-white/[.055] bg-[#080713]/70 backdrop-blur-2xl">
        <div className="cg-drop mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CodeGuard AI home">
            <span className="cg-brand-mark grid size-9 place-items-center rounded-xl text-white"><Shield size={18} strokeWidth={2.3} /></span>
            <span className="text-[15px] font-semibold tracking-[-.04em]">codeguard<span className="text-cyan-300">.</span>ai</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-zinc-300 md:flex">
            <a href="#features" className="transition hover:text-white">Platform</a>
            <a href="#workflow" className="transition hover:text-white">How it works</a>
            <Link href="/pricing" className="text-cyan-100 transition hover:text-white flex items-center gap-1 font-semibold">Pricing <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.2 text-[9px] text-cyan-200 border border-cyan-300/25">Plans</span></Link>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-[12px] text-zinc-300 transition hover:bg-white/[.06] hover:text-white sm:px-4 sm:text-[13px]">Sign in</Link>
            <Link href="/register"><Button size="sm" className="h-9 rounded-lg px-3 text-[12px] sm:h-10 sm:px-4 sm:text-[13px]">Get started <ArrowUpRight size={14} /></Button></Link>
          </div>
        </div>
      </header>

      <section className="cg-hero relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-28 lg:pt-32">
        <div className="cg-drop cg-signal-chip mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/[.055] px-3.5 py-1.5 text-[11px] font-medium text-violet-100 shadow-[0_0_36px_rgba(119,45,229,.15)]">
          <span className="cg-signal-dot grid size-5 place-items-center rounded-full bg-violet-500/25 text-violet-200"><ShieldCheck size={12} /></span>
          A calmer way to secure every release
        </div>
        <HeroHeadline />
        <p className="cg-drop cg-drop--delay-2 mt-6 max-w-[660px] text-[15px] leading-7 text-zinc-300 sm:text-[17px] sm:leading-8">CodeGuard brings security reviews, understandable findings, and AI-assisted fixes into one thoughtful workflow for your codebase.</p>
        <div className="cg-drop cg-drop--delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <MagneticLink strength={9}><Link href="/register"><Button size="lg" className="cg-cta-primary h-12 rounded-lg px-6">Start a free review <ArrowRight size={16} /></Button></Link></MagneticLink>
          <MagneticLink strength={6}><a href="#workflow"><Button size="lg" variant="outline" className="cg-cta-secondary h-12 rounded-lg border-violet-200/20 bg-white/[.035] px-6 hover:border-violet-200/40 hover:bg-white/[.07]">See how it works <ArrowDown size={15} /></Button></a></MagneticLink>
        </div>
        <div data-scroll-reveal="fade" className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5"><LockKeyhole size={12} className="text-violet-300" /> Private by default</span>
          <span className="hidden text-zinc-700 sm:inline">·</span>
          <span>Source analyzed in memory</span>
          <span className="hidden text-zinc-700 sm:inline">·</span>
          <span>Review every proposed change</span>
        </div>

        <div className="cg-preview cg-review-float relative mt-16 w-full max-w-[940px] text-left sm:mt-20">
          <div aria-hidden className="absolute -inset-8 rounded-[48px] bg-violet-600/[.13] blur-[70px]" />
          <div className="cg-review-window relative overflow-hidden rounded-[24px] border border-violet-100/[.13] bg-[#0c0a18]/90 shadow-[0_36px_130px_rgba(0,0,0,.54)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[.08] px-4 py-3.5 sm:px-6">
              <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-violet-500/15 text-violet-200"><ShieldCheck size={16} /></span><span><span className="block text-[12px] font-semibold text-white">Example security review</span><span className="mt-0.5 block text-[10px] text-zinc-500">A finding with context, evidence, and a next step</span></span></div>
              <span className="flex items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-300/[.06] px-2.5 py-1 text-[9px] font-medium text-violet-200"><CircleDot size={10} /> Preview</span>
            </div>
            <div className="relative grid gap-4 p-4 sm:grid-cols-[1.2fr_.8fr] sm:p-6">
              <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full sm:block"><path className="cg-connector-path" d="M 53 51 C 62 51, 58 27, 68 27" fill="none" stroke="rgba(196,181,253,.75)" strokeWidth=".32" strokeDasharray="100" strokeDashoffset="100"/><circle className="cg-connector-dot" cx="68" cy="27" r=".9" fill="#ddd6fe"/></svg>
              <div className="cg-code-scan overflow-hidden rounded-2xl border border-white/[.075] bg-[#080713]">
                <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3"><span className="flex items-center gap-2 text-[10px] text-zinc-400"><FileCode2 size={13} /> src/auth/session.ts</span><span className="cg-line-label text-[9px] text-zinc-600">line 42 <i aria-hidden="true" /></span></div>
                <div className="cg-review-code space-y-1.5 p-4 font-mono text-[10px] leading-6 text-zinc-500 sm:text-[11px]"><div><span className="text-violet-300">export async function</span> <span className="text-sky-200">getSession</span>(req) {'{'}</div><div className="pl-4"><span className="text-violet-300">const</span> token = req.cookies.get(</div><div className="pl-8 text-zinc-400">&quot;session&quot;);</div><div className="cg-preview-line -mx-2 rounded-lg border-l-2 border-amber-300/70 bg-amber-300/[.075] px-2 text-amber-100"><span className="text-violet-300">return</span> verifyToken(token);</div><div className="cg-review-diff" aria-hidden="true"><span>- verifyToken(token)</span><span>+ verifyToken(token, {"{"} issuer, audience {"}"})</span></div><div className="pl-4">{'}'}</div></div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="cg-preview-finding rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[.1] to-orange-400/[.035] p-4"><div className="cg-review-status-row flex items-center justify-between"><span className="sr-only">Needs review</span><span aria-hidden="true" className="cg-review-status cg-review-status--risk text-[9px] font-semibold uppercase tracking-[.14em]">Needs review</span><span aria-hidden="true" className="cg-review-status cg-review-status--fixed text-[9px] font-semibold uppercase tracking-[.14em]">Fixed</span><span className="rounded-full border border-amber-200/20 px-2 py-0.5 text-[8px] text-amber-100">Example</span></div><div className="mt-3 text-[13px] font-semibold text-white">Token validation</div><p className="mt-2 text-[10px] leading-5 text-zinc-400">Validate the issuer and audience before trusting a token.</p><div className="cg-review-diff mt-3" aria-hidden="true"><span>- unchecked token</span><span>+ issuer + audience verified</span></div><div className="mt-3 inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-[9px] text-zinc-400">CWE-347 <ArrowUpRight size={10} /></div></div>
                <div className="cg-preview-next flex-1 rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-center justify-between text-[9px] uppercase tracking-[.13em] text-zinc-500"><span>Review flow</span><Activity size={12} className="text-violet-300" /></div><div className="mt-4 space-y-3">{["Understand the evidence", "Generate a proposed patch", "Review before applying"].map((item, index) => <div key={item} className={`cg-review-step cg-review-step--${index + 1} flex items-center gap-2.5 text-[10px] text-zinc-300`}><span className={`grid size-5 place-items-center rounded-full ${index === 0 ? "bg-violet-500/20 text-violet-200" : "bg-white/[.06] text-zinc-500"}`}>{index === 0 ? <Check size={11} /> : index + 1}</span>{item}</div>)}</div></div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[.07] px-4 py-3 text-[10px] text-zinc-500 sm:px-6"><span className="flex items-center gap-2"><Github size={12} /> Works with your GitHub workflow</span><Link href="/register" className="flex items-center gap-1 text-violet-200 transition hover:text-white">Explore CodeGuard <ArrowUpRight size={12} /></Link></div>
          </div>
        </div>
      </section>

      <section data-scroll-reveal="fade" className="cg-tech-strip border-y border-white/[.06] bg-white/[.012]">
        <div className="mx-auto max-w-6xl px-5 py-9 text-center sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-zinc-500">Security work, in one connected workflow</p>
          <div data-scroll-reveal="fade" className="mt-5"><TechMarquee /></div>
        </div>
      </section>

      <section id="features" data-scroll-reveal="rise" className="relative isolate mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute left-1/2 top-20 z-0 h-72 w-[min(80vw,800px)] -translate-x-1/2 rounded-full bg-violet-700/[.12] blur-[90px]" />
        <div data-scroll-reveal="rise" className="relative z-10 mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-violet-300/15 bg-violet-300/[.06] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-violet-200">Platform</span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Built for people who build.</h2>
          <p className="mt-3 text-[13px] leading-6 text-zinc-400 sm:text-[15px]">A focused set of tools to spot a risk, understand it, and choose a safe next step.</p>
        </div>
        <div className="relative z-10 mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ icon: Icon, title, text, href }, index) => <TiltCard key={title} delay={index % 3 + 1} className="cg-feature-card cg-card group relative overflow-hidden rounded-[20px] border border-white/[.075] bg-gradient-to-br from-[#0d1a27] to-[#08111b] transition duration-300 hover:border-cyan-300/25 hover:shadow-[0_18px_55px_rgba(5,128,160,.15)]"><span className={`cg-feature-icon cg-feature-icon--${index + 1} grid size-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.09] text-violet-200`}><Icon size={19} /></span><div className="mt-7 flex items-center justify-between"><h3 className="text-[15px] font-semibold tracking-[-.02em] text-white">{title}</h3><span className="text-[10px] font-medium text-zinc-600">0{index + 1}</span></div><p className="mt-2.5 text-[12px] leading-6 text-zinc-400">{text}</p><Link href={href} className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-200 transition group-hover:text-white">Explore <ArrowRight size={12} /></Link></TiltCard>)}
        </div>
      </section>

      <ScaleTelemetry />

      <section id="workflow" data-cg-workflow-section className="cg-workflow-section relative border-y border-white/[.06] bg-[#0a0815]/70">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-72 w-[760px] -translate-x-1/2 rounded-full bg-purple-700/[.12] blur-[100px]" />
        <div data-cg-workflow-pin className="cg-workflow-pin relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
          <div data-scroll-reveal="rise" className="mx-auto max-w-2xl text-center"><span className="inline-flex rounded-full border border-violet-300/15 bg-white/[.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-violet-200">The workflow</span><h2 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">From code to a confident next step.</h2><p className="mt-3 text-[13px] leading-6 text-zinc-400 sm:text-[15px]">Keep the review understandable and the final decision in your hands.</p></div>
          <div className="cg-workflow-stations relative mt-12">
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="cg-workflow-beam pointer-events-none absolute inset-0 h-full w-full"><path data-cg-beam-path d="M 15 42 C 28 42, 34 42, 50 42 S 72 42, 85 42" fill="none" stroke="url(#cg-beam-gradient)" strokeWidth=".7" strokeDasharray="100" strokeDashoffset="100" /><defs><linearGradient id="cg-beam-gradient"><stop stopColor="#15d9ff" /><stop offset=".54" stopColor="#9873ff" /><stop offset="1" stopColor="#38e8ad" /></linearGradient></defs></svg>
            <div className="grid gap-4 md:grid-cols-3">{workflow.map((step, index) => <article data-cg-workflow-station={index} data-scroll-reveal="rise" data-reveal-delay={index + 1} key={step.number} className={`cg-workflow-station relative rounded-[20px] border p-6 sm:p-7 ${index === 1 ? "border-violet-300/25 bg-gradient-to-br from-[#17364b]/95 to-[#152441]/95 shadow-[0_18px_65px_rgba(10,157,194,.14)]" : "border-white/[.075] bg-[#0b1420]/90"}`}><div className="flex items-center justify-between"><span className={`text-[11px] font-semibold tracking-[.12em] ${index === 1 ? "text-cyan-100" : "text-cyan-300"}`}>{step.number}</span>{index === 0 ? <FileCode2 size={17} className="text-cyan-200" /> : index === 1 ? <Sparkles size={17} className="text-white" /> : <Check size={17} className="text-emerald-300" />}</div><h3 className="mt-8 text-[16px] font-semibold text-white">{step.title}</h3><p className={`mt-2 text-[12px] leading-6 ${index === 1 ? "text-cyan-50/75" : "text-zinc-400"}`}>{step.text}</p></article>)}</div>
          </div>
        </div>
      </section>

      <section className="cg-workspace-section relative">
        <div data-cg-workspace-pin className="cg-workspace-pin mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
          <div data-scroll-reveal="rise" className="mx-auto max-w-2xl text-center"><span className="inline-flex rounded-full border border-violet-300/15 bg-violet-300/[.06] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-violet-200">A workspace for every stage</span><h2 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Start with a scan. Go further when you need.</h2><p className="mt-3 text-[13px] leading-6 text-zinc-400 sm:text-[15px]">Use the part of CodeGuard that fits the work in front of you.</p></div>
          <div data-cg-workspace-viewport className="cg-workspace-viewport mt-12">
            <div data-cg-workspace-track className="cg-workspace-track">
              <article data-cg-workspace-card className="cg-workspace-card rounded-[20px] border border-white/[.08] bg-[#0b1420]/90 p-6 sm:p-7">
                <div aria-hidden="true" className="cg-mini-demo cg-mini-findings"><div className="cg-mini-toolbar"><span><i /> Review queue</span><span>SEVERITY: HIGH</span></div><div className="cg-mini-row"><code>auth/session.ts:42</code><b>HIGH</b><span className="cg-mini-pip" /></div><div className="cg-mini-row"><code>api/upload.py:18</code><b className="cg-mini-medium">MEDIUM</b><span className="cg-mini-pip" /></div><div className="cg-mini-filter">FILTER <span>CRITICAL</span> <span className="is-selected">HIGH</span> <span>MEDIUM</span></div></div>
                <div className="flex items-center gap-2 text-[11px] font-medium text-violet-200"><ScanLine size={15} /> Code review</div><h3 className="mt-5 text-xl font-semibold tracking-[-.04em] text-white">See the signal.</h3><p className="mt-2 min-h-12 text-[12px] leading-6 text-zinc-400">Review file-level findings with severity, evidence, and helpful context.</p><ul className="mt-6 space-y-3 border-t border-white/[.07] pt-5 text-[11px] text-zinc-300">{["Upload files", "Filter findings", "Keep scan history"].map((item) => <li key={item} className="flex items-center gap-2"><Check size={13} className="text-violet-300" />{item}</li>)}</ul><Link href="/register"><Button variant="outline" className="mt-7 w-full rounded-lg">Start a review <ArrowRight size={14} /></Button></Link>
              </article>
              <article data-cg-workspace-card className="cg-workspace-card relative overflow-hidden rounded-[20px] border border-violet-300/30 bg-gradient-to-br from-violet-700/80 via-violet-800/70 to-fuchsia-900/60 p-6 shadow-[0_24px_70px_rgba(91,19,168,.2)] sm:p-7"><div aria-hidden="true" className="absolute -right-20 -top-20 size-52 rounded-full bg-fuchsia-300/20 blur-3xl"/><div className="relative"><div aria-hidden="true" className="cg-mini-demo cg-mini-diff"><div className="cg-mini-toolbar"><span><i /> Proposed patch</span><span>+2 −1</span></div><code className="cg-mini-removed">− return verifyToken(token);</code><code className="cg-mini-added">+ verifyToken(token, {"{"} issuer {"}"});</code><code className="cg-mini-added">+ verifyAudience(claims.aud);</code><span className="cg-mini-typing">▍</span></div><div className="flex items-center gap-2 text-[11px] font-medium text-violet-100"><WandSparkles size={15} /> Patch proposals</div><h3 className="mt-5 text-xl font-semibold tracking-[-.04em] text-white">Make a fix reviewable.</h3><p className="mt-2 min-h-12 text-[12px] leading-6 text-violet-50/75">Generate a proposed patch and inspect the diff before you keep it.</p><ul className="mt-6 space-y-3 border-t border-white/20 pt-5 text-[11px] text-white/90">{["Original and fixed code", "Diff preview", "Download the patched file"].map((item) => <li key={item} className="flex items-center gap-2"><Check size={13} className="text-violet-100" />{item}</li>)}</ul><Link href="/register"><Button className="mt-7 w-full rounded-lg bg-none bg-white text-violet-800 shadow-none hover:bg-violet-50">Explore patching <ArrowRight size={14} /></Button></Link></div></article>
              <article data-cg-workspace-card className="cg-workspace-card rounded-[20px] border border-white/[.08] bg-[#0b1420]/90 p-6 sm:p-7">
                <div aria-hidden="true" className="cg-mini-demo cg-mini-agent"><div className="cg-mini-toolbar"><span><i /> Agent Studio</span><span className="cg-mini-online">● READY</span></div><div className="cg-mini-message">Explain this finding in <code>session.ts</code>.</div><div className="cg-mini-reply">The token is verified without checking its issuer<span className="cg-mini-caret">▍</span></div><div className="cg-mini-input">Ask about this file <span>↗</span></div></div>
                <div className="flex items-center gap-2 text-[11px] font-medium text-violet-200"><Bot size={15} /> Agent Studio</div><h3 className="mt-5 text-xl font-semibold tracking-[-.04em] text-white">Think through the change.</h3><p className="mt-2 min-h-12 text-[12px] leading-6 text-zinc-400">Ask about your files, plan a change, or preview an edit proposal.</p><ul className="mt-6 space-y-3 border-t border-white/[.07] pt-5 text-[11px] text-zinc-300">{["Ask and plan modes", "Edit proposals", "Undo in the browser"].map((item) => <li key={item} className="flex items-center gap-2"><Check size={13} className="text-violet-300" />{item}</li>)}</ul><Link href="/dashboard/agent"><Button variant="outline" className="mt-7 w-full rounded-lg">Open Agent Studio <ArrowRight size={14} /></Button></Link>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" data-scroll-reveal="rise" className="relative border-y border-white/[.06] bg-[#0a0815]/70">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-[720px] -translate-x-1/2 rounded-full bg-violet-800/[.12] blur-[100px]" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 sm:px-8 sm:py-28">
          <div className="text-center"><span className="inline-flex rounded-full border border-violet-300/15 bg-white/[.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-violet-200">FAQs</span><h2 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Questions, clearly answered.</h2><p className="mx-auto mt-3 max-w-xl text-[13px] leading-6 text-zinc-400 sm:text-[15px]">A few useful details about how CodeGuard handles your code and reviews.</p></div>
          <div className="cg-faq-list mt-10 divide-y divide-violet-300/15 border-y border-violet-300/15">{faqs.map(({ question, answer }) => <details key={question} className="cg-faq-item group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-medium text-zinc-100 marker:hidden sm:text-sm">{question}<ChevronDown size={16} className="shrink-0 text-zinc-400 transition group-open:rotate-180 group-open:text-violet-200" /></summary><div className="cg-faq-answer"><p className="max-w-2xl pt-3 pr-8 text-[12px] leading-6 text-zinc-400">{answer}</p></div></details>)}</div>
        </div>
      </section>

      <section data-scroll-reveal="rise" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-[28px] border border-violet-300/20 bg-gradient-to-br from-[#37106f] via-[#25104f] to-[#111022] px-6 py-12 text-center shadow-[0_28px_100px_rgba(70,20,132,.2)] sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-180px] h-80 w-[660px] -translate-x-1/2 rounded-full bg-fuchsia-400/20 blur-[80px]" />
          <div className="relative mx-auto max-w-2xl"><span className="cg-final-shield mx-auto grid size-11 place-items-center rounded-2xl border border-white/15 bg-white/[.1] text-cyan-100"><ShieldCheck size={20} /></span><h2 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Make your next release feel safer.</h2><p className="mt-3 text-[13px] leading-6 text-violet-100/75 sm:text-[15px]">Start with one file. Get a review you can understand and decide what happens next.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><MagneticLink strength={7}><Link href="/register"><Button size="lg" className="cg-cta-primary cg-cta-burst rounded-lg bg-none bg-white px-6 text-[#04121b] shadow-none hover:bg-violet-50">Get started <ArrowRight size={15} /></Button></Link></MagneticLink><MagneticLink strength={5}><Link href="/login"><Button size="lg" variant="outline" className="rounded-lg border-white/25 bg-white/[.05] px-6 text-white hover:bg-white/[.1]">Sign in</Button></Link></MagneticLink></div></div>
        </div>
      </section>

      <footer className="cg-footer relative overflow-hidden border-t border-white/[.07] bg-[#070610]/75">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_.7fr_.7fr]">
          <div><Link href="/" className="inline-flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white"><Shield size={16} /></span><span className="text-sm font-semibold tracking-[-.04em]">codeguard<span className="text-fuchsia-400">.</span>ai</span></Link><p className="mt-4 max-w-sm text-[11px] leading-6 text-zinc-500">A thoughtful security workspace for developers who want clear findings and reviewable fixes.</p></div>
          <div><h3 className="text-[11px] font-semibold text-zinc-200">Explore</h3><div className="mt-4 flex flex-col gap-3 text-[11px] text-zinc-500"><a className="hover:text-white" href="#features">Platform</a><a className="hover:text-white" href="#workflow">How it works</a><Link className="hover:text-white" href="/login">Sign in</Link><Link className="hover:text-white" href="/register">Get started</Link></div></div>
          <div><h3 className="text-[11px] font-semibold text-zinc-200">Resources</h3><div className="mt-4 flex flex-col gap-3 text-[11px] text-zinc-500"><Link className="hover:text-white" href="/privacy">Privacy policy</Link><Link className="hover:text-white" href="/terms">Terms of service</Link><Link className="hover:text-white" href="/dashboard/trust">Trust Center</Link></div></div>
        </div>
        <div className="border-t border-white/[.06]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-[10px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 CodeGuard AI</span><span className="flex items-center gap-1.5"><TerminalSquare size={11} /> Built for secure shipping</span></div></div>
      </footer>
    </main>
  );
}
