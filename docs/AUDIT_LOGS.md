# Audit Logs

DotVault maintains comprehensive audit logs of all activities within your projects, providing transparency, accountability, and compliance support.

## Overview

Every action in DotVault is logged with detailed metadata, including:

- **Who**: User who performed the action
- **What**: Type of action performed
- **When**: Timestamp of the action
- **Where**: IP address and user agent
- **Context**: Additional relevant details

## Logged Actions

### Project Actions

| Action           | Description              | Metadata           |
| ---------------- | ------------------------ | ------------------ |
| `project_create` | New project created      | project name, slug |
| `project_update` | Project settings changed | changed fields     |
| `project_delete` | Project deleted          | -                  |
| `project_view`   | Project accessed         | -                  |

### Environment Actions

| Action        | Description          | Metadata                |
| ------------- | -------------------- | ----------------------- |
| `env_create`  | Environment created  | label, import source    |
| `env_update`  | Environment modified | label, via (ui/api/cli) |
| `env_delete`  | Environment deleted  | label                   |
| `env_view`    | Environment viewed   | label, masked flag      |
| `env_export`  | Environment exported | label, format           |
| `env_import`  | Environment imported | label, format, count    |
| `env_restore` | Version restored     | label, from version     |

### Member Actions

| Action               | Description         | Metadata                  |
| -------------------- | ------------------- | ------------------------- |
| `member_invite`      | Member invited      | email, role               |
| `member_accept`      | Invitation accepted | email                     |
| `member_remove`      | Member removed      | email, role               |
| `member_role_change` | Role changed        | email, old role, new role |

### Access Control Actions

| Action              | Description                | Metadata           |
| ------------------- | -------------------------- | ------------------ |
| `access_request`    | Access requested           | reason, duration   |
| `access_approve`    | Access approved            | approver, duration |
| `access_reject`     | Access rejected            | approver           |
| `access_use`        | Elevated access used       | actions performed  |
| `emergency_request` | Emergency access requested | type, description  |
| `emergency_approve` | Emergency access approved  | approvers          |
| `emergency_reject`  | Emergency access rejected  | approver           |
| `emergency_use`     | Emergency access used      | actions performed  |

### Security Actions

| Action                 | Description          | Metadata        |
| ---------------------- | -------------------- | --------------- |
| `login`                | User logged in       | method, success |
| `logout`               | User logged out      | -               |
| `login_failed`         | Failed login attempt | reason          |
| `2fa_enabled`          | 2FA enabled          | method          |
| `2fa_disabled`         | 2FA disabled         | -               |
| `2fa_backup_used`      | Backup code used     | -               |
| `api_key_created`      | API key created      | name, scopes    |
| `api_key_revoked`      | API key revoked      | name            |
| `ip_allowlist_updated` | IP allowlist changed | added, removed  |
| `webhook_created`      | Webhook created      | type, events    |
| `webhook_deleted`      | Webhook deleted      | type            |

### Secret Management

| Action                     | Description       | Metadata                |
| -------------------------- | ----------------- | ----------------------- |
| `secret_rotation_enabled`  | Rotation enabled  | key, interval           |
| `secret_rotation_disabled` | Rotation disabled | key                     |
| `secret_rotated`           | Secret rotated    | key, method             |
| `sync_configured`          | Sync configured   | source, target          |
| `sync_executed`            | Sync performed    | source, target, changes |
| `sync_approved`            | Sync approved     | approver                |

## Viewing Audit Logs

### Web Interface

1. Navigate to Project Settings
2. Click "Audit Logs" tab
3. Filter by:
   - Date range
   - Action type
   - User
   - Resource

### API

```bash
# Get project audit logs
GET /api/projects/{projectId}/audit-logs?page=1&limit=50

# Filter by action
GET /api/projects/{projectId}/audit-logs?action=env_update

# Filter by user
GET /api/projects/{projectId}/audit-logs?userId=user_xxx

# Filter by date range
GET /api/projects/{projectId}/audit-logs?from=2024-01-01&to=2024-01-31
```

### CLI

```bash
# View recent logs
dotvault audit my-project --limit 50

# Filter by action
dotvault audit my-project --action env_update

# Export to file
dotvault audit my-project --from 2024-01-01 --to 2024-01-31 --format csv --output audit.csv
```

## Exporting Audit Logs

### Formats

- **JSON**: Machine-readable, complete data
- **CSV**: Spreadsheet-friendly
- **PDF**: Human-readable report
- **Syslog**: SIEM integration

### API Export

```bash
POST /api/projects/{projectId}/audit-logs/export
{
  "format": "csv",
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-01-31T23:59:59Z",
  "actions": ["env_update", "env_view"]
}
```

## Real-time Streaming

For SIEM integration and real-time monitoring:

### WebSocket

```javascript
const ws = new WebSocket("wss://api.dotvault.io/audit-stream");
ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log("New audit log:", log);
};
```

### Webhook

Configure webhooks to receive audit events:

```bash
POST /api/projects/{projectId}/webhooks
{
  "type": "generic",
  "url": "https://your-siem.com/webhook",
  "events": ["env_update", "env_delete", "login_failed"],
  "secret": "your-webhook-secret"
}
```

## Retention

Audit log retention depends on your plan:

| Plan       | Retention |
| ---------- | --------- |
| Free       | 7 days    |
| Pro        | 90 days   |
| Enterprise | Unlimited |

Enterprise customers can configure custom retention policies.

## Compliance

### SOC 2

Audit logs support SOC 2 compliance by providing:

- Change tracking (CC6.1)
- Access logging (CC6.2)
- Failed access attempts (CC6.3)
- Privileged access monitoring (CC6.4)

### GDPR

For GDPR compliance:

- All data access is logged
- Export capability for data portability
- Retention policies for data deletion

### HIPAA

For HIPAA compliance:

- Access controls and logging
- Audit trail integrity
- Tamper-evident logs

### PCI DSS

For PCI DSS compliance:

- Access to cardholder data environments
- Failed access attempts
- Administrative access logging

## Best Practices

### Regular Review

Schedule weekly or monthly audit log reviews:

- Look for unusual patterns
- Verify access requests are legitimate
- Check for failed login attempts
- Review emergency access usage

### Alerting

Set up alerts for critical events:

```bash
# Configure Slack alert for emergency access
POST /api/projects/{projectId}/webhooks
{
  "type": "slack",
  "url": "https://hooks.slack.com/services/...",
  "events": ["emergency_request", "emergency_use"]
}
```

### Integration

Send audit logs to your SIEM:

- Splunk
- Datadog
- Elastic Stack
- Sumo Logic
- Custom webhooks

## API Reference

### List Audit Logs

```bash
GET /api/projects/{projectId}/audit-logs
  ?page=1
  &limit=50
  &action=env_update
  &userId=user_xxx
  &from=2024-01-01T00:00:00Z
  &to=2024-01-31T23:59:59Z

Response:
{
  "data": {
    "logs": [
      {
        "id": "log_xxx",
        "action": "env_update",
        "user": {
          "id": "user_xxx",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "resourceType": "env",
        "resourceId": "env_xxx",
        "metadata": {
          "label": "production",
          "via": "web"
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "hasMore": true
    }
  }
}
```

### Get Audit Log Statistics

```bash
GET /api/projects/{projectId}/audit-logs/stats
  ?from=2024-01-01
  &to=2024-01-31

Response:
{
  "data": {
    "totalEvents": 150,
    "byAction": {
      "env_view": 80,
      "env_update": 20,
      "login": 50
    },
    "byUser": {
      "user_xxx": 100,
      "user_yyy": 50
    },
    "failedLogins": 5
  }
}
```

## Security

Audit logs are:

- **Immutable**: Cannot be modified or deleted
- **Encrypted**: At rest with AES-256
- **Access-controlled**: Only project owners can view
- **Backed up**: Geo-redundant storage

## Privacy

Audit logs contain:

- User IDs and emails
- IP addresses
- User agent strings
- Action metadata

This data is subject to your privacy policy and data retention requirements.
