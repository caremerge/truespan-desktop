# Auto-Update Setup Guide

This guide explains how to use the GitHub releases auto-update system that's now configured in your TrueSpan Desktop app.

## 🎯 Overview

Your app will now automatically check for updates on startup and notify users when new versions are available. Updates are distributed via GitHub releases.

## 📋 Prerequisites

1. **GitHub Repository**: Create a GitHub repository for your project (if you haven't already)
2. **GitHub Personal Access Token**: Required to publish releases

## 🔧 Initial Setup

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `truespan-desktop` (or your preferred name)
3. Make it **public** or **private** (both work)

### Step 2: Update package.json

Open `package.json` and update the GitHub configuration (line 27-28):

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",  // ← Change this to your GitHub username
  "repo": "truespan-desktop"         // ← Change this to your repo name if different
}
```

### Step 3: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Direct link: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "TrueSpan Desktop Releases"
4. Set expiration to "No expiration" (or your preferred time)
5. Check the following scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click "Generate token"
7. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 4: Set Environment Variable

Set the `GH_TOKEN` environment variable with your token:

#### Windows (PowerShell):
```powershell
$env:GH_TOKEN="your_token_here"
```

#### Windows (Persistent):
```powershell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'your_token_here', 'User')
```

#### Mac/Linux:
```bash
export GH_TOKEN="your_token_here"
```

#### Mac/Linux (Persistent - add to ~/.bashrc or ~/.zshrc):
```bash
echo 'export GH_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

### Step 5: Install New Dependencies

Run this command to install the auto-update dependencies:

```bash
npm install
```

## 🚀 Publishing Updates

### First Time Publishing (Version 1.0.0)

1. Make sure your `package.json` shows `"version": "1.0.0"`
2. Build and publish:
   ```bash
   npm run publish
   ```
   
   Or platform-specific:
   ```bash
   npm run publish:win   # Windows only
   npm run publish:mac   # Mac only
   ```

3. This will:
   - Build your application
   - Create installers (`.exe` for Windows, `.dmg` for Mac)
   - Create a GitHub release with version `1.0.0`
   - Upload the installers to the release
   - Generate update metadata files (`latest.yml`, `latest-mac.yml`)

### Publishing Future Updates

When you want to release a new version:

1. **Update the version** in `package.json`:
   ```json
   "version": "1.0.1"  // Increment from 1.0.0
   ```

2. **Build and publish**:
   ```bash
   npm run publish
   ```

3. **Done!** Users will be notified of the update next time they launch the app.

## 📱 User Experience

### What Users See

1. **App launches** → After 5 seconds, app checks for updates in the background
2. **Update found** → Dialog appears:
   ```
   Update Available
   A new version (1.0.1) is available!
   Would you like to download it now? The app will continue to work while downloading.
   
   [Download Update]  [Later]
   ```

3. **Download in progress** → App continues working, update downloads silently
4. **Download complete** → Dialog appears:
   ```
   Update Ready
   Update has been downloaded successfully!
   The app will restart to install the update. All your work will be saved.
   
   [Restart Now]  [Restart Later]
   ```

5. **User clicks "Restart Now"** → App closes, installer runs, app reopens with new version

### Silent Updates

If user clicks "Later", the update will install automatically when they quit the app (thanks to `autoInstallOnAppQuit: true`).

## 🧪 Testing Updates Locally

### Option 1: Test with Different Versions

1. Build version 1.0.0:
   ```bash
   npm run dist
   ```

2. Install the built app from `dist/` folder

3. Change version to 1.0.1 in `package.json`

4. Publish to GitHub:
   ```bash
   npm run publish
   ```

5. Launch your installed app (version 1.0.0)

6. Wait 5 seconds → Update notification should appear!

### Option 2: Manually Trigger Update Check

Add this code to your app for testing:

```javascript
// In main.js, add an IPC handler
ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});
```

Then call it from renderer process:
```javascript
ipcRenderer.invoke('check-for-updates');
```

## 🔍 Troubleshooting

### Issue: "Cannot find updates"

**Solution**: Make sure:
- GitHub repo URL is correct in `package.json`
- GH_TOKEN is set correctly
- GitHub release was created successfully
- App is not in dev mode (updates are disabled in dev mode)

### Issue: "Update check fails silently"

**Solution**: Check logs:
- Windows: `%USERPROFILE%\AppData\Roaming\TrueSpan Living\logs\main.log`
- Mac: `~/Library/Logs/TrueSpan Living/main.log`

### Issue: GH_TOKEN not working

**Solution**: 
- Regenerate token with `repo` scope
- Make sure token isn't expired
- Verify environment variable is set: `echo $env:GH_TOKEN` (Windows) or `echo $GH_TOKEN` (Mac/Linux)

### Issue: "Build succeeds but doesn't publish"

**Solution**: Make sure you're using `npm run publish`, not `npm run dist` or `npm run build`

## 📝 Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major** (1.x.x): Breaking changes
- **Minor** (x.1.x): New features, backward compatible
- **Patch** (x.x.1): Bug fixes

Examples:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.1.0` → `2.0.0` (breaking change)

## 🔐 Security Notes

- **Never commit** your `GH_TOKEN` to git
- Add `.env` files to `.gitignore` if storing tokens there
- Use GitHub Actions secrets for CI/CD publishing
- Consider using token expiration for added security

## 📊 Monitoring Updates

### Check GitHub Releases

View all releases and download stats:
```
https://github.com/YOUR_USERNAME/truespan-desktop/releases
```

### See Update Logs

Check logs in:
- **Windows**: `%USERPROFILE%\AppData\Roaming\TrueSpan Living\logs\main.log`
- **Mac**: `~/Library/Logs/TrueSpan Living/main.log`

## 🎉 You're All Set!

Your app now has a professional auto-update system. Users will always stay on the latest version with minimal friction.

### Quick Reference Commands

```bash
# Install dependencies
npm install

# Development
npm start

# Build without publishing
npm run dist

# Build and publish to GitHub
npm run publish          # Both platforms
npm run publish:win      # Windows only
npm run publish:mac      # Mac only
```

---

**Need help?** Check the logs or search for error messages in the [electron-updater documentation](https://www.electron.build/auto-update).

