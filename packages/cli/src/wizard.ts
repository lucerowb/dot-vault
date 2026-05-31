import chalk from "chalk";
import path from "path";
import { api } from "./api.js";
import { getConfig, resolveDefaultApiUrl, saveConfig } from "./config.js";
import {
  promptApiUrl,
  promptConfirm,
  promptEmail,
  promptPassword,
  promptProject,
} from "./prompts.js";
import { detectEnvFiles, readEnvFile } from "./utils.js";
import { createSpinner } from "./spinner.js";
import {
  hint,
  printBanner,
  printNextSteps,
  printRandomTip,
  success,
} from "./ui.js";

/** Sign in (if needed) and optionally upload local `.env*` files. */
export async function runInitWizard(options?: {
  showBanner?: boolean;
}): Promise<void> {
  if (options?.showBanner !== false) {
    await printBanner(false, true);
  }
  hint("We'll sign you in and optionally upload local .env files.");

  const config = await getConfig();
  if (!config.apiToken) {
    const url = await promptApiUrl(config.apiUrl || resolveDefaultApiUrl());
    await saveConfig({ apiUrl: url });
    const email = await promptEmail();
    const pass = await promptPassword();
    const spinner = createSpinner("Signing in…");
    try {
      const { token } = await api.login(email, pass);
      await saveConfig({ apiToken: token });
      spinner.succeed("Signed in");
    } catch (error) {
      spinner.fail("Sign-in failed");
      throw error;
    }
  } else {
    success("Already signed in");
  }

  const detected = detectEnvFiles();
  if (detected.length === 0) {
    console.log(chalk.bold.green("\n  ✓ Setup complete\n"));
    printNextSteps("init");
    return;
  }

  console.log(chalk.gray("\n  Local files:"));
  detected.forEach((f) => console.log(`    • ${f}`));
  console.log();

  const shouldPush = await promptConfirm("Upload these to DotVault?", true);
  if (!shouldPush) {
    console.log(chalk.bold.green("\n  ✓ Setup complete\n"));
    printNextSteps("init");
    return;
  }

  const spinner = createSpinner("Loading projects…");
  const projects = await api.listProjects();
  spinner.stop();

  if (projects.length === 0) {
    console.log(
      chalk.yellow(
        "\n  No projects — run `dv` → Create project, or `dv project-create`.\n",
      ),
    );
    return;
  }

  const projectId = await promptProject(projects, "upload");

  for (const file of detected) {
    const content = await readEnvFile(file);
    const basename = path.basename(file);
    const label = basename === ".env" ? "development" : basename.slice(5);
    const pushSpinner = createSpinner(`Uploading ${file} as ${label}…`);
    try {
      await api.upsertEnv(projectId, label, content);
      pushSpinner.succeed(label);
    } catch (error) {
      pushSpinner.fail(
        `${file}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  console.log(chalk.bold.green("\n  ✓ Setup complete\n"));
  printNextSteps("init");
  printRandomTip();
}
