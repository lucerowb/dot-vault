# Self-Hosted Deployment

Deploy DotVault on your own infrastructure for complete control over your secrets management.

## Overview

Self-hosted deployment provides:

- **Complete data control**: All data stays in your infrastructure
- **Custom security policies**: Implement your own security controls
- **Compliance**: Meet strict regulatory requirements
- **No vendor lock-in**: Own your deployment
- **Cost control**: Predictable infrastructure costs

## Deployment Options

### Docker Compose (Recommended)

Simplest deployment for small to medium teams.

**Requirements**:

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB storage

**Quick Start**:

```bash
# 1. Clone the repository
git clone https://github.com/dotvault/dotvault.git
cd dotvault

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with your settings
nano .env

# 4. Start services
docker-compose up -d

# 5. Run migrations
docker-compose exec app npm run db:migrate

# 6. Create admin user
docker-compose exec app npm run create-admin

# 7. Access DotVault
open http://localhost:3000
```

**docker-compose.yml**:

```yaml
version: "3.8"

services:
  app:
    image: dotvault/dotvault:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://dotvault:${DB_PASSWORD}@db:5432/dotvault
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_SECRET=${AUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - NEXT_PUBLIC_APP_URL=${APP_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
    depends_on:
      - db
      - redis
    volumes:
      - app-data:/app/data
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=dotvault
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=dotvault
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  app-data:
  postgres-data:
  redis-data:
```

### Kubernetes

Production-grade deployment with high availability.

**Requirements**:

- Kubernetes 1.25+
- Helm 3.0+
- Ingress controller
- Cert-manager (for TLS)

**Helm Installation**:

```bash
# Add DotVault Helm repository
helm repo add dotvault https://charts.dotvault.io
helm repo update

# Create namespace
kubectl create namespace dotvault

# Create secrets
kubectl create secret generic dotvault-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=auth-secret='...' \
  --from-literal=encryption-key='...' \
  -n dotvault

# Install DotVault
helm install dotvault dotvault/dotvault \
  --namespace dotvault \
  --set ingress.enabled=true \
  --set ingress.host=dotvault.company.com

# Check status
kubectl get pods -n dotvault
```

**Manual Kubernetes Deployment**:

See `k8s/` directory in repository for:

- Deployment manifests
- Service definitions
- ConfigMaps
- Secrets templates
- Ingress examples

### AWS ECS

Deploy on AWS Elastic Container Service.

**CloudFormation Template**:

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: DotVault on ECS

Resources:
  DotVaultCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: dotvault

  DotVaultService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: dotvault
      Cluster: !Ref DotVaultCluster
      TaskDefinition: !Ref DotVaultTask
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          Subnets: !Ref PrivateSubnets
          SecurityGroups: [!Ref DotVaultSecurityGroup]

  DotVaultTask:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: dotvault
      NetworkMode: awsvpc
      RequiresCompatibilities: [FARGATE]
      Cpu: 512
      Memory: 1024
      ContainerDefinitions:
        - Name: dotvault
          Image: dotvault/dotvault:latest
          PortMappings:
            - ContainerPort: 3000
          Environment:
            - Name: DATABASE_URL
              Value: !Sub "postgresql://${DBUser}:${DBPassword}@${DBEndpoint}/dotvault"
          Secrets:
            - Name: ENCRYPTION_KEY
              ValueFrom: !Sub "${EncryptionKeySecret}:encryption-key"
```

### Google Cloud Run

Serverless deployment on GCP.

**Deployment**:

```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/dotvault

# Deploy to Cloud Run
gcloud run deploy dotvault \
  --image gcr.io/PROJECT_ID/dotvault \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://..." \
  --set-secrets "ENCRYPTION_KEY=encryption-key:latest"

# Connect to Cloud SQL
gcloud run services update dotvault \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_ID
```

### Azure Container Instances

Deploy on Microsoft Azure.

**Azure CLI**:

```bash
# Create resource group
az group create --name dotvault --location eastus

# Create container
az container create \
  --resource-group dotvault \
  --name dotvault \
  --image dotvault/dotvault:latest \
  --ports 3000 \
  --environment-variables DATABASE_URL='postgresql://...' \
  --secrets ENCRYPTION_KEY='...' \
  --dns-name-label dotvault
```

## Configuration

### Required Environment Variables

| Variable              | Description                  | Example                                 |
| --------------------- | ---------------------------- | --------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string | `postgresql://user:pass@host:5432/db`   |
| `BETTER_AUTH_SECRET`  | Session signing secret       | Generate with `openssl rand -base64 32` |
| `ENCRYPTION_KEY`      | AES-256 encryption key       | Generate with `openssl rand -hex 32`    |
| `NEXT_PUBLIC_APP_URL` | Public URL of deployment     | `https://dotvault.company.com`          |

### Optional Environment Variables

| Variable              | Description             | Default                  |
| --------------------- | ----------------------- | ------------------------ |
| `REDIS_URL`           | Redis connection string | `redis://localhost:6379` |
| `SMTP_HOST`           | SMTP server for emails  | -                        |
| `SMTP_PORT`           | SMTP port               | `587`                    |
| `SMTP_USER`           | SMTP username           | -                        |
| `SMTP_PASS`           | SMTP password           | -                        |
| `SMTP_FROM`           | From email address      | `noreply@dotvault.io`    |
| `LOG_LEVEL`           | Logging level           | `info`                   |
| `MAX_UPLOAD_SIZE`     | Max file upload size    | `10mb`                   |
| `RATE_LIMIT_REQUESTS` | API rate limit          | `100`                    |
| `RATE_LIMIT_WINDOW`   | Rate limit window       | `60`                     |

### Database Setup

**PostgreSQL Requirements**:

- Version 14 or higher
- SSL enabled (recommended)
- Regular backups configured
- Connection pooling (PgBouncer recommended)

**Migration**:

```bash
# Run migrations
docker-compose exec app npm run db:migrate

# Check status
docker-compose exec app npm run db:status

# Rollback (if needed)
docker-compose exec app npm run db:rollback
```

### SSL/TLS

**Let's Encrypt (Recommended)**:

```yaml
# docker-compose.yml with Traefik
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@company.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt

  app:
    image: dotvault/dotvault:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dotvault.rule=Host(`dotvault.company.com`)"
      - "traefik.http.routers.dotvault.tls.certresolver=letsencrypt"
```

**Custom Certificate**:

```bash
# Mount certificate
docker run -v /path/to/cert.pem:/app/cert.pem \
           -v /path/to/key.pem:/app/key.pem \
           -e SSL_CERT=/app/cert.pem \
           -e SSL_KEY=/app/key.pem \
           dotvault/dotvault:latest
```

## Backup and Recovery

### Database Backups

**Automated Backups**:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U dotvault dotvault > backup_$DATE.sql

# Upload to S3
aws s3 cp backup_$DATE.sql s3://my-backups/dotvault/

# Keep only last 30 days
aws s3 ls s3://my-backups/dotvault/ | \
  awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'" {print $4}' | \
  xargs -I {} aws s3 rm s3://my-backups/dotvault/{}
```

**Point-in-Time Recovery**:

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'

# Continuous backup
pg_basebackup -D /backup -Fp -Xs -P -v
```

### Encryption Key Backup

**Critical**: Backup encryption keys securely:

```bash
# Generate backup
echo $ENCRYPTION_KEY > encryption-key-backup.txt

# Encrypt backup
gpg --symmetric --cipher-algo AES256 encryption-key-backup.txt

# Store in multiple locations
# - Password manager
# - Hardware security module
# - Offline storage
# - Cloud KMS (AWS KMS, Google Cloud KMS, Azure Key Vault)
```

### Disaster Recovery

**Recovery Procedure**:

1. **Restore Database**:

   ```bash
   # From backup
   psql -U dotvault -d dotvault < backup_20240115.sql

   # Or from WAL archives
   pg_restore -U dotvault -d dotvault /backup/base.tar
   ```

2. **Verify Encryption Key**:

   ```bash
   # Test key works
   docker-compose exec app npm run verify-key
   ```

3. **Start Services**:

   ```bash
   docker-compose up -d
   ```

4. **Verify Functionality**:
   - Test login
   - Verify secret access
   - Check audit logs

## Security Hardening

### Network Security

**Firewall Rules**:

```bash
# Allow only necessary ports
ufw allow 443/tcp
ufw allow 22/tcp
ufw deny 3000/tcp  # Internal only
ufw enable
```

**VPN Access**:

Restrict admin access to VPN:

```yaml
# docker-compose.yml
services:
  app:
    networks:
      - internal
      - vpn-only

networks:
  vpn-only:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 10.200.0.0/16
```

### Database Security

**SSL Configuration**:

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'

# Require SSL for all connections
hostssl all all 0.0.0.0/0 md5
```

**Connection Encryption**:

```bash
# Connect with SSL
psql "postgresql://user:pass@host/db?sslmode=require"
```

### Application Security

**Security Headers**:

```yaml
# nginx.conf
server {
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
}
```

**Rate Limiting**:

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - RATE_LIMIT_REQUESTS=100
      - RATE_LIMIT_WINDOW=60
```

## Monitoring

### Health Checks

**Docker Health Check**:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

**Kubernetes Liveness/Readiness**:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Metrics

**Prometheus Metrics**:

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
```

**Available Metrics**:

- `dotvault_requests_total` - Total requests
- `dotvault_request_duration_seconds` - Request latency
- `dotvault_active_users` - Current active users
- `dotvault_secrets_total` - Total secrets stored
- `dotvault_audit_events_total` - Audit events

### Logging

**Structured Logging**:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": "user_xxx",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Log Aggregation**:

```yaml
# docker-compose.yml
services:
  app:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: localhost:24224
        tag: docker.dotvault
```

## Upgrades

### Upgrade Procedure

1. **Backup**:

   ```bash
   docker-compose exec -T db pg_dump -U dotvault dotvault > pre-upgrade-backup.sql
   ```

2. **Pull New Image**:

   ```bash
   docker-compose pull
   ```

3. **Stop Services**:

   ```bash
   docker-compose down
   ```

4. **Start New Version**:

   ```bash
   docker-compose up -d
   ```

5. **Run Migrations**:

   ```bash
   docker-compose exec app npm run db:migrate
   ```

6. **Verify**:
   ```bash
   docker-compose logs -f app
   ```

### Rollback

If issues detected:

```bash
# Stop services
docker-compose down

# Restore previous image
docker-compose pull dotvault/dotvault:previous-version

# Restore database
docker-compose exec -T db psql -U dotvault < pre-upgrade-backup.sql

# Start services
docker-compose up -d
```

## Troubleshooting

### Database Connection Issues

1. Check PostgreSQL is running
2. Verify connection string
3. Check firewall rules
4. Review PostgreSQL logs

### Encryption Key Issues

1. Verify key is 64 hex characters
2. Check key hasn't changed
3. Restore from backup if lost
4. Contact support if data recovery needed

### Performance Issues

1. Check resource usage (CPU, memory)
2. Review database query performance
3. Enable connection pooling
4. Scale horizontally if needed

### SSL Certificate Issues

1. Verify certificate not expired
2. Check certificate chain complete
3. Verify domain matches
4. Review Traefik/nginx logs

## Support

- Documentation: https://docs.dotvault.io/self-hosted
- Community Forum: https://community.dotvault.io
- GitHub Issues: https://github.com/dotvault/dotvault/issues
- Enterprise Support: enterprise@dotvault.io
