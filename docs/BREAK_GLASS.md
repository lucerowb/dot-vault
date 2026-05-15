# Break-Glass Emergency Access

Break-glass emergency access provides a controlled mechanism for obtaining elevated permissions during critical situations when normal access channels are unavailable.

## Overview

Break-glass access is designed for true emergencies:

- **Production outages** requiring immediate intervention
- **Security incidents** needing rapid response
- **Owner unavailability** blocking critical work

## Emergency Types

### Owner Unavailable

When project owners are unreachable and urgent changes are needed:

- **Required Approvals**: 2
- **Auto-Expire**: 4 hours
- **Use Case**: Critical fixes during off-hours

### Critical Incident

Production outage or security incident requiring immediate access:

- **Required Approvals**: 2
- **Auto-Expire**: 2 hours
- **Use Case**: Active incident response

### Other Emergency

Other urgent situations not covered above:

- **Required Approvals**: 2
- **Auto-Expire**: 4 hours
- **Use Case**: Time-sensitive business needs

## Requesting Emergency Access

### Web Interface

1. Navigate to project
2. Click **Emergency Access** (red button)
3. Select emergency type
4. Provide detailed description
5. Submit request

### CLI

```bash
# Request emergency access
dotvault emergency request my-project \
  --type critical_incident \
  --description "Production database down, need to rotate credentials"

# Check status
dotvault emergency status my-project
```

### API

```bash
POST /api/projects/{projectId}/emergency-access
{
  "emergencyType": "critical_incident",
  "description": "Production database down, need to rotate credentials. Error started at 14:30 UTC. PagerDuty incident #1234."
}

Response:
{
  "data": {
    "id": "emg_xxx",
    "status": "pending",
    "emergencyType": "critical_incident",
    "requiredApprovals": 2,
    "currentApprovals": 0,
    "token": "tok_xxx",
    "createdAt": "2024-01-15T14:35:00Z"
  }
}
```

## Approval Process

### Two-Approver Requirement

Break-glass requires **two separate owners** to approve:

1. First owner approves → Status: "partially_approved"
2. Second owner approves → Status: "approved"
3. Access granted immediately

### Approval Notifications

Owners receive immediate notifications via:

- **Email**: High-priority with approve/reject links
- **Slack/Discord**: Urgent channel mention
- **SMS**: If configured (Enterprise only)

### Approval Interface

```bash
# Via CLI
dotvault emergency approve my-project --request-id emg_xxx

# Via web
# Click link in notification or go to Emergency Access page
```

### Approval Time Limits

- **Response Window**: 1 hour for each approver
- **Total Window**: 2 hours for both approvals
- **Auto-Reject**: If window expires

## Using Emergency Access

### Immediate Access

Once fully approved:

1. Access granted instantly
2. Full editor permissions
3. 2-hour expiration (critical) or 4-hour (other)
4. All actions logged with "emergency" flag

### Access Indicators

UI shows emergency access is active:

- Red banner: "Emergency access active - expires in 1h 23m"
- Audit logs: Marked with 🚨 symbol
- Notifications: Sent to all owners on each action

### Scope of Access

Emergency access grants:

- ✓ View all environments
- ✓ Edit all environments
- ✓ Add/remove variables
- ✓ Rotate secrets
- ✓ View audit logs
- ✗ Delete project
- ✗ Manage billing
- ✗ Change ownership

## Post-Emergency Procedures

### Automatic Actions

After emergency access expires:

1. Access automatically revoked
2. User returns to normal role
3. Comprehensive audit report generated
4. All owners notified of actions taken

### Required Follow-Up

Within 24 hours:

1. **Document incident**: Write post-mortem
2. **Review actions**: Verify all changes were necessary
3. **Rotate secrets**: If any were viewed
4. **Update procedures**: Improve prevention

### Audit Report

Generated report includes:

- Who requested access and why
- Who approved and when
- All actions performed
- Variables viewed or modified
- IP addresses and timestamps

## Security Controls

### Prevention of Abuse

- **Multiple approvers**: No single person can grant access
- **Time limits**: Short expiration windows
- **Audit trail**: Complete logging of all activity
- **Notifications**: Real-time alerts to all owners
- **Rate limiting**: Max 1 request per day per user

### Detection

Alert on suspicious patterns:

- Frequent emergency requests
- Requests during non-emergency times
- Access used for non-critical changes
- Same approver pair repeatedly

### Response

If abuse suspected:

1. Immediately revoke access
2. Disable requester's account
3. Review all actions taken
4. Rotate all potentially exposed secrets
5. Conduct security review

## Configuration

### Custom Approvers

Designate specific emergency approvers:

```bash
POST /api/projects/{projectId}/emergency-config
{
  "emergencyApprovers": [
    "user_xxx", // Primary on-call
    "user_yyy", // Secondary on-call
    "user_zzz"  // Manager
  ],
  "requireApprovers": 2
}
```

### Notification Settings

Configure emergency notifications:

```bash
POST /api/projects/{projectId}/emergency-config
{
  "notifications": {
    "email": true,
    "slack": true,
    "sms": true, // Enterprise only
    "pagerduty": true // Enterprise only
  }
}
```

### Auto-Approve (Not Recommended)

For specific scenarios (use with caution):

```bash
POST /api/projects/{projectId}/emergency-config
{
  "autoApprove": {
    "enabled": true,
    "conditions": {
      "pagerDutyIncident": true,
      "businessHoursOnly": false
    }
  }
}
```

## Best Practices

### 1. Document Procedures

Create runbook for emergency access:

```markdown
# Emergency Access Runbook

## When to Use

- Production outage > 15 min
- Security incident
- Data loss event

## How to Request

1. Create PagerDuty incident
2. Request emergency access
3. Post in #incidents Slack channel

## After Access Granted

1. Communicate in incident channel
2. Document all actions
3. Notify when complete
```

### 2. Regular Drills

Practice emergency procedures:

- Quarterly access request drills
- Verify approvers are responsive
- Test notification channels
- Review and update procedures

### 3. Post-Incident Reviews

Every emergency access use requires review:

- Was it truly an emergency?
- Could it have been prevented?
- Were procedures followed?
- What can be improved?

### 4. Minimize Need

Reduce emergency situations:

- Proper access provisioning
- Cross-training team members
- Automated rollback capabilities
- Comprehensive monitoring

### 5. Communication

Clear communication during emergencies:

- Incident channel updates
- Stakeholder notifications
- Status page updates
- Post-incident reports

## Comparison: Access Requests vs Break-Glass

| Feature       | Access Requests   | Break-Glass    |
| ------------- | ----------------- | -------------- |
| Use case      | Planned elevation | True emergency |
| Approvals     | 1 owner           | 2 owners       |
| Duration      | 1-24 hours        | 2-4 hours      |
| Response time | Normal            | Immediate      |
| Audit level   | Standard          | Enhanced       |
| Notifications | Standard          | Urgent         |
| Post-review   | Optional          | Required       |

## API Reference

### Create Emergency Request

```bash
POST /api/projects/{projectId}/emergency-access
{
  "emergencyType": "critical_incident",
  "description": "Production database connection failure. Started 14:30 UTC. Multiple customer reports."
}

Response:
{
  "data": {
    "id": "emg_xxx",
    "projectId": "proj_xxx",
    "requesterUserId": "user_xxx",
    "emergencyType": "critical_incident",
    "description": "Production database connection failure...",
    "status": "pending",
    "requiredApprovals": 2,
    "currentApprovals": 0,
    "token": "tok_xxx",
    "createdAt": "2024-01-15T14:35:00Z",
    "expiresAt": "2024-01-15T16:35:00Z"
  }
}
```

### Approve Emergency Request

```bash
POST /api/projects/{projectId}/emergency-access/{emergencyId}/approve

Response:
{
  "data": {
    "id": "emg_xxx",
    "status": "partially_approved", // or "approved"
    "approver1UserId": "user_yyy",
    "approver1ApprovedAt": "2024-01-15T14:36:00Z",
    "approver2UserId": null,
    "approver2ApprovedAt": null,
    "accessExpiresAt": "2024-01-15T16:36:00Z" // set when fully approved
  }
}
```

### Reject Emergency Request

```bash
POST /api/projects/{projectId}/emergency-access/{emergencyId}/reject

Response:
{
  "data": {
    "id": "emg_xxx",
    "status": "rejected",
    "reviewedByUserId": "user_yyy",
    "reviewedAt": "2024-01-15T14:36:00Z"
  }
}
```

### List Emergency Requests

```bash
GET /api/projects/{projectId}/emergency-access?status=pending

Response:
{
  "data": {
    "requests": [
      {
        "id": "emg_xxx",
        "requester": {
          "id": "user_xxx",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "emergencyType": "critical_incident",
        "description": "Production database connection failure...",
        "status": "pending",
        "requiredApprovals": 2,
        "currentApprovals": 0,
        "createdAt": "2024-01-15T14:35:00Z",
        "expiresAt": "2024-01-15T16:35:00Z"
      }
    ]
  }
}
```

### Get Emergency Access Report

```bash
GET /api/projects/{projectId}/emergency-access/{emergencyId}/report

Response:
{
  "data": {
    "request": { ... },
    "approvals": [ ... ],
    "actions": [
      {
        "action": "env_view",
        "resourceId": "env_xxx",
        "timestamp": "2024-01-15T14:40:00Z",
        "ipAddress": "192.168.1.1"
      }
    ],
    "summary": {
      "environmentsViewed": 2,
      "environmentsModified": 1,
      "secretsRotated": 1,
      "totalActions": 5
    }
  }
}
```

## Troubleshooting

### Cannot Get Two Approvers

1. Ensure multiple owners are configured
2. Check notification settings
3. Use alternative contact methods
4. Escalate to organization admin

### Access Not Granted

1. Verify both approvals received
2. Check request hasn't expired
3. Confirm you're checking correct project
4. Contact support if system error

### Emergency During Off-Hours

1. Use PagerDuty/Slack for urgent contact
2. Escalation policy should include DotVault owners
3. Consider SMS notifications (Enterprise)
4. Document in incident management system

### False Positive

If request was made in error:

1. Reject the request immediately
2. Notify requester
3. Document reason
4. Review procedures to prevent recurrence

## Support

Emergency support available 24/7:

- **Critical Issues**: emergency@dotvault.io
- **Documentation**: https://docs.dotvault.io/break-glass
- **Status Page**: https://status.dotvault.io
- **Phone**: +1-XXX-XXX-XXXX (Enterprise)

## Legal and Compliance

### Regulatory Requirements

Break-glass access helps meet:

- **SOX**: Emergency access controls
- **HIPAA**: Break-glass procedures
- **PCI DSS**: Emergency access logging
- **GDPR**: Data breach response

### Audit Requirements

Maintain records for:

- Request justifications
- Approver identities
- Actions performed
- Post-incident reviews

Retention: 7 years (configurable)
