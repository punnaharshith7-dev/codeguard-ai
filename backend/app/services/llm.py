"""Optional, server-side LLM adapters. Code is never sent unless the user opted in."""

from dataclasses import dataclass

import httpx
from fastapi import HTTPException

from app.core.config import settings


PROVIDERS = {"openai", "anthropic", "groq", "deepseek", "ollama"}
LOCAL_PROVIDERS = {"ollama"}
OPENAI_BASES = {
    "openai": "https://api.openai.com/v1",
    "groq": "https://api.groq.com/openai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "ollama": "http://host.docker.internal:11434/v1",
}


@dataclass(frozen=True)
class Completion:
    text: str
    input_tokens: int
    output_tokens: int
    provider: str
    model: str


def provider_info() -> dict:
    provider = settings.llm_provider.strip().lower()
    supported = provider in PROVIDERS
    configured = supported and bool(settings.llm_model.strip()) and (provider in LOCAL_PROVIDERS or bool(settings.llm_api_key.strip()))
    return {
        "configured": configured,
        "provider": provider if supported else "",
        "model": settings.llm_model if configured else "",
        "is_local": provider in LOCAL_PROVIDERS,
    }


async def complete(system: str, user: str, max_tokens: int) -> Completion:
    info = provider_info()
    provider = info["provider"]
    if not info["configured"]:
        raise HTTPException(status_code=503, detail="No supported AI provider is configured on the server")
    if max_tokens < 1:
        raise HTTPException(status_code=429, detail="Your daily token budget is exhausted")

    base = settings.llm_base_url.strip().rstrip("/") or OPENAI_BASES.get(provider, "")
    timeout = httpx.Timeout(max(5, min(settings.llm_timeout_seconds, 90)), connect=5)
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            if provider == "anthropic":
                headers.pop("Authorization", None)
                headers["x-api-key"] = settings.llm_api_key
                headers["anthropic-version"] = "2023-06-01"
                response = await client.post(f"{base or 'https://api.anthropic.com'}/v1/messages", headers=headers, json={
                    "model": settings.llm_model,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                })
                response.raise_for_status()
                payload = response.json()
                text = "\n".join(part.get("text", "") for part in payload.get("content", []) if part.get("type") == "text")
                usage = payload.get("usage") or {}
                input_tokens = int(usage.get("input_tokens") or 0)
                output_tokens = int(usage.get("output_tokens") or 0)
            else:
                if provider == "ollama" and settings.llm_api_key:
                    headers["Authorization"] = f"Bearer {settings.llm_api_key}"
                request_body = {
                    "model": settings.llm_model,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "temperature": 0.2,
                }
                if provider == "groq":
                    request_body["max_completion_tokens"] = max_tokens
                    if settings.llm_model.startswith("openai/gpt-oss-"):
                        request_body["reasoning_effort"] = "low"
                        request_body["include_reasoning"] = False
                else:
                    request_body["max_tokens"] = max_tokens
                response = await client.post(f"{base}/chat/completions", headers=headers, json=request_body)
                response.raise_for_status()
                payload = response.json()
                choices = payload.get("choices") or []
                text = str((choices[0].get("message") or {}).get("content") or "") if choices else ""
                usage = payload.get("usage") or {}
                input_tokens = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
                output_tokens = int(usage.get("completion_tokens") or usage.get("output_tokens") or 0)
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="The configured AI provider timed out") from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="The configured AI provider rejected the request; check its server-side configuration") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach the configured AI provider") from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="The AI provider returned an unsupported response") from exc
    if not text.strip():
        raise HTTPException(status_code=502, detail="The AI provider returned an empty response")
    return Completion(
        text=text[:100_000],
        input_tokens=max(input_tokens, 0) or max(1, (len(system) + len(user)) // 4),
        output_tokens=max(output_tokens, 0) or max(1, len(text) // 4),
        provider=provider,
        model=settings.llm_model,
    )
