import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export function formatEnvContent(content: string): string {
  const lines = content.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      formatted.push(line);
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      formatted.push(line);
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    formatted.push(`${key}=${value}`);
  }

  return formatted.join("\n");
}

export function maskSecrets(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex === -1) return line;

      const key = trimmed.slice(0, equalIndex).trim();
      const value = trimmed.slice(equalIndex + 1).trim();

      // Mask the value but show first/last 4 chars if long enough
      if (value.length > 12) {
        const masked =
          value.slice(0, 4) + "•".repeat(value.length - 8) + value.slice(-4);
        return `${key}=${masked}`;
      } else if (value.length > 4) {
        return `${key}=${value.slice(0, 2)}${"•".repeat(value.length - 4)}${value.slice(-2)}`;
      } else {
        return `${key}=${"•".repeat(value.length)}`;
      }
    })
    .join("\n");
}

export async function readEnvFile(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);

  if (!(await fs.pathExists(resolved))) {
    throw new Error(`File not found: ${resolved}`);
  }

  const content = await fs.readFile(resolved, "utf-8");
  return formatEnvContent(content);
}

export async function writeEnvFile(
  filePath: string,
  content: string,
): Promise<void> {
  const resolved = path.resolve(filePath);
  await fs.ensureDir(path.dirname(resolved));
  await fs.writeFile(resolved, content, "utf-8");
}

export function printEnvTable(
  envs: { label: string; updatedAt: string }[],
): void {
  console.log(chalk.bold("\nEnvironment Files:"));
  console.log(chalk.gray("─".repeat(50)));

  for (const env of envs) {
    const date = new Date(env.updatedAt).toLocaleDateString();
    console.log(`  ${chalk.cyan(env.label.padEnd(20))} ${chalk.gray(date)}`);
  }

  console.log(chalk.gray("─".repeat(50)));
  console.log(chalk.gray(`Total: ${envs.length} environment(s)\n`));
}

export function printProjectTable(
  projects: { name: string; slug: string; createdAt: string }[],
): void {
  console.log(chalk.bold("\nProjects:"));
  console.log(chalk.gray("─".repeat(60)));

  for (const project of projects) {
    const date = new Date(project.createdAt).toLocaleDateString();
    console.log(
      `  ${chalk.green(project.name.padEnd(25))} ${chalk.cyan(project.slug.padEnd(15))} ${chalk.gray(date)}`,
    );
  }

  console.log(chalk.gray("─".repeat(60)));
  console.log(chalk.gray(`Total: ${projects.length} project(s)\n`));
}

export function detectEnvFiles(): string[] {
  const candidates = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
  ];
  const found: string[] = [];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      found.push(file);
    }
  }

  return found;
}

export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

export function mergeEnvContent(
  existing: string,
  incoming: string,
  options: { overwrite?: boolean } = {},
): string {
  const existingVars = parseEnvContent(existing);
  const incomingVars = parseEnvContent(incoming);

  const merged = { ...existingVars };

  for (const [key, value] of Object.entries(incomingVars)) {
    if (options.overwrite || !merged[key]) {
      merged[key] = value;
    }
  }

  // Preserve comments and structure from existing
  const lines = existing.split("\n");
  const result: string[] = [];
  const handledKeys = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    // Keep comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      result.push(line);
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      result.push(line);
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    if (merged[key] !== undefined) {
      result.push(`${key}=${merged[key]}`);
      handledKeys.add(key);
    }
  }

  // Add any new keys
  for (const [key, value] of Object.entries(merged)) {
    if (!handledKeys.has(key)) {
      result.push(`${key}=${value}`);
    }
  }

  return result.join("\n");
}
