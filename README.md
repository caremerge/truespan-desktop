# Truespan Desktop App

A desktop wrapper application for the Truespan web application with custom authentication and "Remember Me" functionality.

## Local Build + GitHub Release Updates

This project is set up for **local build + local signing**, then **publishing to GitHub Releases** so users receive in-app updates.

### One-Time Setup

1. Configure `build.publish` in `package.json`:
   - `owner`: your GitHub username/org
   - `repo`: your GitHub repo name
2. Create a GitHub Personal Access Token with `repo` scope.
3. Set `GH_TOKEN` in your shell.

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

You must build/sign on each OS and publish to the same GitHub Release:

- **Windows machine**:
  ```bash
  npm run publish:win
  ```
- **Mac machine**:
  ```bash
  npm run publish:mac
  ```

Both commands upload the installers plus update metadata:
`latest.yml`, `latest-mac.yml`, and `*.blockmap`.
These files are required for auto-updates to work.

## Docs

- `docs/AUTO_UPDATE_SETUP.md`
- `docs/QUICK_START_SIGNING.md`
- `docs/SIGNING_SETUP.md`
- `docs/MAC_BUILD_QUICKSTART.md`
- `docs/MAC_TROUBLESHOOTING.md`
- `docs/ENTITLEMENTS_FIX_SUMMARY.md`