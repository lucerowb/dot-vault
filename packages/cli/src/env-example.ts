// .env.example generation — keeps structure and comments,
// replaces every value with a safe placeholder.

interface ExampleLine {
  type: "blank" | "comment" | "pair";
  raw: string;
  key?: string;
}

function classify(content: string): ExampleLine[] {
  return content.split("\n").map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return { type: "blank" as const, raw };
    if (trimmed.startsWith("#")) return { type: "comment" as const, raw };

    const eq = trimmed.indexOf("=");
    if (eq === -1) return { type: "comment" as const, raw };
    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/i, "");
    if (!key) return { type: "comment" as const, raw };
    return { type: "pair" as const, raw, key };
  });
}

function placeholderFor(key: string, rawValue: string): string {
  const value = rawValue.trim();
  if (value === "") return "";

  if (/^https?:\/\//i.test(value)) {
    return "https://example.com";
  }
  if (/^\d+$/.test(value)) {
    return "1234";
  }
  if (value.startsWith("postgres://") || value.startsWith("mysql://")) {
    return "postgres://user:password@localhost:5432/db";
  }
  return `your_${key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_here`;
}

/**
 * Generate .env.example content from real env content.
 * Comments and blank lines are preserved; keys keep their order.
 */
export function generateEnvExample(content: string): string {
  const lines = classify(content);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.type !== "pair") {
      out.push(line.raw);
      continue;
    }
    if (seen.has(line.key!)) continue;
    seen.add(line.key!);

    const eqIndex = line.raw.indexOf("=");
    // Preserve leading whitespace of the original line
    const indent = line.raw.slice(0, line.raw.length - line.raw.trimStart().length);
    const rawValue = line.raw.slice(eqIndex + 1);
    out.push(`${indent}${line.key}=${placeholderFor(line.key!, rawValue)}`);
  }

  return out.join("\n");
}
