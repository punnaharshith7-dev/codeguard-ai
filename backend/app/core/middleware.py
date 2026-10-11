from collections import defaultdict, deque
import secrets
from time import monotonic

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import settings


class RequestGuardMiddleware(BaseHTTPMiddleware):
    """Same-origin mutation guard and per-process request throttles."""

    def __init__(self, app):
        super().__init__(app)
        self.windows: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        method = request.method.upper()
        # GitHub sends server-to-server webhooks without a browser Origin; the endpoint
        # independently requires a valid X-Hub-Signature-256 HMAC.
        github_webhook = path == "/api/v1/github/webhook"
        if method in {"POST", "PUT", "PATCH", "DELETE"} and path.startswith("/api/") and not github_webhook:
            origin = request.headers.get("origin")
            bridge = request.headers.get("x-codeguard-auth-bridge", "")
            trusted_bridge = bool(settings.auth_bridge_secret) and secrets.compare_digest(bridge, settings.auth_bridge_secret)
            if not trusted_bridge and origin != settings.frontend_url.rstrip("/"):
                return JSONResponse({"detail": "Request origin is not allowed"}, status_code=403)

        address = request.client.host if request.client else "unknown"
        now = monotonic()
        if path.startswith("/api/v1/auth/"):
            bucket, max_requests, window = "auth", 20, 60
        elif path == "/api/v1/scans" and method == "POST":
            bucket, max_requests, window = "scan", 12, 60
        elif path == "/api/v1/agent/execute":
            bucket, max_requests, window = "agent", 8, 60
        else:
            bucket, max_requests, window = "general", 180, 60
        key = (address, bucket)
        events = self.windows[key]
        while events and now - events[0] >= window:
            events.popleft()
        if len(events) >= max_requests:
            retry_after = max(1, int(window - (now - events[0])))
            return JSONResponse(
                {"detail": "Too many requests. Please try again shortly."},
                status_code=429,
                headers={"Retry-After": str(retry_after)},
            )
        events.append(now)
        if len(self.windows) > 10_000:
            for stale_key, stale_events in list(self.windows.items()):
                if not stale_events or now - stale_events[-1] > 300:
                    self.windows.pop(stale_key, None)

        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response

