# Truespan Desktop App

A desktop wrapper application for the Truespan web application with custom authentication and "Remember Me" functionality.

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

## Docs

- `docs/AUTO_UPDATE_SETUP.md`
- `docs/QUICK_START_SIGNING.md`
- `docs/SIGNING_SETUP.md`
- `docs/MAC_BUILD_QUICKSTART.md`
- `docs/MAC_TROUBLESHOOTING.md`
- `docs/ENTITLEMENTS_FIX_SUMMARY.md`