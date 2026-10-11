"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { ArrowLeft, Check, CircleAlert, Github, KeyRound, LoaderCircle, LockKeyhole, Save, ServerCog, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { TrustSettings } from "@/lib/types";

export function TrustCenter() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<TrustSettings | null>(null);
  const [draft, setDraft] = useState({ share_code_with_remote_ai: false, history_retention_days: 90, daily_token_budget: 20000 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    void api.trust().then((value) => {
      setSettings(value);
      setDraft({ share_code_with_remote_ai: value.share_code_with_remote_ai, history_retention_days: value.history_retention_days, daily_token_budget: value.daily_token_budget });
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load privacy settings."));
  }, [user]);

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      const value = await api.updateTrust(draft);
      setSettings(value);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save trust settings.");
    } finally { setBusy(false); }
  };

  const setBudget = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) setDraft((current) => ({ ...current, daily_token_budget: Math.min(200000, Math.max(1000, Math.round(value))) }));
  };

  if (loading || !user || !settings) return <main className="grid min-h-screen place-items-center bg-[#080713] text-zinc-400">{error ? <div role="alert" className="text-sm text-rose-200">{error}</div> : <LoaderCircle className="animate-spin" size={16}/>}</main>;

  return <main className="min-h-screen bg-[#080713] text-zinc-100">
    <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-white/[.07] bg-[#080713]/75 px-5 backdrop-blur-2xl sm:px-8"><a href="/dashboard" className="flex items-center gap-2.5 text-[14px] font-medium text-zinc-300 transition hover:text-white"><ArrowLeft size={14}/> CodeGuard workspace</a><span className="flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/[.045] px-3 py-1.5 text-[12px] font-medium text-violet-100"><LockKeyhole size={12}/> Trust Center</span></header>
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div data-scroll-reveal="drop" className="mx-auto mb-10 max-w-3xl text-center"><span className="section-kicker"><ShieldCheck size={13}/> Privacy & integrations</span><h1 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">You control what leaves your workspace.</h1><p className="mx-auto mt-3 max-w-2xl text-[13px] leading-6 text-zinc-400 sm:text-[15px]">Source files are analyzed in memory and are not stored. Scan findings and snippets are retained according to your setting. AI providers and GitHub Apps are configured server-side.</p></div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-3 text-[11px] text-rose-100">{error}</div>}
      {saved && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-purple-400/15 bg-purple-400/[.04] p-3 text-[12px] text-purple-200"><Check size={13}/> Trust settings saved.</div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[14px] font-medium text-zinc-100"><LockKeyhole size={14} className="text-purple-300"/> Data & AI controls</div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3.5"><input type="checkbox" checked={draft.share_code_with_remote_ai} onChange={(event) => setDraft((current) => ({ ...current, share_code_with_remote_ai: event.target.checked }))} className="mt-0.5 accent-purple-400"/><span><span className="block text-[12px] font-medium text-zinc-200">Allow configured remote AI to receive source code</span><span className="mt-1 block text-[11px] leading-5 text-zinc-500">Off by default. Local Ollama does not require this permission. API keys remain on the backend.</span></span></label>
          <label className="mt-4 block text-[12px] font-medium text-zinc-300">Scan history retention</label><select value={draft.history_retention_days} onChange={(event) => setDraft((current) => ({ ...current, history_retention_days: Number(event.target.value) }))} className="mt-2 h-10 w-full rounded-lg border border-white/[.08] bg-[#080713] px-3 text-[12px] text-zinc-200 outline-none focus:border-purple-400/30"><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>365 days</option><option value={0}>Keep until I delete it</option></select><p className="mt-1.5 text-[11px] leading-5 text-zinc-600">Expired scan records are removed when you open scan history. Raw source files are never retained.</p>
          <label className="mt-4 block text-[12px] font-medium text-zinc-300">Daily AI token budget</label>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            <input type="range" min={1000} max={100000} step={1000} value={Math.min(draft.daily_token_budget, 100000)} onChange={setBudget} className="w-full sm:flex-1 accent-purple-400"/>
            <input type="number" min={1000} max={200000} step={1000} value={draft.daily_token_budget} onChange={setBudget} className="h-9 w-full sm:w-28 rounded-lg border border-white/[.08] bg-[#080713] px-2 text-left sm:text-right text-[12px] text-zinc-200 outline-none"/>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">The agent caps provider output to the remaining budget. Daily usage is counted over a rolling 24-hour window.</p>
          <Button onClick={() => void save()} disabled={busy} className="mt-5 h-9">{busy ? <LoaderCircle size={13} className="animate-spin"/> : <Save size={13}/>} Save controls</Button>
        </Card>
        <div className="space-y-4">
          <Card className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[14px] font-medium text-zinc-100"><ServerCog size={14} className="text-sky-200"/> AI provider</div><span className={`rounded-md border px-2 py-1 text-[10px] ${settings.ai_provider_configured ? "border-purple-400/15 bg-purple-400/[.04] text-purple-200" : "border-amber-300/15 bg-amber-300/[.04] text-amber-100"}`}>{settings.ai_provider_configured ? "READY" : "NOT CONFIGURED"}</span></div>
            {settings.ai_provider_configured ? <p className="mt-3 text-[12px] leading-5 text-zinc-400">{settings.ai_provider} · {settings.ai_model}{settings.ai_provider_is_local ? " · local" : " · remote"}</p> : <p className="mt-3 text-[11px] leading-5 text-zinc-500">Set <code className="text-zinc-300">LLM_PROVIDER</code>, <code className="text-zinc-300">LLM_MODEL</code>, and a server-side key in the root <code className="text-zinc-300">.env</code>, then restart the backend. Supported providers: OpenAI, Anthropic, Groq, DeepSeek, and Ollama.</p>}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[.06] bg-white/[.02] p-2.5 text-[10px] leading-5 text-zinc-600"><KeyRound size={11} className="mt-0.5 shrink-0"/> Never put an AI provider key in the frontend or paste it into the agent prompt.</div>
          </Card>
          <Card className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[14px] font-medium text-zinc-100"><Github size={14}/> GitHub PR security gate</div><span className={`rounded-md border px-2 py-1 text-[10px] ${settings.github_pr_gate_configured ? "border-purple-400/15 bg-purple-400/[.04] text-purple-200" : "border-amber-300/15 bg-amber-300/[.04] text-amber-100"}`}>{settings.github_pr_gate_configured ? "SERVER READY" : "SETUP NEEDED"}</span></div>
            <p className="mt-3 text-[11px] leading-5 text-zinc-500">GitHub OAuth signs users in. This separate GitHub App reads changed pull-request files and posts a CodeGuard check with annotations; configure it only for repositories you choose.</p>
            <details className="mt-3 rounded-lg border border-white/[.07] bg-white/[.015] p-3"><summary className="cursor-pointer text-[11px] font-medium text-zinc-300">Show GitHub App setup</summary><ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-5 text-zinc-500"><li>Create a GitHub App with repository contents: read and checks: write permissions.</li><li>Subscribe to pull_request events: opened, reopened, synchronize, ready_for_review.</li><li>Set its webhook URL to <code className="break-all text-zinc-300">https://YOUR-API-HOST/api/v1/github/webhook</code> and generate a webhook secret.</li><li>Set <code className="text-zinc-300">GITHUB_APP_ID</code>, <code className="text-zinc-300">GITHUB_APP_PRIVATE_KEY</code>, and <code className="text-zinc-300">GITHUB_WEBHOOK_SECRET</code> on the backend, then install the app on selected repositories.</li><li>Mark “CodeGuard Security Gate” as a required status check in repository branch protection to block high/critical findings.</li></ol></details>
          </Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-[14px] font-medium text-zinc-100"><CircleAlert size={14} className="text-orange-200"/> What we retain</div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg border border-purple-400/10 bg-purple-400/[.025] p-2.5 text-purple-200">Never stored<span className="mt-1 block text-zinc-500">Uploaded source, agent prompts, generated full files</span></div><div className="rounded-lg border border-white/[.07] bg-white/[.02] p-2.5 text-zinc-300">History only<span className="mt-1 block text-zinc-500">Findings, redacted snippets, token counts, action metadata</span></div></div><div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-600"><Check size={10}/> Agent actions are auditable without saving your code.</div></Card>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-[10px] text-zinc-700"><ShieldCheck size={11}/> Security settings are account-scoped. Changing retention affects scan history loaded after the next request.</div>
    </section>
  </main>;
}
