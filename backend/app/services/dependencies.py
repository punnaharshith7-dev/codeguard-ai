"""Bounded dependency inventory and OSV lookup. Lockfile contents stay in request memory."""

import asyncio
import hashlib
import json
import re
import tomllib
from dataclasses import dataclass
from pathlib import PurePosixPath
from xml.etree import ElementTree

import httpx

from app.services.scanner import SourceFile


@dataclass(frozen=True)
class Dependency:
    name: str
    version: str
    ecosystem: str
    path: str


PINNED_REQUIREMENT = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*==\s*([A-Za-z0-9_.!+-]+)")
MAX_DEPENDENCIES = 200
MAX_RESULTS = 50


def inventory(files: list[SourceFile]) -> list[Dependency]:
    found: dict[tuple[str, str, str], Dependency] = {}

    def add(name: str, version: str, ecosystem: str, path: str) -> None:
        name, version = name.strip(), version.strip()
        if name and version and len(name) <= 200 and len(version) <= 100:
            dep = Dependency(name=name, version=version, ecosystem=ecosystem, path=path)
            found[(ecosystem, name.lower(), version)] = dep

    for source in files:
        filename = PurePosixPath(source.path).name.lower()
        try:
            if filename in {"package-lock.json", "npm-shrinkwrap.json"}:
                document = json.loads(source.content)
                for installed_path, item in (document.get("packages") or {}).items():
                    if not installed_path or not isinstance(item, dict):
                        continue
                    package_name = installed_path.split("node_modules/")[-1]
                    if package_name and item.get("version"):
                        add(package_name, str(item["version"]), "npm", source.path)
            elif filename == "package.json":
                document = json.loads(source.content)
                for section in ("dependencies", "devDependencies", "optionalDependencies"):
                    for name, version in (document.get(section) or {}).items():
                        version = str(version).strip()
                        if re.fullmatch(r"\d+(?:\.\d+){0,3}(?:-[\w.-]+)?", version):
                            add(name, version, "npm", source.path)
            elif filename in {"requirements.txt", "requirements-dev.txt"}:
                for line in source.content.splitlines():
                    match = PINNED_REQUIREMENT.match(line)
                    if match:
                        add(match.group(1), match.group(2), "PyPI", source.path)
            elif filename in {"poetry.lock", "pdm.lock", "cargo.lock"}:
                document = tomllib.loads(source.content)
                for item in document.get("package", []):
                    name, version = item.get("name"), item.get("version")
                    if name and version:
                        add(str(name), str(version), "crates.io" if filename == "cargo.lock" else "PyPI", source.path)
            elif filename == "gemfile.lock":
                in_specs = False
                for line in source.content.splitlines():
                    if line.strip() == "specs:":
                        in_specs = True
                        continue
                    if in_specs and line and not line.startswith(" "):
                        in_specs = False
                    if in_specs:
                        match = re.match(r"^\s{4}([A-Za-z0-9_.-]+) \(([^)]+)\)", line)
                        if match:
                            add(match.group(1), match.group(2), "RubyGems", source.path)
            elif filename in {"go.mod", "go.mod.txt"}:
                for line in source.content.splitlines():
                    match = re.match(r"^\s*(?:require\s+)?([^\s()]+)\s+(v\d[^\s]*)", line)
                    if match and match.group(1) not in {"require", "go", "module"}:
                        add(match.group(1), match.group(2), "Go", source.path)
            elif filename == "pom.xml":
                root = ElementTree.fromstring(source.content)
                for dependency in root.iter():
                    if dependency.tag.split("}")[-1] != "dependency":
                        continue
                    parts = {child.tag.split("}")[-1]: (child.text or "").strip() for child in dependency}
                    if parts.get("groupId") and parts.get("artifactId") and parts.get("version"):
                        add(f"{parts['groupId']}:{parts['artifactId']}", parts["version"], "Maven", source.path)
        except (ValueError, TypeError, KeyError, ElementTree.ParseError):
            # Malformed manifests do not fail source analysis.
            continue
    return list(found.values())[:MAX_DEPENDENCIES]


def _severity(vulnerability: dict) -> str:
    value = str((vulnerability.get("database_specific") or {}).get("severity", "")).lower()
    if value in {"critical", "high", "medium", "moderate", "low"}:
        return "medium" if value == "moderate" else value
    for item in vulnerability.get("severity") or []:
        score = str(item.get("score", ""))
        # OSV may provide a numeric score or a CVSS vector. Keep the conservative fallback for vectors.
        try:
            number = float(score)
        except ValueError:
            continue
        if number >= 9:
            return "critical"
        if number >= 7:
            return "high"
        if number >= 4:
            return "medium"
        return "low"
    return "medium"


def _fixed_version(vulnerability: dict, dependency: Dependency) -> str | None:
    for affected in vulnerability.get("affected") or []:
        package = affected.get("package") or {}
        if package.get("name", "").lower() != dependency.name.lower():
            continue
        for version_range in affected.get("ranges") or []:
            for event in version_range.get("events") or []:
                if event.get("fixed"):
                    return str(event["fixed"])
    return None


async def scan_dependencies(files: list[SourceFile]) -> list[dict]:
    dependencies = inventory(files)
    if not dependencies:
        return []
    findings: list[dict] = []
    timeout = httpx.Timeout(6.0, connect=3.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for offset in range(0, len(dependencies), 100):
            batch = dependencies[offset:offset + 100]
            try:
                response = await client.post("https://api.osv.dev/v1/querybatch", json={"queries": [
                    {"package": {"name": item.name, "ecosystem": item.ecosystem}, "version": item.version}
                    for item in batch
                ]})
                response.raise_for_status()
                results = response.json().get("results", [])
            except (httpx.HTTPError, ValueError):
                continue
            lookup = [(item, vuln.get("id")) for item, result in zip(batch, results) for vuln in (result.get("vulns") or [])[:10] if vuln.get("id")][:max(0, MAX_RESULTS - len(findings))]
            if not lookup:
                return findings
            semaphore = asyncio.Semaphore(8)

            async def detail(vuln_id: str):
                async with semaphore:
                    try:
                        result = await client.get(f"https://api.osv.dev/v1/vulns/{vuln_id}")
                        result.raise_for_status()
                        return result.json()
                    except (httpx.HTTPError, ValueError):
                        return {"id": vuln_id, "summary": "Known vulnerability reported by OSV."}

            details = await asyncio.gather(*(detail(vuln_id) for _, vuln_id in lookup))
            for (dependency, vuln_id), vulnerability in zip(lookup, details):
                fixed = _fixed_version(vulnerability, dependency)
                summary = str(vulnerability.get("summary") or "Affected dependency version reported by OSV.").strip()[:700]
                remediation = f" Upgrade to {fixed} or later." if fixed else " Check OSV for the affected-version range and remediation."
                fingerprint = hashlib.sha256(f"osv:{dependency.ecosystem}:{dependency.name}:{dependency.version}:{vuln_id}".encode()).hexdigest()
                findings.append({
                    "fingerprint": fingerprint,
                    "file_path": dependency.path,
                    "line": 1,
                    "rule_id": f"osv.{vuln_id}"[:100],
                    "severity": _severity(vulnerability),
                    "cwe": "CWE-1104",
                    "confidence": 98,
                    "title": f"Vulnerable dependency · {dependency.name} {dependency.version}"[:180],
                    "description": f"{summary}{remediation} OSV advisory: {vuln_id}.",
                    "snippet": f"{dependency.name}@{dependency.version} ({dependency.ecosystem})",
                    "reachability": "version_match",
                    "attack_path": [],
                })
                if len(findings) >= MAX_RESULTS:
                    return findings
    return findings
