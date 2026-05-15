# Notifications

DotVault supports real-time notifications via Slack, Discord, and generic webhooks to keep your team informed of important events.

## Overview

Notifications help you:

- **Monitor activity**: Know when secrets are accessed or modified
- **Respond quickly**: Get alerted to security events
- **Maintain compliance**: Track all changes in real-time
- **Integrate workflows**: Connect with your existing tools

## Supported Channels

### Slack

Receive notifications in Slack channels with rich formatting.

**Features**:

- Rich message formatting with color-coded events
- Direct mention support for urgent events
- Thread replies for related events
- Mobile push notifications

**Setup**:

1. Create a Slack app with incoming webhooks
2. Copy webhook URL
3. Configure in DotVault project settings

### Discord

Get notifications in Discord channels with embed formatting.

**Features**:

- Rich embeds with event details
- Color-coded by severity
- Role mention support
- Mobile notifications

**Setup**:

1. Create a Discord webhook in channel settings
2. Copy webhook URL
3. Configure in DotVault project settings

### Generic Webhooks

Send notifications to any HTTP endpoint for custom integrations.

**Features**:

- Custom payload format
- Signature verification
- Retry logic
- Custom headers

**Use Cases**:

- SIEM integration
- Custom dashboards
- Automated workflows
- PagerDuty/Opsgenie

## Event Types

### Environment Events

| Event          | Description             | Severity |
| -------------- | ----------------------- | -------- |
| `env.created`  | New environment created | Info     |
| `env.updated`  | Environment modified    | Info     |
| `env.deleted`  | Environment deleted     | Warning  |
| `env.viewed`   | Environment accessed    | Info     |
| `env.exported` | Environment exported    | Info     |

### Member Events

| Event                 | Description         | Severity |
| --------------------- | ------------------- | -------- |
| `member.invited`      | New member invited  | Info     |
| `member.joined`       | Invitation accepted | Info     |
| `member.removed`      | Member removed      | Warning  |
| `member.role_changed` | Role updated        | Info     |

### Access Control Events

| Event                   | Description                | Severity |
| ----------------------- | -------------------------- | -------- |
| `access.requested`      | Access request submitted   | Info     |
| `access.approved`       | Access request approved    | Info     |
| `access.rejected`       | Access request rejected    | Info     |
| `emergency.access.used` | Emergency access activated | Critical |

### Security Events

| Event             | Description                | Severity |
| ----------------- | -------------------------- | -------- |
| `login.failed`    | Failed login attempt       | Warning  |
| `login.succeeded` | Successful login           | Info     |
| `secret.rotated`  | Secret rotated             | Info     |
| `sync.completed`  | Environment sync completed | Info     |

## Configuration

### Web Interface

1. Go to **Project Settings** → **Notifications**
2. Click **Add Webhook**
3. Select channel type (Slack/Discord/Generic)
4. Enter webhook URL
5. Select events to subscribe to
6. Optional: Add secret for signature verification
7. Test the configuration
8. Save

### CLI

```bash
# Add Slack webhook
dotvault webhook add my-project \
  --type slack \
  --url https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX \
  --events env.updated,env.deleted,emergency.access.used

# Add Discord webhook
dotvault webhook add my-project \
  --type discord \
  --url https://discord.com/api/webhooks/... \
  --events "*"

# Add generic webhook
dotvault webhook add my-project \
  --type generic \
  --url https://your-api.com/webhook \
  --events env.updated \
  --secret your-webhook-secret

# List webhooks
dotvault webhook list my-project

# Test webhook
dotvault webhook test my-project --webhook-id whk_xxx

# Remove webhook
dotvault webhook remove my-project --webhook-id whk_xxx
```

### API

```bash
# Create webhook
POST /api/projects/{projectId}/webhooks
{
  "type": "slack",
  "url": "https://hooks.slack.com/services/...",
  "events": ["env.updated", "env.deleted", "emergency.access.used"],
  "secret": "optional-signing-secret"
}

Response:
{
  "data": {
    "id": "whk_xxx",
    "type": "slack",
    "url": "https://hooks.slack.com/services/...",
    "events": ["env.updated", "env.deleted", "emergency.access.used"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

# Test webhook
POST /api/projects/{projectId}/webhooks/{webhookId}/test

Response:
{
  "data": {
    "success": true,
    "responseStatus": 200,
    "responseTime": 245
  }
}
```

## Message Formats

### Slack Format

```json
{
  "attachments": [
    {
      "color": "#10b981",
      "title": "✓ Environment Updated",
      "fields": [
        {
          "title": "Project",
          "value": "My Project",
          "short": true
        },
        {
          "title": "User",
          "value": "John Doe (john@example.com)",
          "short": true
        },
        {
          "title": "Environment",
          "value": "production",
          "short": true
        }
      ],
      "footer": "DotVault",
      "ts": 1705315800
    }
  ]
}
```

### Discord Format

```json
{
  "embeds": [
    {
      "title": "✓ Environment Updated",
      "color": 65280,
      "fields": [
        {
          "name": "Project",
          "value": "My Project",
          "inline": true
        },
        {
          "name": "User",
          "value": "John Doe (john@example.com)",
          "inline": true
        }
      ],
      "footer": {
        "text": "DotVault"
      },
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Generic Webhook Format

```json
{
  "event": "env.updated",
  "projectId": "proj_xxx",
  "projectName": "My Project",
  "user": {
    "id": "user_xxx",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": {
    "label": "production",
    "via": "web"
  },
  "ipAddress": "192.168.1.1",
  "source": "dotvault",
  "version": "1.0"
}
```

## Signature Verification

For generic webhooks, verify the signature to ensure authenticity:

### Node.js Example

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return signature === `sha256=${expected}`;
}

// Express middleware
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-dotvault-signature"];
  const secret = process.env.DOTVAULT_WEBHOOK_SECRET;

  if (!verifyWebhook(req.body, signature, secret)) {
    return res.status(401).send("Invalid signature");
  }

  // Process webhook
  console.log("Event:", req.body.event);
  res.status(200).send("OK");
});
```

### Python Example

```python
import hmac
import hashlib
import json

from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-DotVault-Signature', '')
    secret = os.environ['DOTVAULT_WEBHOOK_SECRET']

    expected = 'sha256=' + hmac.new(
        secret.encode(),
        request.data,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        abort(401)

    payload = request.get_json()
    print(f"Event: {payload['event']}")

    return 'OK'
```

## Best Practices

### 1. Subscribe to Relevant Events

Don't subscribe to all events - choose what's important:

**Recommended for most teams**:

- `env.updated`
- `env.deleted`
- `member.removed`
- `emergency.access.used`
- `login.failed`

**For security-focused teams, add**:

- `env.viewed`
- `access.requested`
- `access.approved`

### 2. Use Separate Channels

Create dedicated channels for different purposes:

- `#dotvault-alerts` - Critical events only
- `#dotvault-activity` - All activity
- `#dotvault-security` - Security events

### 3. Set Up Monitoring

Monitor webhook health:

```bash
# Check webhook status
dotvault webhook status my-project

# View delivery logs
dotvault webhook logs my-project --webhook-id whk_xxx
```

### 4. Handle Failures

Implement retry logic in your webhook handler:

```javascript
app.post("/webhook", async (req, res) => {
  try {
    await processWebhook(req.body);
    res.status(200).send("OK");
  } catch (error) {
    // Return 500 to trigger retry
    res.status(500).send("Error");
  }
});
```

### 5. Secure Your Endpoints

- Use HTTPS only
- Verify signatures
- Implement IP allowlisting
- Use strong webhook secrets

## Troubleshooting

### Webhook Not Firing

1. Check webhook is active
2. Verify event subscription
3. Test webhook manually
4. Check delivery logs

### Messages Not Received

1. Verify webhook URL is correct
2. Check channel permissions
3. Test with curl:
   ```bash
   curl -X POST https://hooks.slack.com/services/... \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test"}'
   ```

### Signature Verification Failing

1. Ensure secret matches
2. Check payload isn't modified
3. Verify encoding (UTF-8)
4. Check header name case

### Rate Limiting

If receiving 429 errors:

1. Implement exponential backoff
2. Process webhooks asynchronously
3. Return 200 quickly, process later
4. Contact support if persistent

## API Reference

### List Webhooks

```bash
GET /api/projects/{projectId}/webhooks

Response:
{
  "data": {
    "webhooks": [
      {
        "id": "whk_xxx",
        "type": "slack",
        "url": "https://hooks.slack.com/services/...",
        "events": ["env.updated", "env.deleted"],
        "isActive": true,
        "lastSuccessAt": "2024-01-15T10:30:00Z",
        "lastError": null,
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```

### Update Webhook

```bash
PATCH /api/projects/{projectId}/webhooks/{webhookId}
{
  "events": ["env.updated", "env.deleted", "member.removed"],
  "isActive": true
}
```

### Delete Webhook

```bash
DELETE /api/projects/{projectId}/webhooks/{webhookId}

Response:
{
  "data": {
    "success": true
  }
}
```

### Get Delivery Logs

```bash
GET /api/projects/{projectId}/webhooks/{webhookId}/logs?page=1&limit=50

Response:
{
  "data": {
    "logs": [
      {
        "id": "log_xxx",
        "event": "env.updated",
        "status": "delivered",
        "statusCode": 200,
        "responseTime": 245,
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "log_yyy",
        "event": "env.deleted",
        "status": "failed",
        "statusCode": 500,
        "error": "Internal Server Error",
        "createdAt": "2024-01-15T10:35:00Z"
      }
    ]
  }
}
```

## Pricing

Notification limits by plan:

| Plan       | Webhooks  | Events/Month |
| ---------- | --------- | ------------ |
| Free       | 1         | 100          |
| Pro        | 5         | 10,000       |
| Enterprise | Unlimited | Unlimited    |

Enterprise features:

- Custom webhook formats
- Advanced retry logic
- Webhook analytics
- Priority delivery

## Support

- Documentation: https://docs.dotvault.io/notifications
- Webhook debugging: https://webhook.site
- Community: https://community.dotvault.io
- Email: support@dotvault.io
