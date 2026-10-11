import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import ProjectCreateRequest, ProjectResponse, ProjectScheduleUpdate, RuleSuppressionCreate
from app.api.github import _app_jwt, _installation_token
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.security import get_current_user
from app.models.entities import Finding, Notification, Project, RuleSuppression, Scan, User
from app.services.dependencies import scan_dependencies
from app.services.permissions import ROLE_RANK, has_workspace_role, visible_workspace_ids, workspace_role
from app.services.repositories import fetch_github_repository, github_repo_parts
from app.services.scanner import analyze


router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)


def _response(project: Project, user: User, db: Session) -> dict:
    role = workspace_role(db, user.id, project.workspace_id) if project.workspace_id else "owner" if project.owner_id == user.id else None
    return {
        "id": project.id, "name": project.name, "repo_url": project.repo_url,
        "branch": project.branch, "schedule_hours": project.schedule_hours,
        "next_scan_at": project.next_scan_at, "last_scan_at": project.last_scan_at,
        "baseline_scan_id": project.baseline_scan_id, "pr_fail_severity": project.pr_fail_severity,
        "workspace_id": project.workspace_id,
        "role": role or "viewer", "can_manage": ROLE_RANK.get(role or "viewer", 0) >= ROLE_RANK["admin"],
    }


def _require_project(db: Session, user: User, project_id: str, role: str = "viewer") -> Project:
    workspaces = visible_workspace_ids(db, user.id)
    visible = db.query(Project).filter(
        Project.id == project_id,
        or_(and_(Project.owner_id == user.id, Project.workspace_id.is_(None)), Project.workspace_id.in_(workspaces)),
    ).first()
    if not visible:
        raise HTTPException(status_code=404, detail="Project not found")
    if visible.workspace_id and not has_workspace_role(db, user.id, visible.workspace_id, role):
        raise HTTPException(status_code=403, detail="Your workspace role cannot perform this action")
    return visible


async def _project_sources(project: Project):
    installation_token = None
    if settings.github_app_id and settings.github_app_private_key:
        owner, repository, _ = github_repo_parts(project.repo_url)
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(12, connect=5), follow_redirects=False) as client:
                response = await client.get(
                    f"https://api.github.com/repos/{owner}/{repository}/installation",
                    headers={"Authorization": f"Bearer {_app_jwt()}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
                )
                if response.status_code == 200:
                    installation_id = response.json().get("id")
                    if isinstance(installation_id, int):
                        installation_token = await _installation_token(client, installation_id)
        except (httpx.HTTPError, HTTPException, ValueError, TypeError):
            logger.exception("Could not obtain a GitHub App token for project %s; trying public access", project.id)
    return await fetch_github_repository(project.repo_url, project.branch, installation_token)


@router.get("", response_model=list[ProjectResponse])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspaces = visible_workspace_ids(db, user.id)
    rows = db.query(Project).filter(or_(and_(Project.owner_id == user.id, Project.workspace_id.is_(None)), Project.workspace_id.in_(workspaces))).order_by(Project.created_at.desc()).all()
    return [_response(project, user, db) for project in rows]


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _, _, canonical_url = github_repo_parts(payload.repo_url)
    if payload.workspace_id and not has_workspace_role(db, user.id, payload.workspace_id, "member"):
        raise HTTPException(status_code=403, detail="Only workspace members can add shared projects")
    project = Project(
        owner_id=user.id, workspace_id=payload.workspace_id, name=payload.name.strip(),
        repo_url=canonical_url, branch=payload.branch.strip(), schedule_hours=payload.schedule_hours,
        next_scan_at=datetime.now(timezone.utc) + timedelta(hours=payload.schedule_hours) if payload.schedule_hours else None,
        pr_fail_severity=payload.pr_fail_severity,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _response(project, user, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectScheduleUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id, "admin")
    project.schedule_hours = payload.schedule_hours
    project.next_scan_at = datetime.now(timezone.utc) + timedelta(hours=payload.schedule_hours) if payload.schedule_hours else None
    project.pr_fail_severity = payload.pr_fail_severity
    db.commit()
    db.refresh(project)
    return _response(project, user, db)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id, "admin")
    if project.workspace_id and not has_workspace_role(db, user.id, project.workspace_id, "admin"):
        raise HTTPException(status_code=403, detail="Only workspace admins can delete a shared project")
    db.query(RuleSuppression).filter(RuleSuppression.project_id == project.id).delete(synchronize_session=False)
    db.delete(project)
    db.commit()


async def run_project_scan(db: Session, project: Project, actor: User, scheduled: bool = False) -> Scan:
    sources = await _project_sources(project)
    findings = analyze(sources)
    try:
        findings.extend(await scan_dependencies(sources))
    except Exception:
        logger.exception("OSV dependency check failed for project %s", project.id)
    suppressed = {item.rule_id: item.reason for item in db.query(RuleSuppression).filter(RuleSuppression.project_id == project.id).all()}
    scan = Scan(
        user_id=actor.id, title=f"{project.name} · {project.branch}"[:180], file_count=len(sources),
        project_id=project.id, workspace_id=project.workspace_id,
    )
    db.add(scan)
    db.flush()
    for item in findings:
        rule_id = item["rule_id"]
        item["attack_path"] = json.dumps(item.get("attack_path") or [])
        db.add(Finding(scan_id=scan.id, **item,
                       status="ignored" if rule_id in suppressed else "open",
                       status_reason=suppressed.get(rule_id, "")))
    now = datetime.now(timezone.utc)
    project.last_scan_at = now
    if scheduled and project.schedule_hours:
        project.next_scan_at = now + timedelta(hours=project.schedule_hours)
        db.add(Notification(
            user_id=project.owner_id, title=f"Scheduled scan finished: {project.name}",
            message=f"Reviewed {len(sources)} files and found {len(findings)} issue(s).",
            link=f"/dashboard?scan={scan.id}",
        ))
    db.commit()
    return db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.id == scan.id).first()


@router.post("/{project_id}/scan", status_code=201)
async def scan_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id, "member")
    scan = await run_project_scan(db, project, user)
    return {
        "id": scan.id, "project_id": scan.project_id, "title": scan.title,
        "file_count": scan.file_count, "created_at": scan.created_at,
        "findings": [{"id": item.id, "file_path": item.file_path, "line": item.line, "rule_id": item.rule_id,
                      "severity": item.severity, "title": item.title, "status": item.status} for item in scan.findings],
    }


@router.post("/{project_id}/baseline")
def set_baseline(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id, "member")
    latest = db.query(Scan).filter(Scan.project_id == project.id).order_by(Scan.created_at.desc()).first()
    if not latest:
        raise HTTPException(status_code=409, detail="Run a project scan before setting its baseline")
    project.baseline_scan_id = latest.id
    db.commit()
    return {"baseline_scan_id": latest.id}


@router.get("/{project_id}/comparison")
def compare_project_scans(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id)
    latest = db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.project_id == project.id).order_by(Scan.created_at.desc()).first()
    if not latest:
        raise HTTPException(status_code=404, detail="No project scans are available yet")
    baseline = db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.id == project.baseline_scan_id, Scan.project_id == project.id).first() if project.baseline_scan_id else None
    if baseline is None:
        baseline = db.query(Scan).options(selectinload(Scan.findings)).filter(Scan.project_id == project.id, Scan.id != latest.id).order_by(Scan.created_at.desc()).first()
    if baseline is None:
        return {"baseline_scan_id": None, "latest_scan_id": latest.id, "new_findings": [], "resolved_findings": [], "persisting_findings": [], "message": "Set a baseline or run a second scan to compare changes."}
    if baseline.id == latest.id:
        return {"baseline_scan_id": baseline.id, "latest_scan_id": latest.id, "new_findings": [], "resolved_findings": [], "persisting_findings": [], "message": "Run a scan after this baseline to compare changes."}
    stable_key = lambda item: (item.file_path, item.rule_id, item.snippet.strip())
    old = {stable_key(item): item for item in baseline.findings}
    new = {stable_key(item): item for item in latest.findings}
    def brief(item: Finding) -> dict:
        return {"file_path": item.file_path, "line": item.line, "rule_id": item.rule_id, "severity": item.severity, "title": item.title}
    return {
        "baseline_scan_id": baseline.id, "latest_scan_id": latest.id,
        "new_findings": [brief(item) for key, item in new.items() if key not in old],
        "resolved_findings": [brief(item) for key, item in old.items() if key not in new],
        "persisting_findings": [brief(item) for key, item in new.items() if key in old],
    }


@router.get("/{project_id}/suppressions")
def list_suppressions(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id)
    return [{"id": item.id, "rule_id": item.rule_id, "reason": item.reason, "created_at": item.created_at}
            for item in db.query(RuleSuppression).filter(RuleSuppression.project_id == project.id).order_by(RuleSuppression.created_at.desc()).all()]


@router.post("/{project_id}/suppressions", status_code=201)
def suppress_rule(project_id: str, payload: RuleSuppressionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id, "member")
    item = db.query(RuleSuppression).filter_by(project_id=project.id, rule_id=payload.rule_id).first()
    if item:
        item.reason = payload.reason.strip()
        item.created_by_user_id = user.id
    else:
        item = RuleSuppression(project_id=project.id, rule_id=payload.rule_id.strip(), reason=payload.reason.strip(), created_by_user_id=user.id)
        db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "rule_id": item.rule_id, "reason": item.reason, "created_at": item.created_at}


@router.delete("/{project_id}/suppressions/{suppression_id}", status_code=204)
def remove_suppression(project_id: str, suppression_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project(db, user, project_id, "member")
    item = db.query(RuleSuppression).filter_by(id=suppression_id, project_id=project.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Rule suppression not found")
    db.delete(item)
    db.commit()


async def scheduled_scan_loop() -> None:
    """Run due public-repository scans inside the API process."""
    while True:
        await asyncio.sleep(60)
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            due = db.query(Project).filter(Project.schedule_hours.isnot(None), Project.next_scan_at <= now).limit(5).all()
            for project in due:
                owner = db.get(User, project.owner_id)
                if not owner:
                    continue
                try:
                    await run_project_scan(db, project, owner, scheduled=True)
                except Exception:
                    logger.exception("Scheduled scan failed for project %s", project.id)
                    if project.schedule_hours:
                        project.next_scan_at = datetime.now(timezone.utc) + timedelta(hours=project.schedule_hours)
                        db.commit()
        finally:
            db.close()
