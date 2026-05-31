import { confirm, input, password, search, select } from "@inquirer/prompts";
import chalk from "chalk";
import { api, type Project } from "./api.js";
import { hint, info } from "./ui.js";

export async function promptEmail(): Promise<string> {
  return input({
    message: "Email",
    validate: (v) => (v.includes("@") ? true : "Enter a valid email"),
  });
}

export async function promptPassword(): Promise<string> {
  return password({
    message: "Password",
    mask: "•",
    validate: (v) =>
      v.length >= 8 ? true : "At least 8 characters (matches the web app)",
  });
}

export async function promptApiUrl(current: string): Promise<string> {
  hint("Use your DotVault URL — not /api/auth (the CLI adds API paths).");
  return input({
    message: "DotVault server URL",
    default: current,
    validate: (v) => {
      const t = v.trim();
      if (!t) return "URL is required";
      try {
        new URL(t.startsWith("http") ? t : `https://${t}`);
        return true;
      } catch {
        return "Enter a valid URL (e.g. https://dot-vault.example.com)";
      }
    },
    transformer: (v) => v.trim().replace(/\/$/, ""),
  });
}

export async function promptProject(
  projects: Project[],
  purpose: string,
): Promise<string> {
  if (projects.length === 0) {
    throw new Error(
      "No projects yet — run `dv` → Create project, or `dv project-create`.",
    );
  }

  if (projects.length === 1) {
    const p = projects[0]!;
    info(`Using project ${chalk.cyan(p.name)} ${chalk.gray(`(${p.slug})`)}`);
    return p.id;
  }

  return search({
    message: `Project for ${purpose} ${chalk.gray("(type to filter)")}`,
    pageSize: 12,
    source: async (term) => {
      const q = (term ?? "").trim().toLowerCase();
      return projects
        .filter(
          (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q),
        )
        .map((p) => ({
          name: `${p.name} ${chalk.gray(`· ${p.slug}`)}`,
          value: p.id,
          description: `slug: ${p.slug}`,
        }));
    },
  });
}

export async function promptEnvLabel(
  projectId: string,
  purpose: "pull" | "push" | "delete",
): Promise<string> {
  const envs = await api.listEnvs(projectId);

  if (envs.length === 0) {
    hint("No envs yet — you'll create one with this label.");
    return input({
      message: "Environment label",
      default: purpose === "pull" ? "production" : "development",
      validate: (v) => (v.trim().length > 0 ? true : "Label is required"),
    });
  }

  const picked = await search({
    message: `Environment ${chalk.gray("(type to filter)")}`,
    pageSize: 12,
    source: async (term) => {
      const q = (term ?? "").trim().toLowerCase();
      const matches = envs
        .filter((e) => !q || e.label.toLowerCase().includes(q))
        .map((e) => ({
          name: e.label,
          value: e.label,
          description: `updated ${new Date(e.updatedAt).toLocaleDateString()}`,
        }));

      if (purpose === "push") {
        matches.push({
          name: chalk.yellow("+ New label…"),
          value: "__new__",
          description: "Create a new environment",
        });
      }

      return matches;
    },
  });

  if (picked === "__new__") {
    return input({
      message: "New environment label",
      default: "staging",
      validate: (v) => (v.trim().length > 0 ? true : "Label is required"),
    });
  }

  return picked;
}

export async function promptEnvFile(detected: string[]): Promise<string> {
  if (detected.length === 0) {
    return input({
      message: "Path to .env file",
      default: ".env",
      validate: async (v) => {
        const { pathExists } = await import("fs-extra");
        return (await pathExists(v)) ? true : `File not found: ${v}`;
      },
    });
  }

  if (detected.length === 1) {
    info(`Found ${chalk.cyan(detected[0]!)}`);
    return detected[0]!;
  }

  return search({
    message: "Which file to upload? (type to filter)",
    source: async (term) => {
      const q = (term ?? "").trim().toLowerCase();
      return detected
        .filter((f) => !q || f.toLowerCase().includes(q))
        .map((f) => ({ name: f, value: f }));
    },
  });
}

export async function promptOverwriteAction(
  file: string,
): Promise<"merge" | "overwrite" | "cancel"> {
  return select({
    message: `${file} already exists — what should we do?`,
    choices: [
      {
        name: "Merge (keep local keys, add remote)",
        value: "merge" as const,
        description: "Safest for local overrides",
      },
      {
        name: "Overwrite completely",
        value: "overwrite" as const,
        description: "Replace file with vault copy",
      },
      { name: "Cancel", value: "cancel" as const },
    ],
  });
}

export async function promptConfirm(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  return confirm({ message, default: defaultValue });
}
