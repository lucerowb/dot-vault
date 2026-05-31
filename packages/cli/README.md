# @lucerowb/dot-vault

Command-line tool for [DotVault](https://github.com/lucerowb/dot-vault) — sign in, list projects, and **push** / **pull** `.env` files to your encrypted cloud vault.

Requires **Node.js 18+** and a running DotVault instance (self-hosted or your deployment).

## Install

```bash
# Run without installing
npx @lucerowb/dot-vault@latest login --api-url https://your-dotvault.example.com

# Global install (commands: dot-vault and dotvault)
npm install -g @lucerowb/dot-vault
```

The unscoped name `dot-vault` is not available on npm; use the scoped package **`@lucerowb/dot-vault`**.

## Quick start

1. **Point the CLI at your server** (required once per machine):

```bash
dot-vault login --api-url https://dot-vault.lucerowb.cloud
```

2. Sign in with your DotVault email and password.

3. **Verify**:

```bash
dot-vault status
```

4. **Use the vault**:

```bash
dot-vault projects
dot-vault envs my-project-slug
dot-vault pull production -p my-project-slug -o .env
dot-vault push .env -p my-project-slug -l staging
```

Or run the setup wizard:

```bash
dot-vault init
```

## API URL

The CLI does **not** embed your server URL in the npm package. Configure it where you run the CLI:

| Priority | Source |
| -------- | ------ |
| 1 | `~/.dotvault/config.json` — set by `login` or `login --api-url` |
| 2 | `DOTVAULT_API_URL` |
| 3 | `BETTER_AUTH_URL` |
| 4 | `NEXT_PUBLIC_APP_URL` |
| 5 | `http://localhost:3000` (local dev fallback) |

If you run the CLI inside the DotVault repo, it also loads `.env.local` / `.env` from the current directory (without overriding variables already set in your shell).

**Examples:**

```bash
# Recommended: save URL on login
dot-vault login --api-url https://dot-vault.lucerowb.cloud

# Or export in ~/.zshrc
export DOTVAULT_API_URL=https://dot-vault.lucerowb.cloud
dot-vault login
```

Config file location: `~/.dotvault/config.json`.

## Commands

| Command | Description |
| ------- | ----------- |
| `login` | Sign in (email + password) |
| `logout` | Clear stored token |
| `status` | Show API URL and auth state |
| `projects` / `ls` | List projects |
| `envs [project]` / `list` | List environment labels in a project |
| `pull <label>` | Download an env blob to a file |
| `push [file]` | Upload a `.env` file |
| `delete <label>` | Remove an env from the vault |
| `init` | Interactive login + push local `.env` files |

### `login`

```bash
dot-vault login
dot-vault login -e you@example.com -p 'your-password'
dot-vault login --api-url https://dot-vault.lucerowb.cloud
```

### `pull`

```bash
dot-vault pull production -p my-project-slug -o .env
dot-vault pull staging -o .env.staging --merge
```

Options: `-p, --project`, `-o, --output`, `-f, --force`, `--merge`.

### `push`

```bash
dot-vault push
dot-vault push .env.local -p my-project-slug -l staging
```

Auto-detects `.env`, `.env.local`, `.env.production`, etc. when no file is given.  
Options: `-p, --project`, `-l, --label`, `-f, --force`.

### `delete`

```bash
dot-vault delete old-label -p my-project-slug
```

## CI (GitHub Actions)

Set secrets on the job that **runs** the CLI (not on the npm publish workflow):

```yaml
env:
  DOTVAULT_API_URL: ${{ secrets.DOTVAULT_API_URL }}
  # Store session token from a prior login, or login in a guarded step
steps:
  - run: npm install -g @lucerowb/dot-vault
  - run: dot-vault pull production -p my-app -o .env
    env:
      DOTVAULT_API_URL: ${{ secrets.DOTVAULT_API_URL }}
      # If you persist apiToken to config in a prior step, or use a machine user
```

For pull/push in CI you need a valid session token in `~/.dotvault/config.json` or a documented machine-user flow.

## Development (monorepo)

```bash
git clone https://github.com/lucerowb/dot-vault.git
cd dot-vault
pnpm install
pnpm build:cli
node packages/cli/bin/dot-vault.js status
```

## Links

- **App & docs:** [github.com/lucerowb/dot-vault](https://github.com/lucerowb/dot-vault)
- **Releases (tarball / extension):** [Releases](https://github.com/lucerowb/dot-vault/releases)
- **Issues:** [github.com/lucerowb/dot-vault/issues](https://github.com/lucerowb/dot-vault/issues)

## License

MIT
