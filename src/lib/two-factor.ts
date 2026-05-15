// Two-Factor Authentication (2FA) with TOTP and WebAuthn support
import { z } from "zod";
import * as OTPAuth from "otpauth";

// TOTP Configuration
const TOTP_ISSUER = "DotVault";
const TOTP_ALGORITHM = "SHA1";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): {
  secret: string;
  uri: string;
  backupCodes: string[];
} {
  // Generate random secret
  const secret = new OTPAuth.Secret({ size: 32 });
  const secretBase32 = secret.base32;

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  // Create TOTP URI for QR code
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: secretBase32,
  });

  return {
    secret: secretBase32,
    uri: totp.toString(),
    backupCodes,
  };
}

/**
 * Generate backup codes for account recovery
 */
function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // Removed confusing characters

  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Add hyphen for readability: XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Verify a TOTP code
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  // Allow 1 step before and after for time drift
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(
  code: string,
  storedCodes: string[],
): { valid: boolean; remainingCodes: string[] } {
  // Normalize input code (remove spaces, uppercase)
  const normalizedCode = code.replace(/\s/g, "").toUpperCase();

  const index = storedCodes.findIndex(
    (stored) => stored.replace(/\s/g, "").toUpperCase() === normalizedCode,
  );

  if (index === -1) {
    return { valid: false, remainingCodes: storedCodes };
  }

  // Remove used code
  const remainingCodes = [...storedCodes];
  remainingCodes.splice(index, 1);

  return { valid: true, remainingCodes };
}

/**
 * Hash backup codes for storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const crypto = await import("crypto");

  return codes.map((code) => {
    const normalized = code.replace(/\s/g, "").toUpperCase();
    return crypto.createHash("sha256").update(normalized).digest("hex");
  });
}

/**
 * Verify a hashed backup code
 */
export async function verifyHashedBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<{ valid: boolean; remainingCodes: string[] }> {
  const crypto = await import("crypto");
  const normalized = code.replace(/\s/g, "").toUpperCase();
  const hashed = crypto.createHash("sha256").update(normalized).digest("hex");

  const index = hashedCodes.findIndex((stored) => stored === hashed);

  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes };
  }

  const remainingCodes = [...hashedCodes];
  remainingCodes.splice(index, 1);

  return { valid: true, remainingCodes };
}

/**
 * Generate QR code data URL from TOTP URI
 */
export async function generateQRCode(uri: string): Promise<string> {
  // In a real implementation, you'd use a QR code library
  // For now, return the URI which can be used with a QR code component
  return uri;
}

/**
 * Check if 2FA is required for a project
 */
export async function is2FARequiredForProject(
  _projectId: string,
): Promise<boolean> {
  void _projectId;
  // This would query the database
  // For now, return false as default
  return false;
}

/**
 * Validate 2FA token format
 */
export const TOTPTokenSchema = z
  .string()
  .length(6, "Token must be 6 digits")
  .regex(/^\d{6}$/, "Token must be 6 digits");

/**
 * Validate backup code format
 */
export const BackupCodeSchema = z
  .string()
  .regex(
    /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i,
    "Invalid backup code format (XXXX-XXXX)",
  );

// WebAuthn support (simplified - would use @simplewebauthn/server in production)

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports: string[];
}

/**
 * Generate WebAuthn registration options
 */
export function generateWebAuthnRegistrationOptions(
  userId: string,
  userEmail: string,
): unknown {
  // This would use @simplewebauthn/server
  // Simplified for now
  return {
    challenge: generateChallenge(),
    rp: {
      name: "DotVault",
      id:
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
        "localhost",
    },
    user: {
      id: userId,
      name: userEmail,
      displayName: userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };
}

/**
 * Generate WebAuthn authentication options
 */
export function generateWebAuthnAuthenticationOptions(
  credentials: WebAuthnCredential[],
): unknown {
  return {
    challenge: generateChallenge(),
    allowCredentials: credentials.map((cred) => ({
      id: cred.id,
      type: "public-key",
      transports: cred.transports,
    })),
    timeout: 60000,
    userVerification: "preferred",
  };
}

/**
 * Generate a random challenge
 */
function generateChallenge(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Verify WebAuthn registration response
 */
export async function verifyWebAuthnRegistration(
  _response: unknown,
  _expectedChallenge: string,
): Promise<{ verified: boolean; credential?: WebAuthnCredential }> {
  void _response;
  void _expectedChallenge;
  // This would use @simplewebauthn/server
  // Simplified for now
  return { verified: false };
}

/**
 * Verify WebAuthn authentication response
 */
export async function verifyWebAuthnAuthentication(
  _response: unknown,
  _credential: WebAuthnCredential,
  _expectedChallenge: string,
): Promise<{ verified: boolean }> {
  void _response;
  void _credential;
  void _expectedChallenge;
  // This would use @simplewebauthn/server
  // Simplified for now
  return { verified: false };
}
