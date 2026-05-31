# Environment Synchronization

Environment synchronization enables controlled promotion of secrets between environments (e.g., staging to production) with approval gates and audit trails.

## Overview

Environment sync provides:

- **Controlled promotion**: Staging → Production with approval
- **Approval gates**: Required reviewers before sync
- **Diff preview**: See changes before applying
- **Audit trail**: Complete sync history
- **Rollback**: Revert to previous state

## Use Cases

### Staging to Production

Promote tested configuration to production:

1. Test changes in staging environment
2. Request sync to production
3. Approver reviews diff
4. Approver approves sync
5. Production updated

### Development to Staging

Share new configuration:

1. Add new variables in development
2. Sync to staging for testing
3. Automatic sync (if configured)
4. Team notified of changes

### Multi-Environment Consistency

Keep environments in sync:

1. Configure automatic sync rules
2. Changes propagate automatically
3. Notifications sent to team
4. Audit log tracks all changes

## Configuration

### Web Interface

1. Go to **Project Settings** → **Sync**
2. Click **Add Sync Rule**
3. Configure:
   - Source environment (e.g., `staging`)
   - Target environment (e.g., `production`)
   - Sync mode (manual or automatic)
   - Require approval (yes/no)
   - Approvers (if approval required)
4. Save

### CLI

```bash
# Create sync configuration
dotvault sync config my-project \
  --from staging \
  --to production \
  --mode manual \
  --require-approval \
  --approvers user1@example.com,user2@example.com

# List sync configurations
dotvault sync list my-project

# Request sync
dotvault sync request my-project --from staging --to production

# Approve sync (as approver)
dotvault sync approve my-project --sync-id sync_xxx

# Reject sync
dotvault sync reject my-project --sync-id sync_xxx --reason "Need to test more"

# Execute sync (after approval)
dotvault sync execute my-project --from staging --to production

# View sync history
dotvault sync history my-project
```

### API

```bash
# Create sync configuration
POST /api/projects/{projectId}/sync-configs
{
  "sourceEnvLabel": "staging",
  "targetEnvLabel": "production",
  "syncMode": "manual",
  "requireApproval": true,
  "approvers": ["user_xxx", "user_yyy"]
}

Response:
{
  "data": {
    "id": "sync_xxx",
    "sourceEnvLabel": "staging",
    "targetEnvLabel": "production",
    "syncMode": "manual",
    "requireApproval": true,
    "approvers": ["user_xxx", "user_yyy"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

# Request sync
POST /api/projects/{projectId}/sync-requests
{
  "syncConfigId": "sync_xxx"
}

Response:
{
  "data": {
    "id": "req_xxx",
    "syncConfigId": "sync_xxx",
    "requesterUserId": "user_zzz",
    "status": "pending_approval",
    "diff": {
      "totalChanges": 3,
      "additions": 1,
      "updates": 1,
      "deletions": 1,
      "changes": [
        {
          "key": "NEW_VAR",
          "action": "add",
          "sourceValue": "new_value",
          "targetValue": ""
        },
        {
          "key": "EXISTING_VAR",
          "action": "update",
          "sourceValue": "new_value",
          "targetValue": "old_value"
        },
        {
          "key": "OLD_VAR",
          "action": "delete",
          "sourceValue": "",
          "targetValue": "value_to_remove"
        }
      ]
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

# Approve sync
POST /api/projects/{projectId}/sync-requests/{requestId}/approve

Response:
{
  "data": {
    "id": "req_xxx",
    "status": "approved",
    "approvedByUserId": "user_xxx",
    "approvedAt": "2024-01-15T10:35:00Z"
  }
}

# Execute sync
POST /api/projects/{projectId}/sync-requests/{requestId}/execute

Response:
{
  "data": {
    "id": "req_xxx",
    "status": "completed",
    "executedAt": "2024-01-15T10:36:00Z",
    "appliedChanges": 3
  }
}
```

## Sync Modes

### Manual Sync

Requires explicit request and approval:

1. User requests sync
2. Diff generated and shown
3. Approver reviews
4. Approver approves
5. Sync executed

**Best for**: Production environments, sensitive changes

### Automatic Sync

Syncs immediately on source changes:

1. Source environment updated
2. Diff generated automatically
3. Sync executed immediately
4. Notification sent

**Best for**: Development → Staging, non-sensitive environments

### Pull Request Mode

Creates a "PR" for review:

1. User requests sync
2. Diff generated
3. PR created in GitHub/GitLab
4. Team reviews and approves
5. Sync executed on merge

**Best for**: Teams using Git-based workflows

## Approval Workflow

### Requesting Sync

Requester:

1. Select source and target environments
2. Review generated diff
3. Add optional comment
4. Submit request

### Reviewing Sync

Approver sees:

- Side-by-side diff
- Change summary (add/update/delete counts)
- Requester and timestamp
- Optional comment

### Approval Options

Approver can:

- **Approve**: Sync proceeds
- **Reject**: Sync cancelled with reason
- **Request Changes**: Send back for modification

### Multiple Approvers

Configure multiple required approvers:

```json
{
  "requireApproval": true,
  "approvers": ["user_xxx", "user_yyy", "user_zzz"],
  "requiredApprovals": 2
}
```

## Diff Preview

### Change Types

| Action    | Icon | Description                  |
| --------- | ---- | ---------------------------- |
| Add       | +    | New variable in target       |
| Update    | ~    | Variable value changed       |
| Delete    | -    | Variable removed from target |
| Unchanged | =    | No change                    |

### Diff Display

```
Sync Preview: staging → production

Additions (1):
+ NEW_API_KEY = sk_***...***

Updates (1):
~ DATABASE_URL
  - postgres://old-host:5432/db
  + postgres://new-host:5432/db

Deletions (1):
- DEPRECATED_VAR = value

Unchanged (12):
= STRIPE_KEY = sk_***...***
= JWT_SECRET = ***...***
...
```

### Value Masking

Sensitive values are masked in diff:

- API keys: `sk_***...***`
- Passwords: `***`
- URLs: `postgres://***:***@host/db`

## Notifications

### Requester Notifications

- **Submitted**: Confirmation with diff link
- **Approved**: Ready to execute
- **Rejected**: With reason
- **Executed**: Completion confirmation

### Approver Notifications

- **Pending**: New sync request
- **Reminder**: If not reviewed (12 hours)
- **Executed**: After completion

### Team Notifications

- **Slack**: Posted to configured channel
- **Email**: Summary to project members
- **Audit Log**: All events recorded

## Best Practices

### 1. Always Use Approval for Production

Require approval for production syncs:

```json
{
  "sourceEnvLabel": "staging",
  "targetEnvLabel": "production",
  "requireApproval": true,
  "approvers": ["tech-lead@company.com", "devops@company.com"]
}
```

### 2. Review Diff Carefully

Before approving, check:

- All additions are intentional
- Updates are correct
- Deletions won't break anything
- No secrets exposed in diff

### 3. Test in Staging First

Always test changes:

1. Update development environment
2. Sync to staging automatically
3. Test thoroughly in staging
4. Request sync to production
5. Approve after verification

### 4. Document Sync Decisions

Add comments explaining syncs:

```
Request: "Adding new payment provider configuration"
Approval: "Tested in staging, looks good"
```

### 5. Monitor Sync Activity

Regular reviews:

```bash
# Weekly sync review
dotvault sync history my-project --from 2024-01-01 --to 2024-01-31

# Check for rejected syncs
dotvault sync history my-project --status rejected
```

### 6. Use Consistent Naming

Standard environment names:

- `development` or `dev`
- `staging` or `stage`
- `production` or `prod`

Makes sync rules clearer and reduces errors.

## Rollback

### Automatic Backup

Before sync, target environment is backed up:

1. Current state saved as version
2. Sync applied
3. Can restore if issues

### Manual Rollback

If sync causes issues:

```bash
# View sync history
dotvault sync history my-project

# Find previous version
dotvault versions list my-project --env production

# Restore previous version
dotvault versions restore my-project --env production --version 5
```

### Rollback Notifications

All rollbacks trigger:

- Urgent notifications
- Audit log entries
- Incident flagging

## Troubleshooting

### Sync Request Not Received

1. Check approver email addresses
2. Verify approvers have access
3. Check notification settings
4. Review spam folders

### Cannot Approve Sync

1. Verify you're in approvers list
2. Check sync is still pending
3. Ensure you have project access
4. Contact project owner

### Sync Failed

1. Check diff for conflicts
2. Verify target environment exists
3. Check permissions
4. Review error logs
5. Retry or rollback

### Conflicts Detected

If target changed since diff generated:

1. Sync request invalidated
2. New diff generated
3. Re-approval required
4. Prevents overwriting changes

## Compliance

### Regulatory Requirements

Environment sync helps meet:

- **SOX**: Change control procedures
- **HIPAA**: Access controls
- **PCI DSS**: Configuration management
- **SOC 2**: Change management

### Audit Trail

All sync events logged:

- Sync requested
- Diff generated
- Approval/rejection
- Sync executed
- Rollback (if any)

Retention: 7 years

## API Reference

### Update Sync Config

```bash
PATCH /api/projects/{projectId}/sync-configs/{configId}
{
  "requireApproval": true,
  "approvers": ["user_xxx", "user_yyy"],
  "isActive": true
}

Response:
{
  "data": {
    "id": "sync_xxx",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Delete Sync Config

```bash
DELETE /api/projects/{projectId}/sync-configs/{configId}

Response:
{
  "data": {
    "success": true
  }
}
```

### Get Sync Status

```bash
GET /api/projects/{projectId}/sync-configs/{configId}/status

Response:
{
  "data": {
    "id": "sync_xxx",
    "status": "active",
    "lastSyncAt": "2024-01-15T10:30:00Z",
    "lastSyncStatus": "completed",
    "pendingApprovals": 0
  }
}
```

## Pricing

Sync features by plan:

| Feature            | Free    | Pro     | Enterprise |
| ------------------ | ------- | ------- | ---------- |
| Manual sync        | ✓       | ✓       | ✓          |
| Automatic sync     | -       | ✓       | ✓          |
| Approval gates     | -       | ✓       | ✓          |
| Multiple approvers | -       | -       | ✓          |
| Sync history       | 30 days | 90 days | Unlimited  |
| GitHub PR mode     | -       | -       | ✓          |

## Support

- Documentation: https://docs.dotvault.io/sync
- Community: https://community.dotvault.io
- Email: support@dotvault.io
