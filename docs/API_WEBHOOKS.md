# API & Webhooks

DotVault provides a comprehensive REST API and webhook system for programmatic access and integrations.

## API Overview

### Base URL

```
https://api.dotvault.io/v1
```

### Authentication

**API Key** (Recommended for server-to-server):

```bash
curl -H "Authorization: Bearer dv_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
     https://api.dotvault.io/v1/projects
```

**OAuth 2.0** (For user-facing applications):

```bash
# 1. Obtain access token
POST /oauth/token
{
  "grant_type": "authorization_code",
  "client_id": "your-client-id",
  "code": "auth-code",
  "redirect_uri": "https://your-app.com/callback"
}

# 2. Use access token
curl -H "Authorization: Bearer access_token_xxx" \
     https://api.dotvault.io/v1/projects
```

### Rate Limiting

| Plan       | Requests/Minute | Burst |
| ---------- | --------------- | ----- |
| Free       | 60              | 10    |
| Pro        | 600             | 100   |
| Enterprise | 6000            | 1000  |

Headers returned:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 599
X-RateLimit-Reset: 1640995200
```

### Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

Errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

## Core Endpoints

### Projects

**List Projects**:

```bash
GET /v1/projects?page=1&limit=20

Response:
{
  "data": {
    "projects": [
      {
        "id": "proj_xxx",
        "name": "My Project",
        "slug": "my-project",
        "role": "owner",
        "memberCount": 5,
        "envCount": 3,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "meta": { ... }
}
```

**Create Project**:

```bash
POST /v1/projects
{
  "name": "New Project",
  "slug": "new-project"
}

Response:
{
  "data": {
    "id": "proj_xxx",
    "name": "New Project",
    "slug": "new-project",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Get Project**:

```bash
GET /v1/projects/{projectId}

Response:
{
  "data": {
    "id": "proj_xxx",
    "name": "My Project",
    "slug": "my-project",
    "members": [...],
    "envs": [...],
    "settings": { ... }
  }
}
```

**Update Project**:

```bash
PATCH /v1/projects/{projectId}
{
  "name": "Updated Name",
  "ipAllowlist": "192.168.1.0/24"
}
```

**Delete Project**:

```bash
DELETE /v1/projects/{projectId}
```

### Environments

**List Environments**:

```bash
GET /v1/projects/{projectId}/envs

Response:
{
  "data": {
    "envs": [
      {
        "id": "env_xxx",
        "label": "production",
        "variableCount": 12,
        "lastModifiedAt": "2024-01-15T10:30:00Z",
        "lastModifiedBy": { ... }
      }
    ]
  }
}
```

**Get Environment**:

```bash
GET /v1/projects/{projectId}/envs/{envId}

Response:
{
  "data": {
    "id": "env_xxx",
    "label": "production",
    "content": "DATABASE_URL=postgres://...\nAPI_KEY=sk_...",
    "variables": [
      {
        "key": "DATABASE_URL",
        "value": "postgres://...",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Create Environment**:

```bash
POST /v1/projects/{projectId}/envs
{
  "label": "staging",
  "content": "DATABASE_URL=postgres://...\nAPI_KEY=sk_..."
}
```

**Update Environment**:

```bash
PATCH /v1/projects/{projectId}/envs/{envId}
{
  "content": "DATABASE_URL=postgres://...\nAPI_KEY=sk_...\nNEW_VAR=value"
}
```

**Delete Environment**:

```bash
DELETE /v1/projects/{projectId}/envs/{envId}
```

### Members

**List Members**:

```bash
GET /v1/projects/{projectId}/members

Response:
{
  "data": {
    "members": [
      {
        "id": "user_xxx",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "editor",
        "joinedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Invite Member**:

```bash
POST /v1/projects/{projectId}/invitations
{
  "email": "new@example.com",
  "role": "viewer"
}
```

**Update Member Role**:

```bash
PATCH /v1/projects/{projectId}/members/{userId}
{
  "role": "editor"
}
```

**Remove Member**:

```bash
DELETE /v1/projects/{projectId}/members/{userId}
```

### Audit Logs

**List Audit Logs**:

```bash
GET /v1/projects/{projectId}/audit-logs?action=env_update&from=2024-01-01

Response:
{
  "data": {
    "logs": [
      {
        "id": "log_xxx",
        "action": "env_update",
        "user": { ... },
        "resourceType": "env",
        "resourceId": "env_xxx",
        "metadata": { ... },
        "ipAddress": "192.168.1.1",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "meta": { ... }
}
```

## Webhooks

### Overview

Webhooks enable real-time notifications when events occur in your DotVault projects.

### Event Types

| Event                   | Description                |
| ----------------------- | -------------------------- |
| `env.created`           | Environment created        |
| `env.updated`           | Environment modified       |
| `env.deleted`           | Environment deleted        |
| `env.viewed`            | Environment accessed       |
| `member.invited`        | Member invited             |
| `member.joined`         | Member accepted invitation |
| `member.removed`        | Member removed             |
| `access.requested`      | Access request submitted   |
| `access.approved`       | Access request approved    |
| `emergency.access.used` | Emergency access activated |
| `secret.rotated`        | Secret rotated             |
| `sync.completed`        | Environment sync completed |
| `login.failed`          | Failed login attempt       |
| `login.succeeded`       | Successful login           |

### Creating Webhooks

**Via API**:

```bash
POST /v1/projects/{projectId}/webhooks
{
  "type": "slack",
  "url": "https://hooks.slack.com/services/...",
  "events": ["env.updated", "env.deleted"],
  "secret": "webhook-signing-secret"
}

Response:
{
  "data": {
    "id": "whk_xxx",
    "type": "slack",
    "url": "https://hooks.slack.com/services/...",
    "events": ["env.updated", "env.deleted"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Via CLI**:

```bash
dotvault webhook add my-project \
  --type slack \
  --url https://hooks.slack.com/services/... \
  --events env.updated,env.deleted
```

### Webhook Payloads

**Generic Webhook Format**:

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
    "via": "api"
  },
  "ipAddress": "192.168.1.1",
  "source": "dotvault",
  "version": "1.0"
}
```

**Slack Format**:

```json
{
  "attachments": [
    {
      "color": "#3b82f6",
      "title": "✏️ Environment Updated",
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
        }
      ],
      "footer": "DotVault",
      "ts": 1705315800
    }
  ]
}
```

### Signature Verification

Verify webhook authenticity using HMAC-SHA256:

**Node.js**:

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return signature === `sha256=${expected}`;
}

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

**Python**:

```python
import hmac
import hashlib

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

### Retry Logic

DotVault retries failed webhooks:

| Attempt | Delay      |
| ------- | ---------- |
| 1       | Immediate  |
| 2       | 5 seconds  |
| 3       | 25 seconds |
| 4       | 2 minutes  |
| 5       | 10 minutes |

Webhooks disabled after 5 consecutive failures.

### Testing Webhooks

**Via API**:

```bash
POST /v1/projects/{projectId}/webhooks/{webhookId}/test

Response:
{
  "data": {
    "success": true,
    "responseStatus": 200,
    "responseTime": 245
  }
}
```

**Via CLI**:

```bash
dotvault webhook test my-project --webhook-id whk_xxx
```

**Using webhook.site**:

1. Visit https://webhook.site
2. Copy unique URL
3. Create webhook with that URL
4. Trigger test event
5. Inspect payload on webhook.site

## SDKs

### JavaScript/TypeScript

```bash
npm install @dotvault/sdk
```

```typescript
import { DotVault } from "@dotvault/sdk";

const dotvault = new DotVault({
  apiKey: "dv_live_...",
});

// Get environment
const env = await dotvault.envs.get("proj_xxx", "env_xxx");
console.log(env.content);

// Update environment
await dotvault.envs.update("proj_xxx", "env_xxx", {
  content: "DATABASE_URL=postgres://...",
});

// List projects
const projects = await dotvault.projects.list();
```

### Python

```bash
pip install dotvault
```

```python
from dotvault import DotVault

dotvault = DotVault(api_key='dv_live_...')

# Get environment
env = dotvault.envs.get('proj_xxx', 'env_xxx')
print(env.content)

# Update environment
dotvault.envs.update('proj_xxx', 'env_xxx', content='DATABASE_URL=postgres://...')

# List projects
projects = dotvault.projects.list()
```

### Go

```bash
go get github.com/dotvault/go-sdk
```

```go
package main

import (
    "context"
    "fmt"
    "github.com/dotvault/go-sdk"
)

func main() {
    client := dotvault.New("dv_live_...")

    // Get environment
    env, err := client.Envs.Get(context.Background(), "proj_xxx", "env_xxx")
    if err != nil {
        panic(err)
    }
    fmt.Println(env.Content)
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning      |
| ---- | ------------ |
| 200  | Success      |
| 201  | Created      |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 403  | Forbidden    |
| 404  | Not Found    |
| 409  | Conflict     |
| 429  | Rate Limited |
| 500  | Server Error |

### Error Codes

| Code               | Description                |
| ------------------ | -------------------------- |
| `VALIDATION_ERROR` | Invalid request parameters |
| `UNAUTHORIZED`     | Authentication required    |
| `FORBIDDEN`        | Insufficient permissions   |
| `NOT_FOUND`        | Resource not found         |
| `CONFLICT`         | Resource already exists    |
| `RATE_LIMITED`     | Too many requests          |
| `INTERNAL_ERROR`   | Server error               |

### Retry Strategy

```python
import time
from dotvault import DotVault, RateLimitError

dotvault = DotVault(api_key='dv_live_...')

def with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(e.retry_after)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff

# Usage
result = with_retry(lambda: dotvault.envs.get('proj_xxx', 'env_xxx'))
```

## Best Practices

### 1. Use API Keys for Server-to-Server

API keys are simpler and more reliable than OAuth for backend services.

### 2. Scope API Keys

Create separate keys for different purposes:

```bash
# CI/CD deployments
dotvault api-key create --name "CI/CD" --scopes "read:envs"

# Monitoring
dotvault api-key create --name "Monitoring" --scopes "read:projects"
```

### 3. Handle Rate Limits

Implement exponential backoff:

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### 4. Verify Webhook Signatures

Always verify webhook signatures to ensure authenticity.

### 5. Use Idempotency Keys

For critical operations:

```bash
POST /v1/projects/{projectId}/envs
{
  "label": "production",
  "content": "...",
  "idempotencyKey": "unique-key-123"
}
```

### 6. Implement Health Checks

```bash
GET /v1/health

Response:
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Support

- API Documentation: https://docs.dotvault.io/api
- SDK Documentation: https://docs.dotvault.io/sdks
- Webhook Testing: https://webhook.site
- Community: https://community.dotvault.io
- Email: api@dotvault.io
