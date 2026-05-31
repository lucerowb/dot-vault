// CI/CD Integration templates for GitHub Actions, GitLab CI, CircleCI, etc.

export type CIProvider =
  | "github"
  | "gitlab"
  | "circleci"
  | "jenkins"
  | "azure"
  | "travis";

export interface CIConfig {
  provider: CIProvider;
  projectId: string;
  envLabel: string;
  apiKey?: string;
  apiUrl?: string;
}

/**
 * Generate GitHub Actions workflow
 */
export function generateGitHubActions(config: CIConfig): string {
  const apiUrl = config.apiUrl || "https://api.dotvault.io";

  return `name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch secrets from DotVault
        uses: dotvault/action@v1
        with:
          api-url: ${apiUrl}
          api-key: \${{ secrets.DOTVAULT_API_KEY }}
          project-id: ${config.projectId}
          env-label: ${config.envLabel}
          output: .env

      - name: Deploy application
        run: |
          # Your deployment commands here
          # Environment variables are now available from .env
          cat .env
`;
}

/**
 * Generate GitLab CI configuration
 */
export function generateGitLabCI(config: CIConfig): string {
  const apiUrl = config.apiUrl || "https://api.dotvault.io";

  return `stages:
  - deploy

deploy:
  stage: deploy
  image: node:20-alpine
  before_script:
    - apk add --no-cache curl
  script:
    # Fetch secrets from DotVault
    - |
      curl -s -X GET \\
        -H "Authorization: Bearer \${DOTVAULT_API_KEY}" \\
        -H "Accept: application/json" \\
        "${apiUrl}/api/projects/${config.projectId}/envs/${config.envLabel}" \\
        | jq -r '.data.content' > .env
    
    # Your deployment commands
    - cat .env
  only:
    - main
  variables:
    DOTVAULT_API_KEY: \${DOTVAULT_API_KEY}
`;
}

/**
 * Generate CircleCI configuration
 */
export function generateCircleCI(config: CIConfig): string {
  const apiUrl = config.apiUrl || "https://api.dotvault.io";

  return `version: 2.1

jobs:
  deploy:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      
      - run:
          name: Fetch secrets from DotVault
          command: |
            curl -s -X GET \\
              -H "Authorization: Bearer \${DOTVAULT_API_KEY}" \\
              -H "Accept: application/json" \\
              "${apiUrl}/api/projects/${config.projectId}/envs/${config.envLabel}" \\
              | jq -r '.data.content' > .env
      
      - run:
          name: Deploy
          command: |
            # Your deployment commands
            cat .env

workflows:
  deploy:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
`;
}

/**
 * Generate Jenkins Pipeline
 */
export function generateJenkinsPipeline(config: CIConfig): string {
  const apiUrl = config.apiUrl || "https://api.dotvault.io";

  return `pipeline {
    agent any
    
    environment {
        DOTVAULT_API_KEY = credentials('dotvault-api-key')
    }
    
    stages {
        stage('Fetch Secrets') {
            steps {
                script {
                    def response = httpRequest(
                        url: "${apiUrl}/api/projects/${config.projectId}/envs/${config.envLabel}",
                        httpMode: 'GET',
                        customHeaders: [
                            [name: 'Authorization', value: "Bearer \${env.DOTVAULT_API_KEY}"],
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
                sh 'cat .env'
                // Add your deployment commands here
            }
        }
    }
}
`;
}

/**
 * Generate Azure DevOps Pipeline
 */
export function generateAzurePipeline(config: CIConfig): string {
  const apiUrl = config.apiUrl || "https://api.dotvault.io";

  return `trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'
  displayName: 'Install Node.js'

- script: |
    curl -s -X GET \\
      -H "Authorization: Bearer \$(DOTVAULT_API_KEY)" \\
      -H "Accept: application/json" \\
      "${apiUrl}/api/projects/${config.projectId}/envs/${config.envLabel}" \\
      | jq -r '.data.content' > .env
  displayName: 'Fetch secrets from DotVault'
  env:
    DOTVAULT_API_KEY: \$(dotvaultApiKey)

- script: |
    cat .env
    # Your deployment commands
  displayName: 'Deploy'
`;
}

/**
 * Generate Travis CI configuration
 */
export function generateTravisCI(config: CIConfig): string {
  const apiUrl = config.apiUrl || "https://api.dotvault.io";

  return `language: node_js
node_js:
  - "20"

before_deploy:
  - curl -s -X GET \\
      -H "Authorization: Bearer \${DOTVAULT_API_KEY}" \\
      -H "Accept: application/json" \\
      "${apiUrl}/api/projects/${config.projectId}/envs/${config.envLabel}" \\
      | jq -r '.data.content' > .env

deploy:
  provider: script
  script: cat .env && echo "Add your deploy commands here"
  on:
    branch: main
`;
}

/**
 * Generate configuration for any supported provider
 */
export function generateCIConfig(
  provider: CIProvider,
  config: CIConfig,
): string {
  switch (provider) {
    case "github":
      return generateGitHubActions(config);
    case "gitlab":
      return generateGitLabCI(config);
    case "circleci":
      return generateCircleCI(config);
    case "jenkins":
      return generateJenkinsPipeline(config);
    case "azure":
      return generateAzurePipeline(config);
    case "travis":
      return generateTravisCI(config);
    default:
      throw new Error(`Unsupported CI provider: ${provider}`);
  }
}

/**
 * Get CI provider information
 */
export function getCIProviderInfo(provider: CIProvider): {
  name: string;
  description: string;
  fileName: string;
  documentation: string;
} {
  const providers: Record<
    CIProvider,
    {
      name: string;
      description: string;
      fileName: string;
      documentation: string;
    }
  > = {
    github: {
      name: "GitHub Actions",
      description: "GitHub's built-in CI/CD solution",
      fileName: ".github/workflows/deploy.yml",
      documentation: "https://docs.github.com/en/actions",
    },
    gitlab: {
      name: "GitLab CI",
      description: "GitLab's integrated CI/CD",
      fileName: ".gitlab-ci.yml",
      documentation: "https://docs.gitlab.com/ee/ci/",
    },
    circleci: {
      name: "CircleCI",
      description: "Cloud-based CI/CD platform",
      fileName: ".circleci/config.yml",
      documentation: "https://circleci.com/docs/",
    },
    jenkins: {
      name: "Jenkins",
      description: "Self-hosted automation server",
      fileName: "Jenkinsfile",
      documentation: "https://www.jenkins.io/doc/",
    },
    azure: {
      name: "Azure DevOps",
      description: "Microsoft's CI/CD solution",
      fileName: "azure-pipelines.yml",
      documentation: "https://docs.microsoft.com/en-us/azure/devops/pipelines/",
    },
    travis: {
      name: "Travis CI",
      description: "Cloud-based CI service",
      fileName: ".travis.yml",
      documentation: "https://docs.travis-ci.com/",
    },
  };

  return providers[provider];
}

/**
 * Get all supported CI providers
 */
export function getAllCIProviders(): Array<{
  id: CIProvider;
  name: string;
  description: string;
}> {
  return [
    {
      id: "github",
      name: "GitHub Actions",
      description: "GitHub's built-in CI/CD",
    },
    {
      id: "gitlab",
      name: "GitLab CI",
      description: "GitLab's integrated CI/CD",
    },
    {
      id: "circleci",
      name: "CircleCI",
      description: "Cloud-based CI/CD platform",
    },
    {
      id: "jenkins",
      name: "Jenkins",
      description: "Self-hosted automation server",
    },
    {
      id: "azure",
      name: "Azure DevOps",
      description: "Microsoft's CI/CD solution",
    },
    { id: "travis", name: "Travis CI", description: "Cloud-based CI service" },
  ];
}

/**
 * Generate Docker Compose for self-hosted DotVault
 */
export function generateDockerCompose(): string {
  return `version: '3.8'

services:
  dotvault:
    image: dotvault/dotvault:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://dotvault:password@db:5432/dotvault
      - BETTER_AUTH_SECRET=\${BETTER_AUTH_SECRET}
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY}
      - NEXT_PUBLIC_APP_URL=\${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
    depends_on:
      - db
    volumes:
      - dotvault-data:/app/data

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=dotvault
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dotvault
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  dotvault-data:
  postgres-data:
  redis-data:
`;
}

/**
 * Generate Kubernetes deployment
 */
export function generateKubernetesDeployment(): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotvault
  labels:
    app: dotvault
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dotvault
  template:
    metadata:
      labels:
        app: dotvault
    spec:
      containers:
      - name: dotvault
        image: dotvault/dotvault:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dotvault-secrets
              key: database-url
        - name: BETTER_AUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: dotvault-secrets
              key: auth-secret
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: dotvault-secrets
              key: encryption-key
---
apiVersion: v1
kind: Service
metadata:
  name: dotvault
spec:
  selector:
    app: dotvault
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: v1
kind: Secret
metadata:
  name: dotvault-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:pass@host:5432/db"
  auth-secret: "your-auth-secret-here"
  encryption-key: "your-encryption-key-here"
`;
}

/**
 * Generate environment setup script
 */
export function generateEnvSetupScript(): string {
  return `#!/bin/bash

# DotVault Environment Setup Script
# Run this script to generate required environment variables

echo "Setting up DotVault environment..."

# Generate Better Auth secret
AUTH_SECRET=$(openssl rand -base64 32)
echo "BETTER_AUTH_SECRET=\${AUTH_SECRET}" > .env.local

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "ENCRYPTION_KEY=\${ENCRYPTION_KEY}" >> .env.local

# Database URL (update with your credentials)
echo "DATABASE_URL=postgresql://user:password@localhost:5432/dotvault" >> .env.local

# App URL
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local

echo ""
echo "Environment variables generated in .env.local"
echo "Please update DATABASE_URL with your actual database credentials"
echo ""
echo "To start DotVault:"
echo "  1. Update .env.local with your settings"
echo "  2. Run: docker-compose up -d"
echo "  3. Open: http://localhost:3000"
`;
}
