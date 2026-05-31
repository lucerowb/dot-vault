<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Agent maintenance guide

**Read this before finishing any task.** DotVault is a monorepo: a change in the web app often requires matching updates in the **CLI**, **browser extension**, **Docusaurus docs**, **README**, and other repo files. Apply these in the **same PR** unless the user explicitly scoped work to one package only.

**Do not wait for the user to ask** — treating doc, README, CLI, extension, and config updates as part of “done” is required, not optional.

## Monorepo map

| Area | Path | Built / served by |
| ---- | ---- | ----------------- |
| Web app | `src/`, `next.config.ts` | `pnpm dev`, `pnpm build` |
| API routes | `src/app/api/**` | Same as web |
| Database | `src/lib/db/`, `drizzle/` | `pnpm run db:generate`, `pnpm run db:migrate` |
| User docs (source) | `docs/*.md` | — |
| Docs site (Docusaurus) | `packages/docs-site/` | `pnpm build:docs` → `public/docs/` (via `prebuild`) |
| CLI | `packages/cli/` | `pnpm build:cli` |
| Browser extension | `packages/browser-extension/` | `pnpm build:extension` |

Published docs URL: **`/docs/`** (Docusaurus). Prose source of truth: **`docs/`** only (not a second copy under `packages/docs-site/`).

---

## Mandatory checklist (end of every task)

Work through this list before marking a task complete. If a row applies and you skipped it, update it now.

### Product code & packages

- [ ] **Web app** — `src/` (UI, API routes, `src/lib/*`) implements the change.
- [ ] **CLI** — API/auth/project/env behavior → `packages/cli/src/` + **`packages/cli/README.md`**; sync **`docs/CLI.md`**; **`packages/cli/CHANGELOG.md`** for user-visible CLI changes.
- [ ] **Browser extension** — Same API/platforms/injection → `packages/browser-extension/src/`, **`manifest.json`**, **`docs/BROWSER_EXTENSION.md`**.
- [ ] **Drizzle** — Schema change → `pnpm run db:generate`, commit `drizzle/*`, document if user-facing.

### Documentation (`docs/` + Docusaurus)

- [ ] **`docs/*.md`** — Behavior, setup, or public API changed → update the right guide (or add `docs/<TOPIC>.md`).
- [ ] **`packages/docs-site/sidebars.ts`** — New `docs/<NAME>.md` → add `NAME` to a category.
- [ ] **`docs/FEATURES_SUMMARY.md`** — New or materially changed feature → entry + link to guide.
- [ ] **`docs/README.md`** — New top-level guide worth listing on the docs home.
- [ ] **`pnpm build:docs`** — Run after any `docs/` or `packages/docs-site/` edit; fix broken links / MDX issues.

### README & repo-level docs

- [ ] **[`README.md`](./README.md)** — See [README sections to keep in sync](#readme-sections-to-keep-in-sync).
- [ ] **[`.env.example`](./.env.example)** — New, renamed, or removed env var (with short comment).
- [ ] **[`CONTRIBUTING.md`](./CONTRIBUTING.md)** — New prerequisite, script, or workflow contributors must know.
- [ ] **[`SECURITY.md`](./SECURITY.md)** — Only if reporting process or security-relevant surface changes (rare).
- [ ] **Package READMEs** — `packages/cli/README.md`, `packages/docs-site/README.md` when behavior of that package changes.

### App integration & UX

- [ ] **`src/lib/integration-guides.tsx`** — In-app integration copy references correct doc paths/commands.
- [ ] **`src/components/*Integration*`**, **`MarketingHome.tsx`** — User-visible feature lists or doc links match reality.
- [ ] **Links to `/docs/`** — Use **`DocsLink`**, never `next/link`. Home reloads on browser back via **`useReloadHomeAfterDocsBack`** (bfcache + Framer Motion).

### Tooling, Docker, CI

- [ ] **Root [`package.json`](./package.json) scripts** — New/changed `pnpm` script exposed to users.
- [ ] **[`Dockerfile`](./Dockerfile)** / **[`Dockerfile.dev`](./Dockerfile.dev)** / **[`docker-compose.yml`](./docker-compose.yml)** / **[`docker-compose.dev.yml`](./docker-compose.dev.yml)** — Build steps, ports, healthchecks, or env vars for deploy/dev.
- [ ] **[`docs/SELF_HOSTED.md`](./docs/SELF_HOSTED.md)** / **[`docs/MANUAL_STEPS.md`](./docs/MANUAL_STEPS.md)** — Deploy and production setup steps.
- [ ] **[`.github/workflows/ci.yml`](./.github/workflows/ci.yml)** — New paths that should trigger app/cli/extension jobs.
- [ ] **[`.github/workflows/release.yml`](./.github/workflows/release.yml)** — New publishable package or release path (rare).

### Quality

- [ ] **Tests** — `src/lib/*.test.ts` for crypto/parsing/rate limits; `e2e/` for critical flows when appropriate.
- [ ] **Verification** — Commands in [Verification](#verification) for every area you touched.

---

## README sections to keep in sync

[`README.md`](./README.md) is the first file users and agents read. Update the relevant sections when behavior changes:

| README section | Update when |
| -------------- | ----------- |
| **Quick start** / **Setup** | Install steps, migrations, or local dev commands change |
| **Monorepo packages** | New workspace package or renamed path |
| **Features** | User-facing capability added/removed/renamed |
| **How to use** | Core flows (quick share, vault, dashboard) change |
| **Environment variables** | Any server/client env var added, renamed, or deprecated |
| **HTTP API** | Public route, method, auth, or request/response contract changes |
| **CI** | Workflow names or what runs on PR |
| **Documentation** | New guide file or `/docs/` workflow change |
| **Deploying** / Docker blurb | Docker Compose, Coolify, or build commands change |
| **Scripts table** (under Quick start) | New `pnpm` scripts (`dev`, `build:docs`, `build:cli`, etc.) |

Keep the **Documentation** table in README aligned with important `docs/*.md` files (not every trivial edit).

---

## When you change X, also update Y

### Web app (`src/`)

| You changed | Also update |
| ----------- | ----------- |
| `src/app/api/**` (routes, request/response, auth) | CLI `packages/cli/src/api.ts` + commands; extension `background.ts`; `docs/*.md` (e.g. `API_WEBHOOKS.md`); README **HTTP API**; `.env.example` if new secrets |
| `src/lib/db/schema.ts` | Drizzle migration; `FEATURES_SUMMARY.md`; feature-specific `docs/*.md` |
| `src/lib/auth.ts` or auth API | CLI + extension auth; `docs/2FA.md`; README env table (`BETTER_AUTH_*`) |
| `src/lib/secret-templates.ts` | `docs/SECRET_TEMPLATES.md`; extension if fill/detection depends on templates |
| `src/lib/import-export.ts` or import/export API | `docs/IMPORT_EXPORT.md`; CLI commands if any |
| `src/lib/*-integration.ts`, GitHub/webhooks | Matching `docs/*.md`, `integration-guides.tsx`, integration UI components |
| New dashboard page or headline feature | `FEATURES_SUMMARY.md`, README **Features**, `MarketingHome.tsx` if marketed on home |
| `next.config.ts` (CSP, `/docs/` rewrites) | `packages/docs-site/` if docs hosting changes; README **Deploying** / dev notes |
| New public env var | `.env.example`, README **Environment variables**, `MANUAL_STEPS.md`, `SELF_HOSTED.md` |

### CLI (`packages/cli/`)

| You changed | Also update |
| ----------- | ----------- |
| New/changed command or flag | **`packages/cli/README.md`** (required); `docs/CLI.md`; `FEATURES_SUMMARY.md`; README **How to use** / monorepo CLI blurb if discoverability matters |
| `packages/cli/src/api.ts` or auth | `src/app/api/**`; extension `background.ts` |
| User-visible release | `packages/cli/CHANGELOG.md` |

Version bump on every change is **not** required; release workflow patches on `main` when `packages/cli/**` changes.

### Browser extension (`packages/browser-extension/`)

| You changed | Also update |
| ----------- | ----------- |
| New host platform (Vercel, Netlify, …) | `manifest.json` permissions + `content_scripts`; `content.ts`; `BROWSER_EXTENSION.md`; README **Features** if listed |
| API URL or endpoints | `background.ts` + CLI + `src/app/api/**` |
| Permissions / manifest version | `manifest.json`; `BROWSER_EXTENSION.md` |

Extension release is automated via `.github/workflows/release.yml` when `packages/browser-extension/**` changes.

### Docusaurus (`docs/` + `packages/docs-site/`)

| You changed | Also update |
| ----------- | ----------- |
| User-facing guide text | **`docs/`** only |
| New `docs/MY_FEATURE.md` | `sidebars.ts`; `FEATURES_SUMMARY.md`; optional `docs/README.md`; README **Documentation** table |
| Navbar / footer / site URL | `packages/docs-site/docusaurus.config.ts` |
| Links outside `docs/` tree | Full GitHub URLs — `../packages/...` breaks `pnpm build:docs` |
| `<` in markdown tables | Rephrase or escape — MDX parse errors (e.g. `Under 60` not `<60`) |

### Docker & scripts

| You changed | Also update |
| ----------- | ----------- |
| `pnpm dev` / `build:docs` / ports | README scripts table, `packages/docs-site/README.md`, **`AGENTS.md`** verification block |
| Production image or compose | `Dockerfile`, `docker-compose.yml`, `docs/SELF_HOSTED.md`, README **Deploying** |
| Local docker dev | `Dockerfile.dev`, `docker-compose.dev.yml` |

---

## New feature workflow (recommended order)

1. Implement **`src/`** (and API / schema as needed).
2. Update **CLI** and/or **extension** if they share the same API or workflows.
3. Add or update **`docs/<TOPIC>.md`**, **`FEATURES_SUMMARY.md`**, **`sidebars.ts`**.
4. Update **`.env.example`**, **`README.md`**, **`MANUAL_STEPS.md`**, **`SELF_HOSTED.md`** for setup/deploy.
5. Update **`integration-guides.tsx`** / UI copy that references docs or commands.
6. Run [verification](#verification).

---

## Verification

From repo root, run what matches your change:

```bash
pnpm lint                    # web app
pnpm test                    # unit tests
pnpm build:docs              # required if docs/ or packages/docs-site/ changed
pnpm build:cli               # if packages/cli/ changed
pnpm --filter dotvault-browser-extension build   # if extension changed
pnpm build                   # full app (prebuild runs build:docs)
```

- **CLI:** `pnpm build:cli` then `pnpm dv` against a running `pnpm dev` app.
- **Extension:** `pnpm build:extension`, load unpacked from `packages/browser-extension/dist/`.
- **Docs in app:** `pnpm dev` (Next + Docusaurus); open `/docs/` via **DocsLink**, not `next/link`.

---

## What not to duplicate

| Topic | Single source of truth |
| ----- | ------------------------ |
| CLI commands | `packages/cli/README.md` — `docs/CLI.md` is overview + link only |
| Guide prose | `docs/` — Docusaurus reads `../../docs` |
| Secrets | Never commit `.env`, `.env.local`, or real credentials |
| README vs guides | README = overview, quick start, tables; deep detail lives in `docs/*.md` |

---

## Quick index: which file to edit

| If you are documenting… | Primary file(s) |
| ----------------------- | ---------------- |
| End-user feature (any surface) | `docs/<TOPIC>.md`, `docs/FEATURES_SUMMARY.md`, README **Features** |
| CLI usage | `packages/cli/README.md`, `docs/CLI.md` |
| Extension | `docs/BROWSER_EXTENSION.md`, `manifest.json` |
| Self-host / Docker | `docs/SELF_HOSTED.md`, `Dockerfile`, `docker-compose.yml` |
| Production env setup | `docs/MANUAL_STEPS.md`, `.env.example`, README **Environment variables** |
| Public HTTP API | README **HTTP API**, `docs/API_WEBHOOKS.md`, CLI/extension clients |
| Contributor workflow | `CONTRIBUTING.md` |
| AI agent rules (this file) | `AGENTS.md` — update when cross-package or dev workflow changes |

### `docs/` topic map

| Topic | File |
| ----- | ---- |
| Feature index | `FEATURES_SUMMARY.md` |
| Docs home | `README.md` |
| Production setup | `MANUAL_STEPS.md`, `SELF_HOSTED.md` |
| CLI | `CLI.md` |
| Extension | `BROWSER_EXTENSION.md` |
| API keys / webhooks | `API_WEBHOOKS.md` |
| GitHub App | `GITHUB_INTEGRATION.md` |
| Import/export | `IMPORT_EXPORT.md` |
| Security (2FA, IP, break-glass, audit) | `2FA.md`, `IP_ALLOWLIST.md`, `BREAK_GLASS.md`, `AUDIT_LOGS.md`, `ACCESS_REQUESTS.md` |

Human-oriented contributing notes: [`CONTRIBUTING.md`](./CONTRIBUTING.md).
