import type { AgentAuditEntry, AgentFile, AgentMode, AgentResult, FixProposal, Notification, Project, RuleSuppression, Scan, ScanComparison, TrustSettings, User, Workspace } from "@/lib/types";

const API_URL = "/api/core";

type ApiError = Error & { status?: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach CodeGuard. Check that the API is running and try again.");
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Preserve the status-based fallback for empty or non-JSON responses.
    }
    const error = new Error(message) as ApiError;
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, username: string, password: string) => request<User>("/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) => request<{ message: string }>("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<void>("/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  scans: () => request<Scan[]>("/scans"),
  deleteScan: (id: string) => request<void>(`/scans/${encodeURIComponent(id)}`, { method: "DELETE" }),
  upload: (files: File[], projectId?: string) => {
    const body = new FormData();
    files.forEach((file) => body.append("files", file, file.name));
    if (projectId) body.append("project_id", projectId);
    return request<Scan>("/scans", { method: "POST", body });
  },
  updateFinding: (scanId: string, findingId: string, update: { status: string; reason: string; assigned_to_user_id: string | null }) => request<Scan["findings"][number]>(`/scans/${encodeURIComponent(scanId)}/findings/${encodeURIComponent(findingId)}`, { method: "PATCH", body: JSON.stringify(update) }),
  generateFix: (scanId: string, findingId: string, source: string) => request<FixProposal>(`/scans/${encodeURIComponent(scanId)}/fixes`, {
    method: "POST", body: JSON.stringify({ finding_id: findingId, source }),
  }),
  trust: () => request<TrustSettings>("/trust"),
  updateTrust: (settings: Pick<TrustSettings, "share_code_with_remote_ai" | "history_retention_days" | "daily_token_budget">) => request<TrustSettings>("/trust", {
    method: "PUT", body: JSON.stringify(settings),
  }),
  agent: (mode: AgentMode, prompt: string, files: AgentFile[], signal?: AbortSignal) => request<AgentResult>("/agent/execute", {
    method: "POST", body: JSON.stringify({ mode, prompt, files }), signal,
  }),
  agentHistory: () => request<AgentAuditEntry[]>("/agent/history"),
  projects: () => request<Project[]>("/projects"),
  createProject: (project: Pick<Project, "name" | "repo_url" | "branch" | "schedule_hours" | "workspace_id" | "pr_fail_severity">) => request<Project>("/projects", { method: "POST", body: JSON.stringify(project) }),
  updateProject: (projectId: string, update: Pick<Project, "schedule_hours" | "pr_fail_severity">) => request<Project>(`/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", body: JSON.stringify(update) }),
  scanProject: (projectId: string) => request<{ id: string; project_id: string; title: string; file_count: number; findings: Array<{ id: string; severity: string; title: string }> }>(`/projects/${encodeURIComponent(projectId)}/scan`, { method: "POST" }),
  setProjectBaseline: (projectId: string) => request<{ baseline_scan_id: string }>(`/projects/${encodeURIComponent(projectId)}/baseline`, { method: "POST" }),
  compareProject: (projectId: string) => request<ScanComparison>(`/projects/${encodeURIComponent(projectId)}/comparison`),
  projectSuppressions: (projectId: string) => request<RuleSuppression[]>(`/projects/${encodeURIComponent(projectId)}/suppressions`),
  suppressProjectRule: (projectId: string, ruleId: string, reason: string) => request<RuleSuppression>(`/projects/${encodeURIComponent(projectId)}/suppressions`, { method: "POST", body: JSON.stringify({ rule_id: ruleId, reason }) }),
  removeProjectSuppression: (projectId: string, suppressionId: string) => request<void>(`/projects/${encodeURIComponent(projectId)}/suppressions/${encodeURIComponent(suppressionId)}`, { method: "DELETE" }),
  deleteProject: (projectId: string) => request<void>(`/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" }),
  workspaces: () => request<Workspace[]>("/workspaces"),
  createWorkspace: (name: string) => request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify({ name }) }),
  addWorkspaceMember: (workspaceId: string, email: string, role: string) => request<Workspace>(`/workspaces/${encodeURIComponent(workspaceId)}/members`, { method: "POST", body: JSON.stringify({ email, role }) }),
  removeWorkspaceMember: (workspaceId: string, userId: string) => request<void>(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  notifications: () => request<Notification[]>("/notifications"),
  markNotificationRead: (notificationId: string) => request<void>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request<void>("/notifications/read-all", { method: "POST" }),
};
