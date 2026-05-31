# DotVault

**Ephemeral _and_ authenticated cloud storage for `.env` files.**

- **Quick share** — encrypt in the browser (**AES-256-GCM**), store ciphertext in [Upstash Redis](https://upstash.com/), put the key in the **URL fragment** so it never hits your server.
- **Cloud vault** — sign in with [**Better Auth**](https://www.better-auth.com/) (email + password), organize **projects**, upload and **view / update / delete** env blobs stored in [**Supabase Postgres**](https://supabase.com/) via [Drizzle ORM](https://orm.drizzle.team/). Payloads are **encrypted at rest** with **AES-256-GCM** using `STORAGE_ENCRYPTION_KEY`.

|                |                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------- |
| **Maintainer** | Srijan Bajracharya ([srijan.bajracharya97@gmail.com](mailto:srijan.bajracharya97@gmail.com)) |
| **Repository** | [github.com/lucerowb/dot-vault](https://github.com/lucerowb/dot-vault)                       |
| **License**    | MIT (see [LICENSE](./LICENSE))                                                               |

---

## Table of contents

- [Quick start](#quick-start)
- [Monorepo packages](#monorepo-packages)
- [Features](#features)
- [How to use](#how-to-use)
- [Environment variables](#environment-variables)
- [HTTP API](#http-api)
- [CI](#ci)
- [Documentation](#documentation)
- [Security notes](#security-notes)
- [Deploying](#deploying)

---

## Quick start

### Prerequisites

- Node.js **20+** and **[pnpm](https://pnpm.io/)** 9.x
- **Supabase** (or any Postgres): `DATABASE_URL` with `?sslmode=require` in production
- **Upstash Redis** (optional): required for ephemeral quick share and production rate limits

### Setup

```bash
git clone https://github.com/lucerowb/dot-vault.git
cd dot-vault
cp .env.example .env.local
# Fill DATABASE_URL, BETTER_AUTH_SECRET, STORAGE_ENCRYPTION_KEY, Redis for quick share, etc.
pnpm install
pnpm run db:migrate   # or apply drizzle/*.sql in order in the Supabase SQL editor
pnpm dev
```

- Home: [http://localhost:3000](http://localhost:3000)
- **Quick share**: [`/quick-share`](/quick-share)
- **Cloud vault**: register → [`/dashboard`](/dashboard)

If `pnpm install` complains about ignored build scripts (`esbuild`), run `pnpm approve-builds` once and retry.

### Scripts

| Command | Purpose |
| -------- | -------- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (crypto helpers) |
| `pnpm test:e2e` | Playwright (install browser first: `pnpm exec playwright install chromium`) |
| `pnpm build:cli` | Build `packages/cli` |
| `pnpm build:extension` | Build `packages/browser-extension` → `dist/` |
| `pnpm run db:generate` | Regenerate Drizzle migrations |
| `pnpm run db:migrate` | Apply migrations |
| `pnpm run db:push` | Push schema (dev prototyping) |

---

## Monorepo packages

pnpm workspace (see [`pnpm-workspace.yaml`](./pnpm-workspace.yaml)):

| Package | Path | Description |
| -------- | ------ | ------------- |
| **dot-vault** (app) | `.` | Next.js web app + API |
| **dotvault** (CLI) | `packages/cli` | Terminal client for projects and env files |
| **dotvault-browser-extension** | `packages/browser-extension` | Chrome extension for one-click fills on host platforms |

Build artifacts (`dist/`, `node_modules/`) are gitignored; CI builds them on demand.

---

## Features

### Core (web app)

| Feature | Summary | Details |
| -------- | --------- | -------- |
| **Quick share** | Client-side encrypted links with TTL, optional passphrase, one-time URLs, sender revoke | [Quick share](#quick-share) below |
| **Cloud vault** | Projects, labeled env files, encrypted at rest | [Cloud vault](#cloud-vault) |
| **Collaboration** | Invite by email (`editor` / `viewer`), accept at `/invite/<token>` | [Collaboration](#collaboration) |
| **Version history** | Automatic versions per env, diff and rollback in the dashboard | [docs/VERSION_HISTORY.md](./docs/VERSION_HISTORY.md) |
| **Audit logs** | Who did what, when, from where; export from API | [docs/AUDIT_LOGS.md](./docs/AUDIT_LOGS.md) |
| **Import / export** | `.env`, JSON, and more via API | [docs/IMPORT_EXPORT.md](./docs/IMPORT_EXPORT.md) |
| **Secret templates** | Pre-built patterns (AWS, Stripe, DB, etc.) | [docs/SECRET_TEMPLATES.md](./docs/SECRET_TEMPLATES.md) |
| **GitHub integration** | Connect repos, sync secrets, scan, webhooks | [docs/GITHUB_INTEGRATION.md](./docs/GITHUB_INTEGRATION.md) |

### Security and access

| Feature | Summary | Details |
| -------- | --------- | -------- |
| **2FA** | TOTP, WebAuthn, backup codes | [docs/2FA.md](./docs/2FA.md) |
| **IP allowlisting** | CIDR / per-IP restrictions on projects | [docs/IP_ALLOWLIST.md](./docs/IP_ALLOWLIST.md) |
| **Access requests** | Time-limited elevated access with approval | [docs/ACCESS_REQUESTS.md](./docs/ACCESS_REQUESTS.md) |
| **Break-glass** | Emergency access with multi-approver workflow | [docs/BREAK_GLASS.md](./docs/BREAK_GLASS.md) |
| **Secret analytics** | Weak/duplicate secrets, security scoring | [docs/SECRET_ANALYTICS.md](./docs/SECRET_ANALYTICS.md) |

### Automation and integrations

| Feature | Summary | Details |
| -------- | --------- | -------- |
| **Secret rotation** | Schedules and provider hooks (AWS, Stripe, custom) | [docs/SECRET_ROTATION.md](./docs/SECRET_ROTATION.md) |
| **Environment sync** | Promote staging → production with approvals | [docs/ENV_SYNC.md](./docs/ENV_SYNC.md) |
| **CI/CD helpers** | GitHub Actions, GitLab, CircleCI workflow snippets | [docs/CICD_INTEGRATION.md](./docs/CICD_INTEGRATION.md) |
| **Notifications** | Slack, Discord, generic webhooks | [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) |
| **API keys & webhooks** | REST API, outbound webhooks, SDK notes | [docs/API_WEBHOOKS.md](./docs/API_WEBHOOKS.md) |

### Enterprise

| Feature | Summary | Details |
| -------- | --------- | -------- |
| **Team workspaces** | Multi-project orgs, SAML/OIDC SSO | [docs/TEAM_WORKSPACES.md](./docs/TEAM_WORKSPACES.md) |
| **Self-hosted** | Docker, Kubernetes, cloud runbooks | [docs/SELF_HOSTED.md](./docs/SELF_HOSTED.md) |

### CLI and browser extension

| Package | Summary | Details |
| -------- | --------- | -------- |
| **CLI** | Login, list projects/envs, push/pull `.env`, init | [CLI](#cli) · [docs/CLI.md](./docs/CLI.md) |
| **Browser extension** | Fill env vars on Vercel, Netlify, GitHub, Railway, etc. | [Browser extension](#browser-extension) · [docs/BROWSER_EXTENSION.md](./docs/BROWSER_EXTENSION.md) |

Full feature index: [docs/FEATURES_SUMMARY.md](./docs/FEATURES_SUMMARY.md). Production setup checklist: [docs/MANUAL_STEPS.md](./docs/MANUAL_STEPS.md).

---

## How to use

### Quick share

1. Open [`/quick-share`](/quick-share).
2. Paste `.env` content (or upload a file).
3. Choose TTL (1h–7d) and optional **one-time** or **passphrase**.
4. Share the link; the decryption key stays in the `#fragment` (never sent to the server).
5. Recipients open `/r/<token>#…` to decrypt in the browser.
6. To revoke before expiry: use the delete token from the upload response with `DELETE /api/vault/:token` and header `X-Delete-Token`.

### Cloud vault

1. Register at [`/register`](/register) and sign in.
2. **Dashboard** → create a **project** (name + slug).
3. Open the project → **Environments** tab → add a **label** (e.g. `staging`, `production`) and paste `.env` content.
4. View, edit, or delete env files; share a stored env via quick-share from the project UI.
5. Tabs on the project page: **Version history**, **Audit log**, **GitHub** (when configured).

### Collaboration

1. Project **owner** → invite by email with role **editor** or **viewer**.
2. Invitee signs in with that email and opens `/invite/<token>`.
3. **Editors** can create/update/delete env blobs; **viewers** can read and quick-share from stored envs.

Apply migrations through `0003_*` (or latest in [`drizzle/`](./drizzle/)) for invites, audit, GitHub, and enterprise tables—see [docs/MANUAL_STEPS.md](./docs/MANUAL_STEPS.md).

### GitHub Releases

Releases are **automatic** when you merge to `main` (with changes under `packages/cli` or `packages/browser-extension`):

1. CI ensures tag `v{version}` exists (`version` from [`packages/cli/package.json`](./packages/cli/package.json)).
2. Builds CLI + extension and publishes assets to **[Releases](https://github.com/lucerowb/dot-vault/releases)** (not just the **Tags** tab — open **Releases** for downloads).

| Secret | Required for | How to get it |
| ------ | ------------- | ------------- |
| *(none)* | GitHub Release assets only | Built-in `GITHUB_TOKEN` |
| **`NPM_TOKEN`** | **`npx @lucerowb/dot-vault`** on npm | See [npm token setup](#npm-token-setup) below |

#### npm token setup

1. [npmjs.com](https://www.npmjs.com/) → **Profile** → **Access Tokens** → **Generate New Token** → **Granular Access Token**
2. Permissions: **Read and write** for packages (scope `@lucerowb` or all packages)
3. Enable **“Bypass two-factor authentication (2FA) for automation”** (required for CI; npm returns 403 without it)
4. Copy the **token value** (`npm_…` — shown only once at creation) into GitHub **Settings → Secrets → Actions** as secret name **`NPM_TOKEN`**.  
   The token **label** on npm (e.g. `dot-vault`) is not the secret; you must paste the `npm_` string. Re-save the secret after rotating the token.

Classic **Automation** tokens also work. A normal publish token without bypass 2FA will fail in GitHub Actions with `403 Forbidden`.

**To ship a new release:** merge CLI or extension changes to `main` under `packages/cli/**` or `packages/browser-extension/**`. The Release workflow will:

1. Detect what changed (CLI vs extension)
2. **Auto-bump** the CLI patch version if that version is already on npm or already tagged
3. Commit the version bump to `main` with `[skip ci]`
4. Publish GitHub Release assets and npm (`@lucerowb/dot-vault`) when `NPM_TOKEN` is set

You only need to edit `packages/cli/package.json` version manually for **minor/major** releases; patch releases are automatic after code changes.

### Install CLI from npm

The unscoped name `dot-vault` is blocked by npm (too similar to `dotvault`). The package is published as **`@lucerowb/dot-vault`**:

```bash
# Run once (no global install)
npx @lucerowb/dot-vault@latest login

# Or install globally (provides `dot-vault` and `dotvault` commands)
npm install -g @lucerowb/dot-vault
dot-vault login
```

**Fix a tag that has no assets** (e.g. only “Source code zip”): **Actions → Release → Run workflow** → leave tag empty (uses package version) or set `v0.1.0`.

Each release includes:

| Asset | Install / use |
| ----- | ---------------- |
| `dotvault-cli-<version>.npm.tgz` | `npm install -g ./dotvault-cli-0.1.0.npm.tgz` (Node 18+) |
| `dotvault-cli-<version>.tar.gz` | Extract, then `node bin/dotvault.js` (includes dependencies) |
| `dotvault-extension-<version>.zip` | Chrome → Extensions → Load unpacked (extract zip, select folder) |
| `SHA256SUMS-<version>.txt` | Checksums |

Downloads: [github.com/lucerowb/dot-vault/releases](https://github.com/lucerowb/dot-vault/releases)

### CLI

From the repo (development):

```bash
pnpm build:cli
node packages/cli/bin/dot-vault.js login
node packages/cli/bin/dot-vault.js projects
node packages/cli/bin/dot-vault.js envs my-project-slug
node packages/cli/bin/dot-vault.js pull production -p my-project-slug -o .env
node packages/cli/bin/dot-vault.js push .env -p my-project-slug -l staging
node packages/cli/bin/dot-vault.js init   # detect local .env files and link a project
```

Commands: `login`, `logout`, `status`, `projects` (`ls`), `envs` (`list`), `pull`, `push`, `delete`, `init`.

Default API URL is resolved at runtime (first match wins):

1. `~/.dotvault/config.json` (`apiUrl` from `dot-vault login --api-url`)
2. `DOTVAULT_API_URL`
3. `BETTER_AUTH_URL`
4. `NEXT_PUBLIC_APP_URL`
5. `http://localhost:3000`

From the repo root, the CLI also loads `.env.local` / `.env` when you run it (same vars as the Next.js app). See [docs/CLI.md](./docs/CLI.md).

### Browser extension

```bash
pnpm build:extension
```

1. Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → select `packages/browser-extension/dist`.
2. Open the extension popup → connect your DotVault account.
3. On supported sites (Vercel, Netlify, GitHub Actions secrets, Railway, etc.), use the extension to fill variables from a selected project/env.

See [docs/BROWSER_EXTENSION.md](./docs/BROWSER_EXTENSION.md) for platform URLs and permissions.

### Import / export (API)

Authenticated session or API key (when enabled):

- **Import**: `POST /api/projects/:projectId/import` — body with format and payload ([docs/IMPORT_EXPORT.md](./docs/IMPORT_EXPORT.md)).
- **Export**: `GET /api/projects/:projectId/envs/:envId/export?format=env|json|…`.

### GitHub

1. Set `GITHUB_APP_*` / webhook secrets in `.env.local` (see `.env.example`).
2. In the project dashboard → **GitHub** tab → connect repository.
3. Configure sync rules; optional secret scanning via `/api/github/scan`.

[docs/GITHUB_INTEGRATION.md](./docs/GITHUB_INTEGRATION.md)

### Programmatic access

- Session cookie: same-origin requests from the web app.
- **API keys** and **webhooks**: [docs/API_WEBHOOKS.md](./docs/API_WEBHOOKS.md).
- **CI/CD**: generate workflow snippets from [docs/CICD_INTEGRATION.md](./docs/CICD_INTEGRATION.md) or use the CLI in GitHub Actions.

---

## Environment variables

| Variable | Required | Description |
| -------- | -------- | ------------- |
| `DATABASE_URL` | **Yes** (cloud vault) | Postgres URI (`?sslmode=require` in prod) |
| `BETTER_AUTH_SECRET` | **Yes** (prod) | Session signing (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Recommended | App origin for auth callbacks |
| `STORAGE_ENCRYPTION_KEY` | **Yes** (cloud vault) | Base64 32-byte key for at-rest env encryption |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public URL for links and auth client |
| `UPSTASH_REDIS_REST_URL` | Quick share / rate limits | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Quick share / rate limits | Upstash REST token |

Optional: SMTP (invites, resets), OAuth providers, GitHub App, S3 backups, workspace SSO—see [.env.example](./.env.example) and [docs/MANUAL_STEPS.md](./docs/MANUAL_STEPS.md).

### Security note (cloud vault)

Cloud-stored env **plaintext** is visible to the **Next.js server** when you view or save a file: the app decrypts with `STORAGE_ENCRYPTION_KEY` to serve the UI. This is **not** the same zero-knowledge model as quick share. Protect `STORAGE_ENCRYPTION_KEY` and your database like any secrets backend.

---

## HTTP API

### Quick share (no session)

| Method | Path | Description |
| ------ | ---- | ------------- |
| `POST` | `/api/vault` | Store ciphertext in Redis (`ttl`, `oneTime`, `iv`, `ciphertext`) |
| `GET` | `/api/vault/:token` | Fetch ciphertext metadata |
| `DELETE` | `/api/vault/:token` | Revoke with `X-Delete-Token` |

### Cloud vault (session required)

| Method | Path | Description |
| ------ | ---- | ------------- |
| `GET` / `POST` | `/api/projects` | List / create projects |
| `GET` / `PATCH` / `DELETE` | `/api/projects/:id` | Project CRUD |
| `GET` / `POST` | `/api/projects/:id/envs` | List / create-or-overwrite by label |
| `GET` / `PATCH` / `DELETE` | `/api/projects/:id/envs/:envId` | Env CRUD (decrypted content on GET) |
| `GET` | `/api/projects/:id/envs/:envId/versions` | Version history |
| `POST` | `/api/projects/:id/envs/:envId/versions` | Rollback |
| `GET` | `/api/projects/:id/audit` | Audit log |
| `POST` | `/api/projects/:id/import` | Bulk import |
| `GET` | `/api/projects/:id/envs/:envId/export` | Export |
| `POST` | `/api/projects/:id/invitations` | Invite collaborator |
| `POST` | `/api/projects/invitations/accept` | Accept invite |
| `*` | `/api/github/*` | GitHub connect, webhooks, scan |

Auth routes: `/api/auth/*` (Better Auth).

---

## CI

GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) uses path filters:

- **App** — lint, unit tests, Next.js build when `src/`, `drizzle/`, etc. change
- **CLI** — `pnpm --filter @lucerowb/dot-vault build` when `packages/cli/**` changes
- **Extension** — `pnpm --filter dotvault-browser-extension build` when `packages/browser-extension/**` changes

Use **Actions → CI → Run workflow** to run all jobs manually.

---

## Documentation

| Doc | Topic |
| ----- | ------ |
| [FEATURES_SUMMARY.md](./docs/FEATURES_SUMMARY.md) | Feature index |
| [MANUAL_STEPS.md](./docs/MANUAL_STEPS.md) | Production setup |
| [CLI.md](./docs/CLI.md) | CLI reference |
| [BROWSER_EXTENSION.md](./docs/BROWSER_EXTENSION.md) | Extension |
| [IMPORT_EXPORT.md](./docs/IMPORT_EXPORT.md) | Import/export formats |
| [VERSION_HISTORY.md](./docs/VERSION_HISTORY.md) | Versions and rollback |
| [AUDIT_LOGS.md](./docs/AUDIT_LOGS.md) | Audit trail |
| [GITHUB_INTEGRATION.md](./docs/GITHUB_INTEGRATION.md) | GitHub App |
| [2FA.md](./docs/2FA.md) | Two-factor auth |
| [API_WEBHOOKS.md](./docs/API_WEBHOOKS.md) | API keys and webhooks |
| [SELF_HOSTED.md](./docs/SELF_HOSTED.md) | Docker / K8s deploy |

---

## Security notes

- **Quick share**: ciphertext on Redis; key in URL fragment; optional passphrase (`v2.` fragments).
- **Cloud vault**: server can decrypt with `STORAGE_ENCRYPTION_KEY`; protect infra and logs.
- **Fragments** may appear in browser history—use private windows when it matters.

This project does **not** provide legal or compliance advice.

---

## Deploying

1. Postgres: apply all migrations in [`drizzle/`](./drizzle/) (or `pnpm run db:migrate`).
2. Set `DATABASE_URL`, `BETTER_AUTH_*`, `STORAGE_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`.
3. Optional: Upstash for quick share; SMTP for email; GitHub App vars.
4. Deploy on Vercel, Coolify ([`Dockerfile`](./Dockerfile)), or [self-hosted](./docs/SELF_HOSTED.md).

Ephemeral vault routes (`/api/vault/*`) use the **Edge** runtime; Better Auth + Postgres use **Node**.

---

## Acknowledgements

Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Better Auth](https://www.better-auth.com/), [Drizzle ORM](https://orm.drizzle.team/), [Supabase Postgres](https://supabase.com/), [Zod](https://zod.dev/), and [Upstash](https://upstash.com/).

Contributions and issues welcome on [GitHub](https://github.com/lucerowb/dot-vault/issues).
