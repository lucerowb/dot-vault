import { createSpinner } from "./spinner.js";
import { api } from "./api.js";
import { promptProject } from "./prompts.js";
import { resolveDefaultApiUrl } from "./config.js";
import chalk from "chalk";

/** Resolve `-p` / positional project ref (slug, name, or UUID) to a project id. */
export async function resolveProjectForCommand(
  projectRef: string | undefined,
  purpose: string,
): Promise<string> {
  if (projectRef) {
    return api.resolveProjectId(projectRef);
  }

  const spinner = createSpinner("Loading your projects…");
  const projects = await api.listProjects();
  spinner.stop();

  if (projects.length === 0) {
    console.log(chalk.yellow("\n  No projects yet."));
    console.log(
      chalk.gray(`  Create one → ${resolveDefaultApiUrl()}/dashboard\n`),
    );
    process.exit(1);
  }

  return promptProject(projects, purpose);
}
