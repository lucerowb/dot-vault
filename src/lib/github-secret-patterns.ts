// Common secret patterns for detection in code
export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    name: "AWS Access Key ID",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "critical",
    description: "AWS Access Key ID detected",
  },
  {
    name: "AWS Secret Access Key",
    pattern:
      /(?:aws_secret_access_key|aws_secret|secret_key)[\s]*[=:]+[\s]*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    severity: "critical",
    description: "AWS Secret Access Key detected",
  },
  // GitHub
  {
    name: "GitHub Personal Access Token",
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    severity: "critical",
    description: "GitHub Personal Access Token detected",
  },
  {
    name: "GitHub OAuth Token",
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: "critical",
    description: "GitHub OAuth Token detected",
  },
  {
    name: "GitHub App Token",
    pattern: /ghs_[a-zA-Z0-9]{36}/g,
    severity: "critical",
    description: "GitHub App Token detected",
  },
  // Stripe
  {
    name: "Stripe Live Secret Key",
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    severity: "critical",
    description: "Stripe Live Secret Key detected",
  },
  {
    name: "Stripe Test Secret Key",
    pattern: /sk_test_[a-zA-Z0-9]{24,}/g,
    severity: "medium",
    description: "Stripe Test Secret Key detected",
  },
  // Twilio
  {
    name: "Twilio API Key",
    pattern: /SK[a-f0-9]{32}/g,
    severity: "high",
    description: "Twilio API Key detected",
  },
  {
    name: "Twilio Auth Token",
    pattern: /[a-f0-9]{32}/g,
    severity: "high",
    description: "Potential Twilio Auth Token detected",
  },
  // SendGrid
  {
    name: "SendGrid API Key",
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    severity: "high",
    description: "SendGrid API Key detected",
  },
  // Slack
  {
    name: "Slack Bot Token",
    pattern: /xoxb-[a-zA-Z0-9-]{10,48}/g,
    severity: "high",
    description: "Slack Bot Token detected",
  },
  {
    name: "Slack User Token",
    pattern: /xoxp-[a-zA-Z0-9-]{10,48}/g,
    severity: "high",
    description: "Slack User Token detected",
  },
  {
    name: "Slack Webhook URL",
    pattern:
      /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8,}\/[a-zA-Z0-9_]{24}/g,
    severity: "medium",
    description: "Slack Webhook URL detected",
  },
  // Generic API Keys
  {
    name: "Generic API Key",
    pattern:
      /(?:api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]+[\s]*['"]?([a-zA-Z0-9_\-]{16,})['"]?/gi,
    severity: "medium",
    description: "Potential API key detected",
  },
  {
    name: "Generic Secret",
    pattern:
      /(?:secret|password|passwd|pwd)[\s]*[=:]+[\s]*['"]?([a-zA-Z0-9!@#$%^&*]{8,})['"]?/gi,
    severity: "medium",
    description: "Potential secret/password detected",
  },
  // Database URLs
  {
    name: "Database Connection String",
    pattern: /(?:postgres|mysql|mongodb|redis):\/\/(?:[^:]+):([^@]+)@[^/]+/g,
    severity: "critical",
    description: "Database connection string with credentials detected",
  },
  // JWT
  {
    name: "JWT Token",
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    severity: "medium",
    description: "JWT Token detected",
  },
  // Private Keys
  {
    name: "Private Key",
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
    description: "Private key detected",
  },
  // .env files
  {
    name: "Environment Variable File",
    pattern: /\.env(?:\.local|\.development|\.production|\.staging)?$/,
    severity: "low",
    description: "Environment file reference detected",
  },
];

export interface SecretMatch {
  pattern: SecretPattern;
  match: string;
  line: number;
  column: number;
}

export function scanForSecrets(
  content: string,
  filename?: string,
): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  // Skip binary files and common non-code files
  if (filename) {
    const skipExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".ico",
      ".svg",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
      ".mp4",
      ".webm",
      ".mp3",
      ".pdf",
      ".zip",
      ".tar",
      ".gz",
    ];
    if (skipExtensions.some((ext) => filename.toLowerCase().endsWith(ext))) {
      return matches;
    }
  }

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (!line) continue;

    for (const pattern of SECRET_PATTERNS) {
      // Reset regex lastIndex
      pattern.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(line)) !== null) {
        // Avoid duplicate matches from overlapping patterns
        const matchArray = match!;
        const alreadyFound = matches.some(
          (m) => m.line === lineNum + 1 && m.match === matchArray[0],
        );
        if (!alreadyFound) {
          matches.push({
            pattern,
            match: matchArray[0],
            line: lineNum + 1,
            column: matchArray.index + 1,
          });
        }
      }
    }
  }

  return matches.sort((a, b) => {
    // Sort by severity first
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff =
      severityOrder[a.pattern.severity] - severityOrder[b.pattern.severity];
    if (severityDiff !== 0) return severityDiff;
    // Then by line number
    return a.line - b.line;
  });
}

export function generateSecretReport(matches: SecretMatch[]): {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Array<{
    severity: string;
    type: string;
    description: string;
    line: number;
    column: number;
    snippet: string;
  }>;
} {
  const summary = {
    total: matches.length,
    critical: matches.filter((m) => m.pattern.severity === "critical").length,
    high: matches.filter((m) => m.pattern.severity === "high").length,
    medium: matches.filter((m) => m.pattern.severity === "medium").length,
    low: matches.filter((m) => m.pattern.severity === "low").length,
  };

  const findings = matches.map((m) => ({
    severity: m.pattern.severity,
    type: m.pattern.name,
    description: m.pattern.description,
    line: m.line,
    column: m.column,
    snippet: m.match.slice(0, 50) + (m.match.length > 50 ? "..." : ""),
  }));

  return { summary, findings };
}
