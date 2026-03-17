# Windows Store Migration — Legacy NSIS Users

This document covers migrating existing Windows users (NSIS `.exe` installer) to the Microsoft Store (AppX) version.

## Background

- **Old distribution:** NSIS `.exe` signed via eSigner, auto-updates via `electron-updater` + GitHub Releases
- **New distribution:** Unsigned `.appx` submitted to Microsoft Store, updates handled by the Store
- **Problem:** Existing users won't automatically move to the Store version. They need a one-time migration.

## How It Works

The app includes migration logic in `src/main.js` that runs on Windows when **not** installed from the Store (`process.windowsStore !== true`). It shows a dialog prompting the user to install the Store version.

The dialog offers three options:
1. **Open Microsoft Store** — opens the Store listing directly
2. **Remind Me Later** — dismisses until next launch
3. **Don't Show Again** — permanently dismisses (stored in keytar)

## Step-by-Step

### 1. Wait for Store approval

Submit the `.appx` to Partner Center and wait for Microsoft to approve it. Once approved, note the **Store product ID** (format: `9NXXXXXXXX`). You can find it in:
- Partner Center > Product overview
- Or the Store URL: `https://apps.microsoft.com/detail/9NXXXXXXXX`

### 2. Update the Store URL in code

In `src/main.js`, find the migration section and replace the placeholder:

```javascript
const STORE_URL = 'ms-windows-store://pdp/?productid=9NS9B080746M';
```

Change `9P1234CHANGE` to your actual product ID (e.g., `9NXXXXXXXX`).

### 3. Bump the version

```bash
npm run version:patch
git commit -am "Add Store migration prompt for legacy Windows users"
```

### 4. Build the final NSIS installer

Since the default build target is now `appx`, use a CLI override to build NSIS:

```bash
npx electron-builder --win nsis
```

This produces in `dist/`:
- `Truespan-Neighborhood-{version}.exe`
- `Truespan-Neighborhood-{version}.exe.blockmap`
- `latest.yml`

### 5. Create a GitHub Release

Tag and push:

```bash
git tag v{version}
git push && git push --tags
```

Then manually upload the three files from step 4 to the GitHub Release. The CI workflow now builds `.appx` by default, so for this one-off NSIS release you upload manually.

Alternatively, build locally and create the release entirely via the GitHub UI.

### 6. What happens for legacy users

1. Their installed app checks GitHub Releases for updates (via `electron-updater`)
2. It finds the new version, downloads, and installs automatically
3. On next launch, a dialog appears: *"Truespan Neighborhood is now available on the Microsoft Store!"*
4. User clicks **Open Microsoft Store**, installs the Store version
5. User uninstalls the old NSIS version from **Settings > Apps**

### 7. Clean up (after migration period)

After enough time has passed (e.g., 30-60 days):
- Remove the migration dialog code from `src/main.js`
- Delete the NSIS bridge release from GitHub if desired
- Remove eSigner GitHub secrets if not already done:
  - `ESIGNER_USERNAME`
  - `ESIGNER_PASSWORD`
  - `ESIGNER_CREDENTIAL_ID`
  - `ESIGNER_TOTP_SECRET`

## Notes

- The final NSIS `.exe` will be **unsigned** (eSigner has been removed). Since this is delivered as an auto-update to existing users (not a fresh download), SmartScreen typically does not trigger. If SmartScreen is a concern, you could do this release before removing eSigner.
- The migration prompt only appears on Windows when `process.windowsStore` is `false`.
- The "Don't Show Again" preference is stored via `keytar` in the system credential store.
- macOS users are unaffected — they continue receiving updates via GitHub Releases as before.
