# Secret Templates

Secret templates provide structure and validation for common service credentials, ensuring your secrets are correctly formatted and complete.

## Overview

Templates help you:

- **Validate format**: Ensure secrets match expected patterns
- **Ensure completeness**: All required fields are present
- **Standardize naming**: Consistent key names across projects
- **Document usage**: Built-in documentation links

## Available Templates

### Cloud Providers

#### AWS Credentials

**Keys**:

- `AWS_ACCESS_KEY_ID` - Access Key ID (starts with AKIA)
- `AWS_SECRET_ACCESS_KEY` - Secret Access Key (40 chars)
- `AWS_REGION` - AWS Region (optional)

**Validation**:

- Access Key ID format: `AKIA[0-9A-Z]{16}`
- Secret Access Key: 40 alphanumeric characters
- Region: Valid AWS region format

**Example**:

```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

#### Firebase Config

**Keys**:

- `FIREBASE_PROJECT_ID` - Project identifier
- `FIREBASE_PRIVATE_KEY` - Service account private key (PEM format)
- `FIREBASE_CLIENT_EMAIL` - Service account email

**Validation**:

- Private key must be valid PEM format
- Email must match Firebase service account pattern

#### Supabase

**Keys**:

- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - Public/anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (optional)

**Validation**:

- URL must be valid Supabase domain
- Keys must be valid JWT format

### Payment Processors

#### Stripe API

**Keys**:

- `STRIPE_PUBLISHABLE_KEY` - Public key (pk*test* or pk*live*)
- `STRIPE_SECRET_KEY` - Secret key (sk*test* or sk*live*)
- `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret (optional)

**Validation**:

- Publishable key format: `pk_(test|live)_[a-zA-Z0-9]{24,}`
- Secret key format: `sk_(test|live)_[a-zA-Z0-9]{24,}`
- Webhook secret format: `whsec_[a-zA-Z0-9]{24,}`

**Security Notes**:

- Publishable keys are safe for frontend code
- Secret keys must never be exposed client-side
- Use separate keys for test and production

### Communication Services

#### Twilio

**Keys**:

- `TWILIO_ACCOUNT_SID` - Account identifier (AC...)
- `TWILIO_AUTH_TOKEN` - Authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number (optional)

**Validation**:

- Account SID: `AC[a-f0-9]{32}`
- Auth token: 32 hex characters
- Phone number: E.164 format

#### SendGrid

**Keys**:

- `SENDGRID_API_KEY` - API key
- `SENDGRID_FROM_EMAIL` - Default from address (optional)

**Validation**:

- API key format: `SG.[a-zA-Z0-9_-]{22}.[a-zA-Z0-9_-]{43}`
- Email must be valid format

#### Slack Bot

**Keys**:

- `SLACK_BOT_TOKEN` - Bot User OAuth Token (xoxb-...)
- `SLACK_SIGNING_SECRET` - Request signing secret (optional)
- `SLACK_CHANNEL_ID` - Default channel ID (optional)

**Validation**:

- Bot token format: `xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}`
- Signing secret: 32 hex characters
- Channel ID: Valid Slack channel format

### Authentication

#### GitHub Token

**Keys**:

- `GITHUB_TOKEN` - Personal Access Token (ghp\_...)
- `GITHUB_USERNAME` - GitHub username (optional)

**Validation**:

- Token format: `ghp_[a-zA-Z0-9]{36}`

#### JWT Secret

**Keys**:

- `JWT_SECRET` - Signing secret (min 32 chars)
- `JWT_EXPIRES_IN` - Token expiration (optional)

**Validation**:

- Secret: Minimum 32 characters
- Expires in: Number + s/m/h/d (e.g., "24h", "7d")

### Databases

#### Database Connection

**Keys**:

- `DATABASE_URL` - Full connection URL
- `DATABASE_SSL` - SSL mode (optional)

**Validation**:

- URL must start with supported protocol (postgres, mysql, mongodb, redis)
- SSL mode must be valid option

#### Redis

**Keys**:

- `REDIS_URL` - Connection URL
- `REDIS_PASSWORD` - Password (optional)

**Validation**:

- URL must start with `redis://` or `rediss://`

### Other Services

#### OpenAI API

**Keys**:

- `OPENAI_API_KEY` - API key (sk-...)
- `OPENAI_ORG_ID` - Organization ID (optional)

**Validation**:

- Key format: `sk-[a-zA-Z0-9]{48}`
- Org ID format: `org-[a-zA-Z0-9]{24}`

#### Sentry

**Keys**:

- `SENTRY_DSN` - Data Source Name
- `SENTRY_ENVIRONMENT` - Environment tag (optional)

**Validation**:

- DSN format: Valid Sentry DSN pattern

## Using Templates

### Web Interface

1. Navigate to **Project** → **Environment**
2. Click **Add from Template**
3. Select a template category
4. Choose the specific service
5. Fill in the required fields
6. Click **Save**

### CLI

```bash
# Create from template
dotvault env create my-project --env production --template aws-credentials

# Interactive mode
dotvault env create my-project --env production --template aws-credentials --interactive

# With values
dotvault env create my-project --env production --template stripe-api \
  --values '{"STRIPE_PUBLISHABLE_KEY":"pk_test_...","STRIPE_SECRET_KEY":"sk_test_..."}'
```

### API

```bash
POST /api/projects/{projectId}/envs/from-template
{
  "label": "production",
  "templateId": "aws-credentials",
  "values": {
    "AWS_ACCESS_KEY_ID": "AKIA...",
    "AWS_SECRET_ACCESS_KEY": "...",
    "AWS_REGION": "us-east-1"
  }
}
```

## Validation

### Real-time Validation

As you type, templates validate:

- **Format**: Regex pattern matching
- **Length**: Minimum/maximum character limits
- **Prefix**: Required prefixes (e.g., `AKIA`, `sk_`)
- **Type**: URL, email, JSON validation

### Batch Validation

Validate all secrets in an environment:

```bash
dotvault env validate my-project --env production
```

Returns:

- Valid secrets count
- Invalid secrets with specific errors
- Warnings for suspicious patterns

### Custom Validation

Add custom validation rules:

```typescript
// .dotvault/config.js
module.exports = {
  templates: {
    "my-custom-api": {
      keys: [
        {
          key: "MY_API_KEY",
          required: true,
          pattern: /^my_[a-z0-9]{32}$/,
          validationMessage:
            "Must start with my_ followed by 32 alphanumeric chars",
        },
      ],
    },
  },
};
```

## Auto-Detection

### Import Detection

When importing secrets, DotVault auto-detects templates:

```bash
# Import with auto-detection
dotvault import my-project --env production --file secrets.env --detect-templates
```

Detection criteria:

- Key name matching (e.g., `AWS_ACCESS_KEY_ID`)
- Value patterns (e.g., `AKIA...`)
- Key combinations (multiple related keys)

### Environment Scanning

Scan existing environments for template matches:

```bash
dotvault env scan my-project --env production
```

Results:

- Detected templates
- Missing required keys
- Invalid values
- Suggested fixes

## Best Practices

### 1. Use Templates for New Services

Always start with a template when adding a new service:

- Ensures all required keys are present
- Validates format immediately
- Provides documentation links

### 2. Validate Before Deployment

Run validation before deploying:

```bash
# In CI/CD pipeline
dotvault env validate my-project --env production --fail-on-error
```

### 3. Keep Templates Updated

Templates are updated as services change:

- New required fields
- Updated validation patterns
- Deprecation notices

### 4. Document Custom Keys

For keys not in templates:

```
# Custom: Payment Gateway API
PAYMENT_API_KEY=...
PAYMENT_API_SECRET=...
PAYMENT_WEBHOOK_SECRET=...
```

### 5. Use Consistent Naming

Follow template naming conventions:

- `SERVICE_KEY_NAME` format
- All uppercase
- Underscore separators

## Creating Custom Templates

### Organization Templates

Create templates for your internal services:

```bash
# Via web interface
Project Settings → Templates → Create Template

# Via API
POST /api/organizations/{orgId}/templates
{
  "id": "internal-api",
  "name": "Internal API",
  "category": "other",
  "variables": [
    {
      "key": "INTERNAL_API_KEY",
      "label": "API Key",
      "required": true,
      "type": "string",
      "pattern": "^int_[a-z0-9]{32}$"
    }
  ]
}
```

### Template Schema

```typescript
interface SecretTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "cloud"
    | "payment"
    | "communication"
    | "database"
    | "auth"
    | "other";
  icon: string;
  documentationUrl?: string;
  variables: Array<{
    key: string;
    label: string;
    description?: string;
    required: boolean;
    type: "string" | "url" | "email" | "json";
    pattern?: RegExp;
    placeholder?: string;
    validationMessage?: string;
  }>;
}
```

## API Reference

### List Templates

```bash
GET /api/templates

Response:
{
  "data": {
    "templates": [
      {
        "id": "aws-credentials",
        "name": "AWS Credentials",
        "category": "cloud",
        "description": "AWS Access Key ID and Secret Access Key",
        "icon": "☁️",
        "documentationUrl": "https://docs.aws.amazon.com/...",
        "variableCount": 3
      }
    ]
  }
}
```

### Get Template Details

```bash
GET /api/templates/{templateId}

Response:
{
  "data": {
    "id": "aws-credentials",
    "name": "AWS Credentials",
    "category": "cloud",
    "variables": [
      {
        "key": "AWS_ACCESS_KEY_ID",
        "label": "Access Key ID",
        "description": "Your AWS Access Key ID (starts with AKIA)",
        "required": true,
        "type": "string",
        "pattern": "^AKIA[0-9A-Z]{16}$",
        "placeholder": "AKIAIOSFODNN7EXAMPLE",
        "validationMessage": "Must be a valid AWS Access Key ID"
      }
    ]
  }
}
```

### Validate Values

```bash
POST /api/templates/{templateId}/validate
{
  "values": {
    "AWS_ACCESS_KEY_ID": "AKIA...",
    "AWS_SECRET_ACCESS_KEY": "..."
  }
}

Response:
{
  "data": {
    "valid": true,
    "errors": [],
    "missing": []
  }
}
```

## Troubleshooting

### Validation Failures

1. Check the exact error message
2. Verify the pattern matches your value
3. Ensure no extra spaces or characters
4. Use the template's placeholder as a guide

### Missing Templates

If a service isn't covered:

1. Use the generic template
2. Submit a template request
3. Create a custom organization template

### Pattern Updates

Services occasionally change their formats:

- Check the template's documentation link
- Report outdated patterns
- Use custom validation temporarily

## Contributing

### Submitting New Templates

1. Fork the repository
2. Add template to `src/lib/secret-templates.ts`
3. Include validation patterns
4. Add documentation link
5. Submit PR with test cases

### Template Requirements

- Clear, unique ID
- Descriptive name
- Accurate validation patterns
- Documentation URL
- Test cases

## Support

- Documentation: https://docs.dotvault.io/templates
- Template requests: https://github.com/dotvault/dotvault/issues
- Community: https://community.dotvault.io
