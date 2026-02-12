# Truespan Desktop App

Desktop wrapper for the Go Icon web app with Truespan branding, custom auth, and auto-updates.

## Overview

- **Platform:** Electron (Windows + macOS)
- **Purpose:** Wraps `goicon.com` with native features and update delivery
- **Windows distribution:** Microsoft Store (AppX)
- **macOS distribution:** Signed + notarized DMG via GitHub Releases (electron-updater)

## Distribution

### Windows — Microsoft Store

Windows builds produce an unsigned `.appx` package that is submitted to the Microsoft Store via [Partner Center](https://partner.microsoft.com/dashboard). Microsoft handles signing and distribution.

- **Build:** `npm run build:win` produces `dist/Truespan-Neighborhood-{version}.appx`
- **Updates:** Managed automatically by the Microsoft Store
- **Identity:** `GoIcon.TruespanNeighborhood` (Publisher: `CN=0615E2C2-9EA4-4EE6-BB49-33F2E386CF25`)
- **Web-to-app links:** Enabled via `windows-app-web-link` hosted at `api.goicon.com/.well-known/`

### macOS — GitHub Releases (Direct Download)

macOS builds produce a signed, notarized DMG uploaded to GitHub Releases. In-app auto-updates are handled by `electron-updater`.

- **Build:** `npm run build:mac` produces a universal DMG (Intel + Apple Silicon)
- **Signing:** Developer ID certificate (Go Icon LLC) + Apple notarization
- **Updates:** `electron-updater` checks GitHub Releases on startup
- **Web-to-app links:** Enabled via Universal Links (AASA at `api.goicon.com/.well-known/apple-app-site-association`)

## CI/CD — GitHub Actions

Releases are built automatically via the `Create Release` workflow (`.github/workflows/release.yml`).

### Triggering a Release

1. Bump the version and push a tag:
```bash
npm run version:patch
git commit -am "Bump version"
git tag v1.0.8
git push && git push --tags
```

2. The workflow builds:
   - **macOS:** Signed + notarized DMG, uploaded to GitHub Release
   - **Windows:** Unsigned `.appx`, uploaded to GitHub Release (then manually submitted to Partner Center)

You can also trigger the workflow manually via `Actions > Create Release > Run workflow`.

**Note:** Only version tags (`v*`) or manual runs trigger builds. A normal `git push` does not.

### GitHub Secrets (Required)

**macOS signing:**
- `APPLE_CERT_DATA` — Base64-encoded P12 certificate
- `APPLE_CERT_PASSWORD` — Certificate password
- `KEYCHAIN_PASSWORD` — Temporary keychain password
- `APPLE_ID` — Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD` — App-specific password for notarization
- `APPLE_TEAM_ID` — `C42TKCA35H`

**Optional:**
- `LEGACY_RELEASE_TOKEN` — For publishing to a secondary repo
- `LEGACY_RELEASE_REPO` — Secondary repo name

## Version Bump

Use the helper scripts (they update `package.json` only):

```bash
npm run version:patch
# or: npm run version:minor
# or: npm run version:major
# or: npm run version:set -- 1.2.3
```

Commit and push the version bump before tagging.

## Deep Links

| Platform | Mechanism | Trigger |
|----------|-----------|---------|
| macOS | Universal Links (AASA) | `https://api.goicon.com/social/*` |
| Windows | App Links (windows-app-web-link) | `https://api.goicon.com/social/*` |
| Both | Custom protocol | `goicon://social/*` |

### Configuration

- **macOS entitlements:** `build/entitlements.mac.plist` — declares `applinks:api.goicon.com`
- **AASA file:** Hosted at `https://api.goicon.com/.well-known/apple-app-site-association`
  - App ID: `C42TKCA35H.com.goicon.truespan.desktop`
  - Paths: `/social/*`, `/facilities/*/social/*`
- **Windows app web link:** Hosted at `https://api.goicon.com/.well-known/windows-app-web-link`
  - Package family name: `GoIcon.TruespanNeighborhood_t99k7bkaz0ett`

## Project Structure

- `src/` — Electron main + preload code
- `assets/` — Icons and branding
- `build/` — Platform packaging configs (entitlements, AppX icons)
- `scripts/` — Build helpers (icon generation, version bumping)
- `docs/` — Operational docs

## Docs

- `docs/AUTO_UPDATE_SETUP.md`
- `docs/MAC_BUILD_QUICKSTART.md`
- `docs/MAC_TROUBLESHOOTING.md`
- `docs/ENTITLEMENTS_FIX_SUMMARY.md`
- `docs/WINDOWS_APP_LINKS.md`
