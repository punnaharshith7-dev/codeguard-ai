import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

const sections = [
  { title: "Information we process", text: "Account email, display name, and authentication identifiers are used to operate your account. For code review, uploaded source files are processed in memory by the configured scanner. The initial version does not save source contents. Scan titles, file paths, and finding snippets are stored to show your private review history." },
  { title: "How information is used", text: "Information is used to provide sign-in, scan history, and security findings. The starter product does not sell personal data. Administrators and infrastructure providers may process information as needed to operate and secure the service." },
  { title: "Retention and controls", text: "You can delete individual scans from your dashboard. Account deletion and formal data export controls are not yet implemented in this preview. Do not upload regulated or highly sensitive source code until your organization has reviewed the deployment and retention configuration." },
  { title: "Contact", text: "Replace this section with your organization’s privacy contact and legal entity before public production launch." },
];

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#080713] px-5 pb-16 text-zinc-200 sm:px-8">
    <header className="mx-auto flex h-[68px] max-w-7xl items-center justify-between border-b border-white/[.06]"><Link href="/" className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white"><Shield size={16}/></span><span className="text-sm font-semibold text-white">codeguard<span className="text-fuchsia-400">.</span>ai</span></Link><Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-zinc-400 transition hover:bg-white/[.05] hover:text-white"><ArrowLeft size={13}/> Back home</Link></header>
    <section className="mx-auto max-w-4xl py-14 sm:py-20">
      <div className="text-center"><span className="section-kicker">Legal · Last updated October 8, 2026</span><h1 className="mt-5 text-4xl font-semibold tracking-[-.06em] text-white sm:text-5xl">Privacy Policy</h1><p className="mx-auto mt-4 max-w-2xl text-[13px] leading-6 text-zinc-400">How CodeGuard handles account information, source code, and review history.</p></div>
      <div className="mt-10 space-y-3">{sections.map(({ title, text }) => <section key={title} className="rounded-[20px] border border-white/[.07] bg-gradient-to-br from-[#131026]/90 to-[#0c0a17]/90 p-5 sm:p-7"><h2 className="text-[15px] font-semibold text-white">{title}</h2><p className="mt-3 text-[13px] leading-7 text-zinc-400">{text}</p></section>)}</div>
    </section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/[.06] pt-5 text-[10px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 CodeGuard AI</span><div className="flex gap-5"><Link href="/terms" className="hover:text-zinc-300">Terms of Service</Link><Link href="/login" className="hover:text-zinc-300">Sign in</Link></div></footer>
  </main>;
}
