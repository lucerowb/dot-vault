# Access Requests

The Access Requests system allows team members to request temporary elevated permissions for specific tasks, with approval workflows and automatic expiration.

## Overview

Access requests enable:

- **Temporary elevation**: Request editor access for a limited time
- **Approval workflow**: Project owners review and approve requests
- **Automatic expiration**: Access automatically revoked after duration
- **Audit trail**: All requests logged for compliance

## Use Cases

### Emergency Bug Fixes

When a critical bug needs immediate fixing:

1. Viewer requests 2-hour editor access
2. Owner receives notification
3. Owner approves with one click
4. Developer fixes the bug
5. Access automatically expires

### On-Call Rotation

For on-call engineers who need occasional access:

1. On-call engineer requests 8-hour access
2. Automated approval (if configured)
3. Engineer handles incidents
4. Access expires at shift end

### Contractor Access

For temporary contractors:

1. Contractor requests 24-hour access
2. Owner reviews and approves
3. Contractor completes work
4. Access automatically revoked

## Requesting Access

### Web Interface

1. Navigate to the project
2. Click **Request Access** button
3. Select duration (1, 2, 4, 8, or 24 hours)
4. Provide reason for request
5. Submit request

### CLI

```bash
# Request access
dotvault access request my-project --duration 4 --reason "Fixing production bug"

# Check request status
dotvault access status my-project

# Cancel pending request
dotvault access cancel my-project
```

### API

```bash
POST /api/projects/{projectId}/access-requests
{
  "reason": "Fixing production bug",
  "durationHours": 4
}

Response:
{
  "data": {
    "id": "req_xxx",
    "status": "pending",
    "requestedRole": "editor",
    "durationHours": 4,
    "expiresAt": "2024-01-15T14:30:00Z",
    "token": "tok_xxx"
  }
}
```

## Reviewing Requests

### Web Interface

1. Go to **Project Settings** → **Access Requests**
2. View pending requests
3. Review reason and requester
4. Click **Approve** or **Reject**
5. Optionally adjust duration

### Email Notifications

Owners receive email notifications with:

- Requester name and email
- Requested duration
- Reason for request
- One-click approve/reject links

### CLI

```bash
# List pending requests
dotvault access list my-project

# Approve request
dotvault access approve my-project --request-id req_xxx --duration 2

# Reject request
dotvault access reject my-project --request-id req_xxx
```

### API

```bash
POST /api/projects/{projectId}/access-requests/{requestId}/review
{
  "action": "approve",
  "durationHours": 2
}
```

## Duration Options

| Duration | Use Case            |
| -------- | ------------------- |
| 1 hour   | Quick fix or review |
| 2 hours  | Short task          |
| 4 hours  | Half day            |
| 8 hours  | Full day            |
| 24 hours | Extended access     |

## Notifications

### Requester Notifications

- **Submitted**: Confirmation email
- **Approved**: Access granted notification with expiration time
- **Rejected**: Decline notification with reason (if provided)
- **Expiring Soon**: 15-minute warning before expiration
- **Expired**: Access revoked notification

### Owner Notifications

- **New Request**: Immediate email with approve/reject links
- **Request Expiring**: If not reviewed within 12 hours
- **Access Used**: When elevated access is exercised

### Slack/Discord Integration

Configure notifications to team channels:

```bash
POST /api/projects/{projectId}/webhooks
{
  "type": "slack",
  "url": "https://hooks.slack.com/services/...",
  "events": ["access.requested", "access.approved"]
}
```

## Automatic Expiration

### How It Works

1. Access granted with expiration timestamp
2. Background job monitors active grants
3. At expiration, access automatically revoked
4. User demoted back to viewer role
5. Notification sent to user and owners

### Early Termination

Requesters can voluntarily end access early:

```bash
dotvault access revoke my-project
```

Or via web interface: **Revoke Access** button.

### Extension

If more time is needed:

1. Requester submits new request
2. Owner approves
3. New expiration time set

## Audit Trail

All access request activities are logged:

| Action          | Logged Data                    |
| --------------- | ------------------------------ |
| Request created | Who, when, reason, duration    |
| Approved        | Who approved, final duration   |
| Rejected        | Who rejected, reason           |
| Access used     | What actions were performed    |
| Expired         | Automatic expiration timestamp |
| Revoked early   | Who revoked, when              |

View audit logs:

```bash
dotvault audit my-project --action access_request
```

## Configuration

### Auto-Approval

Configure automatic approval for trusted users:

```bash
POST /api/projects/{projectId}/access-config
{
  "autoApprove": {
    "enabled": true,
    "maxDurationHours": 4,
    "trustedUsers": ["user_xxx", "user_yyy"]
  }
}
```

### Custom Durations

Allow custom durations beyond standard options:

```bash
POST /api/projects/{projectId}/access-config
{
  "customDurations": {
    "enabled": true,
    "minHours": 1,
    "maxHours": 72
  }
}
```

### Require Multiple Approvers

For sensitive projects, require multiple approvals:

```bash
POST /api/projects/{projectId}/access-config
{
  "requireApprovers": 2,
  "approverRoles": ["owner"]
}
```

## Best Practices

### 1. Principle of Least Privilege

- Default all members to viewer
- Grant editor access only when needed
- Use shortest duration that suffices

### 2. Meaningful Reasons

Require detailed reasons:

```
Good: "Fixing critical payment bug affecting checkout (JIRA-1234)"
Bad: "Need access"
```

### 3. Regular Review

Schedule weekly reviews of:

- Pending requests
- Approved access patterns
- Rejected requests (training opportunity)

### 4. Time Limits

Set reasonable defaults:

- Standard: 4 hours
- On-call: 8 hours
- Contractors: 24 hours (with review)

### 5. Emergency Procedures

Document emergency access procedures:

- When to use access requests vs break-glass
- Escalation paths
- After-hours contact info

## Security

### Access Controls

- Only project owners can approve requests
- Requesters cannot approve their own requests
- All approvals logged and auditable

### Rate Limiting

Prevent abuse:

- Max 3 pending requests per user
- Max 1 request per hour
- Cooldown period after rejection

### Monitoring

Alert on suspicious patterns:

- Frequent requests from same user
- Requests outside business hours
- Short time between request and usage

## API Reference

### Create Request

```bash
POST /api/projects/{projectId}/access-requests
{
  "reason": "Production bug fix",
  "durationHours": 4
}

Response:
{
  "data": {
    "id": "req_xxx",
    "projectId": "proj_xxx",
    "requesterUserId": "user_xxx",
    "requestedRole": "editor",
    "reason": "Production bug fix",
    "status": "pending",
    "token": "tok_xxx",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T14:30:00Z"
  }
}
```

### List Requests

```bash
GET /api/projects/{projectId}/access-requests?status=pending

Response:
{
  "data": {
    "requests": [
      {
        "id": "req_xxx",
        "requester": {
          "id": "user_xxx",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "reason": "Production bug fix",
        "status": "pending",
        "durationHours": 4,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Review Request

```bash
POST /api/projects/{projectId}/access-requests/{requestId}/review
{
  "action": "approve",
  "durationHours": 2
}

Response:
{
  "data": {
    "id": "req_xxx",
    "status": "approved",
    "reviewedByUserId": "user_yyy",
    "reviewedAt": "2024-01-15T10:35:00Z",
    "expiresAt": "2024-01-15T12:35:00Z"
  }
}
```

### Revoke Access

```bash
POST /api/projects/{projectId}/access-requests/{requestId}/revoke

Response:
{
  "data": {
    "success": true,
    "revokedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Get My Active Access

```bash
GET /api/me/access-grants

Response:
{
  "data": {
    "grants": [
      {
        "projectId": "proj_xxx",
        "projectName": "My Project",
        "role": "editor",
        "grantedAt": "2024-01-15T10:35:00Z",
        "expiresAt": "2024-01-15T14:35:00Z",
        "timeRemaining": "3h 35m"
      }
    ]
  }
}
```

## Troubleshooting

### Request Not Received

1. Check spam/junk folders
2. Verify email address is correct
3. Check notification settings
4. Try web interface instead

### Cannot Approve

1. Verify you are project owner
2. Check if request is still pending
3. Ensure you're not approving your own request
4. Check for required multiple approvers

### Access Not Working

1. Refresh the page
2. Log out and back in
3. Check if access has expired
4. Verify role was updated

### Expired Too Soon

1. Check actual expiration time in notification
2. Verify timezone settings
3. Submit new request if needed
4. Contact owner for permanent access if recurring

## Support

- Documentation: https://docs.dotvault.io/access-requests
- Community: https://community.dotvault.io
- Email: support@dotvault.io
