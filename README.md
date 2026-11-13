# Rengera AI

Rengera AI is a Rwanda-focused legal-literacy platform designed to make Rwandan legislation, official gazettes, and civic rights accessible to citizens, businesses, and legal practitioners. The web application helps users ask legal questions, inspect indexed laws and article-level citations, compare legal provisions, track statutory deadlines, and receive law-change alerts, while giving authorized administrators structured tools to ingest, classify, and review official source material. A Flutter mobile application (`mobile/`) provides an on-the-go companion with onboarding, authenticated login, and a recent-chats navigation shell.

> **Important Notice**: supporting sources, article citations, and review state, and must never be presented as formal legal advice or a guarantee of legal outcome.

---

## Core Capabilities & Product Vision

- **Multilingual Legal Q&A & Grounded Citations**: Answers citizen and business questions in Kinyarwanda, English, and French using hybrid retrieval over indexed Rwandan statutes and official gazettes, returning verified article references and clear confidence/limitation boundaries.

- **Citizen Legal Tools**: Dedicated workflows for emergency legal guidance, complaint drafting support, statutory deadlines/schedules, and shareable consultation views.
- **Admin Ingestion & Review Console**: Role-gated operations console for uploading official PDFs/gazettes, running staging classification and OCR triage, reviewing AI-extracted metadata, and approving laws for public indexing.

---

## Repository Map

```text
platform/   V2 React/Vite web application (TanStack Router, TanStack Query, i18n, RBAC UI)
server/     V2 Python/FastAPI backend (hybrid retrieval, auth/sessions, ingestion, USSD, tests)
contracts/  Versioned OpenAPI contrac

The combined production image packages the Platform frontend and FastAPI backend using `Dockerfile.vercel`, backed by Neon PostgreSQL and Cloudflare R2 object storage for source PDFs.

---

#
```

---

## Start Locally

### V2 Platform (`platform/`)

```bash
cd platform
pnpm install
cp .env.example .env.local
pnpm dev
```

### V2 Server (`server/`)

```bash
cd server
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

Configure the environment values required by your workflow (`DATABASE_URL`, object storage settings, and provider keys). Never commit `.env`, `.env.local`, or live credentials.

### Mobile (`mobile/`)

```bash
cd mobile
flutter pub get
flutter run
```

The Flutter app is a mobile companion scaffold (onboarding, login via server, and recent-chats shell) and is not yet at full feature-parity with the web platform.

---

## Useful Commands

- **V2 Server (`server/`)**:
  - `uv run ruff check .`
  - `uv run pytest -q`
  - `uv run python -m scripts.export_openapi --check`
- **V2 Platform (`platform/`)**:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

---

## Documentation & Specifications

- [`docs/README.md`](docs/README.md) — Full documentation index.
- [`docs/v2/README.md`](docs/v2/README.md) — V2 target architecture, UI design migration, ingestion/RAG pipeline, auth/RBAC, and deployment runbooks.

---

## Product & Security Boundaries

- **Server-Only Secrets**: Database and object storage credentials are strictly server-only. Public access is read-only; privileged ingestion, review, and staff management writes require verified RBAC authorization and CSRF protection.
- **Source Integrity**: Never overwrite `laws.raw_content`; reject invalid AI classifications before persistence.
- **Citation Transparency**: Preserve exact article text and surface source provenance and review status on every answer.
- **Safe Operations**: Do not run database migrations, upload corpus data, or deploy to hosted environments without explicit target-specific authorization.

---

## Branches

- `main` — Production release branch.
- `dev` — Active integration branch. Feature work starts from `dev` and returns through review.
