# Architecture:
# Next.js + NextAuth browser session -> same-origin /api/core proxy -> FastAPI
# NextAuth server bridge -------------------------------> FastAPI auth -> PostgreSQL
# file upload -> bounded in-memory scanner -> findings/history -> PostgreSQL
# Semgrep, dependency checks, LLM review, and agents plug in behind services/scanner.py.

import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.core.database import initialize_database
from app.api.scans import router as scans_router
from app.api.features import router as features_router
from app.api.github import router as github_router
from app.api.projects import router as projects_router, scheduled_scan_loop
from app.api.workspaces import router as workspaces_router
from app.core.config import settings
from app.core.middleware import RequestGuardMiddleware
from app.models import entities  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.environment.lower() in {"production", "prod"}:
        if len(settings.secret_key) < 32 or settings.secret_key.startswith("development-only"):
            raise RuntimeError("Set SECRET_KEY to a random value of at least 32 characters in production")
        if len(settings.auth_bridge_secret) < 32:
            raise RuntimeError("Set AUTH_BRIDGE_SECRET to a random value of at least 32 characters in production")
        if not settings.cookie_secure:
            raise RuntimeError("COOKIE_SECURE must be true in production")
    initialize_database()
    scheduler = asyncio.create_task(scheduled_scan_loop())
    try:
        yield
    finally:
        scheduler.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.api_docs_enabled else None,
    redoc_url="/redoc" if settings.api_docs_enabled else None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url.rstrip("/")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Requested-With"],
)
app.add_middleware(RequestGuardMiddleware)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(features_router, prefix="/api/v1")
app.include_router(github_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(workspaces_router, prefix="/api/v1")


@app.get("/healthz", tags=["health"])
def healthz():
    return {"status": "ok", "service": "codeguard-api"}


@app.get("/api/v1/health", tags=["health"])
def api_health():
    return JSONResponse({"status": "ok"})
