import re
from uuid import uuid4


SECRET_ASSIGNMENT = re.compile(
    r"(?i)(\b(?:api[_-]?key|secret|password|token|access[_-]?key)\b\s*[:=]\s*)(['\"])([^'\"\r\n]{8,})(['\"]|)"
)


def redact_source(text: str) -> tuple[str, dict[str, str]]:
    replacements: dict[str, str] = {}

    def replace(match: re.Match[str]) -> str:
        token = f"__CODEGUARD_REDACTED_{uuid4().hex}__"
        replacements[token] = match.group(3)
        return f"{match.group(1)}{match.group(2)}{token}{match.group(4)}"

    return SECRET_ASSIGNMENT.sub(replace, text), replacements


def restore_redactions(text: str, replacements: dict[str, str]) -> str:
    for placeholder, original in replacements.items():
        text = text.replace(placeholder, original)
    return text
