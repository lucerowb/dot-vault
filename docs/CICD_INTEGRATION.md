# CI/CD Integration

DotVault provides native integrations with popular CI/CD platforms, enabling secure secret injection into your deployment pipelines.

## Overview

CI/CD integration enables:

- **Secure secret injection**: Fetch secrets at deploy time
- **No hardcoded secrets**: Eliminate secrets in repositories
- **Automatic rotation**: CI/CD uses latest secrets
- **Audit trail**: Track which secrets were used in deployments
- **Multi-platform support**: GitHub Actions, GitLab CI, CircleCI, and more

## Supported Platforms

### GitHub Actions

**Features**:

- Native action for secret fetching
- Repository secrets sync
- Environment protection rules
- Deployment workflows

**Setup**:

1. Install DotVault GitHub App
2. Configure sync rules
3. Add workflow using `dotvault/action`

**Example Workflow**:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Fetch secrets from DotVault
        uses: dotvault/action@v1
        with:
          api-key: ${{ secrets.DOTVAULT_API_KEY }}
          project: my-project
          env: production
          output: .env

      - name: Deploy
        run: |
          source .env
          npm run deploy
```

### GitLab CI

**Features**:

- Native CI/CD variables sync
- Pipeline integration
- Protected variable support
- Multi-environment deployments

**Example Pipeline**:

```yaml
stages:
  - deploy

deploy_production:
  stage: deploy
  image: node:20-alpine
  before_script:
    - apk add --no-cache curl
  script:
    - |
      curl -s -X GET \
        -H "Authorization: Bearer ${DOTVAULT_API_KEY}" \
        -H "Accept: application/json" \
        "https://api.dotvault.io/api/projects/${PROJECT_ID}/envs/production" \
        | jq -r '.data.content' > .env
    - source .env
    - npm run deploy
  environment:
    name: production
    url: https://myapp.com
  only:
    - main
```

### CircleCI

**Features**:

- Context integration
- Project-level variables
- Orb support
- Secure secret handling

**Example Config**:

```yaml
version: 2.1

orbs:
  dotvault: dotvault/dotvault@1.0

jobs:
  deploy:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - dotvault/fetch-env:
          api-key: DOTVAULT_API_KEY
          project: my-project
          env: production
          output: .env
      - run:
          name: Deploy
          command: |
            source .env
            npm run deploy

workflows:
  deploy:
    jobs:
      - deploy:
          context: production
          filters:
            branches:
              only: main
```

### Jenkins

**Features**:

- Pipeline integration
- Credential management
- Multi-branch support
- Freestyle job support

**Example Pipeline**:

```groovy
pipeline {
    agent any

    environment {
        DOTVAULT_API_KEY = credentials('dotvault-api-key')
        PROJECT_ID = 'proj_xxx'
    }

    stages {
        stage('Fetch Secrets') {
            steps {
                script {
                    def response = httpRequest(
                        url: "https://api.dotvault.io/api/projects/${PROJECT_ID}/envs/production",
                        httpMode: 'GET',
                        customHeaders: [
                            [name: 'Authorization', value: "Bearer ${env.DOTVAULT_API_KEY}"],
                            [name: 'Accept', value: 'application/json']
                        ]
                    )

                    def json = readJSON text: response.content
                    writeFile file: '.env', text: json.data.content
                }
            }
        }

        stage('Deploy') {
            steps {
                sh 'source .env && npm run deploy'
            }
        }
    }
}
```

### Azure DevOps

**Features**:

- Pipeline variables
- Variable groups
- Environment integration
- Service connections

**Example Pipeline**:

```yaml
trigger:
  - main

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
    displayName: "Install Node.js"

  - script: |
      curl -s -X GET \
        -H "Authorization: Bearer $(DOTVAULT_API_KEY)" \
        -H "Accept: application/json" \
        "https://api.dotvault.io/api/projects/$(PROJECT_ID)/envs/production" \
        | jq -r '.data.content' > .env
    displayName: "Fetch secrets from DotVault"

  - script: |
      source .env
      npm run deploy
    displayName: "Deploy"
```

### Travis CI

**Features**:

- Environment variables
- Build matrix support
- Secure variable encryption
- Multi-environment deployments

**Example Config**:

```yaml
language: node_js
node_js:
  - "20"

before_deploy:
  - curl -s -X GET \
      -H "Authorization: Bearer ${DOTVAULT_API_KEY}" \
      -H "Accept: application/json" \
      "https://api.dotvault.io/api/projects/${PROJECT_ID}/envs/production" \
      | jq -r '.data.content' > .env

deploy:
  provider: script
  script: source .env && npm run deploy
  on:
    branch: main
```

## Configuration

### API Key Setup

1. Create API key in DotVault:

   ```bash
   dotvault api-key create --name "CI/CD Deployment" --scopes "read:envs"
   ```

2. Store in CI/CD platform:
   - GitHub: Settings → Secrets → Actions
   - GitLab: Settings → CI/CD → Variables
   - CircleCI: Project Settings → Environment Variables

3. Use in workflows (examples above)

### Project Configuration

Configure CI/CD in DotVault:

```bash
# Via CLI
dotvault cicd config my-project \
  --env production \
  --provider github \
  --repo owner/repo \
  --branch main

# Via API
POST /api/projects/{projectId}/cicd-config
{
  "envLabel": "production",
  "provider": "github",
  "repository": "owner/repo",
  "branch": "main",
  "autoSync": true
}
```

## Best Practices

### 1. Use Dedicated API Keys

Create separate API keys for each CI/CD pipeline:

```bash
# Production deployments
dotvault api-key create --name "GitHub Actions - Production" --scopes "read:envs"

# Staging deployments
dotvault api-key create --name "GitLab CI - Staging" --scopes "read:envs"
```

Benefits:

- Independent rotation
- Separate audit trails
- Granular revocation

### 2. Scope API Keys

Limit API key permissions:

```bash
# Read-only for deployments
dotvault api-key create --scopes "read:envs"

# No write access needed for CI/CD
```

### 3. Rotate Regularly

Set API key expiration:

```bash
# 90-day expiration
dotvault api-key create --expires-in 90
```

Automate rotation:

- Monthly reminder
- Automated key rotation
- Update CI/CD secrets

### 4. Use Environment Protection

Configure deployment protection:

**GitHub**:

```yaml
environment: production
protection_rules:
  - type: required_reviewers
    reviewers: [user1, user2]
  - type: wait_timer
    wait_timer: 60
```

**GitLab**:

```yaml
environment:
  name: production
  deployment_tier: production
  protected: true
```

### 5. Audit Deployments

Track which secrets were used:

```bash
# View deployment history
dotvault audit my-project --action env_view --via cicd

# Check API key usage
dotvault api-key usage my-project --key-id key_xxx
```

### 6. Secure Secret Handling

Never log secrets:

```yaml
# Good - mask secrets
- name: Deploy
  run: npm run deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

# Bad - exposes secrets
- name: Debug
  run: echo $DATABASE_URL
```

### 7. Use .env Files Temporarily

Write to temporary files:

```bash
# Create temp file
DOTVAULT_ENV=$(mktemp)

# Fetch secrets
curl ... > $DOTVAULT_ENV

# Source and deploy
source $DOTVAULT_ENV && npm run deploy

# Clean up
rm $DOTVAULT_ENV
```

## Security

### Secret Masking

CI/CD platforms automatically mask secrets:

- GitHub Actions: `::add-mask::${SECRET}`
- GitLab CI: `masked: true`
- CircleCI: Automatic for env vars

### Audit Trail

All CI/CD access logged:

- API key used
- IP address
- Timestamp
- Environment accessed
- Deployment ID (if available)

### Network Security

- TLS 1.3 for all API calls
- Certificate pinning (optional)
- IP allowlisting (Enterprise)

## Troubleshooting

### API Key Invalid

1. Check key not expired
2. Verify key has correct scopes
3. Ensure key not revoked
4. Check for typos

### Cannot Fetch Secrets

1. Verify project access
2. Check environment exists
3. Confirm API key permissions
4. Review IP allowlist

### Secrets Not Available in Deployment

1. Check .env file sourced correctly
2. Verify export commands
3. Check for syntax errors
4. Review CI/CD logs

### Rate Limiting

If hitting rate limits:

1. Implement caching
2. Use bulk operations
3. Contact support for increase
4. Check for unnecessary calls

## Advanced Features

### Conditional Deployments

Deploy only when secrets change:

```yaml
- name: Check for secret changes
  id: secrets
  run: |
    echo "hash=$(dotvault env hash my-project --env production)" >> $GITHUB_OUTPUT

- name: Deploy
  if: steps.secrets.outputs.hash != secrets.LAST_SECRET_HASH
  run: npm run deploy
```

### Multi-Environment Deployments

Deploy to multiple environments:

```yaml
strategy:
  matrix:
    env: [staging, production]

steps:
  - uses: dotvault/action@v1
    with:
      env: ${{ matrix.env }}
```

### Secret Validation

Validate secrets before deployment:

```yaml
- name: Validate secrets
  run: |
    dotvault env validate my-project --env production
    if [ $? -ne 0 ]; then
      echo "Invalid secrets detected"
      exit 1
    fi
```

## API Reference

### Generate CI/CD Config

```bash
POST /api/projects/{projectId}/cicd-config/generate
{
  "provider": "github",
  "envLabel": "production"
}

Response:
{
  "data": {
    "config": "name: Deploy\n...",
    "fileName": ".github/workflows/deploy.yml"
  }
}
```

### List CI/CD Integrations

```bash
GET /api/projects/{projectId}/cicd-integrations

Response:
{
  "data": {
    "integrations": [
      {
        "id": "int_xxx",
        "provider": "github",
        "repository": "owner/repo",
        "envLabel": "production",
        "lastUsedAt": "2024-01-15T10:30:00Z",
        "status": "active"
      }
    ]
  }
}
```

## Pricing

CI/CD features by plan:

| Feature             | Free   | Pro     | Enterprise |
| ------------------- | ------ | ------- | ---------- |
| API keys            | 1      | 10      | Unlimited  |
| CI/CD integrations  | 1      | 10      | Unlimited  |
| Deployment audit    | 7 days | 90 days | Unlimited  |
| Priority support    | -      | ✓       | ✓          |
| Custom integrations | -      | -       | ✓          |

## Support

- Documentation: https://docs.dotvault.io/cicd
- GitHub Action: https://github.com/dotvault/action
- Community: https://community.dotvault.io
- Email: support@dotvault.io
