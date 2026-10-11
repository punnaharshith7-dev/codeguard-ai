"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Check, CircleStop, Clock3, FileCode2, LoaderCircle, Play, RotateCcw, ShieldCheck, Sparkles, UploadCloud, WandSparkles, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { AgentAuditEntry, AgentFile, AgentMode, AgentResult } from "@/lib/types";

type WorkspaceFile = AgentFile & { original: string; createdByAgent?: boolean };
const accepted = ".py,.js,.jsx,.ts,.tsx,.java,.go,.cpp,.cc,.c,.h,.rs,.php,.rb,.cs,.kt,.swift,.vue,.sql,.sh,.yaml,.yml,.tf,.html,.css,.json,.toml,.xml,.md,.txt";

export function AgentWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceFile[]>([]);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AgentMode>("ask");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [history, setHistory] = useState<AgentAuditEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadHistory = useCallback(async () => {
    try { setHistory(await api.agentHistory()); } catch { /* history is optional when the provider is not yet configured */ }
  }, []);

  useEffect(() => { if (user) void loadHistory(); }, [user, loadHistory]);

  const loadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    setError("");
    try {
      const files = await Promise.all(selected.slice(0, 25).map(async (file) => {
        const content = await file.text();
        return { path: file.webkitRelativePath || file.name, content, original: content };
      }));
      setWorkspace(files);
      setResult(null);
      setApplied(false);
      if (files.length) setNotice(`${files.length} file${files.length === 1 ? "" : "s"} loaded in this browser session`);
    } catch {
      setError("Some files could not be read as UTF-8 text. Choose source files rather than binaries.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const run = async () => {
    if (!prompt.trim() || !workspace.length) return;
    setRunning(true);
    setError("");
    setNotice("");
    setResult(null);
    setApplied(false);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const answer = await api.agent(mode, prompt.trim(), workspace.map(({ path, content }) => ({ path, content })), controller.signal);
      setResult(answer);
      setNotice(`${answer.input_tokens + answer.output_tokens} tokens used · ${answer.remaining_tokens} remain today`);
      await loadHistory();
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") setNotice("Stopped. The workspace was not modified.");
      else setError(reason instanceof Error ? reason.message : "The agent request failed.");
    } finally {
      setRunning(false);
      controllerRef.current = null;
    }
  };

  const applyEdits = () => {
    if (!result?.edits.length) return;
    setWorkspace((current) => {
      const next = [...current];
      for (const edit of result.edits) {
        const index = next.findIndex((file) => file.path === edit.path);
        if (index >= 0) next[index] = { ...next[index], content: edit.content };
        else next.push({ ...edit, original: "", createdByAgent: true });
      }
      return next;
    });
    setApplied(true);
    setNotice("Edits applied to the in-browser workspace only. Download files to keep them.");
  };

  const undoEdits = () => {
    setWorkspace((current) => current.filter((file) => !file.createdByAgent).map((file) => ({ ...file, content: file.original })));
    setApplied(false);
    setNotice("Restored the original in-browser workspace.");
  };

  const downloadFile = (file: AgentFile) => {
    const url = URL.createObjectURL(new Blob([file.content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.path.split("/").pop() || "agent-edit.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || !user) return <main className="grid min-h-screen place-items-center bg-[#080713] text-zinc-400"><LoaderCircle className="animate-spin" size={16}/></main>;

  return <main className="min-h-screen bg-[#080713] text-zinc-100">
    <input ref={inputRef} type="file" multiple accept={accepted} className="hidden" onChange={loadFiles}/>
    <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-white/[.07] bg-[#080713]/75 px-5 backdrop-blur-2xl sm:px-8">
      <a href="/dashboard" className="flex items-center gap-2.5 text-[13px] font-medium text-zinc-300 transition hover:text-white"><ArrowLeft size={14}/> CodeGuard workspace</a>
      <span className="flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/[.045] px-3 py-1.5 text-[12px] font-medium text-violet-100"><ShieldCheck size={12}/> Preview-first agent</span>
    </header>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div data-scroll-reveal="drop" className="mx-auto mb-10 max-w-3xl text-center"><span className="section-kicker"><Bot size={13}/> Agent Studio</span><h1 className="mt-5 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Work with your code, safely.</h1><p className="mx-auto mt-3 max-w-2xl text-[13px] leading-6 text-zinc-400 sm:text-[15px]">Ask questions, plan a change, or review a proposed edit. The agent has no terminal or network tools, and it never writes to your files.</p></div>
      {error && <div role="alert" className="mb-4 flex justify-between rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-3 text-[12px] text-rose-100">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={14}/></button></div>}
      {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-purple-400/15 bg-purple-400/[.04] p-3 text-[12px] text-purple-200"><Check size={13}/>{notice}</div>}
      {running && <div role="status" className="cg-result-toast mb-4 flex items-center gap-3 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-4 py-3 text-[11px] text-violet-100"><span className="cg-scan-pulse grid size-7 place-items-center rounded-full bg-violet-300/[.08]"><Sparkles size={13} className="cg-orbiting"/></span><span>Working on your request…</span><span aria-hidden className="ml-auto flex gap-1"><i className="cg-working-dot size-1.5 rounded-full bg-violet-200"/><i className="cg-working-dot size-1.5 rounded-full bg-violet-200"/><i className="cg-working-dot size-1.5 rounded-full bg-violet-200"/></span></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.65fr)]">
        <Card data-scroll-reveal="rise" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-4 py-4 sm:px-5"><div className="flex gap-1 rounded-xl border border-white/[.07] bg-black/20 p-1">{(["ask", "plan", "edit"] as const).map((item) => <button key={item} onClick={() => { setMode(item); setResult(null); }} className={`rounded-lg px-3 py-1.5 text-[12px] capitalize transition ${mode === item ? "bg-purple-400 text-zinc-950" : "text-zinc-500 hover:text-white"}`}>{item}</button>)}</div><Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} className="h-8"><UploadCloud size={13}/> {workspace.length ? `${workspace.length} files · Change` : "Add source files"}</Button></div>
          <div className="p-4 sm:p-5"><label className="mb-2 block text-[12px] font-medium text-zinc-300">What should the agent do?</label><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={8000} rows={4} placeholder={mode === "ask" ? "Explain how authentication flows through these files…" : mode === "plan" ? "Plan a safe refactor of the request validation…" : "Add input validation and improve error handling…"} className="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0914] p-3 text-[12px] leading-6 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-purple-400/30"/>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-zinc-600">{workspace.length ? `${workspace.length} context files · held in browser memory` : "Choose up to 25 UTF-8 source files, up to 2 MB total"}</span><div className="flex gap-2">{running ? <Button variant="danger" size="sm" onClick={() => controllerRef.current?.abort()} className="h-9"><CircleStop size={13}/> Stop</Button> : <Button size="sm" onClick={() => void run()} disabled={!prompt.trim() || !workspace.length} className="h-9"><Play size={13}/> Run {mode}</Button>}</div></div>
          </div>
          {workspace.length > 0 && <div className="border-t border-white/[.06] px-4 py-3 sm:px-5"><div className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-zinc-600">Workspace context</div><div className="flex flex-wrap gap-2">{workspace.map((file) => <span data-scroll-reveal="scale" key={file.path} className="flex max-w-full items-center gap-1.5 rounded-lg border border-white/[.07] bg-white/[.02] px-2 py-1.5 text-[11px] text-zinc-400"><FileCode2 size={11}/><span className="max-w-52 truncate font-mono">{file.path}</span><span className="text-zinc-700">{file.content.length.toLocaleString()} chars</span></span>)}</div></div>}
          {result && <div data-scroll-reveal="rise" className="border-t border-white/[.07] p-4 sm:p-5"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><Sparkles size={13} className="text-purple-300"/>{mode === "edit" ? "Change proposal" : mode === "plan" ? "Implementation plan" : "Answer"}</div><div className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-zinc-300">{result.answer}</div>
            {result.edits.length > 0 && <div className="mt-4 space-y-3">{result.edits.map((edit) => <div data-scroll-reveal="rise" key={edit.path} className="overflow-hidden rounded-xl border border-white/[.08]"><div className="flex items-center justify-between border-b border-white/[.06] px-3 py-2"><span className="font-mono text-[11px] text-zinc-300">{edit.path}</span><Button variant="ghost" size="sm" onClick={() => downloadFile(edit)} className="h-7 text-[11px]">Download proposal</Button></div><pre className="max-h-64 overflow-auto bg-[#0a0914] p-3 text-[11px] leading-5 text-purple-200/80"><code>{edit.content}</code></pre></div>)}<div className="flex flex-wrap gap-2">{!applied ? <Button size="sm" onClick={applyEdits} className="h-8"><WandSparkles size={12}/> Apply to browser workspace</Button> : <Button variant="secondary" size="sm" onClick={undoEdits} className="h-8"><RotateCcw size={12}/> Undo edits</Button>}<span className="self-center text-[11px] text-zinc-600">Nothing is saved to your computer until you download.</span></div></div>}
          </div>}
        </Card>
        <div className="space-y-4">
          <Card data-scroll-reveal="rise" data-reveal-delay="1" className="p-4"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><ShieldCheck size={13} className="text-purple-300"/> Safety boundaries</div><ul className="mt-3 space-y-2 text-[11px] leading-5 text-zinc-500"><li>• Source is sent to your configured provider only after consent.</li><li>• No terminal, network, or automatic repository writes.</li><li>• Edit mode returns a reviewable proposal; undo restores the original browser copy.</li><li>• Prompts, file content, and responses are not stored in the audit log.</li></ul><a href="/dashboard/trust" className="mt-3 inline-flex text-[11px] text-purple-200 hover:text-purple-300">Review Trust Center <ArrowLeft className="ml-1 rotate-180" size={11}/></a></Card>
          <Card data-scroll-reveal="rise" data-reveal-delay="2" className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><Clock3 size={13}/> Recent agent actions</div><button onClick={() => void loadHistory()} className="text-[11px] text-zinc-600 hover:text-zinc-300">Refresh</button></div>{history.length ? <div className="mt-3 space-y-2">{history.slice(0, 8).map((entry) => <div data-scroll-reveal="rise" key={entry.id} className="flex items-start justify-between gap-2 border-t border-white/[.05] pt-2"><span className="text-[11px] capitalize text-zinc-400">{entry.mode} · {entry.outcome}<span className="mt-1 block text-zinc-700">{new Date(entry.created_at).toLocaleString()}</span></span><span className="text-right text-[10px] text-zinc-600">{entry.input_tokens + entry.output_tokens} tokens<br/>{entry.proposed_files} proposed files</span></div>)}</div> : <p className="mt-3 text-[11px] leading-5 text-zinc-600">No actions yet. Audit entries record mode and token counts, never source code.</p>}</Card>
        </div>
      </div>
    </section>
  </main>;
}
