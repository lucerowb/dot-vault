// DotVault Extension Popup

let currentConfig = null;
let currentTab = null;
let detectedPlatform = null;

const BUILTIN_DEFAULTS = window.__DOTVAULT_DEFAULTS__ || {
  apiUrl: "",
  serverConfigured: false,
};

const SETUP_PLACEHOLDER = "https://vault.example.com";

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  await init();
});

async function sendBackgroundMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error("DotVault background error:", error);
    return {
      success: false,
      error:
        "Extension background failed to start. Reload the extension at chrome://extensions.",
    };
  }
}

function updateInstanceFooter(apiUrl) {
  const link = document.getElementById("instance-link");
  if (!link) return;

  if (!apiUrl?.trim()) {
    link.href = "#";
    link.textContent = "Server not configured";
    return;
  }

  const base = apiUrl.replace(/\/$/, "");
  link.href = base;
  try {
    link.textContent = new URL(base).host;
  } catch {
    link.textContent = base;
  }
}

function isServerConfigured(config) {
  return Boolean(config?.serverConfigured && config?.apiUrl?.trim());
}

function showFatalError(container, message) {
  container.innerHTML = `
    <div class="error-message" style="margin-bottom: 12px;">${escapeHtml(message)}</div>
    <p style="font-size: 13px; color: #6b7280;">Open <strong>chrome://extensions</strong>, find DotVault, and click <strong>Reload</strong>. Then open this popup again.</p>
  `;
}

async function init() {
  const content = document.getElementById("content");

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Detect platform
  const platformResult = await sendBackgroundMessage({
    action: "detectPlatform",
    url: currentTab?.url || "",
  });
  if (!platformResult?.success && platformResult?.error) {
    showFatalError(content, platformResult.error);
    return;
  }
  detectedPlatform = platformResult?.success ? platformResult.platform : null;

  // Get config
  const configResult = await sendBackgroundMessage({ action: "getConfig" });
  if (!configResult?.success) {
    showFatalError(
      content,
      configResult?.error ||
        "Could not reach the extension. Reload it at chrome://extensions.",
    );
    return;
  }

  currentConfig = configResult.config;
  updateInstanceFooter(currentConfig?.apiUrl);

  if (!isServerConfigured(currentConfig)) {
    showServerSetup(content);
  } else if (!currentConfig?.apiToken) {
    showLogin(content);
  } else {
    showProjects(content);
  }
}

function showServerSetup(container) {
  const prefill =
    currentConfig?.apiUrl?.trim() ||
    BUILTIN_DEFAULTS.apiUrl?.trim() ||
    "";

  const builtInHint = BUILTIN_DEFAULTS.serverConfigured
    ? '<p class="setup-hint">Default server URL was set when this extension was built. Confirm or edit it below.</p>'
    : '<p class="setup-hint">Enter your DotVault base URL (same as NEXT_PUBLIC_APP_URL on the server).</p>';

  container.innerHTML = `
    <div class="login-form">
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <h3>Connect to your server</h3>
        ${builtInHint}
      </div>

      <div class="form-group">
        <label for="api-url">Server URL</label>
        <input type="url" id="api-url" value="${escapeHtml(prefill)}" placeholder="${SETUP_PLACEHOLDER}" required>
      </div>

      <button class="btn btn-primary" id="save-server-btn">Save &amp; continue</button>
      <div id="setup-error"></div>
    </div>
  `;

  document
    .getElementById("save-server-btn")
    .addEventListener("click", async () => {
      const apiUrlInput = document.getElementById("api-url").value.trim();
      const errorDiv = document.getElementById("setup-error");
      const btn = document.getElementById("save-server-btn");

      if (!apiUrlInput) {
        errorDiv.innerHTML =
          '<div class="error-message">Enter your DotVault server URL</div>';
        return;
      }

      try {
        new URL(apiUrlInput);
      } catch {
        errorDiv.innerHTML =
          '<div class="error-message">Use a full URL including https:// or http://</div>';
        return;
      }

      btn.disabled = true;
      btn.textContent = "Saving...";

      const result = await sendBackgroundMessage({
        action: "setApiUrl",
        apiUrl: apiUrlInput,
      });

      if (result?.success) {
        await init();
      } else {
        errorDiv.innerHTML = `<div class="error-message">${escapeHtml(result?.error || "Could not save server URL")}</div>`;
        btn.disabled = false;
        btn.textContent = "Save & continue";
      }
    });
}

function showLogin(container) {
  const serverHost = formatServerHost(currentConfig?.apiUrl);

  container.innerHTML = `
    <div class="login-form">
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <h3>Sign in to DotVault</h3>
        <p class="setup-hint">Server: <strong>${escapeHtml(serverHost)}</strong></p>
      </div>
      
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="you@company.com" required>
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="••••••••" required>
      </div>
      
      <button class="btn btn-primary" id="login-btn">Sign In</button>
      <button type="button" class="btn btn-secondary" id="change-server-btn">Change server</button>
      
      <div id="login-error"></div>
    </div>
  `;

  document
    .getElementById("change-server-btn")
    .addEventListener("click", async () => {
      await sendBackgroundMessage({ action: "resetServer" });
      await init();
    });

  document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("login-error");
    const btn = document.getElementById("login-btn");

    if (!email || !password) {
      errorDiv.innerHTML =
        '<div class="error-message">Please enter email and password</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in...";

    const result = await sendBackgroundMessage({
      action: "login",
      email,
      password,
    });

    if (result?.success) {
      await init();
    } else {
      errorDiv.innerHTML = `<div class="error-message">${escapeHtml(result?.error || "Login failed")}</div>`;
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });
}

function formatServerHost(apiUrl) {
  if (!apiUrl?.trim()) return "not set";
  try {
    return new URL(apiUrl.replace(/\/$/, "")).host;
  } catch {
    return apiUrl;
  }
}

async function showProjects(container) {
  // Show loading
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';

  // Sync projects if needed
  const lastSync = currentConfig?.lastSync || 0;
  const needsSync = Date.now() - lastSync > 5 * 60 * 1000; // 5 minutes

  if (needsSync || !currentConfig?.projects?.length) {
    const syncResult = await sendBackgroundMessage({
      action: "syncProjects",
    });
    if (syncResult.success) {
      currentConfig.projects = syncResult.projects;
    }
  }

  const projects = currentConfig?.projects || [];

  let html = `
    <div class="status">
      <div class="status-icon connected"></div>
      <span class="status-text">Connected · ${escapeHtml(formatServerHost(currentConfig?.apiUrl))}</span>
      <button class="btn btn-sm btn-secondary" id="logout-btn" style="margin-left: auto;">Logout</button>
    </div>
  `;

  // Show platform banner if on a supported platform
  if (detectedPlatform) {
    const platformNames = {
      vercel: "Vercel",
      netlify: "Netlify",
      github: "GitHub",
      aws: "AWS",
      railway: "Railway",
      render: "Render",
      heroku: "Heroku",
      digitalocean: "DigitalOcean",
      cloudflare: "Cloudflare",
      supabase: "Supabase",
      neon: "Neon",
    };

    html += `
      <div class="platform-banner">
        <span class="platform-icon">🚀</span>
        <span class="platform-text">Detected ${platformNames[detectedPlatform] || detectedPlatform}</span>
      </div>
    `;
  }

  if (projects.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <h3>No projects found</h3>
        <p>Create a project in your DotVault dashboard</p>
      </div>
    `;
  } else {
    html += '<div class="projects-list">';

    for (const project of projects) {
      const hasEnvs = project.envs && project.envs.length > 0;

      html += `
        <div class="project-item" data-project-id="${project.id}">
          <div class="project-header">
            <div>
              <div class="project-name">${escapeHtml(project.name)}</div>
              <div class="project-slug">${escapeHtml(project.slug)}</div>
            </div>
            <span class="project-toggle">${hasEnvs ? "▼" : ""}</span>
          </div>
          ${
            hasEnvs
              ? `
            <div class="envs-list" style="display: none;">
              ${project.envs
                .map(
                  (env) => `
                <div class="env-item" data-project-id="${project.id}" data-env-id="${env.id}" data-env-label="${escapeHtml(env.label)}">
                  <span class="env-name">${escapeHtml(env.label)}</span>
                  <span class="env-date">${formatDate(env.updatedAt)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
      `;
    }

    html += "</div>";
  }

  html += `
    <div class="actions">
      <button class="btn btn-secondary" id="refresh-btn">Refresh</button>
      <button class="btn btn-secondary" id="change-server-btn">Change server</button>
      <button class="btn btn-primary" id="open-dashboard-btn">Open Dashboard</button>
    </div>
  `;

  container.innerHTML = html;

  // Add event listeners
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await sendBackgroundMessage({ action: "logout" });
    await init();
  });

  document
    .getElementById("change-server-btn")
    .addEventListener("click", async () => {
      await sendBackgroundMessage({ action: "resetServer" });
      await init();
    });

  document.getElementById("refresh-btn").addEventListener("click", async () => {
    const btn = document.getElementById("refresh-btn");
    btn.disabled = true;
    btn.textContent = "Refreshing...";

    const result = await sendBackgroundMessage({ action: "syncProjects" });
    if (result.success) {
      currentConfig.projects = result.projects;
      await showProjects(container);
    } else {
      btn.disabled = false;
      btn.textContent = "Refresh";
    }
  });

  document
    .getElementById("open-dashboard-btn")
    .addEventListener("click", () => {
      const base = currentConfig.apiUrl.replace(/\/$/, "");
      chrome.tabs.create({ url: `${base}/dashboard` });
    });

  // Project expand/collapse
  document.querySelectorAll(".project-header").forEach((header) => {
    header.addEventListener("click", () => {
      const projectItem = header.closest(".project-item");
      const envsList = projectItem.querySelector(".envs-list");
      if (envsList) {
        const isVisible = envsList.style.display !== "none";
        envsList.style.display = isVisible ? "none" : "block";
        projectItem.classList.toggle("expanded", !isVisible);
      }
    });
  });

  // Env item click
  document.querySelectorAll(".env-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const projectId = item.dataset.projectId;
      const envId = item.dataset.envId;
      const envLabel = item.dataset.envLabel;

      await showEnvFill(container, projectId, envId, envLabel);
    });
  });
}

async function showEnvFill(container, projectId, envId, envLabel) {
  // Show loading
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';

  // Fetch env content
  const result = await sendBackgroundMessage({
    action: "getEnvContent",
    projectId,
    envId,
  });

  if (!result.success) {
    container.innerHTML = `
      <div class="error-message">Failed to load environment: ${result.error}</div>
      <button class="btn btn-secondary" id="back-btn">← Back</button>
    `;
    document
      .getElementById("back-btn")
      .addEventListener("click", () => showProjects(container));
    return;
  }

  // Parse env content
  const envVars = parseEnvContent(result.content);
  const varCount = Object.keys(envVars).length;

  let html = `
    <button class="btn btn-sm btn-secondary" id="back-btn" style="margin-bottom: 12px;">← Back to Projects</button>
    
    <div class="fill-section">
      <h3>${escapeHtml(envLabel)}</h3>
      <p style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">${varCount} variables</p>
      
      <div class="fill-preview">
        ${Object.entries(envVars)
          .slice(0, 10)
          .map(
            ([key, value]) => `
          <div class="fill-preview-item">
            <span class="fill-preview-key">${escapeHtml(key)}</span>
            <span class="fill-preview-value">${maskValue(value)}</span>
          </div>
        `,
          )
          .join("")}
        ${varCount > 10 ? `<div style="text-align: center; padding: 8px; font-size: 12px; color: #6b7280;">...and ${varCount - 10} more</div>` : ""}
      </div>
      
      ${
        detectedPlatform
          ? `
        <button class="btn btn-primary" id="fill-btn" style="width: 100%;">
          Fill into ${escapeHtml(detectedPlatform)}
        </button>
      `
          : `
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; font-size: 13px; color: #92400e;">
          Navigate to Vercel, Netlify, GitHub, or other supported platforms to auto-fill variables.
        </div>
      `
      }
    </div>
    
    <div class="actions">
      <button class="btn btn-secondary" id="copy-btn">Copy All</button>
      <button class="btn btn-secondary" id="download-btn">Download .env</button>
    </div>
  `;

  container.innerHTML = html;

  // Back button
  document
    .getElementById("back-btn")
    .addEventListener("click", () => showProjects(container));

  // Fill button
  const fillBtn = document.getElementById("fill-btn");
  if (fillBtn) {
    fillBtn.addEventListener("click", async () => {
      fillBtn.disabled = true;
      fillBtn.textContent = "Filling...";

      const fillResult = await sendBackgroundMessage({
        action: "fillEnvVars",
        envVars,
        platform: detectedPlatform,
      });

      if (fillResult.success) {
        fillBtn.textContent = "✓ Filled Successfully";
        setTimeout(() => {
          fillBtn.disabled = false;
          fillBtn.textContent = `Fill into ${detectedPlatform}`;
        }, 2000);
      } else {
        fillBtn.disabled = false;
        fillBtn.textContent = "Failed - Try Again";
      }
    });
  }

  // Copy button
  document.getElementById("copy-btn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(result.content);
    const btn = document.getElementById("copy-btn");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy All"), 2000);
  });

  // Download button
  document.getElementById("download-btn").addEventListener("click", () => {
    const blob = new Blob([result.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.${envLabel}`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function parseEnvContent(content) {
  const vars = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    vars[key] = value;
  }

  return vars;
}

function maskValue(value) {
  if (value.length <= 8) return "•".repeat(value.length);
  return value.slice(0, 2) + "•".repeat(value.length - 4) + value.slice(-2);
}
