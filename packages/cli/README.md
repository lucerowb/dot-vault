# @lucerowb/dot-vault

Command-line tool for [DotVault](https://github.com/lucerowb/dot-vault) — sign in, list projects, and **push** / **pull** `.env` files to your encrypted cloud vault.

**Short command:** `dv` (also `dot-vault`, `dotvault`)

Requires **Node.js 18+** and a running DotVault instance.

## Install

```bash
npm install -g @lucerowb/dot-vault

# or one-off
npx @lucerowb/dot-vault@latest
```

## Interactive mode

Run **`dv`** with no arguments — a **pretext-inspired** animated logo plays, then a menu guides you through sign-in, pull, push, and more. The effect uses a moving brightness field and density-matched characters (like [Variable Typographic ASCII](https://chenglou.me/pretext/variable-typographic-ascii/) from [chenglou/pretext](https://github.com/chenglou/pretext)).

```bash
dv          # animated logo + interactive hub
dv logo     # replay the logo animation
dv help     # static logo + cheatsheet
dv init     # setup wizard
```

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
| Delete | `dv delete` | `dv rm` |
| Wizard | `dv init` | `dv setup` |

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
