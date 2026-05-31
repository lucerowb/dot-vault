# Secret Analytics

Secret Analytics provides insights into your environment variables, helping you identify security risks, track usage patterns, and maintain compliance.

## Overview

Secret Analytics offers:

- **Security scoring**: Identify weak or duplicate secrets
- **Usage tracking**: Monitor who accesses what and when
- **Compliance reporting**: Generate audit-ready reports
- **Trend analysis**: Track changes over time
- **Risk detection**: Find exposed credentials

## Security Metrics

### Security Score

Overall security rating (0-100) based on:

- Weak secrets (high severity: -10 points each)
- Duplicate values (-5 points each)
- Hardcoded URLs (-2 points each)
- Potential embedded secrets (-3 points each)

**Grading Scale**:

| Score  | Grade | Status    |
| ------ | ----- | --------- |
| 90-100 | A     | Excellent |
| 80-89  | B     | Good      |
| 70-79  | C     | Fair      |
| 60-69  | D     | Poor      |
| Under 60 | F     | Critical  |

### Weak Secret Detection

Identifies secrets with security issues:

| Issue               | Severity | Examples                      |
| ------------------- | -------- | ----------------------------- |
| Generic names       | Low      | `PASSWORD`, `SECRET`, `KEY`   |
| Test/example values | Medium   | `test`, `example`, `dummy`    |
| Common weak values  | High     | `password`, `123456`, `admin` |
| Short values        | High     | < 8 characters                |

### Duplicate Values

Detects identical values across different keys:

```
⚠️ Duplicate Value Detected

Value "sk_test_..." appears 3 times:
- STRIPE_KEY (production)
- STRIPE_SECRET (staging)
- PAYMENT_API_KEY (development)

Recommendation: Use separate keys for each environment
```

### Hardcoded URLs

Finds URLs embedded in secret values:

```
⚠️ Hardcoded URL Detected

DATABASE_URL contains: https://api.internal.company.com

Recommendation: Use environment-specific endpoints
```

### Embedded Secrets

Detects potential secrets within values:

| Pattern        | Example                           |
| -------------- | --------------------------------- |
| AWS Access Key | `AKIAIOSFODNN7EXAMPLE`            |
| GitHub Token   | `ghp_xxxxxxxxxxxxxxxxxxxx`        |
| JWT Token      | `eyJhbGciOiJIUzI1NiIs...`         |
| Private Key    | `-----BEGIN RSA PRIVATE KEY-----` |

## Usage Metrics

### Access Patterns

Track environment access:

- **Views by day**: Daily access counts
- **Views by environment**: Which envs are accessed most
- **Top viewers**: Most active users
- **Last accessed**: Time since last view

### Activity Trends

Analyze changes over time:

- **Secrets added**: New variables per week
- **Secrets modified**: Updates per week
- **Secrets deleted**: Removals per week
- **Access frequency**: Views per week

### User Activity

Monitor individual user behavior:

- **Total views**: Lifetime access count
- **Unique environments**: Number of envs accessed
- **Last active**: Most recent activity
- **Access pattern**: Time of day, day of week

## Compliance Reporting

### Report Types

**Security Report**:

- Overall security score
- Weak secrets list
- Duplicate values
- Recommendations

**Access Report**:

- Who accessed what
- When and from where
- Failed access attempts
- Permission changes

**Change Report**:

- All modifications
- Who made changes
- Before/after values (masked)
- Approval records

### Report Generation

**Via Web Interface**:

1. Go to **Project** → **Analytics** → **Reports**
2. Select report type
3. Choose date range
4. Click **Generate Report**
5. Download (PDF, CSV, JSON)

**Via CLI**:

```bash
# Security report
dotvault analytics security my-project --format pdf --output security-report.pdf

# Access report
dotvault analytics access my-project --from 2024-01-01 --to 2024-01-31 --format csv

# Change report
dotvault analytics changes my-project --env production --format json
```

**Via API**:

```bash
POST /api/projects/{projectId}/analytics/reports
{
  "type": "security",
  "format": "pdf",
  "dateRange": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  }
}

Response:
{
  "data": {
    "reportId": "rpt_xxx",
    "status": "generating",
    "downloadUrl": "https://..."
  }
}
```

### Scheduled Reports

Automated report delivery:

```bash
# Weekly security report
dotvault analytics schedule my-project \
  --type security \
  --frequency weekly \
  --email security@company.com

# Monthly compliance report
dotvault analytics schedule my-project \
  --type compliance \
  --frequency monthly \
  --email compliance@company.com,audit@company.com
```

## Dashboard

### Overview Cards

**Security Score**:

- Current grade (A-F)
- Trend (improving/declining)
- Key issues count

**Secret Statistics**:

- Total secrets
- Total environments
- Secrets by category
- Average secret age

**Activity Summary**:

- Views this week
- Changes this week
- Active users
- Failed access attempts

### Charts

**Security Score Trend**:

- Line chart over time
- Shows improvement/decline
- Annotates significant events

**Secret Categories**:

- Pie chart of secret types
- API keys, database URLs, tokens, etc.

**Access Heatmap**:

- Calendar view of access
- Color-coded by intensity
- Identifies patterns

**Top Issues**:

- Bar chart of security issues
- Prioritized by severity
- Click to drill down

## Best Practices

### 1. Regular Reviews

Schedule weekly analytics reviews:

```bash
# Monday morning review
dotvault analytics dashboard my-project

# Check security score
dotvault analytics security my-project --summary

# Review access patterns
dotvault analytics access my-project --last 7days
```

### 2. Fix High Severity Issues First

Priority order:

1. Critical security issues (score < 60)
2. High severity weak secrets
3. Duplicate values in production
4. Hardcoded URLs
5. Low severity issues

### 3. Monitor Access Patterns

Watch for anomalies:

- Unusual access times
- New users accessing sensitive envs
- Spike in failed attempts
- Access from unexpected IPs

### 4. Track Improvement

Set goals and track progress:

```bash
# Baseline
dotvault analytics security my-project --baseline

# Weekly check
dotvault analytics security my-project --compare-to-baseline

# Goal: Improve from C to B
dotvault analytics goals my-project --target-score 80
```

### 5. Share Reports

Distribute insights to team:

- Weekly security summary to team
- Monthly compliance report to management
- Quarterly review with security team

## API Reference

### Get Security Metrics

```bash
GET /api/projects/{projectId}/analytics/security

Response:
{
  "data": {
    "score": 85,
    "grade": "B",
    "totalSecrets": 45,
    "totalEnvironments": 5,
    "secretsByCategory": {
      "api": 15,
      "database": 8,
      "auth": 12,
      "other": 10
    },
    "weakSecrets": [
      {
        "key": "TEST_API_KEY",
        "envLabel": "development",
        "reason": "Test/Example value",
        "severity": "medium"
      }
    ],
    "duplicateValues": [
      {
        "value": "sk_***...***",
        "occurrences": [
          { "key": "STRIPE_KEY", "envLabel": "production" },
          { "key": "STRIPE_SECRET", "envLabel": "staging" }
        ]
      }
    ],
    "hardcodedUrls": [],
    "potentialSecrets": [],
    "recommendations": [
      "Fix 1 medium-severity weak secret",
      "Consolidate 1 duplicate value"
    ]
  }
}
```

### Get Usage Metrics

```bash
GET /api/projects/{projectId}/analytics/usage?from=2024-01-01&to=2024-01-31

Response:
{
  "data": {
    "viewsByDay": [
      { "date": "2024-01-15", "count": 12 },
      { "date": "2024-01-16", "count": 8 }
    ],
    "viewsByEnvironment": {
      "production": 45,
      "staging": 32,
      "development": 12
    },
    "topViewers": [
      {
        "userId": "user_xxx",
        "userName": "John Doe",
        "viewCount": 25
      }
    ],
    "lastViewedAt": "2024-01-16T14:30:00Z"
  }
}
```

### Get Activity Trends

```bash
GET /api/projects/{projectId}/analytics/trends?period=weekly

Response:
{
  "data": {
    "secretsAdded": [
      { "period": "2024-W02", "count": 3 },
      { "period": "2024-W03", "count": 5 }
    ],
    "secretsModified": [
      { "period": "2024-W02", "count": 8 },
      { "period": "2024-W03", "count": 12 }
    ],
    "secretsDeleted": [
      { "period": "2024-W02", "count": 1 },
      { "period": "2024-W03", "count": 0 }
    ],
    "accessFrequency": [
      { "period": "2024-W02", "count": 45 },
      { "period": "2024-W03", "count": 52 }
    ]
  }
}
```

### Generate Report

```bash
POST /api/projects/{projectId}/analytics/reports
{
  "type": "security",
  "format": "pdf",
  "dateRange": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  }
}

Response:
{
  "data": {
    "reportId": "rpt_xxx",
    "status": "generating",
    "estimatedCompletion": "2024-01-16T10:35:00Z"
  }
}
```

### Get Report Status

```bash
GET /api/projects/{projectId}/analytics/reports/{reportId}

Response:
{
  "data": {
    "id": "rpt_xxx",
    "type": "security",
    "format": "pdf",
    "status": "completed",
    "downloadUrl": "https://api.dotvault.io/reports/rpt_xxx/download",
    "expiresAt": "2024-01-17T10:30:00Z"
  }
}
```

## Troubleshooting

### Score Not Updating

1. Analytics calculated periodically (hourly)
2. Trigger manual recalculation
3. Check for processing errors
4. Contact support if persistent

### Missing Data

1. Verify date range
2. Check permissions
3. Ensure audit logging enabled
4. Review data retention policy

### Report Generation Failed

1. Try different format
2. Reduce date range
3. Check storage quota
4. Retry after delay

### Inaccurate Detection

False positives in weak secret detection:

1. Review detection patterns
2. Add to allowlist if valid
3. Adjust sensitivity
4. Report to support

## Privacy

### Data Handling

- Analytics use metadata only (not secret values)
- Pattern detection uses masked values
- No secret content stored in analytics
- Aggregate data only for trends

### Access Control

- Project owners: Full access
- Editors: View analytics
- Viewers: Limited metrics
- API keys: Configurable scope

### Retention

| Data Type         | Retention |
| ----------------- | --------- |
| Security scores   | 90 days   |
| Usage metrics     | 30 days   |
| Activity trends   | 1 year    |
| Generated reports | 30 days   |

Enterprise: Custom retention policies available.

## Pricing

Analytics features by plan:

| Feature           | Free    | Pro       | Enterprise  |
| ----------------- | ------- | --------- | ----------- |
| Security score    | ✓       | ✓         | ✓           |
| Basic metrics     | ✓       | ✓         | ✓           |
| Usage analytics   | 7 days  | 90 days   | Unlimited   |
| Trend analysis    | -       | ✓         | ✓           |
| Custom reports    | -       | ✓         | ✓           |
| Scheduled reports | -       | -         | ✓           |
| Data export       | CSV     | CSV, JSON | All formats |
| API access        | Limited | Full      | Full        |

## Support

- Documentation: https://docs.dotvault.io/analytics
- Community: https://community.dotvault.io
- Email: support@dotvault.io
