import asyncio
import base64
import re
from pathlib import PurePosixPath
from urllib.parse import quote, urlparse

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.services.scanner import SourceFile


MAX_REPOSITORY_FILES = 25
MAX_FILE_BYTES = 512 * 1024
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".cpp", ".cc", ".c", ".h", ".rs", ".php", ".rb", ".cs", ".kt", ".swift", ".vue", ".sql", ".sh", ".yaml", ".yml", ".tf", ".html", ".css",
}
SUPPORTED_NAMES = {
    "package.json", "package-lock.json", "npm-shrinkwrap.json", "requirements.txt", "requirements-dev.txt", "poetry.lock", "pdm.lock", "cargo.lock", "gemfile.lock", "go.mod", "pom.xml", "dockerfile",
}
IGNORED_PARTS = {".git", "node_modules", "vendor", "dist", "build", ".next", "__pycache__", "coverage"}


def github_repo_parts(value: str) -> tuple[str, str, str]:
    parsed = urlparse(value.strip())
    try:
        port = parsed.port
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="The GitHub repository URL is invalid") from exc
    if parsed.scheme != "https" or parsed.hostname != "github.com" or parsed.username or parsed.password or port or parsed.query or parsed.fragment:
        raise HTTPException(status_code=422, detail="Use an HTTPS GitHub repository URL")
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) != 2 or not re.fullmatch(r"[A-Za-z0-9_.-]+", parts[0]) or not re.fullmatch(r"[A-Za-z0-9_.-]+", parts[1].removesuffix(".git")):
        raise HTTPException(status_code=422, detail="Enter a repository URL in the form https://github.com/owner/repository")
    owner, repository = parts[0], parts[1].removesuffix(".git")
    return owner, repository, f"https://github.com/{owner}/{repository}"


def is_supported_path(path: str) -> bool:
    parsed = PurePosixPath(path)
    if parsed.is_absolute() or ".." in parsed.parts or any(part.lower() in IGNORED_PARTS for part in parsed.parts):
        return False
    return parsed.suffix.lower() in SUPPORTED_EXTENSIONS or parsed.name.lower() in SUPPORTED_NAMES


async def fetch_github_repository(repo_url: str, branch: str, installation_token: str | None = None) -> list[SourceFile]:
    owner, repository, _ = github_repo_parts(repo_url)
    base = f"https://api.github.com/repos/{owner}/{repository}"
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if installation_token:
        headers["Authorization"] = f"Bearer {installation_token}"
    timeout = httpx.Timeout(15, connect=5)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            tree_response = await client.get(f"{base}/git/trees/{quote(branch, safe='')}?recursive=1", headers=headers)
            if tree_response.status_code == 404:
                raise HTTPException(status_code=404, detail="Repository or branch was not found. For a private repository, install the configured GitHub App with Contents: read permission.")
            if tree_response.status_code == 403:
                if tree_response.headers.get("x-ratelimit-remaining") == "0":
                    raise HTTPException(status_code=429, detail="GitHub API rate limit reached. Try again later.")
                raise HTTPException(status_code=403, detail="GitHub could not read this repository. Check the App installation and Contents: read permission.")
            tree_response.raise_for_status()
            tree = tree_response.json().get("tree", [])
            candidates = [item for item in tree if item.get("type") == "blob" and isinstance(item.get("path"), str) and is_supported_path(item["path"]) and int(item.get("size") or 0) <= MAX_FILE_BYTES]
            selected = []
            estimated_total = 0
            for item in candidates:
                size = int(item.get("size") or 0)
                if len(selected) >= MAX_REPOSITORY_FILES:
                    break
                if estimated_total + size > settings.max_upload_bytes:
                    continue
                selected.append(item)
                estimated_total += size
            semaphore = asyncio.Semaphore(5)
            sources: list[SourceFile] = []
            total = 0
            async def read_source(item: dict) -> tuple[SourceFile, int] | None:
                path = item["path"]
                raw_url = f"{base}/contents/{quote(path, safe='/')}?ref={quote(branch, safe='')}"
                async with semaphore:
                    response = await client.get(raw_url, headers=headers)
                if response.status_code == 404:
                    return None
                if response.status_code == 403:
                    if response.headers.get("x-ratelimit-remaining") == "0":
                        raise HTTPException(status_code=429, detail="GitHub API rate limit reached. Try again later.")
                    raise HTTPException(status_code=403, detail="GitHub could not read a repository file. Check the App installation and Contents: read permission.")
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict) or payload.get("encoding") != "base64" or not isinstance(payload.get("content"), str):
                    return None
                try:
                    content = base64.b64decode(payload["content"], validate=False)
                except (ValueError, TypeError):
                    return None
                if len(content) > MAX_FILE_BYTES:
                    return None
                try:
                    decoded = content.decode("utf-8-sig")
                except UnicodeDecodeError:
                    return None
                return SourceFile(path=path, content=decoded), len(content)
            fetched = await asyncio.gather(*(read_source(item) for item in selected))
            for result in fetched:
                if result is None:
                    continue
                source, size = result
                total += size
                if total > settings.max_upload_bytes:
                    raise HTTPException(status_code=413, detail="Repository source exceeds the configured scan size limit")
                sources.append(source)
    except HTTPException:
        raise
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="GitHub did not respond in time. Try the repository scan again.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not read the repository from GitHub") from exc
    if not sources:
        raise HTTPException(status_code=422, detail="No supported text source files were found in this repository branch")
    return sources
