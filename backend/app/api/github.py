"""GitHub App webhook for pull-request security checks (separate from OAuth sign-in)."""

import asyncio
import base64
import hashlib
import hmac
import json
import re
from datetime import datetime, timezone
from urllib.parse import quote

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import GitHubWebhookDelivery, Project
from app.services.scanner import SourceFile, analyze


router = APIRouter(prefix="/github", tags=["github-app"])
PR_ACTIONS = {"opened", "reopened", "synchronize", "ready_for_review"}
MAX_FILES = 25
MAX_TOTAL_BYTES = 2 * 1024 * 1024
MAX_WEBHOOK_BYTES = 5 * 1024 * 1024


def _app_jwt() -> str:
    if not settings.github_app_id or not settings.github_app_private_key:
        raise HTTPException(status_code=503, detail="GitHub App credentials are not configured")
    now = int(datetime.now(timezone.utc).timestamp())
    private_key = settings.github_app_private_key.replace("\\n", "\n")
    try:
        return jwt.encode({"iat": now - 30, "exp": now + 8 * 60, "iss": settings.github_app_id}, private_key, algorithm="RS256")
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="GitHub App private key is invalid") from exc


def _added_lines(patch: str | None) -> set[int]:
    result: set[int] = set()
    current = 0
    in_hunk = False
    for line in (patch or "").splitlines():
        hunk = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if hunk:
            current = int(hunk.group(1))
            in_hunk = True
        elif not in_hunk or line.startswith("\\"):
            continue
        elif line.startswith("+++"):
            continue
        elif line.startswith("+"):
            result.add(current)
            current += 1
        elif line.startswith("-"):
            continue
        else:
            current += 1
    return result


async def _installation_token(client: httpx.AsyncClient, installation_id: int) -> str:
    response = await client.post(
        f"https://api.github.com/app/installations/{installation_id}/access_tokens",
        headers={"Authorization": f"Bearer {_app_jwt()}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
        json={"permissions": {"contents": "read", "pull_requests": "read", "checks": "write"}},
    )
    response.raise_for_status()
    token = response.json().get("token")
    if not token:
        raise HTTPException(status_code=502, detail="GitHub did not issue an installation token")
    return token


async def _pull_sources(client: httpx.AsyncClient, token: str, owner: str, repo: str, number: int, sha: str):
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    response = await client.get(f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files?per_page=100", headers=headers)
    response.raise_for_status()
    files = response.json()
    if not isinstance(files, list):
        return [], {}
    selected = [item for item in files if item.get("status") != "removed" and isinstance(item.get("filename"), str)][:MAX_FILES]
    semaphore = asyncio.Semaphore(6)
    sources: list[SourceFile] = []
    changed_lines: dict[str, set[int]] = {}
    total = 0

    async def get_file(item: dict):
        path = item["filename"].replace("\\", "/")
        if path.startswith("/") or ".." in path.split("/"):
            return None
        changed_lines[path] = _added_lines(item.get("patch"))
        url_path = quote(path, safe="/")
        async with semaphore:
            result = await client.get(f"https://api.github.com/repos/{owner}/{repo}/contents/{url_path}?ref={quote(sha, safe='')}", headers=headers)
        if result.status_code == 404:
            return None
        result.raise_for_status()
        payload = result.json()
        if not isinstance(payload, dict) or payload.get("encoding") != "base64" or not isinstance(payload.get("content"), str):
            return None
        try:
            content = base64.b64decode(payload["content"], validate=False)
            text = content.decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            return None
        if len(content) > 512 * 1024:
            return None
        return SourceFile(path=path, content=text), len(content)

    fetched = await asyncio.gather(*(get_file(item) for item in selected), return_exceptions=True)
    for result in fetched:
        if isinstance(result, Exception) or result is None:
            continue
        source, size = result
        total += size
        if total > MAX_TOTAL_BYTES:
            raise HTTPException(status_code=413, detail="Changed pull-request files exceed the scan size limit")
        sources.append(source)
    return sources, changed_lines


async def _create_check(client: httpx.AsyncClient, token: str, owner: str, repo: str, sha: str, findings: list[dict], changed_lines: dict[str, set[int]], fail_severity: str = "high") -> str:
    high = sum(item["severity"] in {"critical", "high"} for item in findings)
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    threshold_rank = severity_rank.get(fail_severity, 1)
    blocking = [item for item in findings if fail_severity != "never" and severity_rank.get(item["severity"], 5) <= threshold_rank]
    conclusion = "failure" if blocking else "success"
    summary = f"CodeGuard reviewed changed files and reported **{len(findings)} finding(s)**, including **{high} high or critical**.\n\n"
    summary += f"Configured failure threshold: **{fail_severity}**. **{len(blocking)} finding(s)** meet or exceed that threshold.\n\n"
    summary += "The scanner uses source-level and dependency heuristics. Review each annotation before merging."
    annotations = []
    for finding in findings[:50]:
        path = finding["file_path"]
        line = finding["line"]
        if line not in changed_lines.get(path, set()):
            continue
        level = "failure" if finding in blocking else "warning" if finding["severity"] == "medium" else "notice"
        annotations.append({
            "path": path,
            "start_line": line,
            "end_line": line,
            "annotation_level": level,
            "title": finding["title"][:100],
            "message": f"{finding['description']} ({finding['cwe']}; confidence {finding['confidence']}%).",
        })
    owner_repo = f"{owner}/{repo}"
    response = await client.post(
        f"https://api.github.com/repos/{owner_repo}/check-runs",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
        json={
            "name": "CodeGuard Security Gate",
            "head_sha": sha,
            "status": "completed",
            "conclusion": conclusion,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "output": {"title": f"{len(blocking)} finding(s) meet the {fail_severity} threshold" if blocking else f"No findings meet the {fail_severity} threshold", "summary": summary, "annotations": annotations},
        },
    )
    response.raise_for_status()
    return conclusion


@router.post("/webhook")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    secret = settings.github_webhook_secret.encode("utf-8")
    if not secret:
        raise HTTPException(status_code=503, detail="GitHub App webhook secret is not configured")
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_WEBHOOK_BYTES:
        raise HTTPException(status_code=413, detail="GitHub webhook payload is too large")
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_WEBHOOK_BYTES:
            raise HTTPException(status_code=413, detail="GitHub webhook payload is too large")
        chunks.append(chunk)
    body = b"".join(chunks)
    signature = request.headers.get("x-hub-signature-256", "")
    expected = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid GitHub webhook signature")
    delivery_id = request.headers.get("x-github-delivery", "")
    event = request.headers.get("x-github-event", "")
    if not delivery_id or len(delivery_id) > 100:
        raise HTTPException(status_code=400, detail="GitHub delivery ID is required")
    previous = db.get(GitHubWebhookDelivery, delivery_id)
    if previous:
        if previous.conclusion in {"error", "configuration_error", "received", "invalid_payload"}:
            db.delete(previous)
            db.commit()
        else:
            return {"status": "duplicate"}
    try:
        payload = json.loads(body)
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook JSON") from exc
    repository = str((payload.get("repository") or {}).get("full_name") or "")[:250]
    pull = payload.get("pull_request") or {}
    number = payload.get("number")
    record = GitHubWebhookDelivery(delivery_id=delivery_id, event=event, repository=repository,
                                   pull_request_number=number if isinstance(number, int) else None,
                                   conclusion="received")
    db.add(record)
    db.commit()
    if event != "pull_request" or payload.get("action") not in PR_ACTIONS:
        record.conclusion = "ignored"
        db.commit()
        return {"status": "ignored"}
    installation_id = (payload.get("installation") or {}).get("id")
    head = pull.get("head") or {}
    sha = head.get("sha")
    if not installation_id or not sha or not repository or not isinstance(number, int):
        record.conclusion = "invalid_payload"
        db.commit()
        return {"status": "ignored", "reason": "Pull request webhook did not include installation, repository, or head metadata"}
    if not settings.github_app_id or not settings.github_app_private_key:
        record.conclusion = "configuration_error"
        db.commit()
        raise HTTPException(status_code=503, detail="GitHub App credentials are not configured")
    owner, repo = repository.split("/", 1) if "/" in repository else ("", "")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20, connect=5), follow_redirects=False) as client:
            token = await _installation_token(client, int(installation_id))
            sources, changed_lines = await _pull_sources(client, token, owner, repo, number, sha)
            # Evaluate only findings on lines introduced in this pull request so legacy
            # issues in an edited file do not unexpectedly block an unrelated change.
            findings = [item for item in analyze(sources) if item["line"] in changed_lines.get(item["file_path"], set())]
            project = db.query(Project).filter(func.lower(Project.repo_url) == f"https://github.com/{owner}/{repo}".lower()).order_by(Project.created_at.desc()).first()
            threshold = project.pr_fail_severity if project else "high"
            conclusion = await _create_check(client, token, owner, repo, sha, findings, changed_lines, threshold)
        record.conclusion = conclusion
        db.commit()
        return {"status": "completed", "conclusion": conclusion, "files_scanned": len(sources), "findings": len(findings)}
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        record.conclusion = "error"
        db.commit()
        raise HTTPException(status_code=502, detail="GitHub App could not complete the pull-request security check") from exc
