# Team Workspaces

Team Workspaces enable organizations to manage multiple projects, members, and billing under a single umbrella with centralized access control and SSO integration.

## Overview

Team Workspaces provide:

- **Centralized management**: Single dashboard for all projects
- **Member management**: Invite and manage team members
- **SSO integration**: SAML and OIDC support
- **Billing consolidation**: Single invoice for all usage
- **Access policies**: Organization-wide security settings

## Creating a Workspace

### Web Interface

1. Click your profile → **Create Workspace**
2. Enter workspace name
3. Choose a unique slug (URL identifier)
4. Add billing email
5. Click **Create**

### CLI

```bash
dotvault workspace create \
  --name "Acme Corporation" \
  --slug "acme-corp" \
  --billing-email billing@acme.com
```

### API

```bash
POST /api/workspaces
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "billingEmail": "billing@acme.com"
}

Response:
{
  "data": {
    "id": "ws_xxx",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "billingEmail": "billing@acme.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Member Management

### Roles

| Role       | Permissions                     |
| ---------- | ------------------------------- |
| **Owner**  | Full control, billing, deletion |
| **Admin**  | Manage members, all projects    |
| **Member** | Access assigned projects        |

### Inviting Members

**Via Web Interface**:

1. Go to **Workspace Settings** → **Members**
2. Click **Invite Member**
3. Enter email address
4. Select role
5. Click **Send Invite**

**Via CLI**:

```bash
dotvault workspace invite acme-corp \
  --email user@example.com \
  --role admin
```

**Via API**:

```bash
POST /api/workspaces/{workspaceId}/invitations
{
  "email": "user@example.com",
  "role": "admin"
}
```

### Managing Members

**List Members**:

```bash
dotvault workspace members acme-corp
```

**Update Role**:

```bash
dotvault workspace update-member acme-corp \
  --user user@example.com \
  --role member
```

**Remove Member**:

```bash
dotvault workspace remove-member acme-corp \
  --user user@example.com
```

## SSO Integration

### Supported Providers

- **SAML 2.0**: Okta, Azure AD, OneLogin, JumpCloud
- **OIDC**: Google Workspace, Auth0, AWS Cognito

### SAML Configuration (Okta Example)

**In Okta**:

1. Create new SAML application
2. Configure:
   - Single Sign On URL: `https://dotvault.io/api/auth/saml/acme-corp/callback`
   - Audience URI: `https://dotvault.io/workspaces/acme-corp`
   - Name ID Format: EmailAddress
3. Download certificate
4. Copy SSO URL and Issuer

**In DotVault**:

1. Go to **Workspace Settings** → **SSO**
2. Select **SAML 2.0**
3. Enter:
   - SSO URL (from Okta)
   - Issuer/Entity ID (from Okta)
   - X.509 Certificate (from Okta)
4. Click **Save & Test**

**Via API**:

```bash
POST /api/workspaces/{workspaceId}/sso
{
  "provider": "saml",
  "config": {
    "entryPoint": "https://acme.okta.com/app/.../sso/saml",
    "issuer": "https://dotvault.io/workspaces/acme-corp",
    "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
  }
}
```

### OIDC Configuration (Google Example)

**In Google Cloud Console**:

1. Go to **APIs & Services** → **Credentials**
2. Create **OAuth 2.0 Client ID**
3. Configure:
   - Authorized redirect URIs: `https://dotvault.io/api/auth/oidc/acme-corp/callback`
4. Copy Client ID and Secret

**In DotVault**:

1. Go to **Workspace Settings** → **SSO**
2. Select **OpenID Connect**
3. Enter:
   - Client ID (from Google)
   - Client Secret (from Google)
   - Authorization URL: `https://accounts.google.com/o/oauth2/v2/auth`
   - Token URL: `https://oauth2.googleapis.com/token`
   - User Info URL: `https://openidconnect.googleapis.com/v1/userinfo`
   - Scopes: `openid,email,profile`
4. Click **Save & Test**

### Enforcing SSO

Require all members to use SSO:

```bash
POST /api/workspaces/{workspaceId}
{
  "ssoRequired": true
}
```

Effects:

- Existing members prompted to link SSO on next login
- New members must use SSO
- Non-SSO login disabled

### SSO Bypass

Emergency access for SSO outages:

1. Go to **Workspace Settings** → **SSO**
2. Click **Emergency Bypass**
3. Confirm with workspace owner credentials
4. Temporary password login enabled (24 hours)
5. All owners notified

## Project Management

### Creating Projects

Projects created in workspace context:

```bash
dotvault project create my-project \
  --workspace acme-corp
```

All workspace members can access based on role.

### Project Association

Move existing projects to workspace:

```bash
dotvault project move my-project \
  --to-workspace acme-corp
```

Or via web interface:

1. Go to **Project Settings** → **General**
2. Click **Transfer to Workspace**
3. Select workspace
4. Confirm

### Workspace Projects

List all workspace projects:

```bash
dotvault workspace projects acme-corp
```

Filter by member:

```bash
dotvault workspace projects acme-corp --member user@example.com
```

## Billing

### Consolidated Billing

All workspace projects on single invoice:

- One payment method
- Unified billing cycle
- Usage across all projects
- Volume discounts apply

### Usage Tracking

View workspace usage:

```bash
dotvault workspace usage acme-corp \
  --from 2024-01-01 \
  --to 2024-01-31
```

Breakdown by:

- Project
- Feature
- Member

### Invoices

Access invoices:

```bash
# List invoices
dotvault workspace invoices acme-corp

# Download invoice
dotvault workspace invoice acme-corp --invoice-id inv_xxx --download
```

## Access Policies

### Organization-wide Settings

Configure policies for all projects:

```bash
POST /api/workspaces/{workspaceId}/policies
{
  "require2FA": true,
  "minimumPasswordLength": 12,
  "sessionTimeoutMinutes": 60,
  "ipAllowlist": "203.0.113.0/24,198.51.100.0/24"
}
```

### Policy Inheritance

Projects inherit workspace policies:

- Can override some settings
- Cannot weaken security
- Audit trail of overrides

### Compliance Templates

Pre-configured policy sets:

**SOC 2**:

```json
{
  "require2FA": true,
  "sessionTimeoutMinutes": 30,
  "auditLogRetention": "7years",
  "passwordPolicy": "strong"
}
```

**HIPAA**:

```json
{
  "require2FA": true,
  "ipAllowlistRequired": true,
  "sessionTimeoutMinutes": 15,
  "encryptionAtRest": "AES256",
  "auditLogRetention": "7years"
}
```

**PCI DSS**:

```json
{
  "require2FA": true,
  "ipAllowlistRequired": true,
  "sessionTimeoutMinutes": 15,
  "accessReviewInterval": "quarterly"
}
```

## Best Practices

### 1. Use Workspaces for Organization

Structure by:

- Company/organization
- Business unit
- Department
- Product line

### 2. Implement SSO Early

Benefits:

- Centralized access control
- Automatic offboarding
- Compliance requirements
- Reduced password fatigue

### 3. Regular Access Reviews

Quarterly reviews:

```bash
# Generate access report
dotvault workspace access-report acme-corp

# Review inactive members
dotvault workspace members acme-corp --inactive-since 90days
```

### 4. Document Policies

Maintain policy documentation:

```markdown
# Acme Corp DotVault Policy

## Access

- SSO required for all members
- 2FA required for production access
- IP allowlist: Office + VPN only

## Projects

- All projects in workspace
- Naming convention: team-project
- Minimum 2 owners per project

## Security

- Quarterly access reviews
- Annual security training
- Incident response: security@acme.com
```

### 5. Monitor Activity

Workspace-wide monitoring:

```bash
# Failed logins across workspace
dotvault workspace audit acme-corp --action login_failed

# Emergency access usage
dotvault workspace audit acme-corp --action emergency_access
```

### 6. Plan for Scale

As team grows:

- Use groups/teams (Enterprise)
- Implement project templates
- Automate onboarding
- Regular policy updates

## API Reference

### Update Workspace

```bash
PATCH /api/workspaces/{workspaceId}
{
  "name": "Acme Corporation",
  "billingEmail": "new-billing@acme.com",
  "ssoRequired": true
}

Response:
{
  "data": {
    "id": "ws_xxx",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "billingEmail": "new-billing@acme.com",
    "ssoRequired": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### List Workspace Members

```bash
GET /api/workspaces/{workspaceId}/members

Response:
{
  "data": {
    "members": [
      {
        "id": "user_xxx",
        "name": "John Doe",
        "email": "john@acme.com",
        "role": "admin",
        "joinedAt": "2024-01-15T10:30:00Z",
        "lastActiveAt": "2024-01-16T14:20:00Z"
      }
    ]
  }
}
```

### Get SSO Configuration

```bash
GET /api/workspaces/{workspaceId}/sso

Response:
{
  "data": {
    "provider": "saml",
    "enabled": true,
    "entryPoint": "https://acme.okta.com/...",
    "issuer": "https://dotvault.io/workspaces/acme-corp",
    "certFingerprint": "a1b2c3d4...",
    "ssoRequired": true
  }
}
```

### Get Workspace Usage

```bash
GET /api/workspaces/{workspaceId}/usage?from=2024-01-01&to=2024-01-31

Response:
{
  "data": {
    "totalProjects": 12,
    "totalMembers": 25,
    "totalEnvironments": 48,
    "totalSecrets": 156,
    "breakdown": {
      "byProject": [
        {
          "projectId": "proj_xxx",
          "projectName": "API Service",
          "environments": 4,
          "secrets": 24,
          "members": 8
        }
      ],
      "byFeature": {
        "environments": 48,
        "members": 25,
        "apiCalls": 12500,
        "storage": "2.5GB"
      }
    }
  }
}
```

### Delete Workspace

```bash
DELETE /api/workspaces/{workspaceId}

Response:
{
  "data": {
    "success": true,
    "deletedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Warning**: Deletes all workspace projects and data. Irreversible.

## Troubleshooting

### SSO Login Failing

1. Verify SSO URL correct
2. Check certificate not expired
3. Confirm Issuer/Entity ID matches
4. Test with SAML tracer
5. Check DotVault SSO logs

### Cannot Invite Members

1. Verify workspace limits
2. Check billing status
3. Confirm email format valid
4. Ensure you have admin/owner role

### Project Transfer Failed

1. Verify ownership of project
2. Check workspace permissions
3. Ensure project not already in workspace
4. Review error message details

### SSO Bypass Not Working

1. Verify owner credentials
2. Check bypass not recently used
3. Ensure workspace not locked
4. Contact support if persistent

## Pricing

Workspace features by plan:

| Feature           | Free     | Pro       | Enterprise    |
| ----------------- | -------- | --------- | ------------- |
| Workspaces        | 1        | 3         | Unlimited     |
| Members           | 3        | 20        | Unlimited     |
| Projects          | 5 per ws | 20 per ws | Unlimited     |
| SSO (SAML/OIDC)   | -        | ✓         | ✓             |
| SSO enforcement   | -        | -         | ✓             |
| Advanced policies | -        | -         | ✓             |
| Audit logs        | 7 days   | 90 days   | Unlimited     |
| Priority support  | -        | Email     | Phone + Email |

## Support

- Documentation: https://docs.dotvault.io/workspaces
- SSO Setup Guide: https://docs.dotvault.io/sso
- Community: https://community.dotvault.io
- Email: support@dotvault.io
- Enterprise: enterprise@dotvault.io
