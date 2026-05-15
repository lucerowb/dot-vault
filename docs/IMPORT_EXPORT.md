# Import & Export

DotVault supports importing secrets from various sources and exporting to multiple formats, making migration and backup easy.

## Supported Import Formats

### .env Files

Standard environment variable files:

```bash
# Simple format
DATABASE_URL=postgres://localhost:5432/mydb
API_KEY=sk_test_1234567890

# With quotes (for values with spaces)
DESCRIPTION="My production database"

# Multi-line values
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgwKVPSmwaFkYLv
..."
```

**Import**:

```bash
# Via CLI
dotvault import my-project --env production --file .env.production

# Via web interface
# Project → Import → Select .env file
```

### JSON

Generic JSON object format:

```json
{
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "sk_test_1234567890",
  "DEBUG": "false"
}
```

**Import**:

```bash
dotvault import my-project --env production --format json --file secrets.json
```

### 1Password

Export from 1Password:

1. Open 1Password
2. Select items to export
3. File → Export → JSON
4. Import to DotVault

**Format**:

```json
[
  {
    "title": "Production Database",
    "fields": [
      {
        "label": "DATABASE_URL",
        "value": "postgres://localhost:5432/mydb",
        "type": "string"
      }
    ],
    "tags": ["production", "database"]
  }
]
```

**Import**:

```bash
dotvault import my-project --env production --format 1password --file 1password-export.json
```

### HashiCorp Vault

Export from Vault KV store:

```bash
# Export from Vault
vault kv get -format=json secret/myapp > vault-export.json
```

**Format**:

```json
{
  "data": {
    "data": {
      "DATABASE_URL": "postgres://localhost:5432/mydb",
      "API_KEY": "sk_test_1234567890"
    }
  }
}
```

**Import**:

```bash
dotvault import my-project --env production --format vault --file vault-export.json
```

### AWS Secrets Manager

Export from AWS:

```bash
# Get secret value
aws secretsmanager get-secret-value \
  --secret-id myapp/production \
  --query 'SecretString' \
  --output text > aws-secret.json
```

**Format**:

```json
{
  "SecretString": "{\"DATABASE_URL\":\"postgres://...\",\"API_KEY\":\"sk_...\"}"
}
```

Or plain string:

```json
{
  "SecretString": "DATABASE_URL=postgres://...\nAPI_KEY=sk_..."
}
```

**Import**:

```bash
dotvault import my-project --env production --format aws --file aws-secret.json
```

### Doppler

Export from Doppler:

```bash
# Export via CLI
doppler secrets download --format json > doppler-export.json
```

**Format**:

```json
[
  {
    "name": "DATABASE_URL",
    "value": "postgres://localhost:5432/mydb"
  },
  {
    "name": "API_KEY",
    "value": "sk_test_1234567890"
  }
]
```

Or object format:

```json
{
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "sk_test_1234567890"
}
```

**Import**:

```bash
dotvault import my-project --env production --format doppler --file doppler-export.json
```

### Vercel

Export from Vercel:

```bash
# Export via CLI
vercel env ls --environment=production --format json > vercel-export.json
```

**Format**:

```json
[
  {
    "key": "DATABASE_URL",
    "value": "postgres://localhost:5432/mydb",
    "target": ["production"],
    "type": "plain"
  }
]
```

**Import**:

```bash
dotvault import my-project --env production --format vercel --file vercel-export.json
```

### Netlify

Export from Netlify:

```bash
# Export via CLI
netlify env:list --context production --json > netlify-export.json
```

**Format**:

```json
[
  {
    "key": "DATABASE_URL",
    "value": "postgres://localhost:5432/mydb"
  }
]
```

**Import**:

```bash
dotvault import my-project --env production --format netlify --file netlify-export.json
```

## Auto-Detection

DotVault automatically detects import format:

```bash
# Auto-detect format
dotvault import my-project --env production --file secrets.txt

# Detects based on:
# - File extension (.env, .json)
# - Content structure
# - Known patterns
```

## Import Options

### Dry Run

Preview import without applying:

```bash
dotvault import my-project --env production --file .env --dry-run

# Output:
# Would import 12 secrets:
#   + DATABASE_URL
#   + API_KEY
#   + DEBUG
#   ...
#
# Issues detected:
#   ⚠️ DEBUG: Value "true" is a common placeholder
```

### Skip Invalid

Continue import even if some secrets are invalid:

```bash
dotvault import my-project --env production --file .env --skip-invalid

# Output:
# Imported 10 secrets
# Skipped 2 invalid secrets:
#   - INVALID KEY: Contains spaces
#   - ANOTHER_BAD_KEY: Invalid characters
```

### Overwrite Existing

Replace existing environment:

```bash
dotvault import my-project --env production --file .env --overwrite

# Warning: This will replace all existing secrets in 'production'
# Previous version will be saved in version history
```

### Add Comment

Document the import:

```bash
dotvault import my-project --env production --file .env --comment "Migration from Heroku"
```

## Supported Export Formats

### .env

Standard environment file:

```bash
# Export
dotvault export my-project --env production --format env --file .env.production

# Output:
DATABASE_URL=postgres://localhost:5432/mydb
API_KEY=sk_test_1234567890
DEBUG=false
```

### JSON

Structured JSON:

```bash
dotvault export my-project --env production --format json --file secrets.json

# Output:
{
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "sk_test_1234567890",
  "DEBUG": "false"
}
```

### CSV

Spreadsheet-compatible:

```bash
dotvault export my-project --env production --format csv --file secrets.csv

# Output:
Key,Value
DATABASE_URL,postgres://localhost:5432/mydb
API_KEY,sk_test_1234567890
DEBUG,false
```

### YAML

YAML format:

```bash
dotvault export my-project --env production --format yaml --file secrets.yaml

# Output:
DATABASE_URL: "postgres://localhost:5432/mydb"
API_KEY: "sk_test_1234567890"
DEBUG: "false"
```

## Export Options

### Mask Values

Export with masked values:

```bash
dotvault export my-project --env production --format env --mask

# Output:
DATABASE_URL=postgres://****:****@****:5432/****
API_KEY=sk_****...****
DEBUG=****
```

### Select Keys

Export only specific keys:

```bash
dotvault export my-project --env production --keys DATABASE_URL,API_KEY
```

### Include Metadata

Add metadata to export:

```bash
dotvault export my-project --env production --format json --include-metadata

# Output:
{
  "_metadata": {
    "exportedAt": "2024-01-15T10:30:00Z",
    "exportedBy": "john@example.com",
    "project": "my-project",
    "environment": "production"
  },
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "sk_test_1234567890"
}
```

## Migration Workflows

### From 1Password to DotVault

```bash
# 1. Export from 1Password
# File → Export → Selected Items → JSON

# 2. Import to DotVault
dotvault import my-project --env production --format 1password --file 1password-export.json

# 3. Verify import
dotvault env get my-project --env production

# 4. (Optional) Delete from 1Password
```

### From HashiCorp Vault to DotVault

```bash
# 1. Export from Vault
vault kv get -format=json secret/myapp/production > vault-export.json

# 2. Import to DotVault
dotvault import my-project --env production --format vault --file vault-export.json

# 3. Set up rotation (optional)
dotvault rotation enable my-project --env production --key DATABASE_URL --interval 90

# 4. (Optional) Migrate gradually
# Keep Vault as backup during transition
```

### From AWS Secrets Manager to DotVault

```bash
# 1. Export from AWS
aws secretsmanager get-secret-value \
  --secret-id myapp/production \
  > aws-secret.json

# 2. Import to DotVault
dotvault import my-project --env production --format aws --file aws-secret.json

# 3. Update applications to use DotVault
# (Gradual migration recommended)

# 4. (Optional) Set up AWS rotation via DotVault
dotvault rotation enable my-project --env production --key AWS_ACCESS_KEY_ID --provider aws
```

### From Vercel to DotVault

```bash
# 1. Export from Vercel
vercel env ls --environment=production --format json > vercel-export.json

# 2. Import to DotVault
dotvault import my-project --env production --format vercel --file vercel-export.json

# 3. Set up GitHub Actions integration
dotvault cicd generate my-project --env production --provider github

# 4. Update Vercel to use DotVault
# (Use dotvault/action in GitHub Actions)
```

## Best Practices

### 1. Validate Before Import

Always use dry-run first:

```bash
dotvault import my-project --env production --file .env --dry-run
```

### 2. Document Migrations

Add comments for audit trail:

```bash
dotvault import my-project --env production --file .env --comment "Migration from Heroku - Jan 2024"
```

### 3. Keep Backups

Export before major changes:

```bash
# Backup before import
dotvault export my-project --env production --format json --file backup-$(date +%Y%m%d).json

# Then import
dotvault import my-project --env production --file .env
```

### 4. Use Version History

Imports create new versions:

```bash
# View version history
dotvault versions list my-project --env production

# Rollback if needed
dotvault versions restore my-project --env production --version 5
```

### 5. Secure Exports

Handle exported files carefully:

```bash
# Export with restricted permissions
dotvault export my-project --env production --format env --file .env.production
chmod 600 .env.production

# Or use masked export for sharing
dotvault export my-project --env production --format env --mask --file env-structure.env
```

### 6. Automate Regular Exports

Schedule backups:

```bash
# Add to crontab
0 2 * * * dotvault export my-project --env production --format json --file /backups/secrets-$(date +\%Y\%m\%d).json
```

## API Reference

### Import

```bash
POST /api/projects/{projectId}/import
{
  "label": "production",
  "content": "DATABASE_URL=postgres://...\nAPI_KEY=sk_...",
  "format": "auto",
  "options": {
    "skipInvalid": true,
    "overwriteExisting": false,
    "dryRun": false
  }
}

Response:
{
  "data": {
    "imported": 12,
    "skipped": 0,
    "errors": [],
    "issues": [
      {
        "key": "DEBUG",
        "issue": "Value appears to be a placeholder",
        "severity": "warning"
      }
    ]
  }
}
```

### Export

```bash
GET /api/projects/{projectId}/envs/{envId}/export?format=env&includeValues=true

Response: (file download)
Content-Type: text/plain
Content-Disposition: attachment; filename="production.env"

DATABASE_URL=postgres://...
API_KEY=sk_...
```

### List Supported Formats

```bash
GET /api/import/formats

Response:
{
  "data": {
    "formats": [
      {
        "id": "env",
        "name": ".env File",
        "description": "Standard .env file format"
      },
      {
        "id": "json",
        "name": "JSON",
        "description": "Generic JSON object format"
      },
      {
        "id": "1password",
        "name": "1Password",
        "description": "1Password export format"
      }
    ]
  }
}
```

## Troubleshooting

### Import Fails

1. Check file format matches specified format
2. Verify file encoding (UTF-8)
3. Check for special characters
4. Use dry-run to identify issues

### Secrets Not Importing

1. Check key format (no spaces, valid characters)
2. Verify values not empty
3. Check for duplicate keys
4. Review error messages

### Export Empty

1. Verify environment exists
2. Check you have access permissions
3. Ensure environment not empty
4. Try different format

### Encoding Issues

1. Ensure UTF-8 encoding
2. Check for BOM (Byte Order Mark)
3. Handle special characters properly
4. Use binary mode for CLI

## Security

### Import Security

- All imports logged in audit trail
- Previous versions preserved
- Validation prevents injection attacks
- Size limits prevent abuse

### Export Security

- Requires appropriate permissions
- Can be masked for safe sharing
- Audit log records exports
- Automatic cleanup of temporary files

### Data Handling

- Never log secret values
- Secure temporary storage
- Memory-only processing
- Immediate cleanup after import/export

## Support

- Documentation: https://docs.dotvault.io/import-export
- Migration Guide: https://docs.dotvault.io/migration
- Community: https://community.dotvault.io
- Email: support@dotvault.io
