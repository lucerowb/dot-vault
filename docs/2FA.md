# Two-Factor Authentication (2FA)

Two-factor authentication adds an extra layer of security to your DotVault account by requiring both your password and a second factor (TOTP or WebAuthn) to sign in.

## Overview

2FA protects your account from:

- **Password breaches**: Stolen passwords aren't enough
- **Phishing attacks**: Time-based codes prevent replay
- **Credential stuffing**: Unique second factor required
- **Account takeovers**: Physical device needed

## Supported Methods

### Time-based One-Time Password (TOTP)

The most common 2FA method, compatible with:

- **Google Authenticator** (iOS, Android)
- **Microsoft Authenticator** (iOS, Android)
- **Authy** (iOS, Android, Desktop)
- **1Password** (Built-in 2FA)
- **Yubico Authenticator** (Hardware-based)

**Pros**:

- Works offline
- Wide compatibility
- Easy to set up
- Free apps available

**Cons**:

- Requires phone/device
- Codes time-sensitive
- Secret key must be backed up

### WebAuthn / Security Keys

Hardware-based authentication using:

- **YubiKey** (USB, NFC, Lightning)
- **Google Titan** (USB, NFC)
- **Feitian** (USB, NFC)
- **Built-in biometrics** (Touch ID, Windows Hello)

**Pros**:

- Phishing-resistant
- No codes to enter
- Strongest security
- Works across devices

**Cons**:

- Requires hardware key
- Not all devices supported
- More expensive

## Setup

### Enabling TOTP

1. Go to **Account Settings** → **Security** → **Two-Factor Authentication**
2. Click **Enable 2FA**
3. Scan QR code with authenticator app
4. Enter 6-digit code to verify
5. Save backup codes securely

### CLI Setup

```bash
# Start 2FA setup
dotvault 2fa setup

# Follow prompts to scan QR code
# Enter verification code
# Save backup codes

# Verify 2FA is working
dotvault 2fa verify
```

### API Setup

```bash
# Generate TOTP secret
POST /api/auth/2fa/setup

Response:
{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "uri": "otpauth://totp/DotVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DotVault",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": [
      "ABCD-EFGH",
      "IJKL-MNOP",
      "QRST-UVWX"
    ]
  }
}

# Verify and enable
POST /api/auth/2fa/verify
{
  "code": "123456",
  "secret": "JBSWY3DPEHPK3PXP"
}

Response:
{
  "data": {
    "enabled": true,
    "backupCodes": ["ABCD-EFGH", "IJKL-MNOP", "QRST-UVWX"]
  }
}
```

### Enabling WebAuthn

1. Go to **Account Settings** → **Security** → **Two-Factor Authentication**
2. Click **Add Security Key**
3. Insert/register your security key
4. Name your key (e.g., "YubiKey 5")
5. Test the key

## Backup Codes

### What Are Backup Codes?

Backup codes are single-use codes for account recovery if you lose access to your 2FA device.

### Saving Backup Codes

**Do**:

- Print and store in a safe place
- Save in password manager
- Store in secure cloud storage
- Keep multiple copies

**Don't**:

- Store on your phone only
- Save in email
- Share with others
- Store unencrypted

### Using Backup Codes

1. At 2FA prompt, click **Use Backup Code**
2. Enter one of your backup codes
3. Code is consumed (cannot be reused)
4. Generate new codes after use

### CLI

```bash
# View remaining backup codes
dotvault 2fa backup-codes

# Generate new backup codes
dotvault 2fa regenerate-codes
# Requires current 2FA code or backup code
```

## Sign In with 2FA

### Web

1. Enter email and password
2. Enter 6-digit code from authenticator app
3. Or insert security key
4. Signed in

### CLI

```bash
# Sign in with 2FA
dotvault login
# Enter email
# Enter password
# Enter 2FA code: 123456

# Or use backup code
dotvault login --backup-code
# Enter backup code: ABCD-EFGH
```

### API

```bash
# Step 1: Initiate login
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "data": {
    "requires2FA": true,
    "method": "totp"
  }
}

# Step 2: Complete with 2FA
POST /api/auth/2fa/verify
{
  "code": "123456"
}

Response:
{
  "data": {
    "token": "jwt_token_here",
    "user": { ... }
  }
}
```

## Disabling 2FA

### Requirements

To disable 2FA, you must:

1. Be signed in
2. Provide current 2FA code or backup code
3. Confirm the action

### Web

1. Go to **Account Settings** → **Security** → **Two-Factor Authentication**
2. Click **Disable 2FA**
3. Enter 2FA code or backup code
4. Confirm

### CLI

```bash
# Disable 2FA
dotvault 2fa disable
# Enter 2FA code to confirm
```

### API

```bash
POST /api/auth/2fa/disable
{
  "code": "123456"
}

Response:
{
  "data": {
    "disabled": true
  }
}
```

## Recovery

### Lost Authenticator App

1. Use backup code to sign in
2. Disable 2FA
3. Re-enable with new device
4. Generate new backup codes

### Lost Backup Codes

1. Sign in with authenticator app
2. Generate new backup codes
3. Store securely

### Lost Everything

Contact support with:

- Account email
- Proof of identity
- Recent activity details
- Recovery may take 24-48 hours

## Organization Requirements

### Requiring 2FA

Organization admins can require 2FA for all members:

```bash
POST /api/organizations/{orgId}/security
{
  "require2FA": true
}
```

**Effects**:

- Members without 2FA prompted on next login
- Cannot access projects until 2FA enabled
- Grace period configurable (default: 7 days)

### Exemptions

Service accounts and API keys can be exempted:

```bash
POST /api/organizations/{orgId}/security
{
  "require2FA": true,
  "exemptions": [
    "service-account-ci",
    "service-account-deploy"
  ]
}
```

## Security Best Practices

### 1. Use Authenticator Apps

Recommended apps:

- **Google Authenticator** - Simple, reliable
- **Microsoft Authenticator** - Cloud backup
- **Authy** - Multi-device sync
- **1Password** - Integrated with password manager

Avoid SMS-based 2FA when possible (SIM swap attacks).

### 2. Multiple 2FA Methods

Set up both:

- Primary: TOTP app
- Secondary: Security key
- Backup: Backup codes

### 3. Secure Backup Codes

Store in multiple locations:

- Password manager (1Password, Bitwarden)
- Physical safe
- Encrypted USB drive
- Trusted family member

### 4. Regular Review

Check your 2FA settings quarterly:

- Verify backup codes accessible
- Check for unknown devices
- Review recovery options
- Update security key firmware

### 5. Device Security

Protect your 2FA device:

- Phone: PIN/biometric lock
- Security key: Physical safe when not in use
- Backup codes: Encrypted storage

## Troubleshooting

### Code Not Working

1. Check device time is accurate (TOTP is time-based)
2. Try next code (30-second windows)
3. Use backup code
4. Contact support if persistent

### Time Sync Issues

TOTP requires accurate time:

**iOS/Android**:

- Enable automatic time sync
- Settings → Date & Time → Automatic

**Desktop**:

```bash
# Linux
sudo ntpdate -s time.nist.gov

# macOS
sudo sntp -sS time.apple.com
```

### New Phone Setup

1. Sign in with backup code on new phone
2. Disable 2FA
3. Re-enable with new device
4. Generate new backup codes

**Or use Authy/Microsoft Authenticator**:

- Enable cloud backup
- Restore on new device
- No re-setup needed

### Security Key Not Working

1. Try different USB port
2. Check browser support (Chrome, Edge, Safari)
3. Verify key firmware updated
4. Remove and re-add key

## API Reference

### Get 2FA Status

```bash
GET /api/auth/2fa/status

Response:
{
  "data": {
    "enabled": true,
    "method": "totp",
    "backupCodesRemaining": 8,
    "lastUsedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Regenerate Backup Codes

```bash
POST /api/auth/2fa/backup-codes/regenerate
{
  "code": "123456" // Current 2FA code
}

Response:
{
  "data": {
    "backupCodes": [
      "ABCD-EFGH",
      "IJKL-MNOP",
      "QRST-UVWX",
      ...
    ]
  }
}
```

### List Security Keys

```bash
GET /api/auth/webauthn/credentials

Response:
{
  "data": {
    "credentials": [
      {
        "id": "cred_xxx",
        "name": "YubiKey 5 NFC",
        "createdAt": "2024-01-15T10:30:00Z",
        "lastUsedAt": "2024-01-15T14:20:00Z"
      }
    ]
  }
}
```

### Remove Security Key

```bash
DELETE /api/auth/webauthn/credentials/{credentialId}
{
  "code": "123456" // Current 2FA code
}

Response:
{
  "data": {
    "removed": true
  }
}
```

## Compliance

### Regulatory Requirements

2FA helps meet:

- **PCI DSS**: Multi-factor authentication for CDE access
- **HIPAA**: Strong authentication for PHI access
- **SOX**: Financial system access controls
- **NIST 800-63**: Digital identity guidelines
- **GDPR**: Security of processing

### Audit Trail

All 2FA events logged:

- Enabled/disabled
- Backup codes generated
- Security keys added/removed
- Failed verification attempts
- Recovery attempts

Retention: 7 years

## Support

- Documentation: https://docs.dotvault.io/2fa
- TOTP Apps: Check app documentation
- Security Keys: Contact manufacturer
- Account Recovery: support@dotvault.io
- Community: https://community.dotvault.io
