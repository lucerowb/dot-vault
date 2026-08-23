// Local, offline secret auditing for .env content.
// Never sends values anywhere — all checks run in-process.

export interface ScanFinding {
  key: string;
  issue: string;
  severity: "low" | "medium" | "high";
}

export interface ScanResult {
  totalVars: number;
  findings: ScanFinding[];
}

interface ProviderPattern {
  name: string;
  pattern: RegExp;
}

const PROVIDER_PATTERNS: ProviderPattern[] = [
  { name: "AWS access key", pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "Stripe secret key", pattern: /\b[sr]k_(live|test)_[A-Za-z0-9]{20,}\b/ },
  { name: "OpenAI API key", pattern: /\bsk-(proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]+\b/ },
  { name: "Google API key", pattern: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { name: "Twilio API key", pattern: /\bSK[a-f0-9]{32}\b/ },
  { name: "SendGrid API key", pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
  { name: "npm token", pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: "Private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "JWT", pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
];

const SECRETISH_KEY =
  /pass(word|wd)?|secret|token|api.?key|access.?key|credential|private|auth/i;

const COMMON_WEAK_VALUES = new Set([
  "password",
  "passwd",
  "changeme",
  "change-me",
  "secret",
  "admin",
  "root",
  "123456",
  "12345678",
  "qwerty",
  "letmein",
  "test",
  "example",
  "dummy",
  "placeholder",
]);

const PLACEHOLDER_MARKERS = [
  "your_",
  "your-",
  "<your",
  "${your",
  "xxx",
  "****",
  "insert_",
  "replace_me",
  "replace-me",
];

function parsePairs(content: string): Array<{ key: string; value: string }> {
  const pairs: Array<{ key: string; value: string }> = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let key = trimmed.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    pairs.push({ key, value });
  }
  return pairs;
}

/**
 * Scan env content for security issues:
 * live provider credentials, weak/duplicate/placeholder values,
 * insecure URLs. Purely local.
 */
export function scanEnvContent(content: string): ScanResult {
  const pairs = parsePairs(content);
  const findings: ScanFinding[] = [];
  const seenValues = new Map<string, string[]>();

  for (const { key, value } of pairs) {
    // Live provider credentials in the value
    for (const provider of PROVIDER_PATTERNS) {
      if (provider.pattern.test(value)) {
        findings.push({
          key,
          issue: `Looks like a ${provider.name} — double-check it belongs here`,
          severity: "high",
        });
        break;
      }
    }

    // Empty secret-ish values
    if (!value && SECRETISH_KEY.test(key)) {
      findings.push({
        key,
        issue: "Empty value for a credential-style key",
        severity: "low",
      });
      continue;
    }

    // Weak values on credential-style keys
    if (SECRETISH_KEY.test(key)) {
      const lower = value.toLowerCase();
      if (COMMON_WEAK_VALUES.has(lower)) {
        findings.push({
          key,
          issue: `Common weak value ("${lower}")`,
          severity: "high",
        });
      } else if (value.length < 8) {
        findings.push({
          key,
          issue: `Very short (${value.length} chars) for a credential`,
          severity: "medium",
        });
      }
    }

    // Placeholder markers anywhere
    const lowerValue = value.toLowerCase();
    for (const marker of PLACEHOLDER_MARKERS) {
      if (lowerValue.includes(marker)) {
        findings.push({
          key,
          issue: `Placeholder marker ("${marker}") — looks unset`,
          severity: "medium",
        });
        break;
      }
    }

    // Insecure HTTP endpoints
    if (/^http:\/\//i.test(value) && !/localhost|127\.0\.0\.1/.test(value)) {
      findings.push({
        key,
        issue: "Uses plain http:// (not https://)",
        severity: "low",
      });
    }

    // Duplicate tracking
    if (value.length > 3) {
      const list = seenValues.get(value.toLowerCase()) ?? [];
      list.push(key);
      seenValues.set(value.toLowerCase(), list);
    }
  }

  for (const keys of seenValues.values()) {
    if (keys.length > 1) {
      findings.push({
        key: keys.join(", "),
        issue: `Same value reused across ${keys.length} keys`,
        severity: "medium",
      });
    }
  }

  return { totalVars: pairs.length, findings };
}
