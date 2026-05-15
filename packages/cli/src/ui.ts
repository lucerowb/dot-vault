import chalk from "chalk";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { playLogoAnimation, printLogoStatic } from "./pretext-visual.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CLI_BIN = "dv";
export const CLI_NAMES = ["dv", "dot-vault", "dotvault"] as const;

export function getCliVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function printBanner(
  compact = false,
  animate = false,
): Promise<void> {
  if (compact) {
    console.log(
      chalk.cyan.bold("🛡️  DotVault") +
        chalk.gray(` · ${CLI_BIN} v${getCliVersion()}`),
    );
    return;
  }
  console.log();
  if (animate) {
    await playLogoAnimation(12);
    return;
  }
  printLogoStatic();
}

export function hint(text: string): void {
  console.log(chalk.gray(`  💡 ${text}`));
}

export function info(text: string): void {
  console.log(chalk.blue(`  ℹ ${text}`));
}

export function success(text: string): void {
  console.log(chalk.green(`  ✓ ${text}`));
}

const TIPS = [
  `Run \`${CLI_BIN}\` with no args for an interactive session (stays open).`,
  `Short alias: \`${CLI_BIN} pl production\` = pull, \`${CLI_BIN} ps\` = push.`,
  `Tab-friendly: type to filter when picking projects or env labels.`,
  `Set API once: \`${CLI_BIN} login --api-url https://your-server.com\`.`,
  `Check connection: \`${CLI_BIN} st\` (status).`,
  `List envs: \`${CLI_BIN} e realpha\` or \`${CLI_BIN} envs\`.`,
  `Pull to file: \`${CLI_BIN} pl production -p my-slug -o .env\`.`,
  `First time here? \`${CLI_BIN} init\` runs the setup wizard.`,
];

export function printRandomTip(): void {
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)]!;
  hint(tip);
}

export function printCheatsheet(): void {
  console.log(chalk.bold("\n  Quick reference"));
  console.log(chalk.gray(`  ${"─".repeat(40)}`));
  const rows: [string, string, string][] = [
    ["login", "li", "Sign in"],
    ["logout", "lo", "Sign out"],
    ["status", "st", "API URL + auth"],
    ["projects", "ls · p", "List projects"],
    ["envs", "e · env", "List env labels"],
    ["pull", "pl · get", "Download → file"],
    ["push", "ps · up", "Upload ← file"],
    ["delete", "rm", "Remove env"],
    ["init", "setup", "Wizard"],
    ["logo", "art", "ASCII animation"],
    ["shell", "i · sh", "Interactive session"],
    ["(no cmd)", "", "Same as shell"],
  ];
  for (const [cmd, alias, desc] of rows) {
    console.log(
      `  ${chalk.cyan(cmd.padEnd(10))} ${chalk.gray(alias.padEnd(12))} ${desc}`,
    );
  }
  console.log();
  hint(`Global install: npm i -g @lucerowb/dot-vault → use \`${CLI_BIN}\``);
  console.log();
}

export function printNextSteps(command: string): void {
  const steps: Record<string, string[]> = {
    login: [
      `${CLI_BIN} ls          # see projects`,
      `${CLI_BIN} e <slug>    # list env labels`,
      `${CLI_BIN} pl production -p <slug>`,
    ],
    pull: [`${CLI_BIN} ps .env -p <slug> -l staging  # push changes back`],
    push: [`${CLI_BIN} pl <label> -p <slug>       # pull anytime`],
    envs: [`${CLI_BIN} pl <label> -p <slug> -o .env`],
    projects: [`${CLI_BIN} e <slug>`, `${CLI_BIN} init`],
    init: [`${CLI_BIN} st`, `${CLI_BIN} pl production -p <slug>`],
  };
  const list = steps[command];
  if (!list?.length) return;
  console.log(chalk.bold.gray("\n  Try next:"));
  for (const line of list) {
    console.log(chalk.gray(`    ${line}`));
  }
  console.log();
}
