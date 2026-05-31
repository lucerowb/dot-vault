// Content script for DotVault extension
// Injected into supported platform pages

interface PlatformSelectors {
  envRow: string;
  keyInput: string;
  valueInput: string;
  addButton: string;
  saveButton: string;
}

const platformConfigs: Record<string, PlatformSelectors> = {
  vercel: {
    envRow: '[data-testid="env-row"], .env-row',
    keyInput: 'input[name*="key"], input[placeholder*="KEY"]',
    valueInput:
      'input[name*="value"], input[placeholder*="value"], [data-testid="env-value-input"]',
    addButton: 'button[data-testid="add-env-button"], button:has-text("Add")',
    saveButton: 'button[type="submit"], button:has-text("Save")',
  },
  netlify: {
    envRow: '.env-var-row, [data-testid="env-var"]',
    keyInput: 'input[name="key"]',
    valueInput: 'input[name="value"], textarea[name="value"]',
    addButton:
      'button:has-text("Add variable"), button:has-text("New variable")',
    saveButton: 'button[type="submit"], button:has-text("Save")',
  },
  github: {
    envRow: '.secret-row, [data-testid="secret-row"]',
    keyInput: 'input[name="name"]',
    valueInput:
      'input[name="encrypted_value"], textarea[name="encrypted_value"]',
    addButton: 'button:has-text("Add secret"), button:has-text("New secret")',
    saveButton: 'button[type="submit"], button:has-text("Add secret")',
  },
  railway: {
    envRow: '.env-variable-row, [data-testid="env-variable"]',
    keyInput: 'input[placeholder="KEY"]',
    valueInput: 'input[placeholder="VALUE"], textarea[placeholder="VALUE"]',
    addButton: 'button:has-text("Add"), button:has-text("New Variable")',
    saveButton: 'button:has-text("Save"), button[type="submit"]',
  },
  render: {
    envRow: ".env-var-row",
    keyInput: 'input[name*="key"]',
    valueInput: 'input[name*="value"], textarea[name*="value"]',
    addButton: 'button:has-text("Add Environment Variable")',
    saveButton: 'button[type="submit"], button:has-text("Save Changes")',
  },
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "detectFields") {
    const platform = detectPlatform();
    const fields = detectEnvFields(platform);
    sendResponse({ success: true, platform, fields });
    return true;
  }

  if (request.action === "fillEnvVars") {
    const result = fillEnvVars(request.envVars);
    sendResponse(result);
    return true;
  }

  return false;
});

function detectPlatform(): string | null {
  const hostname = window.location.hostname;

  const platforms: Record<string, string> = {
    "vercel.com": "vercel",
    "netlify.com": "netlify",
    "github.com": "github",
    "railway.app": "railway",
    "render.com": "render",
    "heroku.com": "heroku",
    "aws.amazon.com": "aws",
    "cloudflare.com": "cloudflare",
    "supabase.com": "supabase",
    "neon.tech": "neon",
  };

  for (const [domain, platform] of Object.entries(platforms)) {
    if (hostname.includes(domain)) {
      return platform;
    }
  }

  return null;
}

function detectEnvFields(platform: string | null): {
  hasFields: boolean;
  fieldCount: number;
} {
  if (!platform) {
    // Try generic detection
    const inputs = document.querySelectorAll(
      'input[name*="env"], input[name*="key"], input[name*="value"], textarea[name*="env"]',
    );
    return {
      hasFields: inputs.length > 0,
      fieldCount: inputs.length,
    };
  }

  const config = platformConfigs[platform];
  if (!config) {
    return { hasFields: false, fieldCount: 0 };
  }

  const rows = document.querySelectorAll(config.envRow);
  return {
    hasFields: rows.length > 0,
    fieldCount: rows.length,
  };
}

function fillEnvVars(envVars: Record<string, string>): {
  success: boolean;
  filled: number;
  missing: string[];
} {
  const platform = detectPlatform();
  const filled: string[] = [];
  const missing: string[] = [];

  if (!platform) {
    // Generic filling strategy
    const inputs = document.querySelectorAll("input, textarea");

    for (const [key, value] of Object.entries(envVars)) {
      let filledThisKey = false;

      // Look for key input
      for (const input of inputs) {
        const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
        const keyMatch =
          inputEl.name?.toLowerCase().includes("key") ||
          inputEl.placeholder?.toLowerCase().includes("key") ||
          inputEl.id?.toLowerCase().includes("key");

        if (keyMatch && inputEl.value === key) {
          // Found the key input, now look for adjacent value input
          const row = inputEl.closest(
            'tr, .row, [class*="row"], [class*="field"]',
          );
          if (row) {
            const valueInput = row.querySelector(
              'input[name*="value"], input[placeholder*="value"], textarea[name*="value"], textarea[placeholder*="value"]',
            ) as HTMLInputElement | HTMLTextAreaElement | null;

            if (valueInput) {
              valueInput.value = value;
              valueInput.dispatchEvent(new Event("input", { bubbles: true }));
              valueInput.dispatchEvent(new Event("change", { bubbles: true }));
              filled.push(key);
              filledThisKey = true;
              break;
            }
          }
        }
      }

      if (!filledThisKey) {
        missing.push(key);
      }
    }
  } else {
    // Platform-specific filling
    const config = platformConfigs[platform];
    if (config) {
      const rows = document.querySelectorAll(config.envRow);

      for (const [key, value] of Object.entries(envVars)) {
        let filledThisKey = false;

        // Check existing rows
        for (const row of rows) {
          const keyInput = row.querySelector(
            config.keyInput,
          ) as HTMLInputElement | null;

          if (keyInput && keyInput.value === key) {
            const valueInput = row.querySelector(config.valueInput) as
              | HTMLInputElement
              | HTMLTextAreaElement
              | null;

            if (valueInput) {
              valueInput.value = value;
              valueInput.dispatchEvent(new Event("input", { bubbles: true }));
              valueInput.dispatchEvent(new Event("change", { bubbles: true }));
              filled.push(key);
              filledThisKey = true;
              break;
            }
          }
        }

        if (!filledThisKey) {
          missing.push(key);
        }
      }
    }
  }

  // Show notification
  showNotification(filled.length, Object.keys(envVars).length);

  return {
    success: filled.length > 0,
    filled: filled.length,
    missing,
  };
}

function showNotification(filled: number, total: number): void {
  // Remove existing notification
  const existing = document.getElementById("dotvault-notification");
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement("div");
  notification.id = "dotvault-notification";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    animation: dotvault-slide-in 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="currentColor"/>
      </svg>
      <span>DotVault filled ${filled}/${total} variables</span>
    </div>
  `;

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes dotvault-slide-in {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "dotvault-slide-in 0.3s ease-out reverse";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add floating DotVault button on supported platforms
function addFloatingButton(): void {
  const platform = detectPlatform();
  if (!platform) return;

  // Check if button already exists
  if (document.getElementById("dotvault-float-btn")) return;

  const button = document.createElement("button");
  button.id = "dotvault-float-btn";
  button.innerHTML = "🔐 DotVault";
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #111827;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    z-index: 2147483646;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
  });

  button.addEventListener("click", () => {
    // Open extension popup
    chrome.runtime.sendMessage({ action: "openPopup" });
  });

  document.body.appendChild(button);
}

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    addFloatingButton();
  });
} else {
  addFloatingButton();
}

// Re-add button on navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(addFloatingButton, 1000);
  }
}).observe(document, { subtree: true, childList: true });
