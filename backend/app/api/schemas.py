from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=80, pattern=r"^[\w .-]+$")
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirmRequest(BaseModel):
    token: str = Field(min_length=32, max_length=200)
    password: str = Field(min_length=10, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    avatar_url: str | None


class AttackPathStep(BaseModel):
    kind: Literal["source", "sink"]
    file_path: str
    line: int
    evidence: str


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    file_path: str
    line: int
    rule_id: str
    severity: str
    cwe: str
    confidence: int
    title: str
    description: str
    snippet: str
    reachability: str = "unknown"
    attack_path: list[AttackPathStep] = Field(default_factory=list)
    status: str = "open"
    status_reason: str = ""
    assigned_to_user_id: str | None = None


class ScanResponse(BaseModel):
    id: str
    title: str
    file_count: int
    created_at: datetime
    project_id: str | None = None
    workspace_id: str | None = None
    findings: list[FindingResponse]


class FindingTriageUpdate(BaseModel):
    status: Literal["open", "fixed", "accepted_risk", "false_positive", "ignored"]
    reason: str = Field(default="", max_length=1000)
    assigned_to_user_id: str | None = None


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    repo_url: str = Field(min_length=19, max_length=500)
    branch: str = Field(default="main", min_length=1, max_length=255, pattern=r"^[A-Za-z0-9._/-]+$")
    schedule_hours: int | None = Field(default=None, ge=1, le=168)
    workspace_id: str | None = Field(default=None, min_length=36, max_length=36)
    pr_fail_severity: Literal["critical", "high", "medium", "low", "never"] = "high"


class ProjectResponse(BaseModel):
    id: str
    name: str
    repo_url: str
    branch: str
    schedule_hours: int | None
    next_scan_at: datetime | None
    last_scan_at: datetime | None
    baseline_scan_id: str | None
    pr_fail_severity: str
    workspace_id: str | None
    role: Literal["owner", "admin", "member", "viewer"]
    can_manage: bool


class ProjectScheduleUpdate(BaseModel):
    schedule_hours: int | None = Field(default=None, ge=1, le=168)
    pr_fail_severity: Literal["critical", "high", "medium", "low", "never"]


class RuleSuppressionCreate(BaseModel):
    rule_id: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=5, max_length=1000)


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class WorkspaceMemberCreateRequest(BaseModel):
    email: EmailStr
    role: Literal["admin", "member", "viewer"] = "member"


class WorkspaceMemberResponse(BaseModel):
    user_id: str
    username: str
    email: EmailStr
    role: str


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    role: str
    members: list[WorkspaceMemberResponse] = Field(default_factory=list)


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    link: str
    read: bool
    created_at: datetime


class TrustSettingsResponse(BaseModel):
    share_code_with_remote_ai: bool
    history_retention_days: int
    daily_token_budget: int
    ai_provider_configured: bool
    ai_provider: str
    ai_model: str
    ai_provider_is_local: bool
    github_pr_gate_configured: bool


class TrustSettingsUpdate(BaseModel):
    share_code_with_remote_ai: bool
    history_retention_days: int = Field(ge=0, le=365)
    daily_token_budget: int = Field(ge=1000, le=200000)


class AgentFile(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content: str = Field(max_length=524288)


class AgentRequest(BaseModel):
    mode: Literal["ask", "plan", "edit"]
    prompt: str = Field(min_length=3, max_length=8000)
    files: list[AgentFile] = Field(min_length=1, max_length=25)


class AgentResponse(BaseModel):
    mode: Literal["ask", "plan", "edit"]
    answer: str
    edits: list[AgentFile] = Field(default_factory=list)
    input_tokens: int
    output_tokens: int
    remaining_tokens: int
    audit_id: str


class FixRequest(BaseModel):
    finding_id: str = Field(min_length=36, max_length=36)
    source: str = Field(max_length=524288)


class FixResponse(BaseModel):
    file_path: str
    original: str
    fixed: str
    diff: str
    explanation: str
    verified: bool
    verification: str
