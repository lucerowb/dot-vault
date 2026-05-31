import fs from "fs-extra";
import path from "path";
import os from "os";

const SESSION_FILE = path.join(os.homedir(), ".dotvault", "session.json");

export interface CliSession {
  projectId?: string;
  projectSlug?: string;
  projectName?: string;
}

export async function loadSession(): Promise<CliSession> {
  try {
    if (await fs.pathExists(SESSION_FILE)) {
      return (await fs.readJson(SESSION_FILE)) as CliSession;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export async function saveSession(session: CliSession): Promise<void> {
  await fs.ensureDir(path.dirname(SESSION_FILE));
  await fs.writeJson(SESSION_FILE, session, { spaces: 2 });
}

export async function clearSessionProject(): Promise<void> {
  const s = await loadSession();
  delete s.projectId;
  delete s.projectSlug;
  delete s.projectName;
  await saveSession(s);
}
