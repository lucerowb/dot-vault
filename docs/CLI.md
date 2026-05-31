# DotVault CLI

A command-line interface for managing environment variables and secrets directly from your terminal.

## Installation

### macOS/Linux (Homebrew)

```bash
brew install dotvault/tap/dotvault
```

### npm

```bash
npx @lucerowb/dot-vault@latest login

# or global install
npm install -g @lucerowb/dot-vault
dot-vault login
```

### Direct Download

```bash
curl -fsSL https://dotvault.io/install.sh | sh
```

## Quick Start

```bash
# Login to your DotVault account
dotvault login

# List your projects
dotvault projects list

# Get environment variables for a project
dotvault env get my-project --env production

# Set environment variables
dotvault env set my-project --env staging --file .env.staging
```

## Commands

### Authentication

```bash
# Login with browser-based OAuth
dotvault login

# Login with API key
dotvault login --api-key YOUR_API_KEY

# Check current user
dotvault whoami

# Logout
dotvault logout
```

### Projects

```bash
# List all projects
dotvault projects list

# Create a new project
dotvault projects create my-project --description "My new project"

# Delete a project
dotvault projects delete my-project

# Show project details
dotvault projects show my-project
```

### Environment Variables

```bash
# Get all environment variables
dotvault env get my-project --env production

# Get specific variables
dotvault env get my-project --env production --keys DATABASE_URL,API_KEY

# Set from file
dotvault env set my-project --env staging --file .env.staging

# Set from stdin
cat .env | dotvault env set my-project --env production

# Set individual variable
dotvault env set my-project --env production --key DATABASE_URL --value "postgres://..."

# Delete environment
dotvault env delete my-project --env old-environment

# List environments
dotvault env list my-project
```

### Import/Export

```bash
# Import from .env file
dotvault import my-project --env production --file .env.production

# Import from 1Password
dotvault import my-project --env production --format 1password --file 1password-export.json

# Import from HashiCorp Vault
dotvault import my-project --env production --format vault --file vault-export.json

# Export to .env file
dotvault export my-project --env production --file .env.production

# Export to JSON
dotvault export my-project --env production --format json --file secrets.json
```

### Members

```bash
# List project members
dotvault members list my-project

# Invite a member
dotvault members invite my-project --email user@example.com --role editor

# Remove a member
dotvault members remove my-project --email user@example.com
```

### Access Requests

```bash
# Request editor access
dotvault access request my-project --reason "Need to update production config"

# List pending requests (owners only)
dotvault access list my-project

# Approve a request
dotvault access approve my-project --request-id req_xxx

# Reject a request
dotvault access reject my-project --request-id req_xxx
```

### Secret Rotation

```bash
# List rotation schedules
dotvault rotation list my-project

# Enable rotation for a secret
dotvault rotation enable my-project --env production --key AWS_ACCESS_KEY_ID --interval 30

# Rotate a secret immediately
dotvault rotation rotate my-project --env production --key AWS_ACCESS_KEY_ID

# Disable rotation
dotvault rotation disable my-project --env production --key AWS_ACCESS_KEY_ID
```

### Sync

```bash
# Sync staging to production (with approval)
dotvault sync my-project --from staging --to production

# Force sync (requires admin)
dotvault sync my-project --from staging --to production --force

# List sync configurations
dotvault sync list my-project
```

### CI/CD Integration

```bash
# Generate GitHub Actions workflow
dotvault cicd generate my-project --env production --provider github

# Generate GitLab CI config
dotvault cicd generate my-project --env production --provider gitlab

# Generate for other providers: circleci, jenkins, azure, travis
```

## Configuration

The CLI stores configuration in `~/.dotvault/config.json`:

```json
{
  "apiUrl": "https://dot-vault.example.com",
  "defaultProject": "my-project"
}
```

### API URL resolution

When no `apiUrl` is saved in `~/.dotvault/config.json`, the CLI uses the first set variable:

| Priority | Variable |
| -------- | -------- |
| 1 | `DOTVAULT_API_URL` |
| 2 | `BETTER_AUTH_URL` |
| 3 | `NEXT_PUBLIC_APP_URL` |
| 4 | `http://localhost:3000` |

From a project directory, the CLI loads `.env.local` and `.env` (walking up to the repo root) so local `pnpm build:cli` / `dot-vault login` picks up the same values as the web app.

```bash
# Example: use production URL from your shell
export BETTER_AUTH_URL=https://dot-vault.lucerowb.cloud
dot-vault login

# Or one-off
dot-vault login --api-url "$BETTER_AUTH_URL"
```

### Environment Variables

- `DOTVAULT_API_URL` - API base URL (overrides `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`)
- `BETTER_AUTH_URL` - Same as the Next.js app auth URL
- `NEXT_PUBLIC_APP_URL` - Public app URL (fallback)
- `DOTVAULT_PROJECT` - Default project (optional)
- `DOTVAULT_ENV` - Default environment (optional)

## Global Flags

```bash
--api-key string      API key for authentication
--api-url string      API endpoint URL
--project string      Project name or ID
--env string          Environment label
--format string       Output format (env, json, yaml)
--quiet               Suppress non-error output
--verbose             Enable verbose logging
--help                Show help
--version             Show version
```

## Examples

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install DotVault CLI
        run: curl -fsSL https://dotvault.io/install.sh | sh

      - name: Fetch secrets
        run: dotvault env get my-app --env production --file .env
        env:
          DOTVAULT_API_KEY: ${{ secrets.DOTVAULT_API_KEY }}

      - name: Deploy
        run: |
          source .env
          npm run deploy
```

### Docker Entrypoint

```dockerfile
FROM node:20-alpine
RUN curl -fsSL https://dotvault.io/install.sh | sh
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/sh
# entrypoint.sh
dotvault env get $PROJECT --env $ENV --file .env
export $(cat .env | xargs)
exec "$@"
```

### Local Development

```bash
# Add to your shell profile for auto-loading
function dotvault-load() {
  eval "$(dotvault env get $1 --env ${2:-development})"
}

# Usage: dotvault-load my-project staging
```

## Troubleshooting

### Authentication Issues

```bash
# Clear cached credentials
dotvault logout
dotvault login

# Check API key
dotvault whoami
```

### Connection Issues

```bash
# Test connection
dotvault ping

# Use verbose mode
dotvault --verbose env get my-project
```

### Rate Limiting

The CLI respects rate limits and will automatically retry with exponential backoff. To avoid hitting limits:

- Use bulk operations instead of individual requests
- Cache results when appropriate
- Use webhooks for real-time updates

## Security

- API keys are stored in OS keychain when available
- All communication uses TLS 1.3
- Secrets are never logged or stored locally
- Shell history is automatically cleared for sensitive commands

## Shell Completions

```bash
# Bash
dotvault completion bash > /etc/bash_completion.d/dotvault

# Zsh
dotvault completion zsh > "${fpath[1]}/_dotvault"

# Fish
dotvault completion fish > ~/.config/fish/completions/dotvault.fish
```
