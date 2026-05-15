// IP Allowlisting for project access control
// Supports CIDR notation and individual IP addresses

import { z } from "zod";

/**
 * Validate an IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) {
    return false;
  }

  const ip = parts[0];
  const prefix = parts[1];
  if (!ip || !prefix) {
    return false;
  }

  if (!isValidIP(ip)) {
    return false;
  }

  const prefixNum = parseInt(prefix, 10);
  if (isNaN(prefixNum)) {
    return false;
  }

  // IPv4 CIDR: 0-32
  // IPv6 CIDR: 0-128
  const isIPv4 = ip.includes(".");
  const maxPrefix = isIPv4 ? 32 : 128;

  return prefixNum >= 0 && prefixNum <= maxPrefix;
}

/**
 * Parse IP allowlist string
 * Format: comma-separated list of IPs or CIDR ranges
 */
export function parseAllowlist(allowlist: string): string[] {
  if (!allowlist || allowlist.trim().length === 0) {
    return [];
  }

  return allowlist
    .split(",")
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

/**
 * Validate an allowlist string
 * Returns array of errors if any
 */
export function validateAllowlist(allowlist: string): {
  valid: boolean;
  errors: string[];
  entries: string[];
} {
  const entries = parseAllowlist(allowlist);
  const errors: string[] = [];

  for (const entry of entries) {
    if (!isValidIP(entry) && !isValidCIDR(entry)) {
      errors.push(`Invalid IP or CIDR: ${entry}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    entries,
  };
}

/**
 * Convert IP to numeric representation for comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  const [a = 0, b = 0, c = 0, d = 0] = parts;
  return (a << 24) + (b << 16) + (c << 8) + d;
}

/**
 * Check if an IP is within a CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split("/");
  if (!network || !prefixStr) {
    return false;
  }
  const prefix = parseInt(prefixStr, 10);

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);

  const mask = 0xffffffff << (32 - prefix);

  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Check if an IP address is allowed by the allowlist
 */
export function isIPAllowed(
  clientIP: string,
  allowlist: string,
): { allowed: boolean; reason?: string } {
  const entries = parseAllowlist(allowlist);

  // Empty allowlist = allow all
  if (entries.length === 0) {
    return { allowed: true };
  }

  // Check if clientIP is directly in the list
  if (entries.includes(clientIP)) {
    return { allowed: true };
  }

  // Check if clientIP is in any CIDR range
  for (const entry of entries) {
    if (isValidCIDR(entry)) {
      try {
        if (isIPInCIDR(clientIP, entry)) {
          return { allowed: true };
        }
      } catch {
        // Invalid CIDR format, skip
      }
    }
  }

  return {
    allowed: false,
    reason: `IP ${clientIP} is not in the allowlist`,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check X-Forwarded-For header (common with proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  // Check X-Real-IP header
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to CF-Connecting-IP (Cloudflare)
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }

  // Last resort: return unknown
  return "unknown";
}

/**
 * Format allowlist for display
 */
export function formatAllowlist(allowlist: string): {
  entries: Array<{
    value: string;
    type: "ip" | "cidr";
    description?: string;
  }>;
  count: number;
} {
  const entries = parseAllowlist(allowlist);

  const formatted = entries.map((entry) => {
    if (isValidCIDR(entry)) {
      return {
        value: entry,
        type: "cidr" as const,
        description: getCIDRDescription(entry),
      };
    }
    return {
      value: entry,
      type: "ip" as const,
    };
  });

  return {
    entries: formatted,
    count: entries.length,
  };
}

/**
 * Get human-readable description of a CIDR range
 */
function getCIDRDescription(cidr: string): string {
  const [, prefix = "0"] = cidr.split("/");
  const prefixNum = parseInt(prefix, 10);

  if (prefixNum === 32) {
    return "Single IP";
  }

  if (prefixNum === 24) {
    return "256 IPs (Class C)";
  }

  if (prefixNum === 16) {
    return "65,536 IPs (Class B)";
  }

  if (prefixNum === 8) {
    return "16,777,216 IPs (Class A)";
  }

  const numIPs = Math.pow(2, 32 - prefixNum);
  return `${numIPs.toLocaleString()} IPs`;
}

/**
 * Common IP ranges for quick selection
 */
export const COMMON_IP_RANGES = [
  { label: "Localhost", value: "127.0.0.1", description: "Development only" },
  {
    label: "Private Network (10.x)",
    value: "10.0.0.0/8",
    description: "RFC 1918 private",
  },
  {
    label: "Private Network (172.16-31)",
    value: "172.16.0.0/12",
    description: "RFC 1918 private",
  },
  {
    label: "Private Network (192.168.x)",
    value: "192.168.0.0/16",
    description: "RFC 1918 private",
  },
  {
    label: "Office Network (example)",
    value: "203.0.113.0/24",
    description: "Example range",
  },
];

/**
 * Zod schema for allowlist validation
 */
export const AllowlistSchema = z
  .string()
  .max(2000, "Allowlist too long (max 2000 characters)")
  .refine(
    (val) => {
      if (!val || val.trim().length === 0) return true;
      const result = validateAllowlist(val);
      return result.valid;
    },
    {
      message: "Invalid IP or CIDR format",
    },
  );
