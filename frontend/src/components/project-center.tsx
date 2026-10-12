"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, Bell, Check, Clock3, FileCode2, Github, GitCompareArrows, LoaderCircle, Plus, ScanLine, ShieldAlert, ShieldCheck, Trash2, UploadCloud, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MotionToast } from "@/components/motion-toast";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { useCountUp } from "@/lib/motion/hooks";
import type { Notification, Project, RuleSuppression, ScanComparison, Workspace } from "@/lib/types";

const selectStyle = "h-10 w-full rounded-lg border border-white/[.08] bg-[#100d1c] px-3 text-[12px] text-zinc-200 outline-none transition focus:border-violet-400/35";

function AnimatedCount({ value, resetKey }: { value: number; resetKey: string }) {
  const count = useCountUp(value, { duration: "slow", resetKey });
  return <span className="cg-count inline-block tabular-nums">{Math.round(count)}</span>;
}

export function ProjectCenter() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [suppressionRows, setSuppressionRows] = useState<RuleSuppression[]>([]);
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [scheduleHours, setScheduleHours] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [threshold, setThreshold] = useState<Project["pr_fail_severity"]>("high");
  const [workspaceName, setWorkspaceName] = useState("");
  const [memberWorkspaceId, setMemberWorkspaceId] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [suppressionRule, setSuppressionRule] = useState("");
  const [suppressionReason, setSuppressionReason] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadFileNames, setUploadFileNames] = useState<string[]>([]);
  const [uploadFileCount, setUploadFileCount] = useState(0);
  const [completionFileCount, setCompletionFileCount] = useState<number | null>(null);

  const selectedProject = projects.find((item) => item.id === selectedProjectId) || null;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const activeWorkspace = workspaces.find((item) => item.id === memberWorkspaceId) || null;
  const comparisonGroups: Array<{ label: string; items: ScanComparison["new_findings"]; color: string }> = comparison ? [
    { label: "New", items: comparison.new_findings, color: "text-rose-200" },
    { label: "Resolved", items: comparison.resolved_findings, color: "text-emerald-200" },
    { label: "Persisting", items: comparison.persisting_findings, color: "text-amber-100" },
  ] : [];

  const load = useCallback(async () => {
    const [projectRows, workspaceRows, notificationRows] = await Promise.all([api.projects(), api.workspaces(), api.notifications()]);
    setProjects(projectRows);
    setWorkspaces(workspaceRows);
    setNotifications(notificationRows);
    setSelectedProjectId((current) => projectRows.some((item) => item.id === current) ? current : projectRows[0]?.id || "");
    setMemberWorkspaceId((current) => workspaceRows.some((item) => item.id === current) ? current : workspaceRows[0]?.id || "");
  }, []);

  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);
  useEffect(() => { if (user) void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load projects.")); }, [user, load]);
  useEffect(() => {
    setComparison(null);
    if (!selectedProjectId) { setSuppressionRows([]); return; }
    void api.projectSuppressions(selectedProjectId).then(setSuppressionRows).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load rule suppressions."));
  }, [selectedProjectId]);
  useEffect(() => {
    if (!selectedProject) return;
    setScheduleHours(selectedProject.schedule_hours ? String(selectedProject.schedule_hours) : "");
    setThreshold(selectedProject.pr_fail_severity);
    setWorkspaceId(selectedProject.workspace_id || "");
  }, [selectedProject]);

  const act = async (key: string, callback: () => Promise<void>) => {
    setBusy(key); setError(""); setNotice(""); setCompletionFileCount(null);
    try { await callback(); } catch (reason) { setError(reason instanceof Error ? reason.message : "That action could not be completed."); }
    finally { setBusy(""); }
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await act("create-project", async () => {
      const created = await api.createProject({ name: name.trim(), repo_url: repoUrl.trim(), branch: branch.trim() || "main", schedule_hours: scheduleHours ? Number(scheduleHours) : null, workspace_id: workspaceId || null, pr_fail_severity: threshold });
      setName(""); setRepoUrl("");
      await load(); setSelectedProjectId(created.id);
      setNotice("Project connected. Run a scan to establish its first baseline.");
    });
  };

  const scanProject = (project: Project) => act(`scan-${project.id}`, async () => {
    const result = await api.scanProject(project.id);
    setCompletionFileCount(result.file_count);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
    setNotice(`Reviewed ${result.file_count} files and found ${result.findings.length} issue(s).`);
    await load();
    router.push(`/dashboard?scan=${encodeURIComponent(result.id)}`);
  });

  const saveProjectSettings = (project: Project) => act(`settings-${project.id}`, async () => {
    await api.updateProject(project.id, { schedule_hours: scheduleHours ? Number(scheduleHours) : null, pr_fail_severity: threshold });
    await load(); setNotice("Project scan and pull-request settings saved.");
  });

  const setBaseline = (project: Project) => act(`baseline-${project.id}`, async () => {
    await api.setProjectBaseline(project.id); setNotice("The latest project scan is now the comparison baseline.");
    setComparison(await api.compareProject(project.id)); await load();
  });

  const compare = (project: Project) => act(`compare-${project.id}`, async () => { setComparison(await api.compareProject(project.id)); });

  const addWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await act("create-workspace", async () => {
      await api.createWorkspace(workspaceName.trim()); setWorkspaceName(""); await load();
      setNotice("Shared workspace created.");
    });
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberWorkspaceId) return;
    await act("add-member", async () => {
      await api.addWorkspaceMember(memberWorkspaceId, memberEmail.trim(), memberRole); setMemberEmail(""); await load();
      setNotice("Workspace membership saved.");
    });
  };

  const removeMember = (workspace: Workspace, memberId: string) => act(`remove-${memberId}`, async () => {
    await api.removeWorkspaceMember(workspace.id, memberId); await load(); setNotice("Workspace member removed.");
  });

  const createSuppression = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProject) return;
    await act("suppress", async () => {
      await api.suppressProjectRule(selectedProject.id, suppressionRule.trim(), suppressionReason.trim());
      setSuppressionRule(""); setSuppressionReason("");
      setSuppressionRows(await api.projectSuppressions(selectedProject.id));
      setNotice("Rule ignored for future scans of this project. Existing scan results remain available.");
    });
  };

  const removeSuppression = (item: RuleSuppression) => selectedProject && act(`unsuppress-${item.id}`, async () => {
    await api.removeProjectSuppression(selectedProject.id, item.id);
    setSuppressionRows(await api.projectSuppressions(selectedProject.id)); setNotice("Rule suppression removed.");
  });

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const target = uploadProjectId;
    event.target.value = "";
    if (!files.length || !target) return;
    setUploadFileNames(files.slice(0, 8).map((file) => file.name));
    setUploadFileCount(files.length);
    await act(`upload-${target}`, async () => {
      const scan = await api.upload(files, target);
      setUploadFileCount(scan.file_count);
      setCompletionFileCount(scan.file_count);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
      router.push(`/dashboard?scan=${encodeURIComponent(scan.id)}`);
    });
    setUploadFileNames([]);
    setUploadFileCount(0);
  };

  const markAllRead = () => act("notifications", async () => { await api.markAllNotificationsRead(); await load(); });
  const openNotification = (item: Notification) => {
    if (!item.read) void api.markNotificationRead(item.id).then(load).catch(() => undefined);
  };

  if (authLoading || !user) return <main className="grid min-h-screen place-items-center bg-[#080713] text-zinc-400"><LoaderCircle className="animate-spin" size={17}/></main>;

  return <main className="min-h-screen bg-[#080713] text-zinc-100">
    <input ref={uploadRef} type="file" multiple className="hidden" onChange={(event) => void uploadFiles(event)}/>
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/[.07] bg-[#080713]/80 px-5 backdrop-blur-2xl sm:px-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-[12px] text-zinc-400 transition hover:text-white"><ArrowLeft size={14}/> CodeGuard workspace</Link>
      <div className="flex items-center gap-2"><span className="rounded-full border border-violet-300/15 bg-violet-300/[.045] px-3 py-1.5 text-[11px] text-violet-100"><Bell size={12} className="mr-1.5 inline"/>{unreadCount} unread</span><span className="hidden text-[11px] text-zinc-600 sm:inline">Projects & team</span></div>
    </header>

    <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div data-scroll-reveal="drop"><span className="section-kicker"><Github size={12}/> Projects & collaboration</span><h1 className="mt-4 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Keep every review connected<span className="text-fuchsia-400">.</span></h1><p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-400">Save GitHub repositories, compare scans, set scheduled reviews, and share projects with your team.</p></div>
        <Link href="/dashboard" className="text-[11px] text-violet-200 hover:text-white">Back to scan dashboard →</Link>
      </div>
      {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-3 text-[12px] text-rose-100"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={14}/></button></div>}
      {notice && <MotionToast message={notice} onDismiss={() => setNotice("")} className="mb-4 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-3 text-[12px] text-violet-100"/>}
      {(busy.startsWith("scan-") || busy.startsWith("upload-") || completionFileCount !== null) && <div role="status" className="cg-result-toast scan-progress mb-5 overflow-hidden rounded-xl border border-violet-300/10 bg-violet-300/[.025] px-4 py-3"><div className="flex items-center gap-2 text-[11px] text-violet-100"><span className="cg-scan-pulse grid size-5 place-items-center rounded-full bg-violet-300/[.08]">{completionFileCount !== null ? <Check size={13}/> : <LoaderCircle size={13} className="animate-spin"/>}</span>{completionFileCount !== null ? `Review complete · ${completionFileCount} file${completionFileCount === 1 ? "" : "s"} inspected` : busy.startsWith("scan-") ? "Reading repository files and checking code and dependencies…" : "Uploading files for in-memory review…"}</div>{busy.startsWith("upload-") && uploadFileNames.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Files selected for this review">{uploadFileNames.map((fileName, index) => <span key={`${fileName}-${index}`} className="cg-file-chip max-w-full truncate rounded-md border border-violet-300/10 bg-violet-300/[.035] px-2 py-1 text-[9px] text-violet-100/75" title={fileName}>{fileName}</span>)}{uploadFileCount > uploadFileNames.length && <span className="cg-file-chip rounded-md border border-violet-300/10 bg-violet-300/[.035] px-2 py-1 text-[9px] text-violet-100/75">+{uploadFileCount - uploadFileNames.length} more</span>}</div>}<div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className={`scan-progress__bar h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-300 ${completionFileCount !== null ? "scan-progress__bar--complete" : "w-1/3"}`}/></div></div>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
        <div className="space-y-5">
          <Card data-scroll-reveal="rise" className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-[14px] font-medium text-zinc-100"><Plus size={15} className="text-violet-300"/> Connect a repository</div>
            <form onSubmit={(event) => void createProject(event)} className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] text-zinc-500">Project name<Input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 text-[12px]" placeholder="API security review"/></label>
              <label className="text-[11px] text-zinc-500">GitHub URL<Input required type="url" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} className="mt-1.5 h-10 text-[12px]" placeholder="https://github.com/org/repository"/></label>
              <label className="text-[11px] text-zinc-500">Branch<Input required value={branch} onChange={(event) => setBranch(event.target.value)} className="mt-1.5 h-10 text-[12px]" placeholder="main"/></label>
              <label className="text-[11px] text-zinc-500">Share with workspace<select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} className={`${selectStyle} mt-1.5`}><option value="">Personal project</option>{workspaces.filter((item) => ["owner", "admin", "member"].includes(item.role)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-[11px] text-zinc-500">Scheduled scans<select value={scheduleHours} onChange={(event) => setScheduleHours(event.target.value)} className={`${selectStyle} mt-1.5`}><option value="">Off</option><option value="6">Every 6 hours</option><option value="24">Daily</option><option value="168">Weekly</option></select></label>
              <label className="text-[11px] text-zinc-500">PR check fails at<select value={threshold} onChange={(event) => setThreshold(event.target.value as Project["pr_fail_severity"])} className={`${selectStyle} mt-1.5`}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="never">Never fail</option></select></label>
              <div className="flex items-center justify-between gap-3 pt-1 sm:col-span-2"><p className="max-w-xl text-[10px] leading-5 text-zinc-600">Public repositories scan directly. For private repositories, install the configured GitHub App with Contents: read permission. Scans read at most 25 files and 2 MB; source is not retained.</p><Button disabled={busy === "create-project"} type="submit" size="sm" className="h-9 shrink-0">{busy === "create-project" ? <LoaderCircle size={13} className="animate-spin"/> : <Plus size={13}/>} Connect</Button></div>
            </form>
          </Card>

          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[13px] font-medium text-zinc-200"><Activity size={14} className="text-violet-300"/> Connected projects</div><span className="text-[10px] text-zinc-600">{projects.length} project{projects.length === 1 ? "" : "s"}</span></div>
          {projects.length === 0 ? <Card className="grid min-h-44 place-items-center p-8 text-center"><div><span className="mx-auto grid size-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-zinc-500"><Github size={16}/></span><p className="mt-3 text-[12px] font-medium text-zinc-300">No projects connected yet</p><p className="mt-1 text-[11px] text-zinc-600">Add a repository above to start saving scan history.</p></div></Card> : <div className="space-y-3">
            {projects.map((project, index) => <Card data-scroll-reveal="rise" data-reveal-delay={index % 3 + 1} key={project.id} className={`overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300/20 ${selectedProjectId === project.id ? "border-violet-300/20" : ""}`}>
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <button onClick={() => setSelectedProjectId(project.id)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg border border-violet-300/15 bg-violet-300/[.06] text-violet-200"><Github size={14}/></span><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-zinc-100">{project.name}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-600">{project.repo_url} · {project.branch}</span></span></div><span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-10 text-[10px] text-zinc-600"><span>{project.schedule_hours ? `Every ${project.schedule_hours}h` : "Schedule off"}</span><span>PR threshold: {project.pr_fail_severity}</span><span>Role: {project.role}</span>{project.last_scan_at && <span>Last scan {new Date(project.last_scan_at).toLocaleString()}</span>}</span></button>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:justify-end">
                  <Button size="sm" onClick={() => void scanProject(project)} disabled={project.role === "viewer" || busy === `scan-${project.id}`} className="h-8 flex-1 sm:flex-none text-[11px] sm:text-xs">{busy === `scan-${project.id}` ? <LoaderCircle size={12} className="animate-spin"/> : <ScanLine size={12}/>} Scan</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedProjectId(project.id); void compare(project); }} disabled={!project.last_scan_at || busy === `compare-${project.id}`} className="h-8 flex-1 sm:flex-none text-[11px] sm:text-xs"><GitCompareArrows size={12}/> Compare</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setUploadProjectId(project.id); uploadRef.current?.click(); }} disabled={project.role === "viewer" || busy === `upload-${project.id}`} className="h-8 flex-1 sm:flex-none text-[11px] sm:text-xs"><UploadCloud size={12}/> Upload</Button>
                </div>
              </div>
              {selectedProjectId === project.id && <div className="border-t border-white/[.06] bg-white/[.012] px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-[11px] font-medium text-zinc-300">Project controls</div><div className="flex gap-2"><Button variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => void setBaseline(project)} disabled={project.role === "viewer" || !project.last_scan_at || busy === `baseline-${project.id}`}><ShieldCheck size={11}/> Set current scan as baseline</Button>{project.can_manage && <Button variant="ghost" size="sm" className="h-7 text-[10px] text-rose-200 hover:text-rose-100" onClick={() => void act(`delete-${project.id}`, async () => { await api.deleteProject(project.id); setSelectedProjectId(""); await load(); })}><Trash2 size={11}/> Delete</Button>}</div></div>
                {project.can_manage && <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-[10px] text-zinc-600">Scan cadence<select value={scheduleHours} onChange={(event) => setScheduleHours(event.target.value)} className={`${selectStyle} mt-1 text-[11px]`}><option value="">Off</option><option value="6">Every 6 hours</option><option value="24">Daily</option><option value="168">Weekly</option></select></label><label className="text-[10px] text-zinc-600">PR failure threshold<select value={threshold} onChange={(event) => setThreshold(event.target.value as Project["pr_fail_severity"])} className={`${selectStyle} mt-1 text-[11px]`}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="never">Never</option></select></label><Button variant="secondary" size="sm" className="h-10" onClick={() => void saveProjectSettings(project)} disabled={busy === `settings-${project.id}`}>{busy === `settings-${project.id}` ? <LoaderCircle size={12} className="animate-spin"/> : <Check size={12}/>} Save</Button></div>}
                {comparison && comparison.latest_scan_id && <div className="mt-4 rounded-xl border border-white/[.06] bg-[#0a0914] p-3"><div className="flex items-center gap-2 text-[11px] font-medium text-zinc-300"><GitCompareArrows size={12} className="text-violet-300"/> Scan comparison</div>{comparison.message ? <p className="mt-2 text-[10px] text-zinc-600">{comparison.message}</p> : <div className="mt-3 grid gap-2 sm:grid-cols-3">{comparisonGroups.map((group, index) => <div data-scroll-reveal="rise" data-reveal-delay={index + 1} key={group.label} className="rounded-lg border border-white/[.06] bg-white/[.015] p-2.5"><div className={`flex items-center gap-1 text-[10px] ${group.color}`}><span>{group.label}</span><span aria-hidden>·</span><AnimatedCount key={`${selectedProjectId}-${group.label}-${group.items.length}`} value={group.items.length} resetKey={`${selectedProjectId}-${group.label}`}/></div><div className="mt-2 max-h-32 space-y-1 overflow-auto">{group.items.slice(0, 5).map((item, index) => <p key={`${item.rule_id}-${item.file_path}-${index}`} className="truncate text-[9px] text-zinc-600" title={`${item.title} · ${item.file_path}:${item.line}`}>{item.severity} · {item.title}</p>)}</div></div>)}</div>}</div>}
              </div>}
            </Card>)}
          </div>}
          {selectedProject && selectedProject.role !== "viewer" && <Card className="p-4 sm:p-5"><div className="flex items-center gap-2 text-[12px] font-medium text-zinc-200"><ShieldAlert size={13} className="text-amber-200"/> Ignore a rule on future scans</div><form onSubmit={(event) => void createSuppression(event)} className="mt-3 grid gap-2 sm:grid-cols-[minmax(130px,.65fr)_minmax(180px,1fr)_auto]"><Input required maxLength={100} value={suppressionRule} onChange={(event) => setSuppressionRule(event.target.value)} className="h-9 text-[11px]" placeholder="Rule ID, e.g. js.innerhtml"/><Input required minLength={5} maxLength={1000} value={suppressionReason} onChange={(event) => setSuppressionReason(event.target.value)} className="h-9 text-[11px]" placeholder="Reason for accepting this risk"/><Button variant="secondary" size="sm" type="submit" className="h-9" disabled={busy === "suppress"}><Plus size={12}/> Ignore rule</Button></form>{suppressionRows.length > 0 && <div className="mt-3 space-y-2">{suppressionRows.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[.05] px-3 py-2"><span className="min-w-0"><span className="block font-mono text-[10px] text-zinc-300">{item.rule_id}</span><span className="mt-0.5 block truncate text-[10px] text-zinc-600">{item.reason}</span></span><button onClick={() => void removeSuppression(item)} className="shrink-0 rounded-md p-1.5 text-zinc-600 hover:bg-rose-300/[.06] hover:text-rose-200" aria-label={`Remove ${item.rule_id} suppression`}><X size={12}/></button></div>)}</div>}</Card>}
        </div>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[14px] font-medium text-zinc-100"><Users size={15} className="text-sky-200"/> Shared workspace</div><p className="mt-2 text-[11px] leading-5 text-zinc-600">Add an existing CodeGuard account by email and choose a workspace role. Shared projects and findings respect these roles.</p><form onSubmit={(event) => void addWorkspace(event)} className="mt-4 flex gap-2"><Input required minLength={2} maxLength={120} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="h-9 text-[11px]" placeholder="Workspace name"/><Button type="submit" size="sm" className="h-9 shrink-0" disabled={busy === "create-workspace"}><Plus size={12}/> Create</Button></form>
            {workspaces.length > 0 && <><label className="mt-4 block text-[10px] text-zinc-600">Manage workspace<select value={memberWorkspaceId} onChange={(event) => setMemberWorkspaceId(event.target.value)} className={`${selectStyle} mt-1`}>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.role}</option>)}
            </select></label>
            {activeWorkspace && <><div className="mt-3 space-y-2">{activeWorkspace.members.map((member) => <div key={member.user_id} className="flex items-center gap-2 rounded-lg border border-white/[.05] bg-white/[.01] px-2.5 py-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-300/[.08] text-[10px] text-violet-100">{member.username.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] text-zinc-300">{member.username} <span className="text-zinc-700">· {member.role}</span></span><span className="block truncate text-[9px] text-zinc-600">{member.email}</span></span>{["owner", "admin"].includes(activeWorkspace.role) && member.role !== "owner" && <button onClick={() => void removeMember(activeWorkspace, member.user_id)} aria-label={`Remove ${member.email}`} className="rounded p-1 text-zinc-600 hover:text-rose-200"><X size={12}/></button>}</div>)}</div>
              {["owner", "admin"].includes(activeWorkspace.role) && <form onSubmit={(event) => void addMember(event)} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_auto]"><Input required type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} className="h-9 text-[10px]" placeholder="teammate@example.com"/><select value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className={selectStyle}><option value="member">Member</option><option value="viewer">Viewer</option>{activeWorkspace.role === "owner" && <option value="admin">Admin</option>}</select><Button variant="secondary" type="submit" size="sm" className="h-9" disabled={busy === "add-member"}><Plus size={12}/> Add</Button></form>}
            </>}</>}
          </Card>

          <Card id="notifications" className="p-5 sm:p-6"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[13px] font-medium text-zinc-100"><Bell size={14} className="text-violet-300"/> Notifications</div>{unreadCount > 0 && <button onClick={() => void markAllRead()} className="text-[10px] text-violet-200 hover:text-white">Mark all read</button>}</div>
            {notifications.length ? <div className="mt-3 space-y-2">{notifications.slice(0, 8).map((item) => <Link data-scroll-reveal="rise" href={item.link} key={item.id} onClick={() => openNotification(item)} className={`block rounded-lg border p-3 transition hover:border-violet-300/20 ${item.read ? "border-white/[.05] bg-white/[.01]" : "border-violet-300/10 bg-violet-300/[.025]"}`}><div className="flex items-start gap-2"><span className={`mt-1 size-1.5 shrink-0 rounded-full ${item.read ? "bg-zinc-700" : "cg-unread-pulse bg-violet-300"}`}/><span className="min-w-0"><span className="block text-[10px] font-medium text-zinc-300">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-zinc-600">{item.message}</span><span className="mt-1 block text-[9px] text-zinc-700">{new Date(item.created_at).toLocaleString()}</span></span></div></Link>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-white/[.07] p-4 text-center"><Clock3 size={14} className="mx-auto text-zinc-700"/><p className="mt-2 text-[10px] text-zinc-600">Assignments and scheduled scan updates will appear here.</p></div>}
          </Card>

          <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-4 text-[10px] leading-5 text-zinc-600"><div className="mb-1 flex items-center gap-2 text-zinc-400"><FileCode2 size={12}/> Current coverage</div>Python checks include AST-aware unsafe deserialization and dynamic SQL detection. Terraform, Dockerfile, and Kubernetes manifests get configuration checks. Export any scan as SARIF from the dashboard.</div>
        </div>
      </div>
    </section>
  </main>;
}
