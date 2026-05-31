import fs from "fs-extra";
import path from "path";
import os from "os";
const CONFIG_DIR = path.join(os.homedir(), ".dotvault");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const defaultConfig = {
  apiUrl: "https://dotvault.io",
};
export async function getConfig() {
  try {
    await fs.ensureDir(CONFIG_DIR);
    const exists = await fs.pathExists(CONFIG_FILE);
    if (!exists) {
      return { ...defaultConfig };
    }
    const content = await fs.readJson(CONFIG_FILE);
    return { ...defaultConfig, ...content };
  } catch {
    return { ...defaultConfig };
  }
}
export async function saveConfig(config) {
  await fs.ensureDir(CONFIG_DIR);
  const current = await getConfig();
  await fs.writeJson(CONFIG_FILE, { ...current, ...config }, { spaces: 2 });
}
export async function clearConfig() {
  await fs.remove(CONFIG_FILE);
}
export async function isAuthenticated() {
  const config = await getConfig();
  return !!config.apiToken;
}
export async function requireAuth() {
  const config = await getConfig();
  if (!config.apiToken) {
    throw new Error('Not authenticated. Run "dotvault login" to authenticate.');
  }
  return config.apiToken;
}
//# sourceMappingURL=config.js.map
