import ora, { type Ora } from "ora";
import chalk from "chalk";
import { supportsVisual } from "./pretext-visual.js";

export function createSpinner(text: string): Ora {
  if (!supportsVisual()) {
    return ora(text).start();
  }
  return ora({
    text: `${chalk.cyan("▒")} ${text}`,
    spinner: {
      interval: 100,
      frames: ["░", "▒", "▓", "█", "▓", "▒"],
    },
    color: "cyan",
  }).start();
}
