# Manual Setup Steps

This document outlines all the manual steps required to fully configure and deploy the DotVault application with all implemented features.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Setup](#database-setup)
3. [Authentication Configuration](#authentication-configuration)
4. [Encryption Keys](#encryption-keys)
5. [Email/SMTP Setup](#emailsmtp-setup)
6. [External Services](#external-services)
7. [CI/CD Configuration](#cicd-configuration)
8. [Security Configuration](#security-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Production Deployment](#production-deployment)

---

## Environment Variables

### Required Variables

Create a `.env.local` file in the project root with the following:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dotvault"

# Better Auth (Session Management)
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET="your-base64-encoded-secret-here"

# Encryption (AES-256-GCM)
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY="your-64-character-hex-key-here"

# Application URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Optional Variables

```bash
# Redis (for caching and sessions)
REDIS_URL="redis://localhost:6379"

# SMTP (for email notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_FROM="noreply@your-domain.com"

# OAuth Providers (optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# API Rate Limiting
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60"

# File Upload Limits
MAX_UPLOAD_SIZE="10485760"  # 10MB in bytes

# Logging
LOG_LEVEL="info"  # debug, info, warn, error
```

### Generating Secrets

Run these commands to generate secure secrets:

```bash
# Better Auth Secret (32 bytes base64)
openssl rand -base64 32

# Encryption Key (32 bytes hex)
openssl rand -hex 32

# Webhook Secret (for custom integrations)
openssl rand -hex 16
```

---

## Database Setup

### 1. Install PostgreSQL

**macOS (Homebrew)**:

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian**:

```bash
sudo apt-get update
sudo apt-get install postgresql-16
sudo systemctl start postgresql
```

**Docker**:

```bash
docker run -d \
  --name dotvault-db \
  -e POSTGRES_USER=dotvault \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=dotvault \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE dotvault;
CREATE USER dotvault WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE dotvault TO dotvault;
\q
```

### 3. Run Migrations

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Or using drizzle-kit
npx drizzle-kit push:pg
```

### 4. Verify Connection

```bash
# Test database connection
npm run db:check
```

---

## Authentication Configuration

### 1. Better Auth Setup

The app uses Better Auth (`src/lib/auth.ts`) with email/password, bearer tokens (CLI), and the **Better Auth Dashboard** plugin.

#### Connect Better Auth Dashboard

1. Create a project at [better-auth.com](https://www.better-auth.com) and copy your **API key**.
2. Set in production (and `.env.local` for local testing):

```bash
BETTER_AUTH_API_KEY="your-key-from-dashboard"
BETTER_AUTH_URL="https://dot-vault.lucerowb.cloud"   # must match deployed origin
NEXT_PUBLIC_APP_URL="https://dot-vault.lucerowb.cloud"
```

3. Deploy so `https://dot-vault.lucerowb.cloud/api/auth` serves the updated app (includes `dash()` from `@better-auth/infra`).
4. In the dashboard, set base URL to `https://dot-vault.lucerowb.cloud/api/auth` and click **Retry connection**.

`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must match the public URL the dashboard probes. A mismatch is the most common cause of “could not connect”.

### 2. OAuth Providers (Optional)

**GitHub OAuth**:

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: "DotVault"
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env.local`

**Google OAuth**:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Configure consent screen
4. Application type: "Web application"
5. Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### 3. Two-Factor Authentication (2FA)

2FA is automatically available. Users can enable it in their account settings. No additional configuration required.

---

## Encryption Keys

### 1. Generate Master Encryption Key

```bash
# Generate 256-bit key (64 hex characters)
openssl rand -hex 32

# Example output:
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. Store Securely

Add to `.env.local`:

```bash
ENCRYPTION_KEY="your-generated-key-here"
```

### 3. Backup Strategy

**Critical**: Backup your encryption key securely:

```bash
# Create encrypted backup
echo $ENCRYPTION_KEY | gpg --symmetric --cipher-algo AES256 -o encryption-key-backup.gpg

# Store in multiple locations:
# 1. Password manager (1Password, Bitwarden)
# 2. Hardware security module (if available)
# 3. Offline storage (encrypted USB)
# 4. Cloud KMS (AWS KMS, Google Cloud KMS)
```

**Warning**: If you lose this key, all encrypted data is permanently unrecoverable.

---

## Email/SMTP Setup

### 1. Gmail SMTP

1. Enable 2FA on your Google account
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name: "DotVault"
   - Copy the 16-character password

3. Configure `.env.local`:

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="noreply@your-domain.com"
```

### 2. SendGrid

1. Create SendGrid account
2. Create API Key with "Mail Send" permissions
3. Configure `.env.local`:

```bash
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="noreply@your-domain.com"
```

### 3. AWS SES

1. Set up AWS SES in your AWS account
2. Verify your domain or email
3. Create SMTP credentials
4. Configure `.env.local`:

```bash
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT="587"
SMTP_USER="your-ses-username"
SMTP_PASS="your-ses-password"
SMTP_FROM="noreply@your-domain.com"
```

---

## External Services

### 1. Redis (Optional but Recommended)

**Docker**:

```bash
docker run -d \
  --name dotvault-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Configuration**:

```bash
# .env.local
REDIS_URL="redis://localhost:6379"
```

### 2. Cloudflare (For DNS & SSL)

1. Add your domain to Cloudflare
2. Update nameservers with your registrar
3. Create A record pointing to your server IP
4. Enable "Always Use HTTPS"
5. Set SSL/TLS mode to "Full (strict)"

### 3. S3-Compatible Storage (Optional)

For backup storage:

**AWS S3**:

```bash
# .env.local
S3_BUCKET="dotvault-backups"
S3_REGION="us-east-1"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
```

**Backblaze B2** (cheaper alternative):

```bash
S3_ENDPOINT="s3.us-west-002.backblazeb2.com"
S3_BUCKET="dotvault-backups"
S3_ACCESS_KEY="your-key-id"
S3_SECRET_KEY="your-application-key"
```

---

## CI/CD Configuration

### 1. GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}

      - name: Deploy
        # Add your deployment steps here
        run: echo "Deploy to your server"
```

Add secrets to GitHub:

1. Repository Settings → Secrets and variables → Actions
2. Add:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `ENCRYPTION_KEY`
   - Any other required secrets

### 2. Environment-Specific Variables

**Development**:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
LOG_LEVEL="debug"
```

**Staging**:

```bash
NEXT_PUBLIC_APP_URL="https://staging.your-domain.com"
LOG_LEVEL="info"
```

**Production**:

```bash
NEXT_PUBLIC_APP_URL="https://your-domain.com"
LOG_LEVEL="warn"
RATE_LIMIT_REQUESTS="100"
```

---

## Security Configuration

### 1. IP Allowlisting (Optional)

For sensitive projects, configure IP allowlisting:

1. Go to Project Settings → Security → IP Allowlist
2. Add allowed IP addresses or CIDR ranges:
   - Office IP: `203.0.113.0/24`
   - VPN range: `10.200.0.0/16`
   - Specific IP: `198.51.100.50`

### 2. Webhook Security

When configuring webhooks (Slack/Discord):

1. Generate webhook secret:

   ```bash
   openssl rand -hex 16
   ```

2. Add to webhook configuration
3. Verify signatures in your webhook handler

### 3. API Key Management

1. Create dedicated API keys for different purposes:
   - CI/CD deployments
   - Monitoring scripts
   - Backup automation

2. Set appropriate scopes:
   - `read:envs` for deployments
   - `read:projects` for monitoring
   - `admin` for management scripts

3. Set expiration dates:
   - CI/CD: 90 days
   - Monitoring: 180 days
   - Admin: 30 days

### 4. SSL/TLS Certificates

**Let's Encrypt (Recommended)**:

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renewal (usually set up automatically)
sudo certbot renew --dry-run
```

**Certificate Paths**:

```bash
# Default Let's Encrypt paths
SSL_CERT="/etc/letsencrypt/live/your-domain.com/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/your-domain.com/privkey.pem"
```

---

## Monitoring & Logging

### 1. Application Logging

Configure log levels in `.env.local`:

```bash
# Development
LOG_LEVEL="debug"

# Production
LOG_LEVEL="warn"
```

### 2. Error Tracking (Sentry - Optional)

1. Create Sentry account
2. Create new project
3. Copy DSN:

```bash
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/1234567"
```

### 3. Uptime Monitoring

**UptimeRobot** (Free tier available):

1. Create account
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://your-domain.com/api/health`
   - Interval: 5 minutes

**Pingdom** or **StatusCake** (Paid alternatives)

### 4. Server Monitoring

**Prometheus + Grafana** (Self-hosted):

```bash
# docker-compose.yml addition
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

**Datadog** or **New Relic** (SaaS alternatives)

---

## Production Deployment

### 1. Server Requirements

**Minimum**:

- 2 vCPU
- 4GB RAM
- 20GB SSD storage
- Ubuntu 22.04 LTS / Debian 12 / RHEL 9

**Recommended**:

- 4 vCPU
- 8GB RAM
- 50GB SSD storage
- Ubuntu 22.04 LTS

### 2. Docker Deployment

**docker-compose.yml**:

```yaml
version: "3.8"

services:
  app:
    image: your-registry/dotvault:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - REDIS_URL=${REDIS_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

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

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
```

### 3. Nginx Configuration

**nginx.conf**:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 4. Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/dotvault.git
cd dotvault

# 2. Create environment file
cp .env.example .env
# Edit .env with your values

# 3. Build and start services
docker-compose up -d

# 4. Run migrations
docker-compose exec app npm run db:migrate

# 5. Verify deployment
curl https://your-domain.com/api/health

# 6. Check logs
docker-compose logs -f app
```

### 5. Backup Strategy

**Database Backup**:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/dotvault"

# Create backup
docker-compose exec -T db pg_dump -U dotvault dotvault > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/dotvault/

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

Add to crontab:

```bash
0 2 * * * /path/to/backup.sh
```

### 6. SSL Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab (usually already set up by certbot)
0 3 * * * /usr/bin/certbot renew --quiet
```

---

## Post-Deployment Checklist

### Immediate

- [ ] Application loads without errors
- [ ] Database migrations applied successfully
- [ ] Health check endpoint responds: `/api/health`
- [ ] SSL certificate valid
- [ ] Email notifications working (test signup)

### Within 24 Hours

- [ ] Create first project
- [ ] Add test environment variables
- [ ] Verify encryption/decryption works
- [ ] Test member invitation flow
- [ ] Configure backup automation

### Within 1 Week

- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Document internal procedures
- [ ] Train team members
- [ ] Review security settings

### Ongoing

- [ ] Weekly: Review backup integrity
- [ ] Monthly: Rotate API keys
- [ ] Quarterly: Security audit
- [ ] Annually: Penetration test

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Docker logs
docker-compose logs db

# Verify network
docker network ls
docker network inspect dotvault_default
```

### Encryption Key Issues

```bash
# Verify key format (should be 64 hex characters)
echo $ENCRYPTION_KEY | wc -c  # Should be 65 (includes newline)

# Test encryption
docker-compose exec app node -e "
const { encryptBlob } = require('./src/lib/at-rest-crypto');
const result = encryptBlob('test');
console.log('Encryption works:', result.iv && result.ciphertext);
"
```

### Email Delivery Issues

```bash
# Test SMTP connection
telnet $SMTP_HOST $SMTP_PORT

# Check logs
docker-compose logs app | grep -i email

# Verify credentials
echo $SMTP_USER $SMTP_PASS
```

### SSL Certificate Issues

```bash
# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -noout -dates

# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

---

## Support & Resources

- **Documentation**: https://docs.dotvault.io
- **Community**: https://community.dotvault.io
- **GitHub Issues**: https://github.com/dotvault/dotvault/issues
- **Email**: support@dotvault.io
- **Status Page**: https://status.dotvault.io

---

## Summary

**Critical Manual Steps**:

1. **Generate and securely store encryption key** (irreplaceable!)
2. **Set up PostgreSQL database** with proper credentials
3. **Configure SMTP** for email notifications
4. **Set up SSL certificates** for HTTPS
5. **Configure backups** to prevent data loss
6. **Set up monitoring** for uptime alerts

**Time Estimates**:

- Initial setup: 2-4 hours
- Production deployment: 4-8 hours
- Full configuration: 1-2 days

**Cost Estimates** (monthly):

- VPS (4GB RAM): $20-40
- Domain: $10-15/year
- SSL (Let's Encrypt): Free
- Backups (S3): $5-20
- Monitoring: Free - $50
- **Total**: $25-110/month

Remember: **Never commit `.env.local` or encryption keys to version control!**
