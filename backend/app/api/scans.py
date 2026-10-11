import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import PurePosixPath
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import FindingResponse, FindingTriageUpdate, ScanResponse
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Finding, Notification, Project, RuleSuppression, Scan, TrustSettings, User
from app.services.permissions import can_access_scan, has_workspace_role, visible_workspace_ids
from app.services.dependencies import scan_dependencies
from app.services.scanner import SourceFile, analyze

router = APIRouter(prefix="/scans", tags=["scans"])
logger = logging.getLogger(__name__)
MAX_FILES = 25
MAX_FILE_BYTES = 512 * 1024
ALLOWED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".cpp", ".cc", ".c", ".h", ".rs", ".php", ".rb", ".cs", ".kt", ".swift", ".vue", ".sql", ".sh", ".yaml", ".yml", ".tf", ".dockerfile", ".html", ".css"}
DEPENDENCY_MANIFESTS = {"package.json", "package-lock.json", "npm-shrinkwrap.json", "requirements.txt", "requirements-dev.txt", "poetry.lock", "pdm.lock", "cargo.lock", "gemfile.lock", "go.mod", "pom.xml"}
IGNORED_PARTS = {".git", "node_modules", "vendor", "dist", "build", ".next", "__pycache__"}


def serialize_scan(scan: Scan) -> ScanResponse:
    findings = []
    for finding in scan.findings:
        try:
            attack_path = json.loads(finding.attack_path or "[]")
        except (TypeError, ValueError):
            attack_path = []
        findings.append(FindingResponse.model_validate({
            "id": finding.id,
            "file_path": finding.file_path,
            "line": finding.line,
            "rule_id": finding.rule_id,
            "severity": finding.severity,
            "cwe": finding.cwe,
            "confidence": finding.confidence,
            "title": finding.title,
            "description": finding.description,
            "snippet": finding.snippet,
            "reachability": finding.reachability,
            "attack_path": attack_path,
            "status": finding.status,
            "status_reason": finding.status_reason,
            "assigned_to_user_id": finding.assigned_to_user_id,
        }))
    return ScanResponse(
        id=scan.id,
        title=scan.title,
        file_count=scan.file_count,
        created_at=scan.created_at,
        project_id=scan.project_id,
        workspace_id=scan.workspace_id,
        findings=findings,
    )


@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(files: list[UploadFile] = File(...), project_id: str | None = Form(default=None), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not files or len(files) > MAX_FILES:
        raise HTTPException(status_code=413, detail=f"Upload between 1 and {MAX_FILES} files")
    total_bytes = 0
    sources: list[SourceFile] = []
    for upload in files:
        raw_name = upload.filename or "source.txt"
        normalized = raw_name.replace("\\", "/")
        path = PurePosixPath(normalized)
        if path.is_absolute() or ".." in path.parts:
            raise HTTPException(status_code=400, detail="File path is not allowed")
        if any(part in IGNORED_PARTS for part in path.parts):
            continue
        extension = path.suffix.lower()
        if extension not in ALLOWED_EXTENSIONS and path.name.lower() not in DEPENDENCY_MANIFESTS and path.name.lower() != "dockerfile":
            continue
        raw = await upload.read(MAX_FILE_BYTES + 1)
        if len(raw) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"{path.name} exceeds the per-file limit")
        total_bytes += len(raw)
        if total_bytes > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="Upload exceeds the total size limit")
        try:
            content = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            continue
        safe_path = re.sub(r"[^\w./@+ -]", "_", str(path))[:500]
        sources.append(SourceFile(path=safe_path, content=content))
    if not sources:
        raise HTTPException(status_code=400, detail="No supported text source files were found")

    project = None
    if project_id:
        workspaces = visible_workspace_ids(db, user.id)
        project = db.query(Project).filter(Project.id == project_id, or_(and_(Project.owner_id == user.id, Project.workspace_id.is_(None)), Project.workspace_id.in_(workspaces))).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.workspace_id and not has_workspace_role(db, user.id, project.workspace_id, "member"):
            raise HTTPException(status_code=403, detail="Your workspace role cannot add scans to this project")

    findings = analyze(sources)
    try:
        findings.extend(await scan_dependencies(sources))
    except Exception:
        # External advisory availability must not make private source scanning fail.
        logger.exception("OSV dependency check failed")
    title = ", ".join(source.path.split("/")[-1] for source in sources[:2])
    if len(sources) > 2:
        title += f" +{len(sources) - 2} files"
    scan = Scan(user_id=user.id, title=title[:180], file_count=len(sources),
                project_id=project.id if project else None, workspace_id=project.workspace_id if project else None)
    db.add(scan)
    db.flush()
    suppressed = {item.rule_id: item.reason for item in db.query(RuleSuppression).filter(RuleSuppression.project_id == project.id).all()} if project else {}
    for item in findings:
        item["attack_path"] = json.dumps(item.get("attack_path") or [])
        reason = suppressed.get(item["rule_id"], "")
        db.add(Finding(scan_id=scan.id, **item, status="ignored" if reason else "open", status_reason=reason))
    db.commit()
    scan = db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.id == scan.id).first()
    return serialize_scan(scan)


@router.get("", response_model=list[ScanResponse])
def list_scans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trust = db.get(TrustSettings, user.id)
    retention_days = trust.history_retention_days if trust else 90
    if retention_days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        expired = db.query(Scan).filter(Scan.user_id == user.id, Scan.created_at < cutoff).limit(100).all()
        if expired:
            for item in expired:
                db.delete(item)
            db.commit()
    scans = (
        db.query(Scan)
        .options(selectinload(Scan.findings))
        .filter(or_(and_(Scan.user_id == user.id, Scan.workspace_id.is_(None)), Scan.workspace_id.in_(visible_workspace_ids(db, user.id))))
        .order_by(Scan.created_at.desc())
        .limit(50)
        .all()
    )
    return [serialize_scan(scan) for scan in scans]


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.id == scan_id).first()
    if not scan or not can_access_scan(db, user.id, scan):
        raise HTTPException(status_code=404, detail="Scan not found")
    return serialize_scan(scan)


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(scan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or not can_access_scan(db, user.id, scan):
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.workspace_id and not has_workspace_role(db, user.id, scan.workspace_id, "admin"):
        raise HTTPException(status_code=403, detail="Only workspace admins can delete shared scans")
    db.delete(scan)
    db.commit()


@router.patch("/{scan_id}/findings/{finding_id}", response_model=FindingResponse)
def update_finding(scan_id: str, finding_id: str, payload: FindingTriageUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or not can_access_scan(db, user.id, scan):
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.workspace_id and not has_workspace_role(db, user.id, scan.workspace_id, "member"):
        raise HTTPException(status_code=403, detail="Your workspace role cannot triage findings")
    finding = db.query(Finding).filter(Finding.id == finding_id, Finding.scan_id == scan.id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    reason = payload.reason.strip()
    if payload.status in {"accepted_risk", "false_positive", "ignored"} and len(reason) < 5:
        raise HTTPException(status_code=422, detail="Add a short reason for accepting, ignoring, or dismissing this finding")
    assignee = None
    if payload.assigned_to_user_id:
        assignee = db.get(User, payload.assigned_to_user_id)
        if not assignee:
            raise HTTPException(status_code=404, detail="Assigned account was not found")
        if scan.workspace_id:
            if not has_workspace_role(db, assignee.id, scan.workspace_id):
                raise HTTPException(status_code=422, detail="The assignee must be a member of this project workspace")
        elif assignee.id != user.id:
            raise HTTPException(status_code=422, detail="Create a shared workspace before assigning a finding to another account")
    previous_assignee = finding.assigned_to_user_id
    finding.status = payload.status
    finding.status_reason = reason
    finding.assigned_to_user_id = assignee.id if assignee else None
    if assignee and assignee.id != user.id and assignee.id != previous_assignee:
        db.add(Notification(
            user_id=assignee.id, title=f"Finding assigned: {finding.title}",
            message=f"{finding.severity.title()} in {finding.file_path}:{finding.line}",
            link=f"/dashboard?scan={scan.id}",
        ))
    db.commit()
    db.refresh(finding)
    try:
        attack_path = json.loads(finding.attack_path or "[]")
    except (TypeError, ValueError):
        attack_path = []
    return FindingResponse.model_validate({
        "id": finding.id, "file_path": finding.file_path, "line": finding.line, "rule_id": finding.rule_id,
        "severity": finding.severity, "cwe": finding.cwe, "confidence": finding.confidence,
        "title": finding.title, "description": finding.description, "snippet": finding.snippet,
        "reachability": finding.reachability, "attack_path": attack_path,
        "status": finding.status, "status_reason": finding.status_reason,
        "assigned_to_user_id": finding.assigned_to_user_id,
    })


@router.get("/{scan_id}/sarif")
def export_sarif(scan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.id == scan_id).first()
    if not scan or not can_access_scan(db, user.id, scan):
        raise HTTPException(status_code=404, detail="Scan not found")
    findings = scan.findings
    rules: dict[str, dict] = {}
    results = []
    levels = {"critical": "error", "high": "error", "medium": "warning", "low": "note", "info": "note"}
    for finding in findings:
        rules.setdefault(finding.rule_id, {
            "id": finding.rule_id,
            "shortDescription": {"text": finding.title},
            "fullDescription": {"text": finding.description},
            "defaultConfiguration": {"level": levels.get(finding.severity, "warning")},
            "properties": {"tags": [finding.cwe], "precision": "high" if finding.confidence >= 85 else "medium"},
        })
        result = {
            "ruleId": finding.rule_id, "level": levels.get(finding.severity, "warning"),
            "message": {"text": finding.description},
            "locations": [{"physicalLocation": {"artifactLocation": {"uri": quote(finding.file_path.replace("\\", "/"), safe="/:@._-+")},
                            "region": {"startLine": finding.line}}}],
            "properties": {"severity": finding.severity, "confidence": finding.confidence,
                           "status": finding.status, "statusReason": finding.status_reason},
        }
        if finding.status in {"accepted_risk", "false_positive", "ignored", "fixed"}:
            result["suppressions"] = [{"kind": "accepted", "justification": finding.status_reason or finding.status.replace("_", " ")}]
        results.append(result)
    document = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{"tool": {"driver": {"name": "CodeGuard AI", "informationUri": "https://github.com/", "rules": list(rules.values())}},
                  "results": results, "properties": {"scanId": scan.id, "projectId": scan.project_id}}],
    }
    filename = re.sub(r"[^A-Za-z0-9._-]+", "-", scan.title).strip("-")[:80] or "codeguard-scan"
    return Response(content=json.dumps(document, ensure_ascii=False), media_type="application/sarif+json",
                    headers={"Content-Disposition": f'attachment; filename="{filename}.sarif"'})
