# IP Allowlisting

IP allowlisting restricts project access to specific IP addresses or ranges, adding an additional layer of security for sensitive environments.

## Overview

IP allowlisting enables:

- **Office-only access**: Restrict to corporate network
- **VPN enforcement**: Require VPN connection
- **Cloud security**: Limit to specific cloud provider IPs
- **Compliance**: Meet regulatory requirements

## How It Works

1. Configure allowed IP addresses or CIDR ranges
2. All access attempts checked against allowlist
3. Requests from non-allowed IPs are blocked
4. Audit log records all attempts

## Configuration

### Web Interface

1. Go to **Project Settings** → **Security** → **IP Allowlist**
2. Enter IP addresses or CIDR ranges
3. Format: Comma-separated list
4. Click **Save**

### CLI

```bash
# Set allowlist
dotvault project allowlist my-project \
  --ips "203.0.113.0/24,198.51.100.50"

# Add to existing
dotvault project allowlist my-project \
  --add "192.168.1.0/24"

# Remove IPs
dotvault project allowlist my-project \
  --remove "198.51.100.50"

# Clear allowlist (allow all)
dotvault project allowlist my-project --clear

# View current allowlist
dotvault project allowlist my-project
```

### API

```bash
# Update allowlist
PUT /api/projects/{projectId}/ip-allowlist
{
  "ipAllowlist": "203.0.113.0/24,198.51.100.50"
}

Response:
{
  "data": {
    "ipAllowlist": "203.0.113.0/24,198.51.100.50",
    "entries": [
      {
        "value": "203.0.113.0/24",
        "type": "cidr",
        "description": "256 IPs (Class C)"
      },
      {
        "value": "198.51.100.50",
        "type": "ip",
        "description": "Single IP"
      }
    ],
    "count": 2
  }
}

# Validate IPs
POST /api/projects/{projectId}/ip-allowlist/validate
{
  "ipAllowlist": "203.0.113.0/24,invalid-ip"
}

Response:
{
  "data": {
    "valid": false,
    "errors": [
      "Invalid IP or CIDR: invalid-ip"
    ],
    "entries": [
      {
        "value": "203.0.113.0/24",
        "type": "cidr",
        "valid": true
      },
      {
        "value": "invalid-ip",
        "type": "invalid",
        "valid": false
      }
    ]
  }
}
```

## Supported Formats

### Individual IP Addresses

```
192.168.1.1
203.0.113.50
2001:db8::1
```

### CIDR Ranges

```
192.168.0.0/16    # 65,536 IPs (Class B)
10.0.0.0/8        # 16,777,216 IPs (Class A)
203.0.113.0/24    # 256 IPs (Class C)
2001:db8::/32     # IPv6 range
```

### Common Patterns

**Office Network**:

```
203.0.113.0/24
```

**VPN Range**:

```
10.200.0.0/16
```

**AWS VPC**:

```
172.31.0.0/16
```

**Multiple Locations**:

```
203.0.113.0/24,198.51.100.0/24,192.0.2.0/24
```

## Presets

### Quick Selection

Common presets available in web interface:

| Preset            | Value            | Description      |
| ----------------- | ---------------- | ---------------- |
| Localhost         | `127.0.0.1`      | Development only |
| Private 10.x      | `10.0.0.0/8`     | RFC 1918 private |
| Private 172.16-31 | `172.16.0.0/12`  | RFC 1918 private |
| Private 192.168.x | `192.168.0.0/16` | RFC 1918 private |

### Cloud Provider Ranges

**AWS**:

```
# US East (N. Virginia)
3.80.0.0/12
3.83.168.0/22
# Add more as needed
```

**Google Cloud**:

```
# Use cloud provider's IP ranges
# https://www.gstatic.com/ipranges/cloud.json
```

**Azure**:

```
# Use Azure IP ranges
# https://www.microsoft.com/en-us/download/details.aspx?id=56519
```

## User Experience

### Blocked Access

When access is blocked:

1. User sees clear error message
2. Shows their current IP address
3. Provides contact information
4. Suggests using VPN or contacting admin

Example message:

```
Access Denied

Your IP address (203.0.113.100) is not in the allowlist for this project.

Current IP: 203.0.113.100
Allowed ranges: 192.168.0.0/16, 10.0.0.0/8

Please:
• Connect to your corporate VPN
• Contact your administrator to add this IP
• Access from an allowed location

Need help? Contact support@dotvault.io
```

### Bypass for Owners

Project owners can:

1. View current IP in settings
2. Temporarily disable allowlist
3. Add current IP with one click
4. View access attempt logs

## Best Practices

### 1. Start Restrictive

Begin with minimal access:

```
# Initial setup
192.168.1.0/24  # Office only
```

Then expand as needed based on legitimate access patterns.

### 2. Use CIDR Ranges

Prefer ranges over individual IPs:

```
# Good
10.0.0.0/8

# Avoid (hard to maintain)
10.0.0.1,10.0.0.2,10.0.0.3,...
```

### 3. Document Ranges

Add comments in your documentation:

```
# Office: 203.0.113.0/24
# VPN: 10.200.0.0/16
# AWS VPC: 172.31.0.0/16
203.0.113.0/24,10.200.0.0/16,172.31.0.0/16
```

### 4. Regular Review

Schedule quarterly reviews:

- Remove unused ranges
- Update changed IPs
- Audit access logs
- Verify compliance

### 5. Combine with Other Controls

IP allowlisting works best with:

- Two-factor authentication
- Access requests
- Audit logging
- Session timeouts

### 6. Emergency Access

Document emergency procedures:

```markdown
# Emergency IP Allowlist Bypass

1. Project owner logs into DotVault
2. Navigate to Project Settings → Security
3. Click "Temporarily Disable IP Allowlist"
4. Select duration (1-4 hours)
5. Provide reason
6. All owners notified automatically
7. Allowlist automatically re-enables
```

## API Integration

### Check Access

```bash
GET /api/projects/{projectId}/check-access

Response:
{
  "data": {
    "allowed": false,
    "clientIP": "203.0.113.100",
    "reason": "IP not in allowlist",
    "allowlist": ["192.168.0.0/16", "10.0.0.0/8"]
  }
}
```

### Get Access Attempts

```bash
GET /api/projects/{projectId}/ip-attempts?page=1&limit=50

Response:
{
  "data": {
    "attempts": [
      {
        "id": "atm_xxx",
        "ipAddress": "203.0.113.100",
        "userId": "user_xxx",
        "userEmail": "john@example.com",
        "action": "blocked",
        "timestamp": "2024-01-15T10:30:00Z",
        "userAgent": "Mozilla/5.0..."
      }
    ]
  }
}
```

## Troubleshooting

### Cannot Access Project

1. Check your current IP: `curl ifconfig.me`
2. Verify IP is in allowlist
3. Check for typos in CIDR notation
4. Ensure no conflicting rules

### VPN Issues

If using VPN:

1. Connect to VPN first
2. Verify VPN-assigned IP
3. Add VPN range to allowlist
4. Check split tunneling settings

### Dynamic IPs

For dynamic IP situations:

1. Use broader CIDR range
2. Implement dynamic DNS
3. Use VPN for access
4. Consider alternative controls

### IPv6 Issues

If using IPv6:

1. Add IPv6 ranges explicitly
2. Check dual-stack configuration
3. Verify client prefers IPv4
4. Contact support for IPv6 guidance

## Compliance

### Regulatory Requirements

IP allowlisting helps meet:

- **PCI DSS**: Restrict access to CDE
- **HIPAA**: Control access to PHI
- **SOX**: Limit financial system access
- **GDPR**: Data processing controls

### Audit Requirements

Maintain records of:

- Allowlist changes
- Blocked access attempts
- Emergency bypass usage
- Regular reviews

Retention: 7 years (configurable)

## Limitations

### Known Limitations

1. **VPN required for remote work**
2. **Mobile access may be blocked**
3. **Dynamic IPs need regular updates**
4. **IPv6 support varies by provider**

### Workarounds

**For mobile access**:

- Use mobile VPN
- Add mobile carrier ranges
- Use alternative authentication

**For dynamic IPs**:

- Use DDNS with narrow ranges
- Implement API-based updates
- Use VPN as primary solution

## API Reference

### Get Current IP

```bash
GET /api/me/ip

Response:
{
  "data": {
    "ip": "203.0.113.100",
    "geo": {
      "country": "US",
      "region": "California",
      "city": "San Francisco"
    }
  }
}
```

### Validate IP Format

```bash
POST /api/utils/validate-ip
{
  "ip": "203.0.113.0/24"
}

Response:
{
  "data": {
    "valid": true,
    "type": "cidr",
    "range": {
      "start": "203.0.113.0",
      "end": "203.0.113.255",
      "count": 256
    }
  }
}
```

## Support

- Documentation: https://docs.dotvault.io/ip-allowlist
- IP lookup: https://ifconfig.me
- CIDR calculator: https://www.ipaddressguide.com/cidr
- Community: https://community.dotvault.io
- Email: support@dotvault.io
