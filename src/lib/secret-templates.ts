// Secret templates for common services
// Provides validation and structure for known secret types

export interface SecretTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "cloud"
    | "payment"
    | "communication"
    | "database"
    | "auth"
    | "other";
  icon: string;
  variables: Array<{
    key: string;
    label: string;
    description?: string;
    required: boolean;
    type: "string" | "url" | "email" | "json";
    pattern?: RegExp;
    placeholder?: string;
    validationMessage?: string;
  }>;
  documentationUrl?: string;
}

export const SECRET_TEMPLATES: SecretTemplate[] = [
  // AWS
  {
    id: "aws-credentials",
    name: "AWS Credentials",
    description: "AWS Access Key ID and Secret Access Key",
    category: "cloud",
    icon: "☁️",
    documentationUrl:
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    variables: [
      {
        key: "AWS_ACCESS_KEY_ID",
        label: "Access Key ID",
        description: "Your AWS Access Key ID (starts with AKIA)",
        required: true,
        type: "string",
        pattern: /^AKIA[0-9A-Z]{16}$/,
        placeholder: "AKIAIOSFODNN7EXAMPLE",
        validationMessage:
          "Must be a valid AWS Access Key ID (starts with AKIA, 20 characters)",
      },
      {
        key: "AWS_SECRET_ACCESS_KEY",
        label: "Secret Access Key",
        description: "Your AWS Secret Access Key",
        required: true,
        type: "string",
        pattern: /^[a-zA-Z0-9/+=]{40}$/,
        placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        validationMessage: "Must be 40 characters (alphanumeric, /, +, =)",
      },
      {
        key: "AWS_REGION",
        label: "Region",
        description: "AWS Region (optional)",
        required: false,
        type: "string",
        pattern: /^[a-z]{2}-[a-z]+-[0-9]$/,
        placeholder: "us-east-1",
        validationMessage: "Must be a valid AWS region format",
      },
    ],
  },

  // Stripe
  {
    id: "stripe-api",
    name: "Stripe API",
    description: "Stripe API keys for payment processing",
    category: "payment",
    icon: "💳",
    documentationUrl: "https://stripe.com/docs/keys",
    variables: [
      {
        key: "STRIPE_PUBLISHABLE_KEY",
        label: "Publishable Key",
        description: "Your Stripe publishable key (safe for frontend)",
        required: true,
        type: "string",
        pattern: /^pk_(test|live)_[a-zA-Z0-9]{24,}$/,
        placeholder: "pk_test_TYooMQauvdEDq54NiTphI7jx",
        validationMessage: "Must start with pk_test_ or pk_live_",
      },
      {
        key: "STRIPE_SECRET_KEY",
        label: "Secret Key",
        description: "Your Stripe secret key (keep secure!)",
        required: true,
        type: "string",
        pattern: /^sk_(test|live)_[a-zA-Z0-9]{24,}$/,
        placeholder: "sk_test_4eC39HqLyjWDarjtT1zdp7dc",
        validationMessage: "Must start with sk_test_ or sk_live_",
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Webhook Secret",
        description: "Stripe webhook endpoint secret",
        required: false,
        type: "string",
        pattern: /^whsec_[a-zA-Z0-9]{24,}$/,
        placeholder: "whsec_...",
        validationMessage: "Must start with whsec_",
      },
    ],
  },

  // Twilio
  {
    id: "twilio-api",
    name: "Twilio API",
    description: "Twilio credentials for SMS and voice",
    category: "communication",
    icon: "📞",
    documentationUrl: "https://www.twilio.com/docs/usage/requests-to-twilio",
    variables: [
      {
        key: "TWILIO_ACCOUNT_SID",
        label: "Account SID",
        description: "Your Twilio Account SID",
        required: true,
        type: "string",
        pattern: /^AC[a-f0-9]{32}$/,
        placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        validationMessage: "Must start with AC followed by 32 hex characters",
      },
      {
        key: "TWILIO_AUTH_TOKEN",
        label: "Auth Token",
        description: "Your Twilio Auth Token",
        required: true,
        type: "string",
        pattern: /^[a-f0-9]{32}$/,
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        validationMessage: "Must be 32 hex characters",
      },
      {
        key: "TWILIO_PHONE_NUMBER",
        label: "Phone Number",
        description: "Your Twilio phone number",
        required: false,
        type: "string",
        pattern: /^\+[1-9]\d{1,14}$/,
        placeholder: "+1234567890",
        validationMessage: "Must be a valid E.164 phone number",
      },
    ],
  },

  // SendGrid
  {
    id: "sendgrid-api",
    name: "SendGrid API",
    description: "SendGrid API key for email delivery",
    category: "communication",
    icon: "📧",
    documentationUrl:
      "https://docs.sendgrid.com/ui/account-and-settings/api-keys",
    variables: [
      {
        key: "SENDGRID_API_KEY",
        label: "API Key",
        description: "Your SendGrid API key",
        required: true,
        type: "string",
        pattern: /^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$/,
        placeholder: "SG.xxxxx.xxxxx",
        validationMessage: "Must be a valid SendGrid API key format",
      },
      {
        key: "SENDGRID_FROM_EMAIL",
        label: "From Email",
        description: "Default from email address",
        required: false,
        type: "email",
        placeholder: "noreply@example.com",
      },
    ],
  },

  // Slack
  {
    id: "slack-bot",
    name: "Slack Bot",
    description: "Slack Bot Token for API access",
    category: "communication",
    icon: "💬",
    documentationUrl: "https://api.slack.com/authentication/token-types",
    variables: [
      {
        key: "SLACK_BOT_TOKEN",
        label: "Bot Token",
        description: "Your Slack Bot User OAuth Token",
        required: true,
        type: "string",
        pattern: /^xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}$/,
        placeholder: "xoxb-...",
        validationMessage:
          "Must be a valid Slack bot token (starts with xoxb-)",
      },
      {
        key: "SLACK_SIGNING_SECRET",
        label: "Signing Secret",
        description: "Slack app signing secret for verifying requests",
        required: false,
        type: "string",
        pattern: /^[a-f0-9]{32}$/,
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        validationMessage: "Must be 32 hex characters",
      },
      {
        key: "SLACK_CHANNEL_ID",
        label: "Channel ID",
        description: "Default channel ID",
        required: false,
        type: "string",
        pattern: /^[C|D|G][A-Z0-9]{8,}$/,
        placeholder: "C1234567890",
        validationMessage: "Must be a valid Slack channel ID",
      },
    ],
  },

  // GitHub
  {
    id: "github-token",
    name: "GitHub Token",
    description: "GitHub Personal Access Token",
    category: "auth",
    icon: "🐙",
    documentationUrl:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
    variables: [
      {
        key: "GITHUB_TOKEN",
        label: "Personal Access Token",
        description: "GitHub Personal Access Token",
        required: true,
        type: "string",
        pattern: /^ghp_[a-zA-Z0-9]{36}$/,
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        validationMessage: "Must be a valid GitHub PAT (starts with ghp_)",
      },
      {
        key: "GITHUB_USERNAME",
        label: "Username",
        description: "GitHub username (optional)",
        required: false,
        type: "string",
        placeholder: "octocat",
      },
    ],
  },

  // Database URLs
  {
    id: "database-url",
    name: "Database Connection",
    description: "Database connection string",
    category: "database",
    icon: "🗄️",
    documentationUrl:
      "https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING",
    variables: [
      {
        key: "DATABASE_URL",
        label: "Database URL",
        description: "Full database connection URL",
        required: true,
        type: "url",
        pattern: /^(postgres|postgresql|mysql|mongodb|redis):\/\//,
        placeholder: "postgres://user:pass@host:5432/dbname",
        validationMessage: "Must be a valid database URL",
      },
      {
        key: "DATABASE_SSL",
        label: "SSL Mode",
        description: "SSL mode (optional)",
        required: false,
        type: "string",
        pattern: /^(require|prefer|disable|allow|verify-full)$/,
        placeholder: "require",
        validationMessage: "Must be a valid SSL mode",
      },
    ],
  },

  // JWT
  {
    id: "jwt-secret",
    name: "JWT Secret",
    description: "JWT signing secret",
    category: "auth",
    icon: "🔑",
    documentationUrl: "https://jwt.io/introduction",
    variables: [
      {
        key: "JWT_SECRET",
        label: "JWT Secret",
        description: "Secret key for signing JWTs",
        required: true,
        type: "string",
        pattern: /^.{32,}$/,
        placeholder: "your-super-secret-jwt-signing-key-min-32-chars",
        validationMessage: "Must be at least 32 characters for security",
      },
      {
        key: "JWT_EXPIRES_IN",
        label: "Expiration",
        description: "Token expiration time",
        required: false,
        type: "string",
        pattern: /^\d+[smhd]$/,
        placeholder: "24h",
        validationMessage: "Format: number + s/m/h/d (e.g., 24h, 7d)",
      },
    ],
  },

  // OpenAI
  {
    id: "openai-api",
    name: "OpenAI API",
    description: "OpenAI API key for GPT and other models",
    category: "other",
    icon: "🤖",
    documentationUrl:
      "https://platform.openai.com/docs/api-reference/authentication",
    variables: [
      {
        key: "OPENAI_API_KEY",
        label: "API Key",
        description: "Your OpenAI API key",
        required: true,
        type: "string",
        pattern: /^sk-[a-zA-Z0-9]{48}$/,
        placeholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        validationMessage: "Must start with sk- followed by 48 characters",
      },
      {
        key: "OPENAI_ORG_ID",
        label: "Organization ID",
        description: "OpenAI Organization ID (optional)",
        required: false,
        type: "string",
        pattern: /^org-[a-zA-Z0-9]{24}$/,
        placeholder: "org-xxxxxxxxxxxxxxxxxxxxxxxx",
        validationMessage: "Must start with org-",
      },
    ],
  },

  // Firebase
  {
    id: "firebase-config",
    name: "Firebase Config",
    description: "Firebase service account configuration",
    category: "cloud",
    icon: "🔥",
    documentationUrl: "https://firebase.google.com/docs/admin/setup",
    variables: [
      {
        key: "FIREBASE_PROJECT_ID",
        label: "Project ID",
        description: "Firebase Project ID",
        required: true,
        type: "string",
        placeholder: "my-project-12345",
      },
      {
        key: "FIREBASE_PRIVATE_KEY",
        label: "Private Key",
        description: "Firebase service account private key",
        required: true,
        type: "string",
        pattern: /^-----BEGIN PRIVATE KEY-----/,
        placeholder: "-----BEGIN PRIVATE KEY-----...",
        validationMessage: "Must be a valid PEM private key",
      },
      {
        key: "FIREBASE_CLIENT_EMAIL",
        label: "Client Email",
        description: "Firebase service account email",
        required: true,
        type: "email",
        pattern:
          /^firebase-adminsdk-[a-z0-9]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/,
        placeholder: "firebase-adminsdk-xxx@project.iam.gserviceaccount.com",
        validationMessage: "Must be a valid Firebase service account email",
      },
    ],
  },

  // Supabase
  {
    id: "supabase-api",
    name: "Supabase",
    description: "Supabase project credentials",
    category: "database",
    icon: "⚡",
    documentationUrl: "https://supabase.com/docs/guides/api",
    variables: [
      {
        key: "SUPABASE_URL",
        label: "Project URL",
        description: "Your Supabase project URL",
        required: true,
        type: "url",
        pattern: /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
        placeholder: "https://xxxxxx.supabase.co",
        validationMessage: "Must be a valid Supabase URL",
      },
      {
        key: "SUPABASE_ANON_KEY",
        label: "Anon Key",
        description: "Supabase anon/public key (safe for frontend)",
        required: true,
        type: "string",
        pattern: /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/,
        placeholder: "eyJ...",
        validationMessage: "Must be a valid JWT format",
      },
      {
        key: "SUPABASE_SERVICE_ROLE_KEY",
        label: "Service Role Key",
        description: "Supabase service role key (keep secure!)",
        required: false,
        type: "string",
        pattern: /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/,
        placeholder: "eyJ...",
        validationMessage: "Must be a valid JWT format",
      },
    ],
  },

  // Redis
  {
    id: "redis-connection",
    name: "Redis",
    description: "Redis connection configuration",
    category: "database",
    icon: "🔴",
    documentationUrl: "https://redis.io/docs/clients/nodejs/",
    variables: [
      {
        key: "REDIS_URL",
        label: "Redis URL",
        description: "Redis connection URL",
        required: true,
        type: "url",
        pattern: /^redis(s?):\/\//,
        placeholder: "redis://localhost:6379",
        validationMessage: "Must be a valid Redis URL",
      },
      {
        key: "REDIS_PASSWORD",
        label: "Password",
        description: "Redis password (if required)",
        required: false,
        type: "string",
        placeholder: "your-redis-password",
      },
    ],
  },

  // Sentry
  {
    id: "sentry-dsn",
    name: "Sentry",
    description: "Sentry error tracking DSN",
    category: "other",
    icon: "🐛",
    documentationUrl:
      "https://docs.sentry.io/product/sentry-basics/dsn-explainer/",
    variables: [
      {
        key: "SENTRY_DSN",
        label: "DSN",
        description: "Sentry Data Source Name",
        required: true,
        type: "url",
        pattern: /^https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\.[a-z]{2,}\/\d+$/,
        placeholder: "https://xxx@xxx.ingest.sentry.io/1234567",
        validationMessage: "Must be a valid Sentry DSN",
      },
      {
        key: "SENTRY_ENVIRONMENT",
        label: "Environment",
        description: "Sentry environment tag",
        required: false,
        type: "string",
        placeholder: "production",
      },
    ],
  },
];

/**
 * Get a template by ID
 */
export function getTemplate(id: string): SecretTemplate | undefined {
  return SECRET_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all templates
 */
export function getAllTemplates(): SecretTemplate[] {
  return SECRET_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: SecretTemplate["category"],
): SecretTemplate[] {
  return SECRET_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Validate a value against a template variable
 */
export function validateTemplateValue(
  templateId: string,
  variableKey: string,
  value: string,
): { valid: boolean; error?: string } {
  const template = getTemplate(templateId);
  if (!template) {
    return { valid: false, error: "Template not found" };
  }

  const variable = template.variables.find((v) => v.key === variableKey);
  if (!variable) {
    return { valid: false, error: "Variable not found in template" };
  }

  if (variable.required && (!value || value.trim().length === 0)) {
    return { valid: false, error: `${variable.label} is required` };
  }

  if (!variable.required && (!value || value.trim().length === 0)) {
    return { valid: true };
  }

  if (variable.pattern && !variable.pattern.test(value)) {
    return {
      valid: false,
      error: variable.validationMessage || `Invalid ${variable.label} format`,
    };
  }

  // Type-specific validation
  switch (variable.type) {
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { valid: false, error: "Must be a valid email address" };
      }
      break;
    case "url":
      try {
        new URL(value);
      } catch {
        return { valid: false, error: "Must be a valid URL" };
      }
      break;
    case "json":
      try {
        JSON.parse(value);
      } catch {
        return { valid: false, error: "Must be valid JSON" };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validate all values against a template
 */
export function validateTemplateValues(
  templateId: string,
  values: Record<string, string>,
): {
  valid: boolean;
  errors: Array<{ key: string; error: string }>;
  missing: string[];
} {
  const template = getTemplate(templateId);
  if (!template) {
    return {
      valid: false,
      errors: [{ key: "_template", error: "Template not found" }],
      missing: [],
    };
  }

  const errors: Array<{ key: string; error: string }> = [];
  const missing: string[] = [];

  for (const variable of template.variables) {
    const value = values[variable.key];

    if (variable.required && (!value || value.trim().length === 0)) {
      missing.push(variable.key);
      continue;
    }

    const validation = validateTemplateValue(
      templateId,
      variable.key,
      value || "",
    );
    if (!validation.valid) {
      errors.push({ key: variable.key, error: validation.error! });
    }
  }

  return {
    valid: errors.length === 0 && missing.length === 0,
    errors,
    missing,
  };
}

/**
 * Generate .env content from template values
 */
export function generateEnvFromTemplate(
  templateId: string,
  values: Record<string, string>,
): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error("Template not found");
  }

  const lines: string[] = [
    `# ${template.name}`,
    `# ${template.description}`,
    template.documentationUrl ? `# Docs: ${template.documentationUrl}` : "",
    "",
  ];

  for (const variable of template.variables) {
    const value = values[variable.key];
    if (value) {
      if (variable.description) {
        lines.push(`# ${variable.description}`);
      }
      lines.push(`${variable.key}=${value}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Detect which template matches a set of keys
 */
export function detectTemplateFromKeys(
  keys: string[],
): SecretTemplate | undefined {
  for (const template of SECRET_TEMPLATES) {
    const templateKeys = template.variables.map((v) => v.key);
    const matchingKeys = keys.filter((k) =>
      templateKeys.some((tk) => tk.toLowerCase() === k.toLowerCase()),
    );

    // If more than 50% of template keys are present, consider it a match
    if (matchingKeys.length / templateKeys.length >= 0.5) {
      return template;
    }
  }

  return undefined;
}
