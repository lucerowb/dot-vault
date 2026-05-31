// Secret analytics and insights

export interface SecretMetrics {
  totalSecrets: number;
  totalEnvironments: number;
  secretsByCategory: Record<string, number>;
  averageSecretAge: number; // in days
  oldestSecret: {
    key: string;
    envLabel: string;
    age: number; // in days
  } | null;
  recentlyAdded: Array<{
    key: string;
    envLabel: string;
    addedAt: Date;
  }>;
  recentlyModified: Array<{
    key: string;
    envLabel: string;
    modifiedAt: Date;
  }>;
}

export interface SecurityMetrics {
  weakSecrets: Array<{
    key: string;
    envLabel: string;
    reason: string;
    severity: "low" | "medium" | "high";
  }>;
  duplicateValues: Array<{
    value: string;
    occurrences: Array<{ key: string; envLabel: string }>;
  }>;
  hardcodedUrls: Array<{
    key: string;
    envLabel: string;
    url: string;
  }>;
  potentialSecrets: Array<{
    key: string;
    envLabel: string;
    pattern: string;
  }>;
}

export interface UsageMetrics {
  viewsByDay: Array<{ date: string; count: number }>;
  viewsByEnvironment: Record<string, number>;
  topViewers: Array<{
    userId: string;
    userName: string;
    viewCount: number;
  }>;
  lastViewedAt: Date | null;
}

// Weak secret patterns
const WEAK_PATTERNS = [
  {
    pattern: /^(password|passwd|pwd|secret|key|token|api.?key)$/i,
    reason: "Generic name",
    severity: "low" as const,
  },
  {
    pattern: /^(test|example|demo|sample|dummy)$/i,
    reason: "Test/Example value",
    severity: "medium" as const,
  },
  {
    pattern: /^(123|abc|xyz|qwerty|password|admin|root)$/i,
    reason: "Common weak value",
    severity: "high" as const,
  },
  {
    pattern: /^.{0,7}$/,
    reason: "Too short (< 8 chars)",
    severity: "high" as const,
  },
];

// Secret detection patterns
const SECRET_PATTERNS = [
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "AWS Secret Key", pattern: /[0-9a-zA-Z/+]{40}/ },
  { name: "GitHub Token", pattern: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "Slack Token", pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}/ },
  { name: "Stripe Key", pattern: /sk_(test|live)_[0-9a-zA-Z]{24,}/ },
  {
    name: "Private Key",
    pattern: /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "JWT Token",
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
  },
  { name: "API Key", pattern: /api[_-]?key[_-]?[0-9a-zA-Z]{16,}/i },
];

/**
 * Analyze secrets for security issues
 */
export function analyzeSecrets(
  envs: Array<{ label: string; content: string; updatedAt: Date }>,
): SecurityMetrics {
  const weakSecrets: SecurityMetrics["weakSecrets"] = [];
  const valueMap = new Map<string, Array<{ key: string; envLabel: string }>>();
  const hardcodedUrls: SecurityMetrics["hardcodedUrls"] = [];
  const potentialSecrets: SecurityMetrics["potentialSecrets"] = [];

  for (const env of envs) {
    const secrets = parseEnvContent(env.content);

    for (const [key, value] of Object.entries(secrets)) {
      // Check for weak patterns
      for (const weakPattern of WEAK_PATTERNS) {
        if (weakPattern.pattern.test(value)) {
          weakSecrets.push({
            key,
            envLabel: env.label,
            reason: weakPattern.reason,
            severity: weakPattern.severity,
          });
          break;
        }
      }

      // Track duplicate values
      const normalizedValue = value.toLowerCase().trim();
      if (normalizedValue.length > 3) {
        const existing = valueMap.get(normalizedValue) || [];
        existing.push({ key, envLabel: env.label });
        valueMap.set(normalizedValue, existing);
      }

      // Check for hardcoded URLs
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = value.match(urlPattern);
      if (urls) {
        for (const url of urls) {
          // Skip if it's just a reference to localhost or example
          if (!url.includes("localhost") && !url.includes("example.com")) {
            hardcodedUrls.push({
              key,
              envLabel: env.label,
              url,
            });
          }
        }
      }

      // Check for potential secrets in values
      for (const secretPattern of SECRET_PATTERNS) {
        if (secretPattern.pattern.test(value)) {
          potentialSecrets.push({
            key,
            envLabel: env.label,
            pattern: secretPattern.name,
          });
          break;
        }
      }
    }
  }

  // Find duplicates (values appearing more than once)
  const duplicateValues: SecurityMetrics["duplicateValues"] = [];
  for (const [value, occurrences] of valueMap.entries()) {
    if (occurrences.length > 1) {
      duplicateValues.push({
        value: maskValue(value),
        occurrences,
      });
    }
  }

  return {
    weakSecrets,
    duplicateValues,
    hardcodedUrls,
    potentialSecrets,
  };
}

/**
 * Parse .env content into key-value pairs
 */
function parseEnvContent(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

/**
 * Mask a value for display
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }
  return value.slice(0, 4) + "***" + value.slice(-4);
}

/**
 * Calculate secret metrics
 */
export function calculateMetrics(
  envs: Array<{
    label: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
): SecretMetrics {
  let totalSecrets = 0;
  const secretsByCategory: Record<string, number> = {};
  let oldestSecret: { key: string; envLabel: string; age: number } | null =
    null;
  const recentlyAdded: SecretMetrics["recentlyAdded"] = [];
  const recentlyModified: SecretMetrics["recentlyModified"] = [];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const env of envs) {
    const secrets = parseEnvContent(env.content);
    totalSecrets += Object.keys(secrets).length;

    for (const [key, value] of Object.entries(secrets)) {
      // Categorize
      const category = categorizeSecret(key, value);
      secretsByCategory[category] = (secretsByCategory[category] || 0) + 1;

      // Check age
      const age = Math.floor(
        (now.getTime() - env.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (!oldestSecret || age > oldestSecret.age) {
        oldestSecret = { key, envLabel: env.label, age };
      }

      // Recently added
      if (env.createdAt > thirtyDaysAgo) {
        recentlyAdded.push({
          key,
          envLabel: env.label,
          addedAt: env.createdAt,
        });
      }

      // Recently modified
      if (env.updatedAt > thirtyDaysAgo) {
        recentlyModified.push({
          key,
          envLabel: env.label,
          modifiedAt: env.updatedAt,
        });
      }
    }
  }

  // Calculate average age
  const totalAge = envs.reduce((sum, env) => {
    const age = Math.floor(
      (now.getTime() - env.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    return sum + age;
  }, 0);
  const averageSecretAge =
    envs.length > 0 ? Math.floor(totalAge / envs.length) : 0;

  // Sort recent items
  recentlyAdded.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  recentlyModified.sort(
    (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
  );

  return {
    totalSecrets,
    totalEnvironments: envs.length,
    secretsByCategory,
    averageSecretAge,
    oldestSecret,
    recentlyAdded: recentlyAdded.slice(0, 10),
    recentlyModified: recentlyModified.slice(0, 10),
  };
}

/**
 * Categorize a secret based on key and value
 */
function categorizeSecret(key: string, value: string): string {
  const lowerKey = key.toLowerCase();

  if (
    lowerKey.includes("password") ||
    lowerKey.includes("secret") ||
    lowerKey.includes("key")
  ) {
    return "credentials";
  }

  if (
    lowerKey.includes("url") ||
    lowerKey.includes("host") ||
    lowerKey.includes("endpoint")
  ) {
    return "connection";
  }

  if (
    lowerKey.includes("token") ||
    lowerKey.includes("jwt") ||
    lowerKey.includes("auth")
  ) {
    return "authentication";
  }

  if (
    lowerKey.includes("api") ||
    lowerKey.includes("stripe") ||
    lowerKey.includes("aws")
  ) {
    return "api";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return "url";
  }

  if (/^\d+$/.test(value)) {
    return "numeric";
  }

  return "other";
}

/**
 * Generate security score
 */
export function calculateSecurityScore(metrics: SecurityMetrics): {
  score: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  recommendations: string[];
} {
  let score = 100;
  const recommendations: string[] = [];

  // Deduct for weak secrets
  const highSeverity = metrics.weakSecrets.filter(
    (s) => s.severity === "high",
  ).length;
  const mediumSeverity = metrics.weakSecrets.filter(
    (s) => s.severity === "medium",
  ).length;
  const lowSeverity = metrics.weakSecrets.filter(
    (s) => s.severity === "low",
  ).length;

  score -= highSeverity * 10;
  score -= mediumSeverity * 5;
  score -= lowSeverity * 2;

  if (highSeverity > 0) {
    recommendations.push(`Fix ${highSeverity} high-severity weak secrets`);
  }
  if (mediumSeverity > 0) {
    recommendations.push(`Review ${mediumSeverity} medium-severity secrets`);
  }

  // Deduct for duplicates
  const duplicateCount = metrics.duplicateValues.length;
  score -= duplicateCount * 5;

  if (duplicateCount > 0) {
    recommendations.push(`Consolidate ${duplicateCount} duplicate values`);
  }

  // Deduct for hardcoded URLs
  const urlCount = metrics.hardcodedUrls.length;
  score -= urlCount * 2;

  if (urlCount > 0) {
    recommendations.push(`Review ${urlCount} hardcoded URLs`);
  }

  // Deduct for potential secrets
  const secretCount = metrics.potentialSecrets.length;
  score -= secretCount * 3;

  if (secretCount > 0) {
    recommendations.push(`Verify ${secretCount} potential embedded secrets`);
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Calculate grade
  let grade: "A" | "B" | "C" | "D" | "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  return {
    score,
    maxScore: 100,
    grade,
    recommendations,
  };
}

/**
 * Generate security report
 */
export function generateSecurityReport(
  projectName: string,
  metrics: SecurityMetrics,
  score: ReturnType<typeof calculateSecurityScore>,
): string {
  const lines = [
    `# Security Report: ${projectName}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Security Score: ${score.score}/100 (${score.grade})`,
    ``,
    `## Recommendations`,
    ...score.recommendations.map((r) => `- ${r}`),
    ``,
    `## Weak Secrets (${metrics.weakSecrets.length})`,
    ...metrics.weakSecrets.map(
      (s) => `- **${s.key}** (${s.envLabel}): ${s.reason} [${s.severity}]`,
    ),
    ``,
    `## Duplicate Values (${metrics.duplicateValues.length})`,
    ...metrics.duplicateValues.map(
      (d) =>
        `- Value appears ${d.occurrences.length} times: ${d.occurrences.map((o) => `${o.key} (${o.envLabel})`).join(", ")}`,
    ),
    ``,
    `## Hardcoded URLs (${metrics.hardcodedUrls.length})`,
    ...metrics.hardcodedUrls.map(
      (u) => `- **${u.key}** (${u.envLabel}): ${u.url}`,
    ),
    ``,
    `## Potential Embedded Secrets (${metrics.potentialSecrets.length})`,
    ...metrics.potentialSecrets.map(
      (s) => `- **${s.key}** (${s.envLabel}): Possible ${s.pattern}`,
    ),
  ];

  return lines.join("\n");
}
