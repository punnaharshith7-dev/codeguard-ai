"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, Bot, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, FileCode2, FileUp, Filter, Github, LoaderCircle, LockKeyhole, LogOut, Menu, Plus, Search, Settings2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MotionToast } from "@/components/motion-toast";
import { api } from "@/lib/api";
import type { Finding, FixProposal, Scan, Workspace } from "@/lib/types";

const extensions = ".py,.js,.jsx,.ts,.tsx,.java,.go,.cpp,.cc,.c,.h,.rs,.php,.rb,.cs,.kt,.swift,.vue,.sql,.sh,.yaml,.yml,.tf,.html,.css,.dockerfile,.json,.lock,.mod,.txt,.xml";
const EMPTY_FINDINGS: Finding[] = [];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function FindingRow({ finding, active, onClick }: { finding: Finding; active: boolean; onClick: () => void }) {
  const colors: Record<string, string> = {
    critical: "border-rose-400/20 bg-rose-400/[.08] text-rose-200",
    high: "border-orange-300/20 bg-orange-300/[.07] text-orange-200",
    medium: "border-amber-300/20 bg-amber-300/[.06] text-amber-200",
    low: "border-sky-300/20 bg-sky-300/[.06] text-sky-200",
    info: "border-white/10 bg-white/[.04] text-zinc-300",
  };
  return <button onClick={onClick} className={`cg-finding-row relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition ${active ? "cg-finding-row--active border-purple-400/20 bg-purple-400/[.035]" : "border-white/[.065] bg-white/[.015] hover:border-white/[.13] hover:bg-white/[.035]"}`}>
    <div className="flex items-start gap-3"><span className={`mt-0.5 rounded-md border px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[.08em] ${colors[finding.severity] || colors.info}`}>{finding.severity}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-zinc-200"><span>{finding.title}</span>{finding.status !== "open" && <span className="cg-status-badge rounded border border-white/[.08] bg-white/[.025] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-zinc-500">{finding.status.replace("_", " ")}</span>}</div><div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-600"><span className="max-w-[180px] truncate font-mono text-zinc-400">{finding.file_path}</span><span>line {finding.line}</span><span>{finding.cwe}</span></div></div><ChevronRight size={14} className={`mt-1 shrink-0 ${active ? "text-purple-300" : "text-zinc-700"}`} /></div>
  </button>;
}

function AnimatedNumber({ value, resetKey, className = "" }: { value: number | null; resetKey: string; className?: string }) {
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const currentValue = useRef<number | null>(null);
  const previousKey = useRef(resetKey);

  useEffect(() => {
    if (value === null) {
      currentValue.current = null;
      previousKey.current = resetKey;
      setDisplayValue(null);
      return;
    }

    const from = previousKey.current !== resetKey || currentValue.current === null ? 0 : currentValue.current;
    previousKey.current = resetKey;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentValue.current = value;
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    const duration = 520;
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      currentValue.current = next;
      setDisplayValue(next);
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [resetKey, value]);

  return <span className={className}>{value === null ? "—" : displayValue ?? 0}</span>;
}

export function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceFiles = useRef<Map<string, string>>(new Map());
  const completionTimeout = useRef<number | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedFindingId, setSelectedFindingId] = useState("");
  const [loadingScans, setLoadingScans] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [uploadFileNames, setUploadFileNames] = useState<string[]>([]);
  const [uploadFileCount, setUploadFileCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [toast, setToast] = useState("");
  const [fixing, setFixing] = useState(false);
  const [fixProposal, setFixProposal] = useState<FixProposal | null>(null);
  const [fixError, setFixError] = useState("");
  const [triageReason, setTriageReason] = useState("");
  const [triageStatus, setTriageStatus] = useState<Finding["status"]>("open");
  const [assigneeId, setAssigneeId] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [triageBusy, setTriageBusy] = useState(false);
  const [triageError, setTriageError] = useState("");
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => () => {
    if (completionTimeout.current !== null) window.clearTimeout(completionTimeout.current);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadScans = useCallback(async () => {
    try {
      const history = await api.scans();
      setScans(history);
      const requested = new URLSearchParams(window.location.search).get("scan");
      const targetId = requested && history.some((scan) => scan.id === requested) ? requested : "";
      setSelectedId((current) => targetId || (current && history.some((scan) => scan.id === current) ? current : history[0]?.id || ""));
      if (targetId) {
        setSelectedFindingId(history.find((scan) => scan.id === targetId)?.findings[0]?.id || "");
        window.history.replaceState(null, "", "/dashboard");
      }
    } catch (reason) {
      if (reason instanceof Error) setError(reason.message);
    } finally {
      setLoadingScans(false);
    }
  }, []);

  useEffect(() => { if (user) void loadScans(); }, [user, loadScans]);
  useEffect(() => {
    if (!user) return;
    void Promise.all([api.workspaces(), api.notifications()]).then(([teams, notes]) => {
      setWorkspaces(teams);
      setUnreadNotifications(notes.filter((item) => !item.read).length);
    }).catch(() => undefined);
  }, [user]);

  const selectedScan = scans.find((scan) => scan.id === selectedId) || null;
  const allFindings = selectedScan?.findings ?? EMPTY_FINDINGS;
  const filteredFindings = useMemo(() => allFindings.filter((finding) => {
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || [finding.title, finding.file_path, finding.description, finding.cwe].some((part) => part.toLowerCase().includes(search));
    return matchesSearch && (severity === "all" || finding.severity === severity);
  }).sort((left, right) => {
    const priority: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (priority[left.severity] ?? 5) - (priority[right.severity] ?? 5);
  }), [allFindings, query, severity]);
  const selectedFinding = filteredFindings.find((finding) => finding.id === selectedFindingId) || filteredFindings[0] || null;
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedScan?.workspace_id) || null;
  const canTriage = !selectedScan?.workspace_id || (!!selectedWorkspace && selectedWorkspace.role !== "viewer");
  useEffect(() => {
    setTriageStatus(selectedFinding?.status || "open");
    setTriageReason(selectedFinding?.status_reason || "");
    setAssigneeId(selectedFinding?.assigned_to_user_id || "");
    setTriageError("");
  }, [selectedFinding?.id]);
  const highCount = allFindings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const criticalCount = allFindings.filter((finding) => finding.severity === "critical").length;
  const highOnlyCount = allFindings.filter((finding) => finding.severity === "high").length;
  const mediumCount = allFindings.filter((finding) => finding.severity === "medium").length;
  const lowCount = allFindings.filter((finding) => finding.severity === "low" || finding.severity === "info").length;
  const severityTotal = Math.max(allFindings.length, 1);
  const dependencyCount = allFindings.filter((finding) => finding.rule_id.startsWith("osv.")).length;
  const score = selectedScan ? Math.max(12, 100 - allFindings.reduce((total, finding) => total + (finding.severity === "critical" ? 24 : finding.severity === "high" ? 16 : finding.severity === "medium" ? 8 : 3), 0)) : null;

  const handleFiles = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (!files.length) return;
    if (completionTimeout.current !== null) window.clearTimeout(completionTimeout.current);
    completionTimeout.current = null;
    setScanComplete(false);
    setUploadFileNames(files.slice(0, 8).map((file) => file.name));
    setUploadFileCount(files.length);
    setError("");
    setUploading(true);
    setToast("");
    setFixProposal(null);
    setFixError("");
    try {
      sourceFiles.current = new Map(await Promise.all(files.map(async (file) => [file.name, await file.text()] as const)));
      const result = await api.upload(files);
      setScans((current) => [result, ...current.filter((scan) => scan.id !== result.id)]);
      setSelectedId(result.id);
      setSelectedFindingId(result.findings[0]?.id || "");
      setUploadFileCount(result.file_count);
      setToast(`Review complete · ${result.findings.length} finding${result.findings.length === 1 ? "" : "s"}`);
      setScanComplete(true);
      completionTimeout.current = window.setTimeout(() => {
        setScanComplete(false);
        setUploadFileNames([]);
        setUploadFileCount(0);
        completionTimeout.current = null;
      }, 680);
      if (inputRef.current) inputRef.current.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not scan those files.");
    } finally {
      setUploading(false);
      if (completionTimeout.current === null) { setUploadFileNames([]); setUploadFileCount(0); }
    }
  };

  const generateFix = async (finding: Finding) => {
    if (!selectedScan) return;
    const source = sourceFiles.current.get(finding.file_path);
    if (source === undefined) {
      setFixError("Re-upload this file in the current session to create a patch. Source code is not stored on the server.");
      return;
    }
    setFixing(true);
    setFixError("");
    setFixProposal(null);
    try {
      setFixProposal(await api.generateFix(selectedScan.id, finding.id, source));
    } catch (reason) {
      setFixError(reason instanceof Error ? reason.message : "Could not create a patch proposal.");
    } finally {
      setFixing(false);
    }
  };

  const downloadFixedFile = () => {
    if (!fixProposal) return;
    const url = URL.createObjectURL(new Blob([fixProposal.fixed], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fixProposal.file_path.split("/").pop() || "fixed-source.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Patched file downloaded and ready for review.");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  const deleteSelected = async () => {
    if (!selectedScan) return;
    try {
      await api.deleteScan(selectedScan.id);
      const next = scans.filter((scan) => scan.id !== selectedScan.id);
      setScans(next);
      setSelectedId(next[0]?.id || "");
      setToast("Scan removed from your history");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete scan.");
    }
  };

  const saveTriage = async () => {
    if (!selectedScan || !selectedFinding) return;
    setTriageBusy(true); setTriageError("");
    try {
      const finding = await api.updateFinding(selectedScan.id, selectedFinding.id, {
        status: triageStatus, reason: triageReason, assigned_to_user_id: assigneeId || null,
      });
      setScans((current) => current.map((scan) => scan.id === selectedScan.id
        ? { ...scan, findings: scan.findings.map((item) => item.id === finding.id ? finding : item) }
        : scan));
      setToast("Finding status and ownership saved.");
    } catch (reason) {
      setTriageError(reason instanceof Error ? reason.message : "Could not save finding updates.");
    } finally { setTriageBusy(false); }
  };

  const ignoreRule = async () => {
    if (!selectedScan?.project_id || !selectedFinding) return;
    if (triageReason.trim().length < 5) {
      setTriageError("Add a short reason before ignoring this rule.");
      return;
    }
    setTriageBusy(true); setTriageError("");
    try {
      await api.suppressProjectRule(selectedScan.project_id, selectedFinding.rule_id, triageReason.trim());
      const finding = await api.updateFinding(selectedScan.id, selectedFinding.id, {
        status: "ignored", reason: triageReason.trim(), assigned_to_user_id: assigneeId || null,
      });
      setTriageStatus("ignored");
      setScans((current) => current.map((scan) => scan.id === selectedScan.id
        ? { ...scan, findings: scan.findings.map((item) => item.id === finding.id ? finding : item) }
        : scan));
      setToast(`Rule ${selectedFinding.rule_id} will be ignored on future scans of this project.`);
    } catch (reason) {
      setTriageError(reason instanceof Error ? reason.message : "Could not save the rule suppression.");
    } finally { setTriageBusy(false); }
  };

  if (authLoading || !user) return <main className="grid min-h-screen place-items-center bg-[#080713]"><div className="flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle size={15} className="animate-spin text-purple-400" /> Opening your workspace…</div></main>;

  return <main className="min-h-screen bg-[#080713] text-zinc-100">
    <input ref={inputRef} className="hidden" type="file" multiple accept={extensions} onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && void handleFiles(event.target.files)} />
    {/* Mobile drawer backdrop and sidebar */}
    {mobileSidebarOpen && (
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
    )}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-violet-200/[.08] bg-gradient-to-b from-[#100b20] to-[#080713] px-4 py-5 transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:flex lg:w-[250px]`}>
      <div className="flex items-center justify-between px-2">
        <a href="/dashboard" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white shadow-[0_0_24px_rgba(161,0,247,.26)]"><Shield size={17} /></span><span className="text-[15px] font-semibold tracking-[-.04em]">codeguard<span className="text-fuchsia-400">.</span>ai</span><span className="rounded-full border border-violet-200/15 bg-white/[.035] px-2 py-0.5 text-[8px] font-medium tracking-[.1em] text-violet-200">BETA</span></a>
        <button onClick={() => setMobileSidebarOpen(false)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[.05] hover:text-white lg:hidden" aria-label="Close sidebar"><X size={18} /></button>
      </div>
      <div className="mt-8 px-2.5"><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Workspace</span></div>
      <nav className="mt-3 space-y-1.5">
        <button onClick={() => setMobileSidebarOpen(false)} className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-violet-300/15 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/[.06] px-3 text-left text-[12px] font-medium text-white"><Activity size={15} className="text-violet-200" /> Overview <span className="ml-auto size-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_10px_rgba(232,121,249,.7)]" /></button>
        <button onClick={() => { setMobileSidebarOpen(false); inputRef.current?.click(); }} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[12px] text-zinc-400 transition hover:bg-white/[.045] hover:text-white"><ScanLineIcon /> New review <Plus size={13} className="ml-auto" /></button>
        <a href="/dashboard/projects" className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[12px] text-zinc-400 transition hover:bg-white/[.045] hover:text-white"><Github size={15} /> Projects & team</a>
        <a href="/dashboard/agent" className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[12px] text-zinc-400 transition hover:bg-white/[.045] hover:text-white"><Bot size={15} /> Agent Studio</a>
        <a href="/dashboard/trust" className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[12px] text-zinc-400 transition hover:bg-white/[.045] hover:text-white"><LockKeyhole size={15} /> Trust & integrations</a>
        <a href="/pricing" className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-fuchsia-400/20 bg-gradient-to-r from-violet-600/15 to-fuchsia-600/20 px-3 text-[12px] font-medium text-fuchsia-200 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/25"><Sparkles size={15} className="text-fuchsia-300" /> Upgrade Plans <span className="ml-auto rounded-full bg-fuchsia-500/20 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-200">PRO</span></a>
      </nav>
      <div className="mt-8 flex items-center justify-between px-2.5"><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Recent reviews</span><button onClick={() => loadScans()} title="Refresh history" className="text-zinc-600 transition hover:text-zinc-300"><Activity size={12} /></button></div>
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto">{scans.slice(0, 12).map((scan) => <button key={scan.id} onClick={() => { setSelectedId(scan.id); setFixProposal(null); setFixError(""); setMobileSidebarOpen(false); }} className={`group flex w-full items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition ${selectedId === scan.id ? "bg-white/[.045] text-zinc-200" : "text-zinc-500 hover:bg-white/[.025] hover:text-zinc-300"}`}><FileCode2 size={13} className="mt-0.5 shrink-0 text-zinc-600" /><span className="min-w-0 flex-1"><span className="block truncate text-[11px]">{scan.title}</span><span className="mt-1 block text-[10px] text-zinc-700">{dateLabel(scan.created_at)}</span></span><span className="mt-0.5 text-[10px] text-zinc-600">{scan.findings.length}</span></button>)}</div>
      <div className="border-t border-white/[.065] pt-3"><div className="flex items-center gap-2.5 rounded-lg px-2 py-2"><div className="grid size-7 shrink-0 place-items-center rounded-full border border-purple-400/15 bg-purple-400/[.09] text-[11px] font-semibold text-purple-200">{(user?.username || user?.email || "U").slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium text-zinc-300">{user?.username || "Your workspace"}</div><div className="truncate text-[10px] text-zinc-600">{user?.email}</div></div><button onClick={() => void signOut()} className="rounded-md p-1.5 text-zinc-600 transition hover:bg-white/[.06] hover:text-zinc-200" title="Sign out"><LogOut size={13} /></button></div></div>
    </aside>

    <div className="lg:pl-[250px]">
      <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-white/[.07] bg-[#080713]/85 px-4 backdrop-blur-2xl sm:h-[68px] sm:px-8">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMobileSidebarOpen(true)} className="grid size-9 place-items-center rounded-lg border border-white/[.08] text-zinc-400 transition hover:bg-white/[.06] hover:text-white lg:hidden" aria-label="Open navigation menu">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 text-[12px] text-zinc-500 lg:hidden"><Shield size={15} className="text-purple-300" /> <span className="font-semibold text-zinc-200">codeguard<span className="text-purple-400">.</span>ai</span></div>
          <div className="hidden items-center gap-2 text-[12px] text-zinc-500 lg:flex"><span>Workspace</span><ChevronRight size={12} /><span className="text-zinc-200">Overview</span></div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a href="/pricing" className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/25 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-200 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-600/30">
            <Sparkles size={11} className="text-fuchsia-300" /> Upgrade
          </a>
          <span className="hidden items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-300/[.045] px-3 py-1.5 text-[10px] font-medium text-violet-100 md:flex"><span className="size-1.5 rounded-full bg-emerald-300" /> Scanner ready</span>
          <a href="/dashboard/projects#notifications" className="relative grid size-8 place-items-center rounded-xl text-zinc-500 transition hover:bg-white/[.05] hover:text-zinc-200 sm:size-9" title={`${unreadNotifications} unread notifications`}><Bell size={15}/>{unreadNotifications > 0 && <span className="cg-unread-pulse absolute right-1.5 top-1.5 size-1.5 rounded-full bg-fuchsia-300"/>}</a>
          <button className="hidden sm:grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-white/[.05] hover:text-zinc-200" title="Help"><CircleHelp size={16} /></button>
          <button onClick={() => void signOut()} className="flex items-center gap-1 rounded-lg border border-white/[.08] px-2 py-1.5 text-[10px] text-zinc-400 transition hover:bg-white/[.04] hover:text-zinc-200 sm:gap-1.5 sm:px-2.5 sm:text-[11px] lg:hidden"><LogOut size={12} /><span className="hidden xs:inline">Sign out</span></button>
          <div className="hidden size-8 place-items-center rounded-full border border-violet-300/20 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/25 text-[11px] font-semibold text-white lg:grid">{(user?.username || "U").slice(0, 1).toUpperCase()}</div>
        </div>
      </header>


      <section className="mx-auto max-w-[1500px] px-5 pb-16 pt-10 sm:px-8 sm:pt-12">
        <div data-scroll-reveal="drop" className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><span className="section-kicker">Security overview</span><h1 className="mt-4 text-[34px] font-semibold tracking-[-.055em] text-white sm:text-4xl">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.username?.split(" ")[0] || "there"}<span className="text-fuchsia-400">.</span></h1><p className="mt-2 text-[14px] text-zinc-400">A clear view of your latest code security reviews.</p></div><Button onClick={() => inputRef.current?.click()} disabled={uploading} size="sm" className="h-10 self-start rounded-lg sm:self-auto">{uploading ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />} New review</Button></div>

        {error && <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[.055] px-4 py-3 text-[12px] text-rose-100"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
        {toast && <MotionToast message={toast} onDismiss={() => setToast("")} className="mb-5 rounded-xl border border-purple-400/15 bg-purple-400/[.05] px-4 py-3 text-[12px] text-purple-200"/>}
        {(uploading || scanComplete) && <div role="status" className="scan-progress mb-5 overflow-hidden rounded-xl border border-violet-300/10 bg-violet-300/[.025] px-4 py-3"><div className="flex items-center gap-2 text-[11px] text-violet-100"><span className="cg-scan-pulse grid size-5 place-items-center rounded-full bg-violet-300/[.08]">{scanComplete ? <Check size={13}/> : <LoaderCircle size={13} className="animate-spin"/>}</span>{scanComplete ? `Review complete · ${uploadFileCount} file${uploadFileCount === 1 ? "" : "s"} inspected` : "Inspecting source files and dependency manifests…"}</div>{uploadFileNames.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Files selected for this review">{uploadFileNames.map((fileName, index) => <span key={`${fileName}-${index}`} className="cg-file-chip max-w-full truncate rounded-md border border-violet-300/10 bg-violet-300/[.035] px-2 py-1 text-[9px] text-violet-100/75" title={fileName}>{fileName}</span>)}{uploadFileCount > uploadFileNames.length && <span className="cg-file-chip rounded-md border border-violet-300/10 bg-violet-300/[.035] px-2 py-1 text-[9px] text-violet-100/75">+{uploadFileCount - uploadFileNames.length} more</span>}</div>}<div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className={`scan-progress__bar h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-300 ${scanComplete ? "scan-progress__bar--complete" : "w-1/3"}`}/></div></div>}

        {scans.length > 0 && <div className="mb-4 lg:hidden"><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Recent reviews</label><select aria-label="Select review" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setFixProposal(null); setFixError(""); }} className="h-9 w-full rounded-lg border border-white/[.08] bg-[#120f20] px-3 text-[11px] text-zinc-300 outline-none"><option value="">Choose a review</option>{scans.map((scan) => <option key={scan.id} value={scan.id}>{scan.title} · {dateLabel(scan.created_at)}</option>)}</select></div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card data-scroll-reveal="rise" data-reveal-delay="1" className="relative overflow-hidden p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-[12px] font-medium text-zinc-400">Starter signal</span><svg aria-hidden viewBox="0 0 40 40" className="size-10"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2.5"/><circle className="cg-score-ring" cx="20" cy="20" r="16" fill="none" stroke="url(#scoreGradient)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="100.53" strokeDashoffset={100.53 - 100.53 * (score ?? 0) / 100}/><defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#e879f9"/></linearGradient></defs></svg></div><div className="mt-3 flex items-end gap-2"><AnimatedNumber value={score} resetKey={selectedId} className="cg-count text-[36px] font-semibold tracking-[-.06em] text-white"/><span className="mb-1.5 text-[10px] text-zinc-500">{score === null ? "Run your first review" : "heuristic · out of 100"}</span></div></Card>
          <Card data-scroll-reveal="rise" data-reveal-delay="2" className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-[11px] text-zinc-500">Findings in latest</span><ShieldAlert size={14} className="text-amber-200" /></div><div className="mt-2 flex items-end gap-2"><AnimatedNumber value={selectedScan ? selectedScan.findings.length : null} resetKey={selectedId} className="cg-count text-[36px] font-medium tracking-[-.06em] text-zinc-100"/><span className="mb-1.5 text-[10px] text-zinc-600">{selectedScan ? <><AnimatedNumber value={highCount} resetKey={selectedId}/> high or critical</> : "Nothing scanned yet"}</span></div><div aria-label={`${criticalCount} critical, ${highOnlyCount} high, ${mediumCount} medium, ${lowCount} low or informational findings`} className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/[.06]"><span className="bg-rose-300/80 transition-all duration-700" style={{ width: `${criticalCount / severityTotal * 100}%` }}/><span className="bg-orange-300/75 transition-all duration-700" style={{ width: `${highOnlyCount / severityTotal * 100}%` }}/><span className="bg-amber-300/70 transition-all duration-700" style={{ width: `${mediumCount / severityTotal * 100}%` }}/><span className="bg-sky-300/60 transition-all duration-700" style={{ width: `${lowCount / severityTotal * 100}%` }}/></div></Card>
          <Card data-scroll-reveal="rise" data-reveal-delay="3" className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-[11px] text-zinc-500">Files reviewed</span><Code2 size={14} className="text-sky-200" /></div><div className="mt-2 flex items-end gap-2"><AnimatedNumber value={scans.reduce((sum, scan) => sum + scan.file_count, 0)} resetKey="all-scans" className="cg-count text-[36px] font-medium tracking-[-.06em] text-zinc-100"/><span className="mb-1.5 text-[10px] text-zinc-600">across {scans.length} review{scans.length === 1 ? "" : "s"}</span></div><div className="mt-3 flex h-1 gap-1">{[1, 2, 3, 4, 5, 6, 7].map((index) => <span key={index} className={`flex-1 rounded-full ${scans.length >= index ? "bg-sky-300/50" : "bg-white/[.06]"}`} />)}</div></Card>
          <Card data-scroll-reveal="rise" data-reveal-delay="1" className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-[11px] text-zinc-500">Latest review</span><Clock3 size={14} className="text-zinc-500" /></div><div className="mt-3 truncate text-[13px] font-medium text-zinc-200">{selectedScan ? dateLabel(selectedScan.created_at) : "Ready when you are"}</div><div className="mt-2.5 text-[10px] text-zinc-600">{selectedScan ? `${selectedScan.title}${dependencyCount ? ` · ${dependencyCount} OSV advisories` : " · no dependency alerts"}` : "Your first review takes a moment"}</div></Card>
        </div>

        <div className="mt-6 grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,.78fr)]">
          <Card data-scroll-reveal="rise" className="min-w-0 overflow-hidden">
            <div className="flex flex-col justify-between gap-3 border-b border-white/[.065] px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><div className="flex items-center gap-2 text-[13px] font-medium text-zinc-200"><ShieldCheck size={14} className="text-purple-300" /> Latest review</div><div className="mt-1 text-[11px] text-zinc-600">{selectedScan ? <>{selectedScan.title} <span className="px-1">·</span> {selectedScan.file_count} files <span className="px-1">·</span> {dateLabel(selectedScan.created_at)}</> : "Select source code to create your first review"}</div></div><div className="flex items-center gap-2"><div className="relative min-w-0 flex-1 sm:w-[175px]"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600"/><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 border-white/[.07] bg-white/[.02] pl-8 text-[11px]" placeholder="Search findings" /></div><div className="relative"><Filter size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600"/><select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-8 appearance-none rounded-lg border border-white/[.07] bg-[#120f20] pl-7 pr-6 text-[10px] text-zinc-400 outline-none focus:border-purple-400/30"><option value="all">All</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600"/></div></div></div>
            <div className="min-h-[290px] p-4 sm:p-5">
              {selectedScan && <div className="mb-3 flex justify-end"><a href={`/api/core/scans/${encodeURIComponent(selectedScan.id)}/sarif`} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/[.08] px-2.5 text-[10px] text-zinc-400 transition hover:border-violet-300/20 hover:bg-violet-300/[.04] hover:text-violet-100"><ArrowDownToLine size={11}/> Export SARIF</a></div>}
              {loadingScans ? <div className="space-y-3">{[1,2,3].map((row) => <div key={row} className="h-[66px] animate-pulse rounded-xl bg-white/[.035]" />)}</div> : !selectedScan ? <div className="flex min-h-[270px] flex-col items-center justify-center text-center"><div className="grid size-12 place-items-center rounded-2xl border border-white/[.08] bg-white/[.025] text-zinc-500"><FileCode2 size={19}/></div><div className="mt-4 text-[13px] font-medium text-zinc-300">Your first review starts here</div><p className="mt-1.5 max-w-[300px] text-[11px] leading-5 text-zinc-600">Upload a few source files to check for common security risks. Source is analyzed in memory.</p><Button onClick={() => inputRef.current?.click()} size="sm" className="mt-4 h-8"><FileUp size={13}/> Choose files</Button><a href="/dashboard/projects" className="mt-3 text-[10px] text-violet-200 hover:text-white">Connect a repository</a></div> : allFindings.length === 0 ? <div className="flex min-h-[260px] flex-col items-center justify-center text-center"><span className="grid size-10 place-items-center rounded-xl border border-purple-400/15 bg-purple-400/[.06] text-purple-300"><Check size={17}/></span><div className="mt-3 text-[13px] font-medium text-zinc-200">No findings from this review</div><p className="mt-1 text-[11px] text-zinc-600">The source and dependency checks did not flag a supported pattern.</p></div> : filteredFindings.length === 0 ? <div className="grid min-h-[220px] place-items-center text-[12px] text-zinc-600">No findings match these filters.</div> : <div className="finding-list space-y-2">{filteredFindings.map((finding) => <FindingRow key={finding.id} finding={finding} active={selectedFinding?.id === finding.id} onClick={() => { setSelectedFindingId(finding.id); setFixProposal(null); setFixError(""); }} />)}</div>}
            </div>
            {selectedScan && <div className="flex items-center justify-between border-t border-white/[.065] px-4 py-3 text-[10px] text-zinc-600 sm:px-5"><span>Showing {filteredFindings.length} of {allFindings.length} findings</span>{(!selectedScan.workspace_id || selectedWorkspace?.role === "owner" || selectedWorkspace?.role === "admin") && <button onClick={() => void deleteSelected()} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-zinc-600 transition hover:bg-rose-300/[.06] hover:text-rose-200"><Trash2 size={11}/> Delete review</button>}</div>}
          </Card>

          <Card data-scroll-reveal="rise" data-reveal-delay="1" className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[.065] px-4 py-4 sm:px-5"><div><div className="flex items-center gap-2 text-[13px] font-medium text-zinc-200"><Sparkles size={14} className="text-purple-300"/> Finding details</div><div className="mt-1 text-[11px] text-zinc-600">Context for the issue you selected</div></div><button type="button" onClick={() => setDetailsExpanded((expanded) => !expanded)} aria-expanded={detailsExpanded} aria-label={detailsExpanded ? "Collapse finding details" : "Expand finding details"} className="grid size-7 place-items-center rounded-lg text-zinc-600 transition hover:bg-white/[.05] hover:text-zinc-300"><ChevronDown size={15} className={`transition-transform duration-200 ${detailsExpanded ? "" : "-rotate-90"}`}/></button></div>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${detailsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="min-h-0 overflow-hidden">
            {selectedFinding ? <div key={selectedFinding.id} className="p-4 sm:p-5 cg-reveal">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-amber-300/20 bg-amber-300/[.07] px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] text-amber-200">{selectedFinding.severity}</span><span className="rounded-md border border-white/[.08] px-2 py-1 text-[10px] text-zinc-500">{selectedFinding.cwe}</span><span className="rounded-md border border-white/[.08] px-2 py-1 text-[10px] text-zinc-500">{selectedFinding.confidence}% confidence</span></div>
              <h2 className="mt-4 text-[16px] font-medium tracking-[-.03em] text-zinc-100">{selectedFinding.title}</h2><div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500"><FileCode2 size={12}/><span className="max-w-[220px] truncate font-mono text-zinc-300">{selectedFinding.file_path}</span><span>:{selectedFinding.line}</span></div>
              <p className="mt-4 text-[12px] leading-[1.8] text-zinc-400">{selectedFinding.description}</p>
              {selectedFinding.attack_path.length > 0 ? <div className="mt-4 rounded-xl border border-orange-300/15 bg-orange-300/[.035] p-3"><div className="text-[11px] font-medium text-orange-100">Candidate attack path <span className="ml-1 text-zinc-600">heuristic evidence</span></div><div className="mt-2 space-y-2">{selectedFinding.attack_path.map((step, index) => <div key={`${step.file_path}:${step.line}:${index}`} className="cg-attack-step flex gap-2 text-[10px]"><span className="mt-0.5 text-orange-200">{step.kind === "source" ? "SOURCE" : "SINK"}</span><span className="min-w-0"><span className="font-mono text-zinc-300">{step.file_path}:{step.line}</span><span className="mt-0.5 block break-words text-zinc-500">{step.evidence}</span></span></div>)}</div></div> : selectedFinding.reachability === "no_source_observed" ? <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-[10px] leading-5 text-zinc-500">No matching input source was observed by the heuristic scan. This does not prove the code is unreachable.</div> : null}
              <div className="mt-4 overflow-hidden rounded-xl border border-white/[.07] bg-[#080713]"><div className="flex items-center justify-between border-b border-white/[.05] px-3 py-2 text-[10px] text-zinc-600"><span>Source context</span><span>Line {selectedFinding.line}</span></div><pre className="overflow-x-auto px-3 py-3 text-[11px] leading-5 text-amber-100/80"><code>{selectedFinding.snippet}</code></pre></div>
              {canTriage && <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.015] p-3"><div className="text-[11px] font-medium text-zinc-300">Finding workflow</div><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-[9px] uppercase tracking-wide text-zinc-600">Status<select value={triageStatus} onChange={(event) => setTriageStatus(event.target.value as Finding["status"])} className="mt-1 h-8 w-full rounded-lg border border-white/[.08] bg-[#100d1c] px-2 text-[10px] normal-case tracking-normal text-zinc-200 outline-none"><option value="open">Open</option><option value="fixed">Fixed</option><option value="accepted_risk">Accepted risk</option><option value="false_positive">False positive</option><option value="ignored">Ignored</option></select></label><label className="text-[9px] uppercase tracking-wide text-zinc-600">Owner<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-white/[.08] bg-[#100d1c] px-2 text-[10px] normal-case tracking-normal text-zinc-200 outline-none"><option value="">Unassigned</option><option value={user.id}>Me · {user.username}</option>{selectedWorkspace?.members.filter((member) => member.user_id !== user.id).map((member) => <option key={member.user_id} value={member.user_id}>{member.username} · {member.role}</option>)}</select></label></div><Input value={triageReason} onChange={(event) => setTriageReason(event.target.value)} maxLength={1000} className="mt-2 h-8 text-[10px]" placeholder="Reason for accepting, ignoring, or closing (required for dismissals)"/>{triageError && <div role="alert" className="mt-2 text-[10px] text-rose-200">{triageError}</div>}<div className="mt-2 flex flex-wrap justify-end gap-2">{selectedScan?.project_id && <Button variant="ghost" size="sm" onClick={() => void ignoreRule()} disabled={triageBusy} className="h-7 text-[9px]">Ignore rule on future scans</Button>}<Button variant="secondary" size="sm" onClick={() => void saveTriage()} disabled={triageBusy} className="h-7 text-[9px]">{triageBusy ? <LoaderCircle size={11} className="animate-spin"/> : <Check size={11}/>} Save status</Button></div></div>}
              {fixError && <div role="alert" className="mt-3 rounded-lg border border-rose-300/15 bg-rose-300/[.04] p-2.5 text-[10px] leading-5 text-rose-100">{fixError}</div>}
              {fixProposal && fixProposal.file_path === selectedFinding.file_path && <div className="cg-result-toast mt-4 rounded-xl border border-white/[.08] bg-white/[.02] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-[11px] font-medium text-zinc-200">{fixProposal.verified ? "Static verification passed" : "Patch needs review"}</div><Button variant="secondary" size="sm" onClick={downloadFixedFile} className="h-7 text-[10px]"><ArrowDownToLine size={12}/> Download file</Button></div><p className="mt-2 text-[10px] leading-5 text-zinc-500">{fixProposal.explanation}</p><div className={`mt-2 rounded-md px-2 py-1.5 text-[10px] ${fixProposal.verified ? "bg-purple-400/[.05] text-purple-200" : "bg-amber-300/[.05] text-amber-100"}`}>{fixProposal.verification}</div><p className="mt-2 text-[9px] text-zinc-600">Static checks only; uploaded code is never executed.</p><pre className="mt-3 max-h-52 overflow-auto rounded-lg border border-white/[.07] bg-[#080713] p-2 text-[10px] leading-5">{fixProposal.diff.split("\n").map((line, index) => <span key={index} className={`cg-diff-line block ${line.startsWith("+") && !line.startsWith("+++") ? "text-purple-300" : line.startsWith("-") && !line.startsWith("---") ? "text-rose-200" : "text-zinc-500"}`}>{line || " "}</span>)}</pre></div>}
              {canTriage && <div className="mt-4 flex gap-2"><Button variant="secondary" size="sm" onClick={() => void generateFix(selectedFinding)} disabled={fixing} className="h-8 flex-1 text-[10px]">{fixing ? <LoaderCircle size={12} className="animate-spin"/> : <Sparkles size={12}/>} {fixing ? "Preparing patch…" : "Generate & verify patch"}</Button></div>}
            </div> : <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center"><span className="grid size-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-zinc-600"><Sparkles size={16}/></span><div className="mt-3 text-[12px] font-medium text-zinc-400">Your finding context appears here</div><p className="mt-1.5 max-w-[250px] text-[11px] leading-5 text-zinc-600">Choose a finding to see its location, explanation, and confidence.</p></div>}
            </div></div>
          </Card>
        </div>

        <div data-scroll-reveal="rise" className="mt-5 grid gap-3 md:grid-cols-3">
          <a href="/dashboard/agent" className="group rounded-2xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-purple-400/20 hover:bg-purple-400/[.025]"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><Bot size={14} className="text-purple-300"/> Safe Agent Studio</div><p className="mt-2 text-[10px] leading-5 text-zinc-500">Ask, plan, and propose multi-file edits. Changes stay in preview until you download them.</p><div className="mt-2 text-[10px] text-purple-200">Open agent <ArrowUpRight size={11} className="ml-1 inline"/></div></a>
          <a href="/dashboard/trust" className="group rounded-2xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-purple-400/20 hover:bg-purple-400/[.025]"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><Github size={14} className="text-zinc-300"/> Pull request security gate</div><p className="mt-2 text-[10px] leading-5 text-zinc-500">Connect a GitHub App to annotate changed lines and fail checks on high-risk findings.</p><div className="mt-2 text-[10px] text-purple-200">Integration settings <ArrowUpRight size={11} className="ml-1 inline"/></div></a>
          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><ShieldCheck size={14} className="text-sky-200"/> Dependency intelligence</div><p className="mt-2 text-[10px] leading-5 text-zinc-500">Pinned packages in supported manifests are checked against OSV advisories during each scan.</p><div className="mt-2 text-[10px] text-zinc-600">{dependencyCount} advisories in this review</div></div>
        </div>
        <div data-scroll-reveal="rise" onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={onDrop} className={`mt-5 rounded-2xl border border-dashed px-5 py-5 transition ${dragging ? "border-purple-400/50 bg-purple-400/[.055]" : "border-white/[.09] bg-white/[.012] hover:border-white/[.16]"}`}>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-xl border ${dragging ? "border-purple-400/20 bg-purple-400/[.08] text-purple-300" : "border-white/[.08] bg-white/[.025] text-zinc-500"}`}><UploadCloud size={16}/></span><div><div className="text-[12px] font-medium text-zinc-300">{dragging ? "Drop files to start your review" : "Have another change to review?"}</div><div className="mt-1 text-[10px] text-zinc-600">Drop files here or browse · up to 25 files, 2 MB total</div></div></div><Button variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="h-8"><FileUp size={12}/>{uploading ? "Reviewing…" : "Browse files"}</Button></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-700"><span className="flex items-center gap-1.5"><LockKeyholeIcon/> Upload contents are analyzed in memory and not stored.</span><span>Starter scanner · Findings need human review</span></div>
      </section>
    </div>
  </main>;
}

function ScanLineIcon() { return <ShieldCheck size={14} />; }
function LockKeyholeIcon() { return <ShieldCheck size={11} />; }
