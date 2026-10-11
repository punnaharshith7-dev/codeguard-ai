"""Bounded starter rules. Extend behind this interface with Semgrep and analyzers."""

import hashlib
import ast
import re
from dataclasses import dataclass


@dataclass
class SourceFile:
    path: str
    content: str


RULES = [
    ("secret.generic", "high", "CWE-798", 85, "Possible hard-coded credential", "A credential-like value appears directly in source code. Move secrets to a managed environment or secret store.", re.compile(r"(?i)\b(?:api[_-]?key|secret|password|token|access[_-]?key)\b\s*[:=]\s*['\"][^'\"\s]{8,}['\"]")),
    ("python.eval", "high", "CWE-95", 91, "Dynamic code execution", "eval() executes a string as code and can enable code injection when input is untrusted.", re.compile(r"\beval\s*\(")),
    ("python.exec", "high", "CWE-95", 88, "Dynamic code execution", "exec() runs dynamically constructed code. Avoid it or strictly constrain the input.", re.compile(r"\bexec\s*\(")),
    ("js.innerhtml", "medium", "CWE-79", 78, "Potential unsafe HTML injection", "Assigning untrusted content to innerHTML can create a cross-site scripting vulnerability. Prefer textContent or a vetted sanitizer.", re.compile(r"\.innerHTML\s*=")),
    ("js.eval", "high", "CWE-95", 90, "Dynamic code execution", "eval() interprets a string as JavaScript and may execute attacker-controlled code.", re.compile(r"\beval\s*\(")),
    ("python.subprocess-shell", "medium", "CWE-78", 80, "Shell execution with a string command", "shell=True can turn untrusted command input into an operating-system command injection. Prefer an argument list.", re.compile(r"subprocess\.(?:run|Popen|call|check_output)\s*\([^\n]*\bshell\s*=\s*True")),
    ("docker.root-user", "medium", "CWE-250", 82, "Container runs as root", "The image explicitly selects the root user. Create and use a non-root account for the application process.", re.compile(r"(?i)^\s*USER\s+root\b")),
    ("docker.latest-tag", "low", "CWE-1104", 76, "Mutable latest image tag", "The image uses a mutable latest tag, which can make builds non-reproducible and silently change dependencies. Pin a reviewed version or digest.", re.compile(r"(?i)^\s*FROM\s+[^\s]+:latest\b")),
    ("terraform.open-ingress", "high", "CWE-284", 88, "Network ingress is open to the internet", "This ingress rule allows traffic from 0.0.0.0/0. Restrict source ranges and exposed ports to the required network.", re.compile(r"(?i)\bcidr_blocks\s*=\s*\[\s*[\"']0\.0\.0\.0/0[\"']")),
    ("terraform.public-storage", "high", "CWE-732", 86, "Storage may be publicly accessible", "The storage configuration enables public access. Disable public access unless the bucket is intentionally public.", re.compile(r"(?i)\b(?:acl\s*=\s*[\"']public-read|publicly_accessible\s*=\s*true)")),
    ("terraform.storage-unencrypted", "medium", "CWE-311", 80, "Storage encryption is disabled", "The resource explicitly disables encryption at rest. Enable provider-managed encryption for stored data.", re.compile(r"(?i)\b(?:encrypted|server_side_encryption_enabled)\s*=\s*false\b")),
    ("kubernetes.privileged-container", "high", "CWE-250", 89, "Privileged container enabled", "Privileged containers can access host-level capabilities. Remove privileged mode and grant only the capabilities the workload needs.", re.compile(r"(?i)\bprivileged\s*:\s*true\b")),
    ("kubernetes.root-container", "medium", "CWE-250", 78, "Container may run as root", "The pod explicitly allows a root user. Set runAsNonRoot: true and a non-zero runAsUser where possible.", re.compile(r"(?i)\brunAsNonRoot\s*:\s*false\b")),
    ("kubernetes.hostpath", "medium", "CWE-552", 80, "Host filesystem mounted into a pod", "hostPath mounts expose node files to the container. Prefer a scoped persistent volume or a narrowly read-only host path.", re.compile(r"(?i)^\s*hostPath\s*:")),
]

SECRET_VALUE = re.compile(r"(?i)(\b(?:api[_-]?key|secret|password|token|access[_-]?key)\b\s*[:=]\s*)(['\"])[^'\"]+(['\"])")
IDENTIFIER = re.compile(r"[A-Za-z_$][\w$]*")
ASSIGNMENT = re.compile(r"^\s*(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(.+)$")
TAINT_SOURCES = [
    re.compile(r"\brequest\.(?:args|form|json|values|data)\b", re.I),
    re.compile(r"\breq\.(?:query|body|params)\b", re.I),
    re.compile(r"\b(?:r\.URL\.Query|r\.FormValue)\b"),
    re.compile(r"\b(?:\$_GET|\$_POST|\$_REQUEST)\b"),
    re.compile(r"\bparams\s*(?:\[|\.\w)"),
    re.compile(r"\b(?:input|readLine)\s*\("),
    re.compile(r"\bURLSearchParams\s*\("),
]
TAINT_SINKS = {"python.eval", "python.exec", "js.eval", "js.innerhtml", "python.subprocess-shell"}


def analyze(files: list[SourceFile]) -> list[dict]:
    findings: list[dict] = []
    for source in files:
        for line_number, line in enumerate(source.content.splitlines(), start=1):
            for rule_id, severity, cwe, confidence, title, description, pattern in RULES:
                if not pattern.search(line):
                    continue
                fingerprint = hashlib.sha256(
                    f"{source.path}:{line_number}:{rule_id}:{line.strip()}".encode("utf-8")
                ).hexdigest()
                snippet = SECRET_VALUE.sub(r"\1\2[REDACTED]\3", line.strip()[:500])
                findings.append({
                    "fingerprint": fingerprint,
                    "file_path": source.path,
                    "line": line_number,
                    "rule_id": rule_id,
                    "severity": severity,
                    "cwe": cwe,
                    "confidence": confidence,
                    "title": title,
                    "description": description,
                    "snippet": snippet,
                    "reachability": "unknown",
                    "attack_path": [],
                })
    _analyze_python_ast(files, findings)
    _attach_candidate_paths(files, findings)
    _attach_python_taint_paths(files, findings)
    return findings


def _analyze_python_ast(files: list[SourceFile], findings: list[dict]) -> None:
    """Add syntax-aware Python checks where line matching loses call structure."""
    existing = {(item["file_path"], item["line"], item["rule_id"]) for item in findings}
    for source in files:
        if not source.path.lower().endswith(".py"):
            continue
        try:
            tree = ast.parse(source.content.lstrip("\ufeff"), filename=source.path)
        except SyntaxError:
            continue
        lines = source.content.splitlines()
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            name = node.func.id if isinstance(node.func, ast.Name) else node.func.attr if isinstance(node.func, ast.Attribute) else ""
            module = node.func.value.id if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) else ""
            rule = None
            if module == "pickle" and name in {"load", "loads"}:
                rule = ("python.pickle-load", "high", "CWE-502", 87, "Unsafe Python deserialization", "pickle can execute code while loading untrusted data. Use a data-only format such as JSON or validate a signed trusted payload.")
            elif module == "yaml" and name == "load":
                loader = next((keyword.value for keyword in node.keywords if keyword.arg == "Loader"), None)
                if loader is None or (isinstance(loader, ast.Attribute) and loader.attr in {"Loader", "UnsafeLoader"}):
                    rule = ("python.yaml-unsafe-load", "high", "CWE-502", 86, "YAML loaded with an unsafe loader", "yaml.load can construct arbitrary Python objects with an unsafe loader. Use yaml.safe_load or SafeLoader for untrusted documents.")
            elif name == "execute" and node.args:
                query = node.args[0]
                if isinstance(query, (ast.JoinedStr, ast.BinOp)):
                    rule = ("python.sql-string-format", "high", "CWE-89", 82, "SQL query built from a dynamic string", "The query argument is assembled using formatting or concatenation. Bind values with the database driver's parameterized query API.")
            elif module == "subprocess" and name in {"run", "Popen", "call", "check_output"}:
                if any(keyword.arg == "shell" and isinstance(keyword.value, ast.Constant) and keyword.value.value is True for keyword in node.keywords):
                    rule = ("python.subprocess-shell", "medium", "CWE-78", 84, "Shell execution with a string command", "This subprocess call enables a shell. Pass an argument list with shell=False, especially when values can come from a user.")
            if not rule:
                continue
            line_number = int(getattr(node, "lineno", 1))
            identity = (source.path, line_number, rule[0])
            if identity in existing:
                continue
            existing.add(identity)
            line = lines[line_number - 1].strip() if 0 < line_number <= len(lines) else ""
            fingerprint = hashlib.sha256(f"{source.path}:{line_number}:{rule[0]}:{line}".encode("utf-8")).hexdigest()
            findings.append({
                "fingerprint": fingerprint, "file_path": source.path, "line": line_number,
                "rule_id": rule[0], "severity": rule[1], "cwe": rule[2], "confidence": rule[3],
                "title": rule[4], "description": rule[5], "snippet": SECRET_VALUE.sub(r"\1\2[REDACTED]\3", line[:500]),
                "reachability": "unknown", "attack_path": [],
            })


def _attach_candidate_paths(files: list[SourceFile], findings: list[dict]) -> None:
    """Attach evidence-only source-to-sink candidates; this is heuristic, not proof of exploitability."""
    source_lines: list[dict] = []
    aliases: dict[str, set[str]] = {}
    lines_by_file: dict[str, list[str]] = {}
    for source in files:
        lines_by_file[source.path] = source.content.splitlines()
        for number, line in enumerate(lines_by_file[source.path], start=1):
            assignment = ASSIGNMENT.match(line)
            identifiers = set(IDENTIFIER.findall(line))
            if any(pattern.search(line) for pattern in TAINT_SOURCES):
                variable = assignment.group(1) if assignment else None
                source_lines.append({"path": source.path, "line": number, "variable": variable, "identifiers": identifiers, "evidence": line.strip()[:240]})
                if variable:
                    aliases.setdefault(variable, set()).add(variable)
            elif assignment:
                aliases.setdefault(assignment.group(1), set()).update(IDENTIFIER.findall(assignment.group(2)))

    # Follow simple assignments such as cleaned = raw_input across files and local scopes.
    for _ in range(4):
        changed = False
        for variable, references in list(aliases.items()):
            expanded = set(references)
            for reference in references:
                expanded.update(aliases.get(reference, set()))
            if expanded != references:
                aliases[variable] = expanded
                changed = True
        if not changed:
            break

    for finding in findings:
        if finding["rule_id"] not in TAINT_SINKS:
            continue
        sink_line = lines_by_file.get(finding["file_path"], [])
        sink_text = sink_line[finding["line"] - 1] if 0 < finding["line"] <= len(sink_line) else finding["snippet"]
        sink_identifiers = set(IDENTIFIER.findall(sink_text))
        candidates: list[tuple[int, dict, bool]] = []
        for source in source_lines:
            same_file_before_sink = source["path"] == finding["file_path"] and source["line"] <= finding["line"]
            source_names = aliases.get(source["variable"], set()) if source["variable"] else source["identifiers"]
            shared_symbol = bool(source_names & sink_identifiers)
            nearby_context = same_file_before_sink and finding["line"] - source["line"] <= 80
            if shared_symbol or nearby_context:
                candidates.append((0 if shared_symbol else 1, source, shared_symbol))
        candidates.sort(key=lambda item: (item[0], item[1]["path"] != finding["file_path"], item[1]["line"]))
        if candidates:
            _, source, shared_symbol = candidates[0]
            finding["reachability"] = "potential" if shared_symbol else "contextual"
            finding["attack_path"] = [
                {"kind": "source", "file_path": source["path"], "line": source["line"], "evidence": SECRET_VALUE.sub(r"\1\2[REDACTED]\3", source["evidence"])},
                {"kind": "sink", "file_path": finding["file_path"], "line": finding["line"], "evidence": finding["title"]},
            ]
        else:
            finding["reachability"] = "no_source_observed"


def _attach_python_taint_paths(files: list[SourceFile], findings: list[dict]) -> None:
    """Follow simple Python assignments from request/input sources into common sinks."""
    findings_by_location: dict[tuple[str, int], list[dict]] = {}
    for finding in findings:
        findings_by_location.setdefault((finding["file_path"], finding["line"]), []).append(finding)

    for source in files:
        if not source.path.lower().endswith(".py"):
            continue
        try:
            tree = ast.parse(source.content.lstrip("\ufeff"), filename=source.path)
        except SyntaxError:
            continue
        lines = source.content.splitlines()
        tainted: dict[str, tuple[int, str]] = {}
        nodes = sorted((node for node in ast.walk(tree) if isinstance(node, (ast.Assign, ast.AnnAssign, ast.NamedExpr, ast.Call))),
                       key=lambda node: (getattr(node, "lineno", 0), 0 if isinstance(node, (ast.Assign, ast.AnnAssign, ast.NamedExpr)) else 1))
        for node in nodes:
            if isinstance(node, ast.Call):
                function_name = node.func.id if isinstance(node.func, ast.Name) else node.func.attr if isinstance(node.func, ast.Attribute) else ""
                module = node.func.value.id if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) else ""
                sink_rule = None
                if function_name == "eval":
                    sink_rule = "python.eval"
                elif function_name == "exec":
                    sink_rule = "python.exec"
                elif function_name == "execute" and node.args:
                    sink_rule = "python.sql-string-format" if isinstance(node.args[0], (ast.JoinedStr, ast.BinOp)) else None
                elif module == "subprocess" and function_name in {"run", "Popen", "call", "check_output"}:
                    if any(keyword.arg == "shell" and isinstance(keyword.value, ast.Constant) and keyword.value.value is True for keyword in node.keywords):
                        sink_rule = "python.subprocess-shell"
                if sink_rule:
                    arguments = [*node.args, *(keyword.value for keyword in node.keywords)]
                    source_evidence = None
                    source_line = None
                    for argument in arguments:
                        for part in ast.walk(argument):
                            if isinstance(part, ast.Call) and isinstance(part.func, ast.Name) and part.func.id in {"input", "raw_input"}:
                                source_line = int(getattr(part, "lineno", node.lineno))
                                source_evidence = lines[source_line - 1].strip()[:240] if 0 < source_line <= len(lines) else "input()"
                                break
                            if isinstance(part, ast.Attribute) and part.attr in {"args", "form", "json", "values", "data", "GET", "POST"}:
                                root = part
                                while isinstance(root, ast.Attribute):
                                    root = root.value
                                if isinstance(root, ast.Name) and root.id in {"request", "req"}:
                                    source_line = int(getattr(part, "lineno", node.lineno))
                                    source_evidence = lines[source_line - 1].strip()[:240] if 0 < source_line <= len(lines) else "request input"
                                    break
                        if source_line:
                            break
                    names = {part.id for argument in arguments for part in ast.walk(argument) if isinstance(part, ast.Name) and isinstance(part.ctx, ast.Load)}
                    prior = next((tainted[name] for name in names if name in tainted), None)
                    path = (source_line, source_evidence) if source_line is not None else prior
                    if path:
                        line_number = int(getattr(node, "lineno", 1))
                        for finding in findings_by_location.get((source.path, line_number), []):
                            if finding["rule_id"] == sink_rule:
                                source_number, evidence = path
                                finding["reachability"] = "potential"
                                finding["attack_path"] = [
                                    {"kind": "source", "file_path": source.path, "line": source_number,
                                     "evidence": SECRET_VALUE.sub(r"\1\2[REDACTED]\3", evidence)},
                                    {"kind": "sink", "file_path": source.path, "line": line_number, "evidence": finding["title"]},
                                ]
            value = node.value if isinstance(node, (ast.Assign, ast.AnnAssign, ast.NamedExpr)) else None
            if value is None:
                continue
            target_nodes = node.targets if isinstance(node, ast.Assign) else [node.target]
            targets = {part.id for target in target_nodes for part in ast.walk(target) if isinstance(part, ast.Name) and isinstance(part.ctx, ast.Store)}
            if not targets:
                continue
            source_match = None
            for part in ast.walk(value):
                if isinstance(part, ast.Call) and isinstance(part.func, ast.Name) and part.func.id in {"input", "raw_input"}:
                    source_match = (int(getattr(part, "lineno", node.lineno)), lines[int(getattr(part, "lineno", node.lineno)) - 1].strip()[:240])
                    break
                if isinstance(part, ast.Attribute) and part.attr in {"args", "form", "json", "values", "data", "GET", "POST"}:
                    root = part
                    while isinstance(root, ast.Attribute):
                        root = root.value
                    if isinstance(root, ast.Name) and root.id in {"request", "req"}:
                        line_number = int(getattr(part, "lineno", node.lineno))
                        source_match = (line_number, lines[line_number - 1].strip()[:240])
                        break
            if source_match is None:
                names = {part.id for part in ast.walk(value) if isinstance(part, ast.Name) and isinstance(part.ctx, ast.Load)}
                source_match = next((tainted[name] for name in names if name in tainted), None)
            if source_match:
                for target in targets:
                    tainted[target] = source_match
