# GitHub Integration

DotVault integrates seamlessly with GitHub to provide automated secret management for your repositories.

## Overview

The GitHub integration enables:

- **Sync secrets** to GitHub repository secrets
- **Pull requests** with environment variable updates
- **Actions workflows** for automated deployments
- **Repository scanning** for exposed secrets
- **Deployment protection** with required reviewers

## Setup

### 1. Install the GitHub App

1. Go to **Project Settings** → **Integrations** → **GitHub**
2. Click **Connect GitHub**
3. Select repositories to connect
4. Choose permission level:
   - **Read-only**: View repository secrets
   - **Read/Write**: Sync secrets to GitHub
   - **Admin**: Full access including Actions

### 2. Configure Sync

After installation, configure which environments sync to which repositories:

```bash
# Via CLI
dotvault github sync my-project \
  --env production \
  --repo owner/repo \
  --branch main \
  --auto-sync false
```

Or via web interface:

1. Go to **Integrations** → **GitHub** → **Sync Rules**
2. Click **Add Sync Rule**
3. Select:
   - Source environment (e.g., `production`)
   - Target repository
   - Target branch
   - Sync mode (manual or automatic)

## Sync Modes

### Manual Sync

Requires explicit approval before syncing:

1. Make changes in DotVault
2. Go to **GitHub** → **Pending Syncs**
3. Review the diff
4. Click **Sync to GitHub**

### Automatic Sync

Syncs automatically on environment changes:

- Immediate sync for non-destructive changes
- Pull request for destructive changes (deletions)
- Configurable delay for batching changes

### Pull Request Mode

Creates a PR for review before applying:

1. Changes made in DotVault
2. PR automatically created in GitHub
3. Team reviews and approves
4. Merging applies changes to repository secrets

## GitHub Actions Integration

### Workflow Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Option 1: Use GitHub repository secrets (synced from DotVault)
      - name: Deploy
        run: npm run deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}

      # Option 2: Fetch directly from DotVault
      - name: Fetch from DotVault
        uses: dotvault/action@v1
        with:
          api-key: ${{ secrets.DOTVAULT_API_KEY }}
          project: my-project
          env: production
```

### DotVault GitHub Action

```yaml
- name: Fetch secrets from DotVault
  uses: dotvault/action@v1
  with:
    # Required
    api-key: ${{ secrets.DOTVAULT_API_KEY }}
    project: my-project
    env: production

    # Optional
    output: .env # Output file (default: .env)
    format: env # Output format: env, json, yaml
    mask: true # Mask secrets in logs
    export: true # Export to environment
```

## Secret Scanning

### Repository Scanning

Scan your repositories for exposed secrets:

```bash
# Via CLI
dotvault github scan owner/repo

# Via API
POST /api/github/scan
{
  "repository": "owner/repo",
  "branch": "main"
}
```

### Findings

Detected secrets are:

1. **Reported** in DotVault dashboard
2. **Alerted** via Slack/Email
3. **Rotated** automatically (if configured)
4. **Documented** in audit logs

### Supported Secret Types

- API keys (AWS, Stripe, OpenAI, etc.)
- Database connection strings
- JWT tokens
- Private keys
- Passwords
- Custom patterns

## Deployment Protection

### Required Reviewers

Configure required reviewers for production deployments:

1. Go to **GitHub** → **Deployment Protection**
2. Enable **Required Reviewers**
3. Select reviewers from team members
4. Set minimum number of approvals

### Environment Protection Rules

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - name: Verify DotVault sync
        uses: dotvault/verify-action@v1
        with:
          project: my-project
          env: production

      - name: Deploy
        run: npm run deploy
```

## Branch Protection

### Sync on Protected Branches

For protected branches, DotVault:

1. Creates a PR with secret changes
2. Requires status checks to pass
3. Requires code review approval
4. Applies changes only after merge

### Bypass Protection

Emergency access can bypass protection:

```bash
dotvault github sync my-project \
  --env production \
  --repo owner/repo \
  --emergency \
  --reason "Critical security patch"
```

## API Reference

### Install GitHub App

```bash
POST /api/projects/{projectId}/github/install
{
  "installationId": "12345678",
  "repositories": ["owner/repo1", "owner/repo2"],
  "permissions": "read-write"
}
```

### Configure Sync

```bash
POST /api/projects/{projectId}/github/sync-config
{
  "envLabel": "production",
  "repository": "owner/repo",
  "branch": "main",
  "mode": "manual",
  "secretPrefix": "PROD_"
}
```

### Trigger Sync

```bash
POST /api/projects/{projectId}/github/sync
{
  "envLabel": "production",
  "repository": "owner/repo",
  "branch": "main"
}
```

### Get Sync Status

```bash
GET /api/projects/{projectId}/github/sync-status

Response:
{
  "data": {
    "syncs": [
      {
        "id": "sync_xxx",
        "envLabel": "production",
        "repository": "owner/repo",
        "branch": "main",
        "status": "completed",
        "lastSyncedAt": "2024-01-15T10:30:00Z",
        "secretsCount": 12
      }
    ]
  }
}
```

### List Repository Secrets

```bash
GET /api/github/repos/{owner}/{repo}/secrets

Response:
{
  "data": {
    "secrets": [
      {
        "name": "DATABASE_URL",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "totalCount": 12
  }
}
```

## CLI Commands

```bash
# Connect GitHub
dotvault github connect my-project

# Configure sync
dotvault github sync-config my-project \
  --env production \
  --repo owner/repo \
  --branch main \
  --mode manual

# Trigger sync
dotvault github sync my-project --env production --repo owner/repo

# List sync configurations
dotvault github sync-list my-project

# Remove sync configuration
dotvault github sync-remove my-project --env production --repo owner/repo

# Scan repository
dotvault github scan owner/repo --branch main

# Generate Actions workflow
dotvault github workflow my-project --env production --file .github/workflows/deploy.yml
```

## Best Practices

### 1. Use Separate Environments

Create separate GitHub environments for:

- Development
- Staging
- Production

Each with different secret sets from DotVault.

### 2. Enable Required Reviewers

Always require review for production:

- Minimum 1 approval for staging
- Minimum 2 approvals for production
- Include security team for sensitive changes

### 3. Regular Scanning

Schedule regular secret scanning:

```yaml
# .github/workflows/scan.yml
name: Secret Scan
on:
  schedule:
    - cron: "0 0 * * 0" # Weekly

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: dotvault/scan-action@v1
        with:
          api-key: ${{ secrets.DOTVAULT_API_KEY }}
          project: my-project
```

### 4. Audit Sync Activity

Review sync logs regularly:

```bash
dotvault audit my-project --action github_sync
```

### 5. Use PR Mode for Production

Always use pull request mode for production changes:

- Provides audit trail
- Enables code review
- Prevents accidental changes
- Integrates with branch protection

## Troubleshooting

### Sync Failed

1. Check GitHub App permissions
2. Verify repository access
3. Check branch protection rules
4. Review audit logs for errors

### Secrets Not Updating

1. Check sync configuration
2. Verify environment label matches
3. Check for typos in secret names
4. Review GitHub Actions logs

### Authentication Issues

1. Re-install GitHub App
2. Check token expiration
3. Verify organization permissions
4. Contact support if persistent

## Security

### Permissions

The GitHub App requests minimal permissions:

- **Repository secrets**: Read/Write
- **Actions**: Read (for workflow triggers)
- **Contents**: Read (for PR creation)
- **Pull requests**: Write (for sync PRs)

### Data Flow

1. Secrets encrypted in transit (TLS 1.3)
2. Never stored on GitHub servers (only metadata)
3. Audit log of all sync operations
4. Revocable access at any time

### Access Control

- Only project owners can configure sync
- Only editors can trigger manual sync
- All syncs logged in audit trail
- Failed syncs generate alerts

## Pricing

GitHub integration features by plan:

| Feature            | Free | Pro      | Enterprise |
| ------------------ | ---- | -------- | ---------- |
| Manual sync        | ✓    | ✓        | ✓          |
| Automatic sync     | -    | ✓        | ✓          |
| PR mode            | -    | ✓        | ✓          |
| Secret scanning    | -    | 10 repos | Unlimited  |
| Required reviewers | -    | ✓        | ✓          |
| Custom workflows   | -    | -        | ✓          |

## Support

For GitHub integration support:

- Documentation: https://docs.dotvault.io/github
- Community: https://community.dotvault.io
- Support: support@dotvault.io
- Status: https://status.dotvault.io
