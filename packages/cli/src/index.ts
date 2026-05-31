#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { api } from "./api.js";
import { getConfig, saveConfig, clearConfig, requireAuth } from "./config.js";
import {
  readEnvFile,
  writeEnvFile,
  printEnvTable,
  printProjectTable,
  detectEnvFiles,
  maskSecrets,
  mergeEnvContent,
} from "./utils.js";
import fs from "fs-extra";
import path from "path";

program
  .name("dot-vault")
  .description("CLI for DotVault - secure environment variable management")
  .version("0.1.0");

// Login command
program
  .command("login")
  .description("Authenticate with your DotVault account")
  .option("-e, --email <email>", "Email address")
  .option("-p, --password <password>", "Password")
  .option("--api-url <url>", "Custom API URL")
  .action(async (options) => {
    try {
      await getConfig();

      if (options.apiUrl) {
        await saveConfig({ apiUrl: options.apiUrl });
      }

      const email =
        options.email ||
        (
          await inquirer.prompt([
            {
              type: "input",
              name: "email",
              message: "Email:",
              validate: (input) =>
                input.includes("@") || "Please enter a valid email",
            },
          ])
        ).email;

      const password =
        options.password ||
        (
          await inquirer.prompt([
            {
              type: "password",
              name: "password",
              message: "Password:",
              mask: "*",
              validate: (input) =>
                input.length >= 8 || "Password must be at least 8 characters",
            },
          ])
        ).password;

      const spinner = ora("Authenticating...").start();

      try {
        const { token } = await api.login(email, password);
        await saveConfig({ apiToken: token });
        spinner.succeed(chalk.green("Successfully authenticated!"));
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Logout command
program
  .command("logout")
  .description("Remove stored credentials")
  .action(async () => {
    await clearConfig();
    console.log(chalk.green("Logged out successfully"));
  });

// Status command
program
  .command("status")
  .description("Check authentication status")
  .action(async () => {
    const config = await getConfig();

    console.log(chalk.bold("\nDotVault Configuration:"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`API URL: ${chalk.cyan(config.apiUrl)}`);
    console.log(
      `Authenticated: ${config.apiToken ? chalk.green("Yes") : chalk.red("No")}`,
    );

    if (config.apiToken) {
      const spinner = ora("Validating token...").start();
      try {
        await api.getToken();
        spinner.succeed(chalk.green("Token is valid"));
      } catch {
        spinner.fail(chalk.red("Token is invalid or expired"));
        console.log(chalk.yellow('Run "dotvault login" to re-authenticate'));
      }
    }

    console.log();
  });

// List projects command
program
  .command("projects")
  .alias("ls")
  .description("List your projects")
  .action(async () => {
    try {
      await requireAuth();
      const spinner = ora("Fetching projects...").start();

      try {
        const projects = await api.listProjects();
        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("No projects found"));
          console.log(
            chalk.gray("Create one at https://dotvault.io/dashboard"),
          );
          return;
        }

        printProjectTable(projects);
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Failed to fetch projects: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// List environments command
program
  .command("envs [project]")
  .alias("list")
  .description("List environment files in a project")
  .action(async (projectSlug) => {
    try {
      await requireAuth();

      let projectId = projectSlug;

      // If no project specified, list all projects and ask
      if (!projectId) {
        const spinner = ora("Fetching projects...").start();
        const projects = await api.listProjects();
        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("No projects found"));
          return;
        }

        const { selectedProject } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedProject",
            message: "Select a project:",
            choices: projects.map((p) => ({
              name: `${p.name} (${p.slug})`,
              value: p.id,
            })),
          },
        ]);

        projectId = selectedProject;
      }

      const spinner = ora("Fetching environments...").start();

      try {
        const envs = await api.listEnvs(projectId);
        spinner.stop();

        if (envs.length === 0) {
          console.log(chalk.yellow("No environment files found"));
          return;
        }

        printEnvTable(envs);
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Failed to fetch environments: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Pull command
program
  .command("pull <label>")
  .description("Download environment file from DotVault")
  .option("-p, --project <slug>", "Project slug")
  .option("-o, --output <file>", "Output file path")
  .option("-f, --force", "Overwrite existing file without confirmation")
  .option("--merge", "Merge with existing .env file instead of overwriting")
  .action(async (label, options) => {
    try {
      await requireAuth();

      // Get project
      let projectId = options.project;
      if (!projectId) {
        const spinner = ora("Fetching projects...").start();
        const projects = await api.listProjects();
        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("No projects found"));
          return;
        }

        if (projects.length === 1) {
          const firstProject = projects[0]!;
          projectId = firstProject.id;
          console.log(chalk.gray(`Using project: ${firstProject.name}`));
        } else {
          const { selectedProject } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedProject",
              message: "Select a project:",
              choices: projects.map((p) => ({
                name: `${p.name} (${p.slug})`,
                value: p.id,
              })),
            },
          ]);
          projectId = selectedProject;
        }
      }

      // Determine output file
      const outputFile = options.output || ".env";
      const outputPath = path.resolve(outputFile);

      // Check if file exists
      if (await fs.pathExists(outputPath)) {
        if (!options.force && !options.merge) {
          const { action } = await inquirer.prompt([
            {
              type: "list",
              name: "action",
              message: `File ${outputFile} already exists. What would you like to do?`,
              choices: [
                { name: "Merge (add new vars, keep existing)", value: "merge" },
                { name: "Overwrite", value: "overwrite" },
                { name: "Cancel", value: "cancel" },
              ],
            },
          ]);

          if (action === "cancel") {
            console.log(chalk.gray("Operation cancelled"));
            return;
          }

          options.merge = action === "merge";
          options.force = action === "overwrite";
        }
      }

      const spinner = ora(`Pulling ${label}...`).start();

      try {
        const { content } = await api.getEnv(projectId, label);
        spinner.stop();

        let finalContent = content;

        // Merge if requested and file exists
        if (options.merge && (await fs.pathExists(outputPath))) {
          const existing = await fs.readFile(outputPath, "utf-8");
          finalContent = mergeEnvContent(existing, content);
          console.log(chalk.gray("Merged with existing file"));
        }

        await writeEnvFile(outputPath, finalContent);

        console.log(
          chalk.green(`✓ Successfully pulled ${label} to ${outputFile}`),
        );

        // Show preview
        console.log(chalk.gray("\nPreview:"));
        console.log(maskSecrets(finalContent));
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Failed to pull: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Push command
program
  .command("push [file]")
  .description("Upload environment file to DotVault")
  .option("-p, --project <slug>", "Project slug")
  .option("-l, --label <name>", "Environment label (e.g., staging, production)")
  .option("-f, --force", "Overwrite existing without confirmation")
  .action(async (file, options) => {
    try {
      await requireAuth();

      // Detect or use provided file
      let envFile = file;
      if (!envFile) {
        const detected = detectEnvFiles();
        if (detected.length === 0) {
          console.log(chalk.red("No .env file found in current directory"));
          console.log(chalk.gray("Specify a file: dotvault push .env.local"));
          return;
        }

        if (detected.length === 1) {
          envFile = detected[0];
          console.log(chalk.gray(`Using detected file: ${envFile}`));
        } else {
          const { selectedFile } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedFile",
              message: "Select an environment file:",
              choices: detected,
            },
          ]);
          envFile = selectedFile;
        }
      }

      // Read file
      const content = await readEnvFile(envFile);

      // Get project
      let projectId = options.project;
      if (!projectId) {
        const spinner = ora("Fetching projects...").start();
        const projects = await api.listProjects();
        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("No projects found"));
          console.log(
            chalk.gray("Create one at https://dotvault.io/dashboard"),
          );
          return;
        }

        if (projects.length === 1) {
          const firstProject = projects[0]!;
          projectId = firstProject.id;
          console.log(chalk.gray(`Using project: ${firstProject.name}`));
        } else {
          const { selectedProject } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedProject",
              message: "Select a project:",
              choices: projects.map((p) => ({
                name: `${p.name} (${p.slug})`,
                value: p.id,
              })),
            },
          ]);
          projectId = selectedProject;
        }
      }

      // Get or infer label
      let label = options.label;
      if (!label) {
        // Infer from filename
        const basename = path.basename(envFile);
        if (basename === ".env") {
          const { inferredLabel } = await inquirer.prompt([
            {
              type: "input",
              name: "inferredLabel",
              message:
                "Environment label (e.g., development, staging, production):",
              default: "development",
            },
          ]);
          label = inferredLabel;
        } else if (basename.startsWith(".env.")) {
          label = basename.slice(5);
          console.log(chalk.gray(`Using inferred label: ${label}`));
        } else {
          const { inferredLabel } = await inquirer.prompt([
            {
              type: "input",
              name: "inferredLabel",
              message: "Environment label:",
              default: path.basename(envFile, path.extname(envFile)),
            },
          ]);
          label = inferredLabel;
        }
      }

      // Check if env already exists
      const spinner = ora("Checking existing environments...").start();
      const existingEnvs = await api.listEnvs(projectId);
      const existing = existingEnvs.find((e) => e.label === label);
      spinner.stop();

      if (existing && !options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: `Environment "${label}" already exists. Overwrite?`,
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.gray("Operation cancelled"));
          return;
        }
      }

      // Upload
      const uploadSpinner = ora(
        existing ? `Updating ${label}...` : `Creating ${label}...`,
      ).start();

      try {
        if (existing) {
          await api.updateEnv(projectId, label, content);
          uploadSpinner.succeed(chalk.green(`✓ Updated ${label}`));
        } else {
          await api.createEnv(projectId, label, content);
          uploadSpinner.succeed(chalk.green(`✓ Created ${label}`));
        }

        console.log(chalk.gray(`\nPushed ${envFile} to ${label}`));
      } catch (error) {
        uploadSpinner.fail(
          chalk.red(
            `Failed to push: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Delete command
program
  .command("delete <label>")
  .description("Delete an environment file from DotVault")
  .option("-p, --project <slug>", "Project slug")
  .option("-f, --force", "Skip confirmation")
  .action(async (label, options) => {
    try {
      await requireAuth();

      // Get project
      let projectId = options.project;
      if (!projectId) {
        const spinner = ora("Fetching projects...").start();
        const projects = await api.listProjects();
        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("No projects found"));
          return;
        }

        if (projects.length === 1) {
          const firstProject = projects[0]!;
          projectId = firstProject.id;
        } else {
          const { selectedProject } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedProject",
              message: "Select a project:",
              choices: projects.map((p) => ({
                name: `${p.name} (${p.slug})`,
                value: p.id,
              })),
            },
          ]);
          projectId = selectedProject;
        }
      }

      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: chalk.red(`Are you sure you want to delete "${label}"?`),
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.gray("Operation cancelled"));
          return;
        }
      }

      const spinner = ora(`Deleting ${label}...`).start();

      try {
        await api.deleteEnv(projectId, label);
        spinner.succeed(chalk.green(`✓ Deleted ${label}`));
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Init command - setup wizard
program
  .command("init")
  .description("Interactive setup wizard")
  .action(async () => {
    console.log(chalk.bold.blue("\n🛡️  DotVault Setup Wizard\n"));

    // Check auth
    const config = await getConfig();
    if (!config.apiToken) {
      console.log(chalk.yellow("You need to login first.\n"));

      const { email, password } = await inquirer.prompt([
        {
          type: "input",
          name: "email",
          message: "Email:",
          validate: (input) =>
            input.includes("@") || "Please enter a valid email",
        },
        {
          type: "password",
          name: "password",
          message: "Password:",
          mask: "*",
          validate: (input) =>
            input.length >= 8 || "Password must be at least 8 characters",
        },
      ]);

      const spinner = ora("Authenticating...").start();
      try {
        const { token } = await api.login(email, password);
        await saveConfig({ apiToken: token });
        spinner.succeed(chalk.green("Authenticated!"));
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    } else {
      console.log(chalk.green("✓ Already authenticated\n"));
    }

    // Check for existing .env files
    const detected = detectEnvFiles();
    if (detected.length > 0) {
      console.log(chalk.gray(`Found ${detected.length} environment file(s):`));
      detected.forEach((f) => console.log(`  • ${f}`));
      console.log();

      const { shouldPush } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldPush",
          message: "Would you like to push these to DotVault?",
          default: true,
        },
      ]);

      if (shouldPush) {
        // Get projects
        const spinner = ora("Fetching projects...").start();
        const projects = await api.listProjects();
        spinner.stop();

        let projectId: string;
        if (projects.length === 0) {
          console.log(chalk.yellow("\nNo projects found."));
          console.log(
            chalk.gray("Create one at https://dotvault.io/dashboard\n"),
          );
          return;
        } else if (projects.length === 1) {
          const firstProject = projects[0]!;
          projectId = firstProject.id;
          console.log(chalk.gray(`\nUsing project: ${firstProject.name}`));
        } else {
          const { selectedProject } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedProject",
              message: "Select a project:",
              choices: projects.map((p) => ({
                name: `${p.name} (${p.slug})`,
                value: p.id,
              })),
            },
          ]);
          projectId = selectedProject;
        }

        // Push each file
        for (const file of detected) {
          const content = await readEnvFile(file);
          const basename = path.basename(file);
          const label = basename === ".env" ? "development" : basename.slice(5);

          const pushSpinner = ora(`Pushing ${file} as "${label}"...`).start();
          try {
            const existingEnvs = await api.listEnvs(projectId);
            const existing = existingEnvs.find((e) => e.label === label);

            if (existing) {
              await api.updateEnv(projectId, label, content);
              pushSpinner.succeed(chalk.green(`Updated ${label}`));
            } else {
              await api.createEnv(projectId, label, content);
              pushSpinner.succeed(chalk.green(`Created ${label}`));
            }
          } catch (error) {
            pushSpinner.fail(
              chalk.red(
                `Failed to push ${file}: ${error instanceof Error ? error.message : "Unknown error"}`,
              ),
            );
          }
        }
      }
    }

    console.log(chalk.bold.green("\n✓ Setup complete!"));
    console.log(chalk.gray("\nUseful commands:"));
    console.log("  dotvault push     Upload .env file");
    console.log("  dotvault pull     Download .env file");
    console.log("  dotvault envs     List environments");
    console.log();
  });

program.parse();
