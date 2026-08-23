# @lucerowb/dot-vault

Command-line tool for [DotVault](https://github.com/lucerowb/dot-vault) — sign in, list projects, and **push** / **pull** `.env` files to your encrypted cloud vault.

**Short command:** `dv` (also `dot-vault`, `dotvault`)

Requires **Node.js 18+** and a running DotVault instance. See [CHANGELOG](./CHANGELOG.md) for release notes.

## Install

### Homebrew (macOS, project tap)

Not in `homebrew/core` — install from the repo tap ([`Formula/dot-vault.rb`](https://github.com/lucerowb/dot-vault/blob/main/Formula/dot-vault.rb)):

```bash
brew tap lucerowb/dot-vault https://github.com/lucerowb/dot-vault
brew install dot-vault
dv --version
```

Installs `dv`, `dot-vault`, and `dotvault` with a Homebrew-managed Node.js dependency. Upgrade: `brew update && brew upgrade dot-vault`.

### npm

```bash
npm install -g @lucerowb/dot-vault

# or one-off
npx @lucerowb/dot-vault@latest
```

## Interactive session

Run **`dv`** with no arguments — you get a **persistent session** (it stays open until you choose **Exit**). The banner uses a typographic ASCII render of the DotVault logo (cloud + vault), with a subtle animated field.

**Mental model:** a **project** has a slug (`realpha`); **environments** are named `.env` files inside it (`production`, `local`). Use `-p realpha` for the project — not the env name.

```bash
dv              # interactive session (default)
dv shell        # same as above
dv project-create "My App"   # create a project from the terminal
dv logo         # replay the logo animation
dv help         # cheatsheet
dv init         # one-shot setup wizard (sign in + upload)
```

Pick project once in the session; pull/push/edit/rename/delete envs without re-selecting the project each time.

Set `NO_COLOR=1` or pipe output to disable animation and color.

## Quick start

```bash
dv login --api-url https://dot-vault.lucerowb.cloud
dv st                              # status
dv ls                              # projects
dv e realpha                       # env labels (type to filter)
dv pl production -p realpha        # pull → .env
dv ps .env -p realpha -l staging   # push
```

Omit flags for **searchable prompts** (projects, env labels, local files).

## Power tools

### Compare environments (`diff`)

Each side is a **local file path** or a **vault label** — mix and match:

```bash
dv diff staging production        # two labels (server-side, masked)
dv diff .env production           # local file vs vault
dv diff .env.local .env.production
```

Output shows added (`+`), removed (`-`), and changed (`~`) keys. Values are always **masked**, so it's safe to run in terminals, CI logs, and screen shares.

### Encrypted quick share from the terminal (`share`)

Creates the same zero-knowledge links as `/quick-share`: content is encrypted locally (**AES-256-GCM**), only ciphertext is uploaded, and the decryption key lives in the URL `#fragment` — the server never sees it or your key.

```bash
dv share .env --ttl 24h
dv share .env --ttl 15m --one-time
dv share .env --passphrase          # v2 fragment; recipients must enter it
dv share production -p realpha      # share straight from the vault
```

| Flag | Meaning |
| ---- | ------- |
| `--ttl` | `5m`, `15m`, `1h`, `8h`, `24h`, `7d` (default `1h`) |
| `--one-time` | Link self-destructs after first open |
| `--passphrase` | Prompt for a passphrase (PBKDF2-wrapped key) |
| `-f, --force` | Skip the pre-share scan prompt |

The command prints the link, its expiry, and a one-line `curl` to revoke early.

### Local secrets audit (`scan`)

Offline scan of a `.env` file for risky values: live provider credentials (AWS, Stripe, OpenAI, GitHub, Slack, Google, SendGrid, npm, JWTs, private keys), weak/duplicate/placeholder values, insecure `http://` URLs. Nothing leaves your machine.

```bash
dv scan                # audits .env
dv scan .env.production
dv scan --json         # machine-readable (CI)
```

Exit code is **1 when high-severity findings exist**, so `dv scan && dv push` fails closed in CI.

### Generate `.env.example` (`example`)

Replaces every value with a safe placeholder while preserving keys, comments, and order:

```bash
dv example                     # .env → .env.example
dv example .env.production -o .env.example.production
```

### Scan-on-push

`dv push` runs the same audit before uploading and asks for confirmation when it finds issues. Skip with `--force` (or `--no-scan`).


## Easy-to-remember aliases

| What you want | Command | Alias |
| ------------- | ------- | ----- |
| Sign in | `dv login` | `dv li` |
| Sign out | `dv logout` | `dv lo` |
| Status | `dv status` | `dv st` |
| Projects | `dv projects` | `dv ls`, `dv p` |
| Environments | `dv envs` | `dv e`, `dv env` |
| Download | `dv pull` | `dv pl`, `dv get` |
| Upload | `dv push` | `dv ps`, `dv up` |
| Compare | `dv diff` | `dv df` |
| Quick share | `dv share` | — |
| Secrets audit | `dv scan` | — |
| Example file | `dv example` | `dv ex` |
| Delete | `dv delete` | `dv rm` |
| Wizard | `dv init` | `dv setup` |
| Interactive session | `dv shell` | `dv i`, `dv sh` |
| New project | `dv project-create` | `dv new` |

## Shell autocomplete

```bash
# zsh (add to ~/.zshrc)
eval "$(dv completion zsh)"

# bash
eval "$(dv completion bash)"
```

## API URL

Configured **on your machine**, not at npm publish time:

| Priority | Source |
| -------- | ------ |
| 1 | `~/.dotvault/config.json` |
| 2 | `DOTVAULT_API_URL` |
| 3 | `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` |
| 4 | `http://localhost:3000` |

```bash
dv login --api-url https://your-server.com
```

## Examples

```bash
# Fully interactive pull (pick project + label)
dv pl

# Pull production for a slug
dv pl production -p realpha -o .env

# Push detected .env files
dv ps

# Merge instead of overwrite
dv pl staging -o .env --merge
```

## Development

```bash
pnpm build:cli
node packages/cli/bin/dot-vault.js help
```

## License

MIT
