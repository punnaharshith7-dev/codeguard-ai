export type User = {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
};

export type Finding = {
  id: string;
  file_path: string;
  line: number;
  rule_id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  cwe: string;
  confidence: number;
  title: string;
  description: string;
  snippet: string;
  reachability: "potential" | "contextual" | "no_source_observed" | "version_match" | "unknown";
  attack_path: AttackPathStep[];
  status: "open" | "fixed" | "accepted_risk" | "false_positive" | "ignored";
  status_reason: string;
  assigned_to_user_id: string | null;
};

export type AttackPathStep = {
  kind: "source" | "sink";
  file_path: string;
  line: number;
  evidence: string;
};

export type Scan = {
  id: string;
  title: string;
  file_count: number;
  created_at: string;
  project_id: string | null;
  workspace_id: string | null;
  findings: Finding[];
};

export type Project = {
  id: string;
  name: string;
  repo_url: string;
  branch: string;
  schedule_hours: number | null;
  next_scan_at: string | null;
  last_scan_at: string | null;
  baseline_scan_id: string | null;
  pr_fail_severity: "critical" | "high" | "medium" | "low" | "never";
  workspace_id: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  can_manage: boolean;
};

export type WorkspaceMember = { user_id: string; username: string; email: string; role: "owner" | "admin" | "member" | "viewer" };
export type Workspace = { id: string; name: string; role: WorkspaceMember["role"]; members: WorkspaceMember[] };
export type RuleSuppression = { id: string; rule_id: string; reason: string; created_at: string };
export type ScanComparison = {
  baseline_scan_id: string | null;
  latest_scan_id: string;
  new_findings: Array<{ file_path: string; line: number; rule_id: string; severity: string; title: string }>;
  resolved_findings: Array<{ file_path: string; line: number; rule_id: string; severity: string; title: string }>;
  persisting_findings: Array<{ file_path: string; line: number; rule_id: string; severity: string; title: string }>;
  message?: string;
};

export type Notification = { id: string; title: string; message: string; link: string; read: boolean; created_at: string };

export type FixProposal = {
  file_path: string;
  original: string;
  fixed: string;
  diff: string;
  explanation: string;
  verified: boolean;
  verification: string;
};

export type TrustSettings = {
  share_code_with_remote_ai: boolean;
  history_retention_days: number;
  daily_token_budget: number;
  ai_provider_configured: boolean;
  ai_provider: string;
  ai_model: string;
  ai_provider_is_local: boolean;
  github_pr_gate_configured: boolean;
};

export type AgentMode = "ask" | "plan" | "edit";
export type AgentFile = { path: string; content: string };
export type AgentResult = {
  mode: AgentMode;
  answer: string;
  edits: AgentFile[];
  input_tokens: number;
  output_tokens: number;
  remaining_tokens: number;
  audit_id: string;
};

export type AgentAuditEntry = {
  id: string;
  mode: AgentMode;
  outcome: "complete" | "failed";
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  input_files: number;
  proposed_files: number;
  created_at: string;
};
