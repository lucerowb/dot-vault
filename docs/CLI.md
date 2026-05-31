# DotVault CLI

> **Source of truth:** [`packages/cli/README.md`](https://github.com/lucerowb/dot-vault/blob/main/packages/cli/README.md) (published as [@lucerowb/dot-vault](https://www.npmjs.com/package/@lucerowb/dot-vault) on npm).

The CLI signs in with your DotVault account and **pulls** / **pushes** encrypted `.env` files. Short command: **`dv`** (also `dot-vault`, `dotvault`).

## Install

```bash
npm install -g @lucerowb/dot-vault
# or
npx @lucerowb/dot-vault@latest login --api-url https://your-server.example.com
```

## Mental model

| Concept | Example | CLI flag / arg |
| -------- | -------- | ---------------- |
| **Project** | reAlpha | slug `realpha` → `-p realpha` |
| **Environment** | production, local | first arg to pull: `dv pl production` |

`-p` is always the **project slug**, not the environment name.

## Interactive session (recommended)

```bash
dv          # stays open until you choose Exit
dv shell    # same
```

From the menu you can sign in, pick or create a project, list envs, download/upload, edit, rename, delete, and run the setup wizard. Project choice is remembered in `~/.dotvault/session.json`.

## Common commands

```bash
dv login --api-url https://your-server.example.com
dv st                                    # status
dv ls                                    # projects
dv e realpha                             # env labels (type to filter)
dv pl production -p realpha -o .env      # pull
dv ps .env.local -p realpha -l local     # push
dv project-create "My App"               # new project
dv init                                  # sign in + upload local .env*
eval "$(dv completion zsh)"              # tab completion
```

## API URL (runtime)

Resolved in order:

1. `~/.dotvault/config.json` (`dv login --api-url`)
2. `DOTVAULT_API_URL`
3. `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`
4. `http://localhost:3000`

When run from the repo root, the CLI also reads `.env.local` for the same variables.

## Development

```bash
pnpm build:cli
pnpm dv          # from repo root (see root package.json)
node packages/cli/bin/dot-vault.js
```

## Legacy / planned

Sections below in older copies of this file (Homebrew tap, `dotvault env get`, OAuth-only login) may not match the shipped CLI yet. Use `dv help` and [`packages/cli/README.md`](https://github.com/lucerowb/dot-vault/blob/main/packages/cli/README.md) for the current command list.
