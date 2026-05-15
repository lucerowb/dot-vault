# Version History

DotVault automatically tracks all changes to your environment variables, providing a complete audit trail and the ability to restore previous versions.

## Overview

Every time an environment is created, updated, or deleted, DotVault creates a version snapshot. This enables:

- **Audit Trail**: See who changed what and when
- **Rollback**: Restore any previous version
- **Comparison**: Diff between any two versions
- **Compliance**: Meet regulatory requirements for change tracking

## How It Works

### Automatic Versioning

When you save changes to an environment:

1. The previous version is automatically archived
2. A new version is created with a unique version number
3. Metadata is recorded (who, when, what changed)
4. An optional comment can be added

### Version Metadata

Each version includes:

- **Version Number**: Sequential integer (1, 2, 3, ...)
- **Change Type**: `created`, `updated`, or `deleted`
- **Changed By**: User who made the change
- **Timestamp**: When the change occurred
- **Comment**: Optional description of the change
- **Full Content**: Complete snapshot of all variables

## Using Version History

### Viewing History

In the web interface:

1. Navigate to your project
2. Select an environment
3. Click the "History" tab
4. Browse the chronological list of versions

Via API:

```bash
GET /api/projects/{projectId}/envs/{envId}/versions
```

### Comparing Versions

Select any two versions to see a side-by-side diff:

- **Green**: Added variables
- **Red**: Removed variables
- **Yellow**: Modified variables

### Restoring a Version

To restore a previous version:

1. Find the version you want to restore
2. Click "Restore" or use the API
3. Optionally add a comment explaining why
4. The current version is backed up before restoration

Via API:

```bash
POST /api/projects/{projectId}/envs/{envId}/versions/{versionId}/restore
{
  "comment": "Rolling back due to misconfiguration"
}
```

### Downloading Versions

Any version can be downloaded in multiple formats:

- `.env` file
- JSON
- YAML
- CSV

## Retention Policy

Versions are retained according to your plan:

| Plan       | Retention |
| ---------- | --------- |
| Free       | 30 days   |
| Pro        | 90 days   |
| Enterprise | Unlimited |

## Best Practices

### Meaningful Comments

Always add comments when making significant changes:

```bash
# Via CLI
dotvault env set my-project --env production --file .env --comment "Updated database credentials after migration"
```

### Regular Reviews

Schedule periodic reviews of version history:

- Check for unauthorized changes
- Verify rotation schedules are being followed
- Identify patterns of frequent changes (may indicate issues)

### Before Major Changes

Before making significant updates:

1. Download the current version as backup
2. Make your changes
3. Test thoroughly
4. Document the change with a detailed comment

## API Reference

### List Versions

```bash
GET /api/projects/{projectId}/envs/{envId}/versions?page=1&limit=20

Response:
{
  "data": {
    "versions": [
      {
        "id": "ver_xxx",
        "version": 3,
        "changeType": "updated",
        "changedBy": {
          "id": "user_xxx",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "comment": "Updated API keys",
        "variablesCount": 12
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "hasMore": false
    }
  }
}
```

### Get Version Details

```bash
GET /api/projects/{projectId}/envs/{envId}/versions/{versionId}

Response:
{
  "data": {
    "id": "ver_xxx",
    "version": 3,
    "changeType": "updated",
    "changedBy": { ... },
    "createdAt": "2024-01-15T10:30:00Z",
    "comment": "Updated API keys",
    "content": "DATABASE_URL=postgres://...\nAPI_KEY=sk_..."
  }
}
```

### Compare Versions

```bash
GET /api/projects/{projectId}/envs/{envId}/versions/compare?from=2&to=3

Response:
{
  "data": {
    "diff": [
      {
        "key": "API_KEY",
        "action": "modified",
        "oldValue": "sk_old...",
        "newValue": "sk_new..."
      },
      {
        "key": "NEW_VAR",
        "action": "added",
        "newValue": "value"
      }
    ]
  }
}
```

### Restore Version

```bash
POST /api/projects/{projectId}/envs/{envId}/versions/{versionId}/restore
{
  "comment": "Rolling back due to issues with new API key"
}

Response:
{
  "data": {
    "success": true,
    "newVersion": 4,
    "restoredFrom": 2
  }
}
```

## CLI Commands

```bash
# List versions
dotvault versions list my-project --env production

# Show specific version
dotvault versions show my-project --env production --version 3

# Compare versions
dotvault versions diff my-project --env production --from 2 --to 3

# Restore version
dotvault versions restore my-project --env production --version 2 --comment "Rolling back"

# Download version
dotvault versions download my-project --env production --version 3 --file backup.env
```

## Integration with Notifications

Version changes can trigger notifications:

- **Slack**: Post to a channel when changes are made
- **Email**: Notify project owners of modifications
- **Webhook**: Call external systems for integration

Configure in Project Settings → Notifications.

## Compliance & Auditing

Version history helps meet compliance requirements:

- **SOC 2**: Change tracking and rollback capabilities
- **GDPR**: Data processing documentation
- **HIPAA**: Access and modification logs
- **PCI DSS**: Secure credential management

Export audit reports:

```bash
dotvault audit export my-project --from 2024-01-01 --to 2024-01-31 --format csv
```
