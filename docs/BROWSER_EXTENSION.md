# Browser Extension

The DotVault Browser Extension enables one-click secret injection into popular deployment platforms including Vercel, Netlify, Railway, and more.

## Installation

### Chrome Web Store

1. Visit the [DotVault Extension](https://chrome.google.com/webstore) in the Chrome Web Store
2. Click **Add to Chrome**
3. Grant permissions when prompted

### Firefox Add-ons

1. Visit [DotVault Extension](https://addons.mozilla.org) on Firefox Add-ons
2. Click **Add to Firefox**
3. Confirm installation

### Manual Installation (GitHub release or local build)

**From a GitHub release**

1. Download `dotvault-extension-<version>.zip` from the [releases](https://github.com/lucerowb/dot-vault/releases) page (not the source archive).
2. Unzip it to a folder (for example `~/dotvault-extension`).
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the **unzipped folder** (the folder that contains `manifest.json` at its root).

**From this monorepo**

```bash
pnpm install
pnpm build:extension
# Load unpacked: packages/browser-extension/dist/
```

After updating the extension, click **Reload** on `chrome://extensions` so the background service worker picks up changes.

## Setup

### 1. Connect to DotVault

1. Click the DotVault icon in your browser toolbar
2. **Server URL (required first step)** — enter your instance base URL (same as `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`), then click **Save & continue**. When Chrome prompts for host access, allow it.
3. Sign in with your DotVault email and password

**Build-time default (optional):** When you run `pnpm build:extension`, the build reads `DOTVAULT_API_URL`, then `BETTER_AUTH_URL`, then `NEXT_PUBLIC_APP_URL` from the repo root `.env` / `.env.local` (same order as the CLI). If set, that URL is baked into the extension and the setup step is pre-filled. Generic GitHub release zips are built without those env vars, so end users always configure the server in the popup.

```bash
# Example: org-specific extension build
DOTVAULT_API_URL=https://vault.example.com pnpm build:extension
```

### 2. Select Project

1. Choose your project from the dropdown
2. Select the environment to inject (e.g., `production`, `staging`)
3. The extension will remember your selection

## Supported Platforms

### Vercel

**URL Pattern**: `vercel.com/dashboard/*/settings/environment-variables`

**Features**:

- Auto-detect environment variable fields
- One-click fill all variables
- Individual variable injection
- Preview before injection

**Usage**:

1. Navigate to your project's Environment Variables page
2. Click the DotVault icon
3. Click **Fill Variables**
4. Review and confirm

### Netlify

**URL Pattern**: `app.netlify.com/sites/*/settings/deploys#environment-variables`

**Features**:

- Bulk import support
- Individual key-value injection
- Auto-detect existing variables

### Railway

**URL Pattern**: `railway.app/project/*/settings/variables`

**Features**:

- Service-specific variable injection
- Shared variable support
- Auto-detect service selection

### GitHub

**URL Pattern**: `github.com/*/settings/secrets/actions`

**Features**:

- Repository secret injection
- Organization secret support
- Environment-specific secrets

### Render

**URL Pattern**: `dashboard.render.com/web/*/env`

**Features**:

- Environment group support
- Secret file injection
- Build-time vs runtime variables

### Heroku

**URL Pattern**: `dashboard.heroku.com/apps/*/settings`

**Features**:

- Config var injection
- Pipeline promotion support

### AWS Amplify

**URL Pattern**: `console.aws.amazon.com/amplify/home`

**Features**:

- Environment variable injection
- Branch-specific variables

### Cloudflare Pages

**URL Pattern**: `dash.cloudflare.com/*/pages/view/*`

**Features**:

- Production vs preview variables
- Encrypted variable support

### Supabase

**URL Pattern**: `app.supabase.com/project/*/settings/api`

**Features**:

- API key management
- Database URL injection

## Usage

### Quick Fill

1. Navigate to a supported platform's environment variables page
2. Click the floating DotVault button (bottom-right corner)
3. Review the variables to be injected
4. Click **Confirm** to fill all fields

### Selective Injection

1. Open the DotVault popup (click toolbar icon)
2. Select specific variables to inject
3. Click **Inject Selected**
4. Variables are filled into detected fields

### Keyboard Shortcuts

- `Alt+Shift+D` (Windows/Linux) or `Option+Shift+D` (Mac): Open DotVault popup
- `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac): Confirm injection

## Security

### Data Protection

- **No data storage**: Secrets are never stored in the browser
- **Memory only**: Variables exist only during the injection session
- **Encrypted transport**: All communication uses TLS 1.3
- **No logging**: Injected values are never logged

### Permissions

The extension requests minimal permissions:

- **Active tab**: To detect environment variable fields
- **Storage**: To save preferences (not secrets)
- **Host permissions**: Only for supported platforms

### Privacy

- No analytics or tracking
- No third-party services
- Open source (MIT license)
- Auditable code

## Configuration

### Extension Options

Access via: Right-click extension icon → Options

**General**:

- Default project
- Default environment
- Auto-fill on page load
- Show floating button

**Security**:

- Require confirmation before injection
- Mask values in preview
- Auto-lock after inactivity

**Platforms**:

- Enable/disable specific platforms
- Custom URL patterns
- Platform-specific settings

### Per-Project Settings

Configure different defaults for each project:

```json
{
  "project-abc": {
    "defaultEnv": "staging",
    "autoFill": false,
    "requireConfirmation": true
  },
  "project-xyz": {
    "defaultEnv": "production",
    "autoFill": true,
    "requireConfirmation": false
  }
}
```

## Troubleshooting

### Blank popup (header only, no sign-in form)

Usually the background service worker failed to start (often after loading an older build). On `chrome://extensions`, click **Reload** on DotVault, then open the popup again. If it persists, remove the extension, unzip a fresh copy from the latest GitHub release, and load unpacked again.

### Wrong server / login fails

The footer link shows your configured instance host. On sign-in, set **Server URL** to your real dashboard origin (not a marketing domain unless that is where your app runs). Approve the Chrome permission prompt for that host.

### Extension Not Detecting Fields

1. Refresh the page
2. Check if platform is supported
3. Verify URL matches expected pattern
4. Try manual field selection

### Connection Issues

1. Check DotVault account status
2. Re-authenticate the extension
3. Clear extension cache
4. Re-install if persistent

### Injection Failures

1. Verify you have editor access to the project
2. Check if environment exists
3. Ensure variables are not empty
4. Review browser console for errors

### Platform Updates

If a platform changes their UI:

1. Check for extension updates
2. Report the issue: support@dotvault.io
3. Use manual copy-paste as workaround

## Development

### Building from Source

```bash
# From the dot-vault monorepo root
pnpm install
pnpm build:extension

# Load unpacked from packages/browser-extension/dist/
```

### Adding New Platform Support

1. Add platform configuration to `src/platforms.ts`:

```typescript
export const platforms = {
  newplatform: {
    name: "New Platform",
    urlPattern: /newplatform\.com/,
    selectors: {
      envRow: ".env-row",
      keyInput: 'input[name="key"]',
      valueInput: 'input[name="value"]',
      addButton: "button.add-env",
      saveButton: "button.save",
    },
  },
};
```

2. Add injection logic to `src/content.ts`
3. Test thoroughly
4. Submit PR

### Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Manual testing
npm run test:manual
```

## Privacy Policy

### Data Collection

The DotVault extension collects:

- **Extension preferences**: Project selection, settings
- **Usage statistics**: Feature usage (anonymized)
- **Error reports**: Crash logs (opt-in)

### Data NOT Collected

- Secret values
- Environment variable contents
- Platform credentials
- Browsing history

### Third Parties

No data is shared with third parties except:

- DotVault API (for fetching secrets)
- Chrome Web Store/Firefox Add-ons (for updates)

## Support

### Getting Help

- Documentation: https://docs.dotvault.io/extension
- Community: https://community.dotvault.io
- Email: support@dotvault.io
- GitHub Issues: https://github.com/dotvault/extension/issues

### Reporting Bugs

Include:

1. Browser version
2. Extension version
3. Platform being used
4. Steps to reproduce
5. Screenshots if applicable

### Feature Requests

Submit via:

- GitHub Discussions
- Community forum
- Email to feedback@dotvault.io

## Changelog

### v1.2.0 (Latest)

- Added Railway support
- Improved Vercel detection
- Keyboard shortcuts
- Bug fixes

### v1.1.0

- Added Netlify support
- Added GitHub support
- Floating button option
- Security improvements

### v1.0.0

- Initial release
- Vercel support
- Basic injection
- Project selection

## License

MIT License - See LICENSE file for details
