import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

const sections = [
  { title: "Preview service", text: "CodeGuard AI is provided as an early product preview. The initial scanner uses a limited set of pattern-based checks and may miss vulnerabilities or report false positives. Findings are informational and require human review; they are not a security certification or professional audit." },
  { title: "Your code and account", text: "You are responsible for having rights to submit code and for safeguarding your account. Do not use the preview to process code or data you are not authorized to share. Keep credentials and secrets out of uploaded files wherever possible." },
  { title: "Availability and changes", text: "The preview may change as features are developed. Availability, storage limits, and integrations can depend on the deployment provider. You should maintain independent backups and review generated security guidance before acting on it." },
  { title: "Before public launch", text: "This starter document is not legal advice. Replace it with terms reviewed for your organization, jurisdiction, billing model, data processing, and support commitments before offering the service publicly." },
];

export default function TermsPage() {
  return <main className="cg-public-theme cg-legal-page min-h-screen px-5 pb-16 text-zinc-200 sm:px-8">
    <header className="cg-legal-header mx-auto flex h-[68px] max-w-7xl items-center justify-between border-b border-white/[.06]"><Link href="/" className="flex items-center gap-2.5"><span className="cg-brand-mark grid size-8 place-items-center rounded-lg text-white"><Shield size={16}/></span><span className="text-sm font-semibold text-white">codeguard<span className="text-cyan-300">.</span>ai</span></Link><Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-zinc-400 transition hover:bg-white/[.05] hover:text-white"><ArrowLeft size={13}/> Back home</Link></header>
    <section className="mx-auto max-w-4xl py-14 sm:py-20">
      <div className="text-center"><span className="section-kicker">Legal · Last updated October 8, 2026</span><h1 className="mt-5 text-4xl font-semibold tracking-[-.06em] text-white sm:text-5xl">Terms of Service</h1><p className="mx-auto mt-4 max-w-2xl text-[13px] leading-6 text-zinc-400">The terms for using the CodeGuard product preview.</p></div>
      <div className="mt-10 space-y-3">{sections.map(({ title, text }) => <section key={title} className="rounded-[20px] border border-white/[.07] bg-gradient-to-br from-[#131026]/90 to-[#0c0a17]/90 p-5 sm:p-7"><h2 className="text-[15px] font-semibold text-white">{title}</h2><p className="mt-3 text-[13px] leading-7 text-zinc-400">{text}</p></section>)}</div>
    </section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/[.06] pt-5 text-[10px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 CodeGuard AI</span><div className="flex gap-5"><Link href="/privacy" className="hover:text-zinc-300">Privacy Policy</Link><Link href="/login" className="hover:text-zinc-300">Sign in</Link></div></footer>
  </main>;
}
