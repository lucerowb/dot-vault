// Background service worker for DotVault extension

interface DotVaultConfig {
  apiUrl: string;
  apiToken: string | null;
  lastSync: number;
  projects: Project[];
}

interface Project {
  id: string;
  name: string;
  slug: string;
  envs: EnvFile[];
}

interface EnvFile {
  id: string;
  label: string;
  updatedAt: string;
}

// Default configuration (set your instance in the extension popup after install)
const DEFAULT_CONFIG: DotVaultConfig = {
  apiUrl: "http://localhost:3000",
  apiToken: null,
  lastSync: 0,
  projects: [],
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
    console.log("DotVault extension installed");
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case "getConfig":
          const config = await getConfig();
          sendResponse({ success: true, config });
          break;

        case "setConfig":
          await setConfig(request.config);
          sendResponse({ success: true });
          break;

        case "login":
          const loginResult = await login(request.email, request.password);
          sendResponse(loginResult);
          break;

        case "logout":
          await logout();
          sendResponse({ success: true });
          break;

        case "syncProjects":
          const syncResult = await syncProjects();
          sendResponse(syncResult);
          break;

        case "getEnvContent":
          const envResult = await getEnvContent(
            request.projectId,
            request.envId,
          );
          sendResponse(envResult);
          break;

        case "detectPlatform":
          const platform = detectPlatform(request.url);
          sendResponse({ success: true, platform });
          break;

        case "fillEnvVars": {
          const tabId = sender.tab?.id;
          if (tabId === undefined) {
            sendResponse({ success: false, error: "No active tab" });
            break;
          }
          const fillResult = await fillEnvVars(
            tabId,
            request.envVars,
            request.platform,
          );
          sendResponse(fillResult);
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })();

  return true; // Keep message channel open for async
});

// Get configuration from storage
async function getConfig(): Promise<DotVaultConfig> {
  const result = await chrome.storage.local.get("config");
  return result.config || DEFAULT_CONFIG;
}

// Set configuration in storage
async function setConfig(config: Partial<DotVaultConfig>): Promise<void> {
  const current = await getConfig();
  await chrome.storage.local.set({
    config: { ...current, ...config },
  });
}

// Login to DotVault
async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getConfig();
    const base = config.apiUrl.replace(/\/$/, "");
    const response = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Login failed" };
    }

    const data = await response.json();
    const token = data.token ?? data.session?.token;
    if (token) {
      await setConfig({ apiToken: token });
      await syncProjects();
      return { success: true };
    }

    return { success: false, error: "No token received" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Logout from DotVault
async function logout(): Promise<void> {
  await setConfig({
    apiToken: null,
    projects: [],
    lastSync: 0,
  });
}

// Sync projects from DotVault
async function syncProjects(): Promise<{
  success: boolean;
  projects?: Project[];
  error?: string;
}> {
  try {
    const config = await getConfig();
    if (!config.apiToken) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch projects
    const projectsResponse = await fetch(`${config.apiUrl}/api/projects`, {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
    });

    if (!projectsResponse.ok) {
      return { success: false, error: "Failed to fetch projects" };
    }

    const projectsData = await projectsResponse.json();
    const projects: Project[] = [];

    // Fetch envs for each project
    for (const project of projectsData.data || []) {
      const envsResponse = await fetch(
        `${config.apiUrl}/api/projects/${project.id}/envs`,
        {
          headers: {
            Authorization: `Bearer ${config.apiToken}`,
          },
        },
      );

      if (envsResponse.ok) {
        const envsData = await envsResponse.json();
        projects.push({
          ...project,
          envs: envsData.data || [],
        });
      }
    }

    await setConfig({
      projects,
      lastSync: Date.now(),
    });

    return { success: true, projects };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

// Get environment file content
async function getEnvContent(
  projectId: string,
  envId: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const config = await getConfig();
    if (!config.apiToken) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await fetch(
      `${config.apiUrl}/api/projects/${projectId}/envs/${envId}`,
      {
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
        },
      },
    );

    if (!response.ok) {
      return { success: false, error: "Failed to fetch env content" };
    }

    const data = await response.json();
    return { success: true, content: data.data?.content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

// Detect platform from URL
function detectPlatform(url: string): string | null {
  const platforms: Record<string, string> = {
    "vercel.com": "vercel",
    "netlify.com": "netlify",
    "github.com": "github",
    "aws.amazon.com": "aws",
    "railway.app": "railway",
    "render.com": "render",
    "heroku.com": "heroku",
    "digitalocean.com": "digitalocean",
    "cloudflare.com": "cloudflare",
    "supabase.com": "supabase",
    "neon.tech": "neon",
  };

  for (const [domain, platform] of Object.entries(platforms)) {
    if (url.includes(domain)) {
      return platform;
    }
  }

  return null;
}

// Fill environment variables into page
async function fillEnvVars(
  tabId: number,
  envVars: Record<string, string>,
  platform: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectEnvVars,
      args: [envVars, platform],
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Injection failed",
    };
  }
}

// Function to be injected into page
function injectEnvVars(
  envVars: Record<string, string>,
  platform: string,
): void {
  const selectors: Record<string, string[]> = {
    vercel: [
      'input[name^="env_"]',
      '[data-testid="env-input"]',
      'input[placeholder*="value"]',
    ],
    netlify: [
      'input[name="value"]',
      '[data-testid="env-value-input"]',
      ".env-value-input",
    ],
    github: [
      'input[name="encrypted_value"]',
      '[data-testid="secret-value-input"]',
      "#secret-value",
    ],
    railway: [
      'input[placeholder="VALUE"]',
      '[data-testid="env-value"]',
      ".env-value-field",
    ],
    render: [
      'input[name="value"]',
      '[data-testid="environment-variable-value"]',
    ],
    heroku: ['input[name="config_var[value]"]', ".env-var-value"],
    aws: ['input[id="envValue"]', '[data-testid="environment-variable-value"]'],
    default: ['input[name*="value"]', 'input[placeholder*="value"]'],
  };

  const platformSelectors = selectors[platform] || selectors.default;

  // Find all input fields that could be env value inputs
  const inputs: HTMLInputElement[] = [];
  for (const selector of platformSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      if (el instanceof HTMLInputElement) {
        inputs.push(el);
      }
    });
  }

  // Also look for textarea fields
  const textareas = document.querySelectorAll('textarea[name*="value"]');
  textareas.forEach((el) => {
    if (el instanceof HTMLTextAreaElement) {
      // Try to find associated key input
      const row = el.closest('tr, .env-row, [data-testid*="env"]');
      if (row) {
        const keyInput = row.querySelector(
          'input[name*="key"], input[placeholder*="KEY"], input[placeholder*="key"]',
        );
        if (keyInput instanceof HTMLInputElement) {
          const key = keyInput.value;
          if (envVars[key]) {
            el.value = envVars[key];
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }
    }
  });

  // Fill in the values
  for (const input of inputs) {
    // Try to find the associated key
    const row = input.closest('tr, .env-row, [data-testid*="env"]');
    let key: string | null = null;

    if (row) {
      const keyInput = row.querySelector(
        'input[name*="key"], input[placeholder*="KEY"], input[placeholder*="key"]',
      );
      if (keyInput instanceof HTMLInputElement) {
        key = keyInput.value;
      }
    }

    // If we found a key and have a value for it, fill it in
    if (key && envVars[key]) {
      input.value = envVars[key];
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  // Show notification
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.textContent = `✓ DotVault: Filled ${Object.keys(envVars).length} environment variables`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Periodic sync (every 5 minutes)
chrome.alarms.create("syncProjects", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "syncProjects") {
    const config = await getConfig();
    if (config.apiToken) {
      await syncProjects();
    }
  }
});

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "dotvault-fill",
    title: "Fill with DotVault",
    contexts: ["page"],
    documentUrlPatterns: [
      "https://*.vercel.com/*",
      "https://*.netlify.com/*",
      "https://github.com/*",
      "https://*.railway.app/*",
      "https://*.render.com/*",
    ],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "dotvault-fill" && tab?.id) {
    // Open popup to let user select which env to fill
    chrome.action.openPopup();
  }
});
