# Truespan Desktop App

Desktop wrapper for the Go Icon web app with Truespan branding, custom auth, and auto-updates.

## Overview

- **Platform:** Electron (Windows + macOS)
- **Purpose:** Wraps `goicon.com` with native features and update delivery
- **Update feed:** GitHub Releases (electron-updater) (Required Repo Set to Public)

## GitHub Actions Release Updates

This project is set up for **GitHub Actions builds + signing**, then **publishing to GitHub Releases** so users receive in-app updates.

### One-Time Setup

1. Configure `build.publish` in `package.json`:
   - `owner`: your GitHub username/org
   - `repo`: your GitHub repo name
2. Add GitHub Actions secrets:
   - `ESIGNER_USERNAME`
   - `ESIGNER_PASSWORD`
   - `ESIGNER_CREDENTIAL_ID`
   - `ESIGNER_TOTP_SECRET`
   - Optional: `LEGACY_RELEASE_TOKEN`, `LEGACY_RELEASE_REPO`

### Version Bump

Use the helper scripts (they update `package.json` only):

```bash
npm run version:patch
# or: npm run version:minor
# or: npm run version:major
# or: npm run version:set -- 1.2.3
```

Commit and push the version bump before publishing.

### Publish Updates (per OS)

Releases are created and assets are uploaded via GitHub Actions:

1. Bump the version and push a tag:
```bash
npm run version:patch
git commit -am "Bump version"
git tag v1.0.8
git push && git push --tags
```
2. The `Create Release` workflow builds:
   - macOS DMG + auto-update assets
   - Windows EXE (signed via eSigner)

You can also run the workflow manually and toggle Windows signing:
`Actions → Create Release → Run workflow → sign_windows`.

**Note:** A normal `git push` does not trigger builds. Only version tags (`v*`) or manual runs do.

## Project Structure

- `src/` — Electron main + preload code
- `assets/` — icons and branding
- `build/` — signing configs and platform packaging
- `scripts/` — build/sign helpers
- `docs/` — operational docs

## Windows App Links (https://goicon.com → app)

Windows `https://` links require an **AppX/MSIX** package (NSIS `.exe` does not support App Links).

1. Build and sign AppX:
```bash
npm run build:win:appx
```
2. Provide AppX signing inputs (either option):
   - `APPX_CERT_THUMBPRINT` (cert in Windows cert store), or
   - `APPX_CERT_PATH` (+ optional `APPX_CERT_PASSWORD`)
3. Host `windows-app-web-link` at:
   - `https://goicon.com/.well-known/windows-app-web-link`
   - `https://api.goicon.com/.well-known/windows-app-web-link`

See `docs/WINDOWS_APP_LINKS.md` for details.

## macOS Universal Links

macOS `https://` links require:
- App entitlements with `applinks:` domains
- AASA files hosted at `/.well-known/apple-app-site-association`
- A fresh notarized build after entitlement changes

See `docs/UPDATE_CUTOVER.md` and `build/entitlements.mac.plist`.

## Deep Links

- Custom scheme: `goicon://...` (works after install on both platforms)
- Web links: `https://goicon.com/...` (macOS via Universal Links, Windows via App Links + MSIX)

## Auto-Update Assets (Required)

Each release must include:
- Windows: `latest.yml`, `*.exe`, `*.blockmap`
- macOS: `latest-mac.yml`, `*-mac.zip`, `*.blockmap`, `*.dmg`

## Docs

- `docs/AUTO_UPDATE_SETUP.md`
- `docs/QUICK_START_SIGNING.md`
- `docs/SIGNING_SETUP.md`
- `docs/MAC_BUILD_QUICKSTART.md`
- `docs/MAC_TROUBLESHOOTING.md`
- `docs/ENTITLEMENTS_FIX_SUMMARY.md`
- `docs/WINDOWS_APP_LINKS.md`