import { select, input, confirm, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { api } from "./api.js";
import { getConfig, requireAuth, saveConfig } from "./config.js";
import {
  readEnvFile,
  writeEnvFile,
  printEnvTable,
  printProjectTable,
  detectEnvFiles,
  maskSecrets,
  mergeEnvContent,
} from "./utils.js";
import {
  promptApiUrl,
  promptEmail,
  promptEnvFile,
  promptEnvLabel,
  promptOverwriteAction,
  promptPassword,
  promptProject,
  promptConfirm,
} from "./prompts.js";
import { loadSession, saveSession, type CliSession } from "./session-store.js";
import { createSpinner } from "./spinner.js";
import {
  CLI_BIN,
  hint,
  info,
  success,
  printBanner,
  printCheatsheet,
} from "./ui.js";
import { playLogoAnimation } from "./pretext-visual.js";
import { resolveDefaultApiUrl } from "./config.js";

function explainConcepts(): void {
  console.log(chalk.bold("\n  How DotVault is organized\n"));
  console.log(
    chalk.gray(
      "  • A " +
        chalk.white("project") +
        " is a folder for your app (e.g. slug " +
        chalk.cyan("realpha") +
        ").\n" +
        "  • An " +
        chalk.white("environment") +
        " is a named .env inside that project (e.g. " +
        chalk.cyan("production") +
        ", " +
        chalk.cyan("staging") +
        ").\n" +
        "  • Use " +
        chalk.cyan("-p realpha") +
        " for the project slug — " +
        chalk.yellow("not") +
        " the env name.\n",
    ),
  );
}

async function printContextHeader(session: CliSession): Promise<void> {
  const config = await getConfig();
  console.log(chalk.gray("  " + "─".repeat(44)));
  console.log(`  Server   ${chalk.cyan(config.apiUrl)}`);
  if (session.projectSlug) {
    let envCount = "?";
    try {
      if (session.projectId) {
        const envs = await api.listEnvs(session.projectId);
        envCount = String(envs.length);
      }
    } catch {
      /* ignore */
    }
    console.log(
      `  Project  ${chalk.white(session.projectName ?? session.projectSlug)} ${chalk.gray(`(slug: ${session.projectSlug} · ${envCount} env${envCount === "1" ? "" : "s"})`)}`,
    );
  } else {
    console.log(chalk.yellow("  Project  none selected — pick one first"));
  }
  console.log(chalk.gray("  " + "─".repeat(44)));
  console.log();
}

async function ensureAuth(): Promise<void> {
  await requireAuth();
}

async function actionLogin(): Promise<void> {
  const cfg = await getConfig();
  if (!cfg.apiToken) {
    const url = await promptApiUrl(cfg.apiUrl || resolveDefaultApiUrl());
    await saveConfig({ apiUrl: url });
  }
  const email = await promptEmail();
  const pass = await promptPassword();
  const spinner = createSpinner("Signing in…");
  const { token } = await api.login(email, pass);
  await saveConfig({ apiToken: token });
  spinner.succeed("Signed in");
}

async function actionPickProject(session: CliSession): Promise<CliSession> {
  await ensureAuth();
  const spinner = createSpinner("Loading projects…");
  const projects = await api.listProjects();
  spinner.stop();
  if (projects.length === 0) {
    hint("No projects yet — choose “Create project” in the menu.");
    return session;
  }
  printProjectTable(projects);
  const id = await promptProject(projects, "work in");
  const p = projects.find((x) => x.id === id)!;
  const next: CliSession = {
    projectId: p.id,
    projectSlug: p.slug,
    projectName: p.name,
  };
  await saveSession(next);
  success(`Active project: ${p.name} (${p.slug})`);
  return next;
}

async function actionCreateProject(): Promise<CliSession> {
  await ensureAuth();
  const name = await input({
    message: "Project display name",
    validate: (v) => (v.trim().length > 0 ? true : "Required"),
  });
  const slug = await input({
    message: "Project slug (URL-safe, used with -p)",
    default: name.trim().toLowerCase().replace(/\s+/g, "-"),
    validate: (v) =>
      /^[a-z0-9][a-z0-9-]*$/.test(v.trim())
        ? true
        : "Lowercase letters, numbers, hyphens",
  });
  const spinner = createSpinner("Creating project…");
  const p = await api.createProject(name.trim(), slug.trim());
  spinner.succeed(`Created ${p.name} (${p.slug})`);
  const next: CliSession = {
    projectId: p.id,
    projectSlug: p.slug,
    projectName: p.name,
  };
  await saveSession(next);
  return next;
}

async function requireProject(session: CliSession): Promise<{
  session: CliSession;
  projectId: string;
}> {
  if (session.projectId && session.projectSlug) {
    return { session, projectId: session.projectId };
  }
  hint("Pick a project first.");
  const next = await actionPickProject(session);
  if (!next.projectId) throw new Error("No project selected.");
  return { session: next, projectId: next.projectId };
}

async function actionListEnvs(session: CliSession): Promise<void> {
  const { projectId } = await requireProject(session);
  const spinner = createSpinner("Loading environments…");
  const envs = await api.listEnvs(projectId);
  spinner.stop();
  if (envs.length === 0) {
    hint('No envs yet — use “Upload .env to vault”.');
    return;
  }
  printEnvTable(envs);
  hint(`Pull: menu → Download, or \`${CLI_BIN} pl <label> -p ${session.projectSlug}\``);
}

async function actionPull(session: CliSession): Promise<void> {
  const { projectId } = await requireProject(session);
  const label = await promptEnvLabel(projectId, "pull");
  const outputFile =
    (await input({
      message: "Save to file",
      default: label === "production" ? ".env" : `.env.${label}`,
    })) || ".env";
  const outputPath = path.resolve(outputFile);

  if (await fs.pathExists(outputPath)) {
    const action = await promptOverwriteAction(outputFile);
    if (action === "cancel") return;
    if (action === "merge") {
      const spinner = createSpinner(`Pulling ${label}…`);
      const { content } = await api.getEnv(projectId, label);
      spinner.stop();
      const existing = await fs.readFile(outputPath, "utf-8");
      await writeEnvFile(outputPath, mergeEnvContent(existing, content));
      success(`Merged into ${outputFile}`);
      return;
    }
  }

  const spinner = createSpinner(`Pulling ${label}…`);
  const { content } = await api.getEnv(projectId, label);
  spinner.stop();
  await writeEnvFile(outputPath, content);
  success(`Saved to ${outputFile}`);
  console.log(chalk.gray("\n  Preview:\n"));
  console.log(
    maskSecrets(content)
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n"),
  );
  console.log();
}

async function actionPush(session: CliSession): Promise<void> {
  const { projectId } = await requireProject(session);
  const detected = detectEnvFiles();
  const envFile = await promptEnvFile(detected);
  const content = await readEnvFile(envFile);

  const basename = path.basename(envFile);
  let label: string | undefined;
  if (basename.startsWith(".env.")) {
    const inferred = basename.slice(5);
    const useInferred = await confirm({
      message: `Name this environment "${inferred}"?`,
      default: true,
    });
    if (useInferred) label = inferred;
  } else if (basename === ".env") {
    label = "development";
  }
  if (!label) {
    label = await promptEnvLabel(projectId, "push");
  }

  const spinner = createSpinner(`Uploading as "${label}"…`);
  await api.upsertEnv(projectId, label, content);
  spinner.succeed(`Uploaded ${envFile} → ${label}`);
}

async function actionEditEnv(session: CliSession): Promise<void> {
  const { projectId } = await requireProject(session);
  const label = await promptEnvLabel(projectId, "pull");
  const spinner = createSpinner("Downloading current content…");
  const { content } = await api.getEnv(projectId, label);
  spinner.stop();

  const editPath = path.join(
    process.cwd(),
    `.dotvault-edit-${label.replace(/[^a-z0-9.-]/gi, "_")}.env`,
  );
  await writeEnvFile(editPath, content);
  info(`Edit ${chalk.cyan(editPath)} then press Enter here when done.`);
  await input({ message: "Press Enter when finished editing" });

  const updated = await readEnvFile(editPath);
  const up = createSpinner("Saving to vault…");
  await api.upsertEnv(projectId, label, updated);
  up.succeed(`Updated ${label}`);
  await fs.remove(editPath).catch(() => undefined);
}

async function actionDeleteEnv(session: CliSession): Promise<void> {
  const { projectId } = await requireProject(session);
  const label = await promptEnvLabel(projectId, "delete");
  const ok = await promptConfirm(`Delete "${label}" from the vault?`, false);
  if (!ok) return;
  const spinner = createSpinner("Deleting…");
  await api.deleteEnv(projectId, label);
  spinner.succeed(`Deleted ${label}`);
}

async function actionRenameEnv(session: CliSession): Promise<void> {
  const { projectId } = await requireProject(session);
  const oldLabel = await promptEnvLabel(projectId, "pull");
  const newLabel = await input({
    message: "New environment name",
    validate: (v) => (v.trim().length > 0 ? true : "Required"),
  });
  const spinner = createSpinner("Renaming…");
  await api.renameEnv(projectId, oldLabel, newLabel.trim());
  spinner.succeed(`Renamed ${oldLabel} → ${newLabel.trim()}`);
}

async function refreshSessionProject(session: CliSession): Promise<CliSession> {
  if (!session.projectSlug) return session;
  try {
    const p = await api.resolveProject(session.projectSlug);
    const next: CliSession = {
      projectId: p.id,
      projectSlug: p.slug,
      projectName: p.name,
    };
    await saveSession(next);
    return next;
  } catch {
    hint(
      `Saved project "${session.projectSlug}" is gone — pick another project.`,
    );
    await saveSession({});
    return {};
  }
}

export async function runInteractiveSession(): Promise<void> {
  let session = await loadSession();
  let showLogo = true;
  let showedConcepts = false;

  try {
    await requireAuth();
    session = await refreshSessionProject(session);
  } catch {
    /* login via menu */
  }

  while (true) {
    if (!showedConcepts) {
      explainConcepts();
      showedConcepts = true;
    }
    if (showLogo) {
      await playLogoAnimation(8);
      showLogo = false;
    } else {
      await printBanner(true);
    }

    await printContextHeader(session);

    let authed = false;
    try {
      await api.getToken();
      authed = true;
    } catch {
      authed = false;
    }

    const choice = await select<string>({
      message: "What would you like to do?",
      pageSize: 16,
      choices: [
        ...(authed
          ? [
              {
                name: "📁  Select / switch project",
                value: "pick-project",
                description: "Sets context for pull & push",
              },
              {
                name: "➕  Create new project",
                value: "create-project",
              },
              {
                name: "📋  List environments (in current project)",
                value: "list-envs",
              },
              { name: "📥  Download env → local file", value: "pull" },
              { name: "📤  Upload local .env → vault", value: "push" },
              { name: "✏️  Edit env (download, edit, re-upload)", value: "edit" },
              { name: "🏷️  Rename environment", value: "rename-env" },
              { name: "🗑️  Delete environment", value: "delete-env" },
              {
                name: "🚀  Quick setup (sign in + upload .env)",
                value: "init",
              },
              new Separator(),
            ]
          : [
              {
                name: "🔐  Sign in",
                value: "login",
                description: "Required first",
              },
              new Separator(),
            ]),
        { name: "📖  Command cheatsheet", value: "help" },
        { name: "🚪  Exit", value: "exit" },
      ],
    });

    try {
      switch (choice) {
        case "login":
          await actionLogin();
          break;
        case "pick-project":
          session = await actionPickProject(session);
          break;
        case "create-project":
          session = await actionCreateProject();
          break;
        case "list-envs":
          await actionListEnvs(session);
          break;
        case "pull":
          await actionPull(session);
          break;
        case "push":
          await actionPush(session);
          break;
        case "edit":
          await actionEditEnv(session);
          break;
        case "rename-env":
          await actionRenameEnv(session);
          break;
        case "delete-env":
          await actionDeleteEnv(session);
          break;
        case "init": {
          const { runInitWizard } = await import("./wizard.js");
          await runInitWizard({ showBanner: false });
          session = await refreshSessionProject(await loadSession());
          break;
        }
        case "help":
          printCheatsheet();
          explainConcepts();
          break;
        case "exit":
          console.log(chalk.gray("\n  Bye! 👋\n"));
          return;
        default:
          break;
      }
    } catch (err) {
      console.error(
        chalk.red("\n  ✗"),
        err instanceof Error ? err.message : err,
      );
      hint("Try again or pick another action.");
    }

    console.log();
  }
}
