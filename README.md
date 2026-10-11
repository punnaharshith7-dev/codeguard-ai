# CodeGuard AI

An AI-assisted code security and coding platform with account access, multi-file review, repository projects, scan comparisons, team workspaces, proposed patches, and a guarded coding-agent workspace. The scanner is intentionally bounded and reports heuristic evidence rather than proof of exploitability.

## Architecture

```text
Browser (Next.js 15 / TypeScript / Tailwind / shadcn-style UI)
  ├─ Email/password + GitHub OAuth ── HttpOnly session cookie ──┐
  └─ Upload / dashboard API calls (credentialed CORS) ──────────┤
                                                               ▼
FastAPI API ── SQLAlchemy ── PostgreSQL (Neon / Render)
  ├─ Auth and user profile
  ├─ Bounded source, Python AST/taint, and IaC inspection
  ├─ Static rules + OSV dependency advisory lookup
  ├─ Optional server-side LLM adapters → ask / plan / edit / patch proposals
  ├─ GitHub App webhook → PR check run + changed-line annotations
  └─ Findings, trust settings, token usage, and action metadata
```

The scanner combines transparent source rules, Python AST and local taint checks, Terraform/Docker/Kubernetes configuration rules, and best-effort OSV checks for pinned dependencies. Candidate source-to-sink paths are heuristic evidence, not proof of exploitability. Uploaded and repository source is processed in memory and is not stored. Scan findings, triage state, redacted snippets, trust settings, and token-only agent audit metadata are persisted.

## Project layout

```text
frontend/                 Next.js App Router application
  src/app/                Landing, auth, and dashboard routes
  src/components/         Dashboard, Agent Studio, Trust Center, shared UI
  src/lib/                Typed API client and utilities
backend/                  FastAPI service
  app/api/                 Auth, scans, agent/trust, GitHub webhook routes
  app/core/                Configuration and auth helpers
  app/models/              SQLAlchemy persistence models
  app/services/            Scanner, repository access, OSV, LLM, redaction, and mail services
```

## Local development

### Docker Compose (recommended)

1. Copy `.env.example` to `.env` and replace `SECRET_KEY` and database credentials.
2. Run `docker compose up --build`.
3. Open [http://localhost:3000](http://localhost:3000). API health is at [http://localhost:8000/healthz](http://localhost:8000/healthz), and interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

### Run services separately

Backend (Python 3.11+):

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "sqlite:///./codeguard.db"
$env:SECRET_KEY = "local-only-change-this-to-a-long-random-secret"
$env:AUTH_BRIDGE_SECRET = "replace-this-with-the-same-random-secret-as-frontend"
uvicorn app.main:app --reload --port 8000
```

Frontend (Node.js 20+):

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `BACKEND_INTERNAL_URL=http://localhost:8000/api/v1`, a long random `NEXTAUTH_SECRET`, GitHub OAuth keys, and an `AUTH_BRIDGE_SECRET` matching the backend in `frontend/.env.local`. Set that same bridge secret in the backend environment. SQLite is only a local convenience; deploy with PostgreSQL.

## GitHub OAuth

Create a GitHub OAuth App with callback URL `http://localhost:3000/api/auth/callback/github`. Set its client ID and secret, `NEXTAUTH_SECRET`, and `AUTH_BRIDGE_SECRET` in the frontend environment. NextAuth manages the GitHub provider; the API verifies its provider token server-side and issues a separate API session. For production, use `https://<frontend-host>/api/auth/callback/github` as the callback.

## Optional AI provider

AI is disabled until the backend is configured. Add `LLM_PROVIDER`, `LLM_MODEL`, and (for remote providers) `LLM_API_KEY` to the backend environment. Supported providers are OpenAI, Anthropic, Groq, DeepSeek, and Ollama. `LLM_BASE_URL` is optional; for Ollama in Docker Compose the default points to `http://host.docker.internal:11434/v1`. Keep provider keys on the backend. Users must enable remote code sharing in the Trust Center before code is sent to a remote provider. Secret-like assignments are redacted before provider requests and restored only into locally returned edit proposals.

## Optional GitHub App pull-request gate

GitHub OAuth is only for sign-in. To scan PRs, create and install a separate GitHub App with repository **Contents: read**, **Pull requests: read**, and **Checks: write** permissions, subscribe to `pull_request` events, and set its webhook URL to `https://<api-host>/api/v1/github/webhook`. Configure `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_WEBHOOK_SECRET` on the backend, then install the app only on repositories you choose. Add **CodeGuard Security Gate** as a required status check in branch protection if high/critical findings should block merges. The service verifies the webhook signature, limits changed files, does not persist source, and only reports findings on added lines as inline annotations. See the [GitHub App webhook guide](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events) for app event setup.

## API overview

- `GET /healthz` — liveness check
- NextAuth handles browser sign-in at `/api/auth/*`; its credentials provider uses the backend email/password endpoints.
- `GET /api/v1/auth/me` — current account
- `POST /api/v1/auth/github/exchange` — server-side GitHub identity verification
- `POST /api/v1/scans` — authenticated multipart upload (`files`, repeatable)
- `GET /api/v1/scans` and `GET /api/v1/scans/{scan_id}` — private history and findings
- `PATCH /api/v1/scans/{scan_id}/findings/{finding_id}` — triage and assign a finding
- `GET /api/v1/scans/{scan_id}/sarif` — download a SARIF 2.1.0 report
- `DELETE /api/v1/scans/{scan_id}` — delete an owned scan
- `/api/v1/projects` — save GitHub repositories, scan them, compare baselines, and manage suppressions
- `/api/v1/workspaces` — shared workspaces, roles, and in-app notifications
- `POST /api/v1/scans/{scan_id}/fixes` — propose a bounded patch and run static verification
- `GET /api/v1/trust`, `PUT /api/v1/trust` — code-sharing consent, history retention, and daily token budget
- `POST /api/v1/agent/execute`, `GET /api/v1/agent/history` — bounded Ask / Plan / Edit sessions and metadata-only audit history
- `POST /api/v1/github/webhook` — signature-verified GitHub App pull-request checks

Interactive OpenAPI docs are available at `/docs` in local development. Production can disable docs with `API_DOCS_ENABLED=false`.

## Deployment

### Backend on Render

Create a Render Web Service from the root `render.yaml` blueprint (or set the service root to `backend/` and use its Dockerfile). Provision PostgreSQL (Neon or Render) and set `DATABASE_URL`, `SECRET_KEY`, `AUTH_BRIDGE_SECRET`, `ENVIRONMENT=production`, `FRONTEND_URL`, `BACKEND_URL`, and `COOKIE_SECURE=true`. Use `https://<api-host>/healthz` as the health check. Restrict `FRONTEND_URL` to the deployed frontend origin and set the same bridge secret on Vercel.

### Frontend on Vercel

Import `frontend/` as the project root. Set `BACKEND_INTERNAL_URL=https://<api-host>/api/v1`, `NEXTAUTH_URL=https://<frontend-host>`, `NEXTAUTH_SECRET`, `AUTH_BRIDGE_SECRET`, and GitHub OAuth credentials. Set the exact frontend origin as backend `FRONTEND_URL` and use the Vercel origin as the GitHub OAuth callback.

Free-tier services may sleep, have storage/compute limits, and do not guarantee background worker capacity. Long scans and autonomous agent runs need a queue/worker before enabling them in production.

## Security and product scope

- Passwords are hashed with Argon2; NextAuth stores an encrypted HttpOnly session and the backend API credential. Mutating API requests require the configured frontend origin or trusted server bridge.
- Per-process request throttles protect auth, uploads, agent runs, and general API traffic. Use a shared Redis-backed limiter before scaling the API to multiple instances.
- Upload count, file size, extension, encoding, and aggregate size are bounded. File names are normalized and source is not written to disk.
- Repository scans accept HTTPS `github.com/owner/repository` URLs and inspect at most 25 supported files within the configured source size limit. Public repositories work directly; private repositories require the configured GitHub App to be installed with **Contents: read** permission.
- Scheduled project scans run in the API process every minute and use the repository scan limits. Run a single API instance while using schedules; use a distributed worker/lock before scaling the API horizontally.
- Finding state and suppression reasons are retained with scan history. Project suppressions mark matching results as ignored on later scans; they do not delete older findings.
- Workspaces can share projects and scans with owner, admin, member, and viewer roles. Members are added by email after they have registered for CodeGuard. Finding assignments and scheduled scan completions create in-app notifications.
- GitHub pull-request failure thresholds are stored per connected project (critical, high, medium, low, or never). Repositories without a saved project use the default high threshold.
- SARIF export contains finding locations and status metadata. It does not include uploaded source text.
- Reset requests return a uniform response; delivery requires SMTP configuration. GitHub OAuth requires a configured OAuth App.
- Cross-file source-to-sink analysis is a bounded heuristic and can miss flows or produce contextual candidates; it is not a complete taint engine or proof of exploitability.
- Dependency checks use OSV version queries for pinned versions found in package-lock/npm-shrinkwrap, exact package.json entries, requirements files, Poetry/PDM/Cargo lockfiles, Gemfile.lock, go.mod, and Maven pom.xml. Network failures do not fail source scans. See the [OSV querybatch API](https://google.github.io/osv.dev/post-v1-querybatch/) for its version-query response behavior.
- Patch verification runs static rules and Python syntax parsing; it does not execute uploaded code or a project's tests. Offline auto-fixes are limited to an HTML sink rewrite and pinned requirements updates unless an opted-in AI provider proposes an edit. Patches remain previews and need human review.
- The agent offers Ask, Plan, and Edit with user-selected source context. It has no terminal, browser, or repository write access; edits remain in the browser until downloaded. Daily token limits are enforced and audit history omits prompts, code, and responses.
- Scan history retention is 30, 90, 365 days, or manual deletion. Expiry cleanup runs when scan history is requested; source files are never retained.
- GitHub PR checks require a configured and installed GitHub App. It reads changed files within scan limits and posts check-run annotations; configure branch protection separately to make the check required.
- Full autonomous terminal-based agents, Semgrep integration, email notifications, browser/editor extensions, localization, and voice remain future work. Current code and IaC checks are bounded heuristics; review findings before acting on them.
