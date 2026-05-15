# Secret Rotation

Automatic secret rotation ensures your credentials are regularly updated, reducing the risk of compromised secrets and meeting compliance requirements.

## Overview

Secret rotation provides:

- **Automated rotation**: Secrets updated on schedule
- **Provider integration**: Native AWS, Stripe, and custom support
- **Zero downtime**: Seamless credential updates
- **Audit trail**: Complete rotation history
- **Compliance**: Meet regulatory requirements

## Supported Providers

### AWS IAM

Rotate AWS access keys automatically.

**Process**:

1. Create new access key
2. Update secret in DotVault
3. Grace period for propagation
4. Delete old access key

**Configuration**:

```json
{
  "provider": "aws",
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "region": "us-east-1",
  "iamUserName": "my-service-user"
}
```

### Stripe

Rotate Stripe API keys.

**Process**:

1. Generate new API key
2. Update secret in DotVault
3. Update application configuration
4. Revoke old key

**Configuration**:

```json
{
  "provider": "stripe",
  "apiKey": "sk_live_...",
  "keyType": "live"
}
```

### Custom Webhook

Rotate any secret via custom webhook.

**Process**:

1. Call your webhook endpoint
2. Webhook generates new secret
3. Returns new value
4. DotVault updates and stores

**Configuration**:

```json
{
  "provider": "custom",
  "webhookUrl": "https://api.mycompany.com/rotate-secret",
  "secret": "webhook-auth-token"
}
```

## Setup

### Web Interface

1. Navigate to **Project** → **Environment**
2. Select secret to rotate
3. Click **Enable Rotation**
4. Choose provider
5. Enter provider credentials
6. Set rotation interval
7. Save

### CLI

```bash
# Enable rotation
dotvault rotation enable my-project \
  --env production \
  --key AWS_ACCESS_KEY_ID \
  --provider aws \
  --interval 30 \
  --config '{
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "us-east-1",
    "iamUserName": "my-user"
  }'

# Trigger manual rotation
dotvault rotation rotate my-project \
  --env production \
  --key AWS_ACCESS_KEY_ID

# Disable rotation
dotvault rotation disable my-project \
  --env production \
  --key AWS_ACCESS_KEY_ID

# List rotation schedules
dotvault rotation list my-project

# View rotation history
dotvault rotation history my-project --env production --key AWS_ACCESS_KEY_ID
```

### API

```bash
# Enable rotation
POST /api/projects/{projectId}/envs/{envId}/rotation
{
  "secretKey": "AWS_ACCESS_KEY_ID",
  "intervalDays": 30,
  "provider": "aws",
  "providerConfig": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "us-east-1",
    "iamUserName": "my-user"
  }
}

Response:
{
  "data": {
    "id": "rot_xxx",
    "secretKey": "AWS_ACCESS_KEY_ID",
    "intervalDays": 30,
    "provider": "aws",
    "status": "active",
    "nextRotationAt": "2024-02-14T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

# Trigger manual rotation
POST /api/projects/{projectId}/envs/{envId}/rotation/{rotationId}/rotate

Response:
{
  "data": {
    "success": true,
    "rotatedAt": "2024-01-15T10:30:00Z",
    "nextRotationAt": "2024-02-14T10:30:00Z"
  }
}
```

## Rotation Intervals

### Recommended Intervals

| Secret Type        | Recommended | Maximum  | Compliance             |
| ------------------ | ----------- | -------- | ---------------------- |
| AWS Access Keys    | 90 days     | 90 days  | AWS best practice      |
| Stripe Keys        | 180 days    | 365 days | PCI DSS                |
| Database Passwords | 90 days     | 180 days | SOC 2                  |
| API Keys           | 90 days     | 180 days | NIST 800-53            |
| JWT Secrets        | 180 days    | 365 days | Security best practice |

### Custom Intervals

Configure any interval from 1 to 365 days:

```bash
# Weekly rotation (high security)
--interval 7

# Monthly rotation
--interval 30

# Quarterly rotation
--interval 90

# Bi-annual rotation
--interval 180
```

## Rotation Process

### Automatic Rotation

1. **Schedule Check**: Daily check for due rotations
2. **Pre-rotation**: Verify provider connectivity
3. **Generate New**: Create new secret via provider API
4. **Update DotVault**: Store new secret encrypted
5. **Grace Period**: Wait for propagation (configurable)
6. **Revoke Old**: Delete old secret via provider API
7. **Notification**: Alert on success or failure

### Manual Rotation

Trigger immediate rotation:

```bash
dotvault rotation rotate my-project --env production --key AWS_ACCESS_KEY_ID
```

Useful for:

- Security incidents
- Compliance audits
- Employee departures
- Suspicious activity

### Rotation Status

Check rotation health:

```bash
# View all rotations
dotvault rotation list my-project

# View specific rotation
dotvault rotation show my-project --env production --key AWS_ACCESS_KEY_ID

# Output:
# Secret: AWS_ACCESS_KEY_ID
# Status: Active
# Last rotated: 2024-01-15 (15 days ago)
# Next rotation: 2024-02-14 (75 days)
# Provider: AWS IAM
# Interval: 90 days
```

## Notifications

### Success Notifications

Sent when rotation completes:

- **Email**: To project owners
- **Slack**: To configured channels
- **Audit Log**: Rotation event recorded

### Failure Notifications

Sent immediately on failure:

- **Email**: Urgent to project owners
- **Slack**: @channel mention
- **Dashboard**: Red alert badge
- **Retry**: Automatic retry (3 attempts)

### Upcoming Rotation

Warning before scheduled rotation:

- **7 days before**: Initial notification
- **1 day before**: Reminder notification
- **Day of**: Rotation in progress

## Best Practices

### 1. Start with Manual Rotation

Before enabling automatic:

1. Test manual rotation process
2. Verify application handles rotation
3. Confirm provider integration works
4. Enable automatic with confidence

### 2. Application Support

Ensure applications handle rotation:

```python
# Example: AWS SDK automatic refresh
import boto3

# SDK automatically uses new credentials
# from environment variables
session = boto3.Session()
client = session.client('s3')
```

### 3. Grace Period Configuration

Allow time for propagation:

```json
{
  "gracePeriodMinutes": 60,
  "propagationCheck": {
    "enabled": true,
    "endpoint": "https://api.myapp.com/health",
    "expectedStatus": 200
  }
}
```

### 4. Monitor Rotation Health

Regular checks:

```bash
# Weekly review
dotvault rotation list my-project --status failed

# Monthly audit
dotvault audit my-project --action secret_rotated
```

### 5. Emergency Rotation

Document emergency procedures:

```markdown
# Emergency Secret Rotation

1. Identify compromised secret
2. Trigger manual rotation:
   dotvault rotation rotate my-project --env production --key KEY_NAME
3. Verify application health
4. Review audit logs
5. Update incident report
```

### 6. Provider Credentials

Secure provider credentials:

- Store in separate environment
- Use dedicated rotation IAM user
- Limit permissions to minimum
- Monitor provider API usage

## Custom Webhook Integration

### Webhook Contract

Your webhook must accept:

```json
POST https://your-api.com/rotate-secret
Headers:
  Content-Type: application/json
  X-Webhook-Secret: your-secret

Body:
{
  "action": "rotate",
  "currentValue": "old-secret-value",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

And respond with:

```json
{
  "newValue": "new-secret-value",
  "expiresAt": "2024-04-15T10:30:00Z",
  "metadata": {
    "key": "value"
  }
}
```

### Example Implementation

**Node.js/Express**:

```javascript
app.post('/rotate-secret', (req, res) => {
  // Verify webhook secret
  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  // Generate new secret
  const newSecret = generateSecureSecret();

  // Update your system
  await updateSecretInDatabase(newSecret);

  // Return new secret
  res.json({
    newValue: newSecret,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  });
});
```

## Troubleshooting

### Rotation Failed

1. Check provider credentials
2. Verify provider API access
3. Check rate limits
4. Review error logs
5. Retry manually

### Application Breaks After Rotation

1. Verify grace period sufficient
2. Check application caching
3. Confirm environment variable reload
4. Review application logs
5. Consider longer grace period

### Provider Credentials Expired

1. Update provider credentials
2. Test connection
3. Trigger manual rotation
4. Verify automatic rotation resumes

### Rotation Not Scheduled

1. Check rotation is enabled
2. Verify interval setting
3. Check for paused status
4. Review scheduler logs

## Compliance

### Regulatory Requirements

Secret rotation helps meet:

- **PCI DSS**: Key rotation every 90 days
- **SOC 2**: Regular credential rotation
- **HIPAA**: Access control requirements
- **NIST 800-53**: Media protection
- **GDPR**: Security of processing

### Audit Trail

All rotation events logged:

- Rotation triggered (manual/auto)
- Provider API calls
- Success/failure status
- New secret metadata (not value)
- User who triggered (if manual)

Retention: 7 years

## API Reference

### List Rotations

```bash
GET /api/projects/{projectId}/rotations

Response:
{
  "data": {
    "rotations": [
      {
        "id": "rot_xxx",
        "envId": "env_xxx",
        "envLabel": "production",
        "secretKey": "AWS_ACCESS_KEY_ID",
        "intervalDays": 90,
        "provider": "aws",
        "status": "active",
        "lastRotatedAt": "2024-01-15T10:30:00Z",
        "nextRotationAt": "2024-04-15T10:30:00Z"
      }
    ]
  }
}
```

### Get Rotation History

```bash
GET /api/projects/{projectId}/rotations/{rotationId}/history

Response:
{
  "data": {
    "history": [
      {
        "id": "hist_xxx",
        "action": "rotated",
        "triggeredBy": "automatic",
        "status": "success",
        "rotatedAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "providerResponse": "200 OK"
        }
      }
    ]
  }
}
```

### Pause Rotation

```bash
POST /api/projects/{projectId}/rotations/{rotationId}/pause

Response:
{
  "data": {
    "status": "paused",
    "pausedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Resume Rotation

```bash
POST /api/projects/{projectId}/rotations/{rotationId}/resume

Response:
{
  "data": {
    "status": "active",
    "resumedAt": "2024-01-15T10:30:00Z",
    "nextRotationAt": "2024-04-15T10:30:00Z"
  }
}
```

## Pricing

Rotation features by plan:

| Feature            | Free    | Pro       | Enterprise |
| ------------------ | ------- | --------- | ---------- |
| Manual rotation    | ✓       | ✓         | ✓          |
| Automatic rotation | -       | 5 secrets | Unlimited  |
| Custom webhooks    | -       | ✓         | ✓          |
| Rotation history   | 30 days | 90 days   | Unlimited  |
| Priority support   | -       | ✓         | ✓          |

## Support

- Documentation: https://docs.dotvault.io/rotation
- AWS IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- Stripe: https://stripe.com/docs/keys
- Community: https://community.dotvault.io
- Email: support@dotvault.io
