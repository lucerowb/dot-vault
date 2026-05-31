#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { createSpinner } from "./spinner.js";
import { playLogoAnimation } from "./pretext-visual.js";
import fs from "fs-extra";
import path from "path";
import { api } from "./api.js";
import {
  getConfig,
  resolveDefaultApiUrl,
  saveConfig,
  clearConfig,
  requireAuth,
} from "./config.js";
import {
  readEnvFile,
  writeEnvFile,
  printEnvTable,
  printProjectTable,
  detectEnvFiles,
  maskSecrets,
  mergeEnvContent,
} from "./utils.js";
import { resolveProjectForCommand } from "./resolve-project.js";
import {
  promptApiUrl,
  promptConfirm,
  promptEmail,
  promptEnvFile,
  promptEnvLabel,
  promptOverwriteAction,
  promptPassword,
} from "./prompts.js";
import {
  CLI_BIN,
  getCliVersion,
  hint,
  info,
  printBanner,
  printCheatsheet,
  printNextSteps,
  printRandomTip,
  success,
} from "./ui.js";
import { runInteractiveSession } from "./session.js";
import { runInitWizard } from "./wizard.js";
import { printCompletionScript } from "./completion.js";

function handleError(error: unknown): never {
  console.error(
    chalk.red("\n  ✗"),
    error instanceof Error ? error.message : error,
  );
  hint(`Run \`${CLI_BIN} help\` or just \`${CLI_BIN}\` for the menu.`);
  console.log();
  process.exit(1);
}

function registerProgram(): void {
  program
    .name(CLI_BIN)
    .description(
      "DotVault CLI — sync .env secrets with your encrypted cloud vault",
    )
    .version(getCliVersion())
    .addHelpText(
      "before",
      chalk.gray(
        `\n  Tip: run \`${CLI_BIN}\` with no arguments for the interactive menu.\n`,
      ),
    )
    .addHelpText("after", () => {
      printCheatsheet();
      return "";
    });

  program
    .command("login")
    .aliases(["li", "signin"])
    .description("Sign in to DotVault")
    .option("-e, --email <email>", "Email")
    .option("-p, --password <password>", "Password")
    .option("--api-url <url>", "Server URL (saved to ~/.dotvault/config.json)")
    .action(async (options) => {
      try {
        await printBanner(true);
        const cfg = await getConfig();

        if (options.apiUrl) {
          await saveConfig({
            apiUrl: options.apiUrl.trim().replace(/\/$/, ""),
          });
        } else if (!cfg.apiToken) {
          const url = await promptApiUrl(cfg.apiUrl || resolveDefaultApiUrl());
          await saveConfig({ apiUrl: url });
        } else {
          await saveConfig({ apiUrl: cfg.apiUrl });
        }

        const email = options.email ?? (await promptEmail());
        const pass = options.password ?? (await promptPassword());

        const spinner = createSpinner("Signing you in…");
        try {
          const { token } = await api.login(email, pass);
          await saveConfig({ apiToken: token });
          spinner.stop();
          success("You're in!");
          printNextSteps("login");
          printRandomTip();
        } catch (error) {
          spinner.fail(chalk.red("Sign-in failed"));
          handleError(error);
        }
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("logout")
    .aliases(["lo", "signout"])
    .description("Sign out and clear saved token")
    .action(async () => {
      await clearConfig();
      success("Signed out. Run `dv login` when you're back.");
      console.log();
    });

  program
    .command("status")
    .aliases(["st", "whoami"])
    .description("Show server URL and auth status")
    .action(async () => {
      await printBanner(true);
      const config = await getConfig();
      console.log(chalk.bold("  Configuration"));
      console.log(chalk.gray("  " + "─".repeat(36)));
      console.log(`  Server   ${chalk.cyan(config.apiUrl)}`);
      console.log(
        `  Auth     ${config.apiToken ? chalk.green("signed in") : chalk.yellow("not signed in")}`,
      );

      if (config.apiToken) {
        const spinner = createSpinner("Checking session…");
        try {
          await api.getToken();
          spinner.succeed(chalk.green("  Session is valid"));
        } catch {
          spinner.fail(chalk.red("  Session expired"));
          hint(`Run \`${CLI_BIN} login\` to refresh.`);
        }
      } else {
        hint(`Run \`${CLI_BIN} login --api-url <your-server>\``);
      }
      console.log();
      printRandomTip();
    });

  program
    .command("projects")
    .aliases(["ls", "p", "list-projects"])
    .description("List your projects")
    .action(async () => {
      try {
        await requireAuth();
        const spinner = createSpinner("Fetching projects…");
        const projects = await api.listProjects();
        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("\n  No projects yet."));
          console.log(chalk.gray(`  → ${resolveDefaultApiUrl()}/dashboard\n`));
          return;
        }

        printProjectTable(projects);
        hint(
          `List envs: \`${CLI_BIN} e <slug>\`  ·  Pull: \`${CLI_BIN} pl production -p <slug>\``,
        );
        printNextSteps("projects");
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("envs [project]")
    .aliases(["e", "env", "list"])
    .description("List environment labels in a project")
    .action(async (projectSlug) => {
      try {
        await requireAuth();
        const projectId = await resolveProjectForCommand(projectSlug, "envs");
        const spinner = createSpinner("Loading environments…");
        const envs = await api.listEnvs(projectId);
        spinner.stop();

        if (envs.length === 0) {
          console.log(chalk.yellow("\n  No environments yet."));
          hint(`Push one: \`${CLI_BIN} ps .env -p <slug>\``);
          console.log();
          return;
        }

        printEnvTable(envs);
        printNextSteps("envs");
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("pull [label]")
    .aliases(["pl", "get", "down"])
    .description("Download an environment to a local file")
    .option("-p, --project <slug>", "Project slug (not env name)")
    .option("-o, --output <file>", "Output path", ".env")
    .option("-f, --force", "Overwrite without asking")
    .option("--merge", "Merge into existing file")
    .action(async (labelArg, options) => {
      try {
        await requireAuth();
        const projectId = await resolveProjectForCommand(
          options.project,
          "pull",
        );
        const label = labelArg ?? (await promptEnvLabel(projectId, "pull"));

        const outputFile = options.output || ".env";
        const outputPath = path.resolve(outputFile);

        if (
          (await fs.pathExists(outputPath)) &&
          !options.force &&
          !options.merge
        ) {
          const action = await promptOverwriteAction(outputFile);
          if (action === "cancel") {
            info("Cancelled.");
            return;
          }
          options.merge = action === "merge";
          options.force = action === "overwrite";
        }

        const spinner = createSpinner(`Pulling ${chalk.cyan(label)}…`);
        const { content } = await api.getEnv(projectId, label);
        spinner.stop();

        let finalContent = content;
        if (options.merge && (await fs.pathExists(outputPath))) {
          const existing = await fs.readFile(outputPath, "utf-8");
          finalContent = mergeEnvContent(existing, content);
          info("Merged with your existing file.");
        }

        await writeEnvFile(outputPath, finalContent);
        success(`Saved to ${outputFile}`);
        console.log(chalk.gray("\n  Preview (masked):\n"));
        console.log(
          maskSecrets(finalContent)
            .split("\n")
            .map((l) => `  ${l}`)
            .join("\n"),
        );
        console.log();
        printNextSteps("pull");
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("push [file]")
    .aliases(["ps", "up", "put"])
    .description("Upload a local .env file to the vault")
    .option("-p, --project <slug>", "Project slug (not env name)")
    .option("-l, --label <name>", "Environment label")
    .option("-f, --force", "Overwrite without asking")
    .action(async (file, options) => {
      try {
        await requireAuth();

        const detected = detectEnvFiles();
        const envFile = file ?? (await promptEnvFile(detected));
        const content = await readEnvFile(envFile);
        const projectId = await resolveProjectForCommand(
          options.project,
          "push",
        );

        let label = options.label;
        if (!label) {
          const basename = path.basename(envFile);
          if (basename.startsWith(".env.")) {
            label = basename.slice(5);
            info(`Label from filename: ${chalk.cyan(label)}`);
          } else {
            label = await promptEnvLabel(projectId, "push");
          }
        }

        const spinner = createSpinner("Checking vault…");
        const existingEnvs = await api.listEnvs(projectId);
        const existing = existingEnvs.find((e) => e.label === label);
        spinner.stop();

        if (existing && !options.force) {
          const ok = await promptConfirm(
            `Overwrite "${label}" in the vault?`,
            false,
          );
          if (!ok) {
            info("Cancelled.");
            return;
          }
        }

        const uploadSpinner = createSpinner(
          existing ? `Updating ${label}…` : `Creating ${label}…`,
        );
        await api.upsertEnv(projectId, label, content);
        uploadSpinner.succeed(
          existing ? `Updated ${label}` : `Created ${label}`,
        );
        success(`Uploaded ${envFile} → ${label}`);
        printNextSteps("push");
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("delete <label>")
    .aliases(["rm", "del"])
    .description("Delete an environment from the vault")
    .option("-p, --project <slug>", "Project slug (not env name)")
    .option("-f, --force", "Skip confirmation")
    .action(async (label, options) => {
      try {
        await requireAuth();
        const projectId = await resolveProjectForCommand(
          options.project,
          "delete",
        );

        if (!options.force) {
          const ok = await promptConfirm(
            chalk.red(`Delete "${label}" from the vault?`),
            false,
          );
          if (!ok) {
            info("Cancelled.");
            return;
          }
        }

        const spinner = createSpinner(`Deleting ${label}…`);
        await api.deleteEnv(projectId, label);
        spinner.succeed(chalk.green(`Deleted ${label}`));
        console.log();
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("init")
    .aliases(["setup", "start"])
    .description("Interactive setup wizard")
    .action(async () => {
      try {
        await runInitWizard();
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command("completion [shell]")
    .description("Print shell completion script (bash | zsh)")
    .action((shell = "zsh") => {
      printCompletionScript(shell);
      hint(`Add to your shell: eval "$(dv completion ${shell})"`);
    });

  program
    .command("logo")
    .aliases(["art", "banner"])
    .description("Play the typographic ASCII logo animation")
    .option("-n, --frames <n>", "Animation frames", "16")
    .action(async (options) => {
      const frames = Math.min(40, Math.max(4, Number(options.frames) || 16));
      await playLogoAnimation(frames);
    });

  program
    .command("help")
    .aliases(["h", "?"])
    .description("Show command cheatsheet")
    .action(async () => {
      await printBanner(false, false);
      printCheatsheet();
    });

  program
    .command("shell")
    .aliases(["sh", "interactive", "i"])
    .description("Interactive session (stays open until you exit)")
    .action(async () => {
      await runInteractiveSession();
    });

  program
    .command("project-create [name]")
    .alias("new")
    .description("Create a new project")
    .action(async (name) => {
      try {
        await requireAuth();
        const { input: promptInput } = await import("@inquirer/prompts");
        const projectName =
          name ??
          (await promptInput({
            message: "Project name",
            validate: (v) => (v.trim() ? true : "Required"),
          }));
        const spinner = createSpinner("Creating…");
        const p = await api.createProject(projectName.trim());
        spinner.succeed(`${p.name} (${p.slug})`);
      } catch (error) {
        handleError(error);
      }
    });
}

async function main(): Promise<void> {
  registerProgram();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    await runInteractiveSession();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  handleError(err);
});
