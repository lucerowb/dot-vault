import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

import { api } from "./api.js";
import type { EnvDiffResponse } from "./api.js";
import { getConfig } from "./config.js";
import {
  detectEnvFiles,
  readEnvFile,
  writeEnvFile,
} from "./utils.js";
import { resolveProjectForCommand } from "./resolve-project.js";
import {
  promptConfirm,
  promptEnvLabel,
  promptPassword,
} from "./prompts.js";
import { createSpinner } from "./spinner.js";
import { CLI_BIN, hint, info, success } from "./ui.js";
import { diffLocalContents, maskValue } from "./env-diff.js";
import { scanEnvContent, type ScanResult } from "./env-scan.js";
import { generateEnvExample } from "./env-example.js";
import { createQuickShare } from "./quick-share.js";

const TTL_MAP: Record<string, number> = {
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "8h": 28800,
  "24h": 86400,
  "7d": 604800,
};

interface Source {
  kind: "file" | "label";
  display: string;
  content?: string;
}

async function resolveSource(
  ref: string,
  projectId: string,
): Promise<Source> {
  const asPath = path.resolve(ref);
  if (await fs.pathExists(asPath)) {
    const content = await readEnvFile(asPath);
    return { kind: "file", display: ref, content };
  }
  const spinner = createSpinner(`Fetching "${ref}" from vault…`);
  try {
    const { content } = await api.getEnv(projectId, ref);
    spinner.stop();
    return { kind: "label", display: `"${ref}" (vault)`, content };
  } catch {
    spinner.stop();
    throw new Error(
      `"${ref}" is neither a local file nor a label in this project.`,
    );
  }
}

function printScanFindings(result: ScanResult): void {
  if (result.findings.length === 0) return;
  console.log(chalk.bold(`\n  Scan: ${result.totalVars} variable(s) checked\n`));
  for (const finding of result.findings) {
    const color =
      finding.severity === "high"
        ? chalk.red
        : finding.severity === "medium"
          ? chalk.yellow
          : chalk.gray;
    console.log(
      `  ${color(finding.severity.toUpperCase().padEnd(6))} ${chalk.white(finding.key)} — ${finding.issue}`,
    );
  }
  console.log();
}

/** Scan before upload; returns true when it's OK to continue. */
export async function confirmPushAfterScan(
  content: string,
  sourceName: string,
  force = false,
): Promise<boolean> {
  const result = scanEnvContent(content);
  if (result.findings.length === 0) return true;

  info(`${sourceName}: ${result.findings.length} finding(s) from the local scan`);
  printScanFindings(result);

  if (force) return true;
  return promptConfirm("Upload anyway?", false);
}

export async function runDiffCommand(
  a: string | undefined,
  b: string | undefined,
  options: { project?: string },
): Promise<void> {
  const projectId = await resolveProjectForCommand(options.project, "diff");

  const left = a;
  let right = b;
  if (!left || !right) {
    const envs = await api.listEnvs(projectId);
    if (envs.length < 2) {
      throw new Error("Need at least two environments to diff.");
    }
    if (!left) {
      throw new Error(
        `Usage: ${CLI_BIN} diff <a> <b>   (each is a file path or a vault label)`,
      );
    }
    right =
      envs.map((e) => e.label).find((label) => label !== left) ?? undefined;
    if (!right) throw new Error("Need a second environment to diff.");
    info(`Comparing against "${right}"`);
  }

  const leftIsFile = await fs.pathExists(path.resolve(left));
  const rightIsFile = await fs.pathExists(path.resolve(right));

  // Label vs label → single masked API call.
  if (!leftIsFile && !rightIsFile) {
    const spinner = createSpinner("Comparing in vault…");
    try {
      const diff = await api.getEnvDiff(projectId, left, right);
      spinner.stop();
      printServerDiff(diff);
    } catch (error) {
      spinner.stop();
      throw error;
    }
    return;
  }

  // File involved → pull contents and diff locally.
  const leftSource = await resolveSource(left, projectId);
  const rightSource = await resolveSource(right, projectId);
  printLocalDiff(leftSource.display, rightSource.display, leftSource.content!, rightSource.content!);
}

function diffHeader(fromDisplay: string, toDisplay: string): void {
  console.log(
    `\n  ${chalk.gray("Comparing")} ${chalk.cyan(fromDisplay)} ${chalk.gray("→")} ${chalk.cyan(toDisplay)}\n` +
      chalk.gray(`  ${"─".repeat(56)}`),
  );
}

function diffFooter(changeCount: number, unchangedCount: number): void {
  console.log(chalk.gray(`  ${"─".repeat(56)}`));
  if (changeCount === 0) {
    success("Identical — no differences.");
  } else {
    console.log(
      `  ${chalk.bold(String(changeCount))} change(s), ` +
        chalk.gray(`${unchangedCount} unchanged`),
    );
  }
  console.log();
  hint("Values are masked; pull either side to inspect full values.");
}

export function printServerDiff(diff: EnvDiffResponse): void {
  diffHeader(diff.from.label, diff.to.label);

  for (const entry of diff.added) {
    console.log(
      `  ${chalk.green("+ added  ")}`,
      entry.key.padEnd(32),
      chalk.gray(String(entry.value ?? "")),
    );
  }
  for (const entry of diff.removed) {
    console.log(
      `  ${chalk.red("- removed")}`,
      entry.key.padEnd(32),
      chalk.gray(String(entry.value ?? "")),
    );
  }
  for (const entry of diff.changed) {
    console.log(
      `  ${chalk.yellow("~ changed")}`,
      entry.key.padEnd(32),
      chalk.gray(`${entry.from} → ${entry.to}`),
    );
  }

  diffFooter(diff.changeCount, diff.unchangedCount);
}

export function printLocalDiff(
  fromDisplay: string,
  toDisplay: string,
  fromContent: string,
  toContent: string,
): void {
  diffHeader(fromDisplay, toDisplay);
  const diff = diffLocalContents(fromContent, toContent);
  const changeCount = diff.added.length + diff.removed.length + diff.changed.length;

  for (const entry of diff.added) {
    console.log(
      `  ${chalk.green("+ added  ")}`,
      entry.key.padEnd(32),
      chalk.gray(maskValue(entry.to ?? "")),
    );
  }
  for (const entry of diff.removed) {
    console.log(
      `  ${chalk.red("- removed")}`,
      entry.key.padEnd(32),
      chalk.gray(maskValue(entry.from ?? "")),
    );
  }
  for (const entry of diff.changed) {
    console.log(
      `  ${chalk.yellow("~ changed")}`,
      entry.key.padEnd(32),
      chalk.gray(`${maskValue(entry.from ?? "")} → ${maskValue(entry.to ?? "")}`),
    );
  }

  diffFooter(changeCount, diff.unchangedCount);
}

export async function runScanCommand(
  file: string | undefined,
  options: { json?: boolean },
): Promise<void> {
  const target = file ?? ".env";
  if (!(await fs.pathExists(path.resolve(target)))) {
    const detected = detectEnvFiles();
    throw new Error(
      `File not found: ${target}. Found: ${detected.join(", ") || "none"}.`,
    );
  }

  const content = await readEnvFile(target);
  const result = scanEnvContent(content);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.findings.length === 0) {
      success(`No issues found in ${target} (${result.totalVars} variables).`);
    } else {
      printScanFindings(result);
      const high = result.findings.filter((f) => f.severity === "high").length;
      if (high > 0) {
        console.log(
          chalk.red(`  ${high} high-severity finding(s) need attention.\n`),
        );
      }
    }
  }

  process.exitCode = result.findings.some((f) => f.severity === "high")
    ? 1
    : 0;
}

export async function runShareCommand(
  ref: string | undefined,
  options: {
    project?: string;
    ttl?: string;
    oneTime?: boolean;
    passphrase?: boolean;
    force?: boolean;
  },
): Promise<void> {
  const ttlSeconds = TTL_MAP[options.ttl ?? "1h"];
  if (!ttlSeconds) {
    throw new Error(
      `Invalid --ttl "${options.ttl}". Choose one of: ${Object.keys(TTL_MAP).join(", ")}`,
    );
  }

  let content: string;
  let sourceName: string;

  const refIsFile = ref ? await fs.pathExists(path.resolve(ref)) : false;

  if (!ref && !options.project) {
    throw new Error(
      `Provide a file or vault label, e.g. ${CLI_BIN} share .env or ${CLI_BIN} share production -p <slug>`,
    );
  }

  if (refIsFile) {
    content = await readEnvFile(ref!);
    sourceName = ref!;
  } else {
    const projectId = await resolveProjectForCommand(options.project, "share");
    const label = ref ?? (await promptEnvLabel(projectId, "share"));
    const spinner = createSpinner(`Fetching "${label}"…`);
    const { content: vaultContent } = await api.getEnv(projectId, label);
    spinner.stop();
    content = vaultContent;
    sourceName = `"${label}"`;
  }

  // Safety net: scan before sharing.
  const scan = scanEnvContent(content);
  if (scan.findings.length > 0 && !options.force) {
    info(`Scanned ${sourceName} before sharing:`);
    printScanFindings(scan);
    const ok = await promptConfirm("Share anyway?", false);
    if (!ok) {
      info("Cancelled — nothing was uploaded.");
      return;
    }
  }

  let passphrase: string | undefined;
  if (options.passphrase) {
    passphrase = await promptPassword();
    const confirmPass = await promptConfirm("Require recipients to type it? Confirm", true);
    if (!confirmPass) passphrase = await promptPassword();
  }

  const config = await getConfig();
  const spinner = createSpinner("Encrypting and uploading…");
  try {
    const result = await createQuickShare({
      content,
      ttlSeconds,
      oneTime: Boolean(options.oneTime),
      passphrase,
      apiUrl: config.apiUrl,
    });
    spinner.succeed("Encrypted share created (key never left this machine)");

    const expiry = result.expiresAt
      ? new Date(result.expiresAt * 1000).toLocaleString()
      : "unknown";
    console.log();
    console.log(chalk.bold("  Share link:"));
    console.log(chalk.cyanBright(`  ${result.url}\n`));
    console.log(chalk.gray(`  Expires: ${expiry}`));
    if (options.oneTime) console.log(chalk.gray("  One-time link — first open burns it."));
    if (passphrase) console.log(chalk.gray("  Recipients must enter your passphrase."));
    console.log(
      chalk.gray(
        `  Revoke early:\n  curl -X DELETE -H "X-Delete-Token: ${result.deleteToken}" ${config.apiUrl}/api/vault/${result.token}`,
      ),
    );
    console.log();
  } catch (error) {
    spinner.fail("Share failed");
    throw error;
  }
}

export async function runExampleCommand(
  file: string | undefined,
  options: { output?: string; force?: boolean },
): Promise<void> {
  const target = file ?? ".env";
  const outputPath = path.resolve(options.output ?? ".env.example");

  if (!(await fs.pathExists(path.resolve(target)))) {
    throw new Error(`File not found: ${target}`);
  }

  const content = await readEnvFile(target);
  const example = generateEnvExample(content);

  if ((await fs.pathExists(outputPath)) && !options.force) {
    const ok = await promptConfirm(
      `${path.basename(outputPath)} exists — overwrite?`,
      false,
    );
    if (!ok) {
      info("Cancelled.");
      return;
    }
  }

  await writeEnvFile(outputPath, example);
  success(`Wrote ${path.basename(outputPath)}`);
  hint("Values replaced with placeholders — review before committing.");
}
