import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { getConfig, resolveDefaultApiUrl } from "./config.js";
import { printBanner, printCheatsheet, printRandomTip, CLI_BIN } from "./ui.js";

export type MenuAction =
  | "login"
  | "status"
  | "projects"
  | "envs"
  | "pull"
  | "push"
  | "init"
  | "logout"
  | "help"
  | "exit";

export async function runInteractiveMenu(): Promise<MenuAction> {
  await printBanner(false, true);

  const config = await getConfig();
  const authed = Boolean(config.apiToken);
  const server = config.apiUrl || resolveDefaultApiUrl();

  console.log(
    chalk.gray(
      `  Server: ${chalk.cyan(server)}  ·  Auth: ${
        authed ? chalk.green("yes") : chalk.yellow("not signed in")
      }`,
    ),
  );
  console.log();

  const action = await select<MenuAction>({
    message: "What do you want to do?",
    pageSize: 14,
    choices: [
      {
        name: authed ? "📋  List projects" : "🔐  Sign in first…",
        value: authed ? "projects" : "login",
        description: authed ? `${CLI_BIN} ls` : `${CLI_BIN} login`,
      },
      {
        name: "📂  List environments in a project",
        value: authed ? "envs" : "login",
        description: `${CLI_BIN} e <slug>`,
        disabled: authed ? false : "(sign in required)",
      },
      {
        name: "📥  Pull secrets → local .env",
        value: authed ? "pull" : "login",
        description: `${CLI_BIN} pl production`,
      },
      {
        name: "📤  Push local .env → vault",
        value: authed ? "push" : "login",
        description: `${CLI_BIN} ps`,
      },
      {
        name: "🚀  Setup wizard (init)",
        value: "init",
        description: `${CLI_BIN} init`,
      },
      {
        name: "🔐  Sign in",
        value: "login",
        description: `${CLI_BIN} login`,
      },
      {
        name: "📊  Status & connection",
        value: "status",
        description: `${CLI_BIN} st`,
      },
      {
        name: "📖  Command cheatsheet",
        value: "help",
      },
      ...(authed
        ? [
            {
              name: "🚪  Sign out",
              value: "logout" as const,
            },
          ]
        : []),
      { name: "Exit", value: "exit" },
    ],
  });

  if (action === "help") {
    printCheatsheet();
    printRandomTip();
    return runInteractiveMenu();
  }

  if (action === "exit") {
    console.log(chalk.gray("  Bye!\n"));
    process.exit(0);
  }

  return action;
}
