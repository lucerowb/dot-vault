# DotVault

**Ephemeral _and_ authenticated cloud storage for `.env` files.**

- **Quick share** — encrypt in the browser (**AES-256-GCM**), store ciphertext in [Upstash Redis](https://upstash.com/), put the key in the **URL fragment** so it never hits your server.
- **Cloud vault** — sign in with [**Better Auth**](https://www.better-auth.com/) (email + password), organize **projects**, upload and **view / update / delete** env blobs stored in [**Supabase Postgres**](https://supabase.com/) via [Drizzle ORM](https://orm.drizzle.team/). Payloads are **encrypted at rest** on the server with **AES-256-GCM** using `STORAGE_ENCRYPTION_KEY` (see security note below).

|                |                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------- |
| **Maintainer** | Srijan Bajracharya ([srijan.bajracharya97@gmail.com](mailto:srijan.bajracharya97@gmail.com)) |
| **Repository** | [github.com/lucerowb/dot-vault](https://github.com/lucerowb/dot-vault)                       |
| **License**    | MIT (see [LICENSE](./LICENSE))                                                               |

---

## Features

### Quick share (Redis)

- **Client-side encryption** — AES-256-GCM with a random 12-byte IV per upload.
- **Key in the fragment** — Share `https://your-domain/r/<token>#v1.<key>`; the part after `#` stays on the client.
- **Optional passphrase** — PBKDF2 (600k iterations, SHA-256) + AES-KW wrapping (`v2.` fragments).
- **TTL vaults** — 1h, 8h, 24h, or 7d; Redis `EXPIRE` removes data automatically.
- **One-time links** — First successful fetch consumes the vault (Lua + tombstone → **410** on replay).
- **Sender revoke** — `DELETE /api/vault/:token` with `X-Delete-Token`.

### Cloud vault (Better Auth + Supabase)

- **Accounts** — Better Auth with Drizzle schema on Postgres (works with Supabase’s connection string).
- **Projects** — Create, rename, delete; slug unique per user.
- **Collaboration** — Project **owner** invites by email (`editor` or `viewer`). Invitees open `/invite/<token>` while signed in with the invited address. **Editors** can upload/replace/delete env blobs; **viewers** can read and use quick-share from stored envs. Apply migration `drizzle/0001_project_collab.sql` (or `pnpm run db:migrate`) after `0000_init`.
- **Env files** — Per-project **labels** (e.g. `staging`, `prod`); POST **creates or overwrites** the same label.
- **Authorization** — Session cookies plus **owner / member role** checks on project and env routes (not Supabase Auth RLS; use the **service / direct Postgres** URI from Supabase).

### Shared

- **Rate limits** (quick share uploads/downloads) via [`@upstash/ratelimit`](https://github.com/upstash/ratelimit-js).
- **Security headers** — CSP, HSTS, framing, no-referrer in [`next.config.ts`](./next.config.ts).

---

## Quick start

### Prerequisites

- Node.js **20+** and **[pnpm](https://pnpm.io/)** (or use `npx` / `npm` equivalents).
- **Supabase**: create a project → **Settings → Database → Connection string** (URI). Append `?sslmode=require` if needed.
- **Upstash Redis** (HTTP REST): only required for ephemeral quick share (`/api/vault`).

### Setup

```bash
git clone https://github.com/lucerowb/dot-vault.git
cd dot-vault
cp .env.example .env.local
# DATABASE_URL (Supabase), BETTER_AUTH_SECRET, STORAGE_ENCRYPTION_KEY, Redis for quick share, etc.
pnpm install
./node_modules/.bin/drizzle-kit migrate   # or apply drizzle/0000_init.sql + drizzle/0001_project_collab.sql in Supabase
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing home. **Quick share** (ephemeral uploads) lives at [`/quick-share`](/quick-share). Register a user to use **Cloud vault** at `/dashboard`.

If `pnpm install` complains about ignored build scripts (`esbuild`), run `pnpm approve-builds` once and retry.

### Database migrations

- Generated SQL lives in [`drizzle/`](./drizzle/). With `DATABASE_URL` set: `pnpm run db:migrate` (runs `drizzle-kit migrate`), or paste migrations in order (`0000_init.sql`, then `0001_project_collab.sql` for invites/members) into the Supabase SQL editor.

### Scripts

| Command                     | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `pnpm dev`                  | Next.js dev server.                               |
| `pnpm build` / `pnpm start` | Production build / server.                        |
| `pnpm lint`                 | ESLint.                                           |
| `pnpm test`                 | Vitest (crypto helpers).                          |
| `pnpm db:generate`          | Regenerate Drizzle migrations after schema edits. |
| `pnpm db:migrate`           | Apply migrations.                                 |
| `pnpm db:push`              | Push schema (dev prototyping).                    |

For Playwright: `pnpm exec playwright install chromium` then `pnpm test:e2e`.

---

## Environment variables

| Variable                   | Required              | Description                                                                    |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`             | **Yes** (cloud vault) | Supabase Postgres URI (`?sslmode=require`).                                    |
| `BETTER_AUTH_SECRET`       | **Yes** (prod)        | Long random secret (`openssl rand -base64 32`).                                |
| `BETTER_AUTH_URL`          | Recommended           | Same origin as the app, e.g. `https://your-app.vercel.app`.                    |
| `STORAGE_ENCRYPTION_KEY`   | **Yes** (cloud vault) | Base64 **32-byte** key for at-rest env encryption (`openssl rand -base64 32`). |
| `NEXT_PUBLIC_APP_URL`      | Recommended           | Public URL for links and auth client.                                          |
| `UPSTASH_REDIS_REST_URL`   | For quick share       | Upstash Redis REST URL.                                                        |
| `UPSTASH_REDIS_REST_TOKEN` | For quick share       | Upstash REST token.                                                            |

### Security note (cloud vault)

Cloud-stored env **plaintext** is visible to the **Next.js server** when you view or save a file: the app decrypts with `STORAGE_ENCRYPTION_KEY` to serve the UI. This is **not** the same zero-knowledge model as quick share. Protect `STORAGE_ENCRYPTION_KEY` and your database like any secrets backend. For stricter models, you could extend the client to encrypt before upload (not implemented here).

---

## HTTP API

### `POST /api/vault`

Stores ciphertext JSON in Redis under `vault:<token>` with TTL.

**Body (JSON)**

```json
{
  "iv": "base64(12-byte IV)",
  "ciphertext": "base64(ciphertext + GCM tag)",
  "ttl": 86400,
  "oneTime": false
}
```

`ttl` must be one of `3600`, `28800`, `86400`, `604800`.

**201 response**

```json
{
  "success": true,
  "data": {
    "token": "tk_…",
    "expiresAt": 1716086400,
    "deleteToken": "dt_…"
  }
}
```

Keep `deleteToken` private to the sender; it is **not** part of the share URL.

### `GET /api/vault/:token`

Returns `{ iv, ciphertext, expiresAt, oneTime }`. One-time vaults are deleted on first successful read.

| Status | Meaning                          |
| ------ | -------------------------------- |
| `404`  | Missing or expired vault.        |
| `410`  | One-time vault already consumed. |
| `429`  | Rate limited.                    |

### `DELETE /api/vault/:token`

Headers: `X-Delete-Token: <deleteToken>` — removes the vault and consumption tombstone.

### Cloud vault (session cookie required)

| Method   | Path                            | Description                                                                    |
| -------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `GET`    | `/api/projects`                 | List your projects.                                                            |
| `POST`   | `/api/projects`                 | Body `{ "name": "…", "slug?" }` — create project.                              |
| `GET`    | `/api/projects/:id`             | Project metadata.                                                              |
| `PATCH`  | `/api/projects/:id`             | Body `{ "name?", "slug?" }`.                                                   |
| `DELETE` | `/api/projects/:id`             | Deletes project and env rows.                                                  |
| `GET`    | `/api/projects/:id/envs`        | List env labels (no decrypted content).                                        |
| `POST`   | `/api/projects/:id/envs`        | Body `{ "label": "staging", "content": "…" }` — create **or overwrite** label. |
| `GET`    | `/api/projects/:id/envs/:envId` | Decrypted plaintext (authorized owner only).                                   |
| `PATCH`  | `/api/projects/:id/envs/:envId` | Partial update `label` and/or `content`.                                       |
| `DELETE` | `/api/projects/:id/envs/:envId` | Remove env blob.                                                               |

---

## Security notes

- **Quick share** threat model (zero-knowledge to the DotVault Redis layer): ciphertext + fragment key; passphrase adds another layer when used.
- **Cloud vault**: the app server can decrypt blobs when you fetch them (needs `STORAGE_ENCRYPTION_KEY`). Protect infra and logs accordingly.
- **URL fragments** (quick share) can appear in browser history — use incognito where it matters.

This project does **not** provide legal or compliance advice. Review against your own policies before sharing regulated data.

---

## Deploying to Vercel / Supabase

1. Supabase → create project → apply `drizzle/0000_init.sql` or run `pnpm db:migrate` locally against `DATABASE_URL`.
2. Fill **Better Auth env**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `STORAGE_ENCRYPTION_KEY`.
3. (Optional quick share) Add Upstash Redis `UPSTASH_*` vars.
4. Deploy on Vercel; ensure **production** runtime can reach Supabase (**IPv4/v6**, SSL).

Ephemeral vault routes (`/api/vault/*`) use the **Edge** runtime; Better Auth + Postgres routes use the default **Node** runtime.

---

## Roadmap (from the design doc)

- **CLI** — `npx dotvault push` / `pull` (Node 18+ Web Crypto) as a separate package or workspace.
- **Browser extension** — gated on adoption milestones.

Contributions and issues are welcome on [GitHub](https://github.com/lucerowb/dot-vault).

---

## Acknowledgements

Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Better Auth](https://www.better-auth.com/), [Drizzle ORM](https://orm.drizzle.team/), [Supabase Postgres](https://supabase.com/), [Zod](https://zod.dev/), and [Upstash](https://upstash.com/).
