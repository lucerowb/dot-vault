# DotVault CLI

> **Source of truth:** [`packages/cli/README.md`](https://github.com/lucerowb/dot-vault/blob/main/packages/cli/README.md) (published as [@lucerowb/dot-vault](https://www.npmjs.com/package/@lucerowb/dot-vault) on npm).

The CLI signs in with your DotVault account and **pulls** / **pushes** encrypted `.env` files. Short command: **`dv`** (also `dot-vault`, `dotvault`).

## Install

### Homebrew (macOS, project tap)

Uses [`Formula/dot-vault.rb`](https://github.com/lucerowb/dot-vault/blob/main/Formula/dot-vault.rb) in this repo (not `homebrew/core`).

```bash
brew tap lucerowb/dot-vault https://github.com/lucerowb/dot-vault
brew install dot-vault
brew upgrade dot-vault   # after brew update
```

### npm

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
dv ps .env.local -p realpha -l local     # push (scanned first)
dv diff .env production                  # compare local vs vault
dv diff staging production               # compare two labels
dv share .env --ttl 24h                  # encrypted quick-share link
dv scan                                  # audit local secrets
dv example                               # generate .env.example
dv project-create "My App"               # new project
dv init                                  # sign in + upload local .env*
eval "$(dv completion zsh)"              # tab completion
```

## Power tools

- **`dv diff`** — key-level comparison between a local file and a vault label (or two labels). Values are masked, so output is safe for terminals and CI logs.
- **`dv share`** — creates the same zero-knowledge links as `/quick-share` without opening a browser: AES-256-GCM locally, key in the URL fragment, optional passphrase / one-time / TTL.
- **`dv scan`** — offline audit for live provider credentials, weak or duplicated values, placeholders, and `http://` URLs. Exits 1 on high-severity findings (CI-friendly).
- **`dv example`** — writes `.env.example` with every value replaced by a placeholder; comments and key order preserved.
- **`push` safety net** — uploads trigger the same scan and ask for confirmation when findings exist (`--force` to skip).

Full flags and examples: [`packages/cli/README.md`](https://github.com/lucerowb/dot-vault/blob/main/packages/cli/README.md).

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

Formula source: [`Formula/dot-vault.rb`](https://github.com/lucerowb/dot-vault/blob/main/Formula/dot-vault.rb) (updated on each GitHub release).
