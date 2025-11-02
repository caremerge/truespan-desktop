# Mac Installer Quick Start (Without a Mac)

## ✅ What I've Set Up For You:

1. ✅ GitHub Actions workflow (`.github/workflows/build-mac.yml`)
2. ✅ Notarization script (`scripts/notarize.js`)
3. ✅ Entitlements file (`build/entitlements.mac.plist`)
4. ✅ Updated `package.json` with Mac signing config
5. ✅ Installed `@electron/notarize` package

---

## 🚀 Recommended: Use GitHub Actions (FREE)

### Step 1: Get Apple Developer Account
- Go to: https://developer.apple.com/programs/
- Enroll: **$99/year**
- Wait for approval (1-2 days)

### Step 2: Create Apple Certificates

After Apple approval:

1. Go to: https://developer.apple.com/account/resources/certificates/
2. Click **"+"** → Select **"Developer ID Application"**
3. You'll need a Certificate Signing Request (CSR):
   - **Problem**: Normally done on Mac
   - **Solution**: Use online tool or ask someone with a Mac

**Alternative**: Use the certificate creation tool in GitHub Actions (advanced)

### Step 3: Create App-Specific Password

1. Go to: https://appleid.apple.com/account/manage
2. Security → App-Specific Passwords
3. Click **"+"** → Generate password
4. **SAVE THIS PASSWORD!**

### Step 4: Get Your Team ID

1. Go to: https://developer.apple.com/account/
2. Look for "Team ID" on your account page
3. Copy it (format: ABC123DEF4)

### Step 5: Set Up GitHub Repository

```bash
# If not already on GitHub:
git init
git add .
git commit -m "Add Mac build support"
git branch -M main
git remote add origin https://github.com/yourusername/truespan.git
git push -u origin main
```

### Step 6: Add GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Click "New repository secret" and add:

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `APPLE_CERT_DATA` | Base64 of .p12 certificate | Convert your certificate: `base64 certificate.p12` |
| `APPLE_CERT_PASSWORD` | Password for .p12 | Password you set when exporting cert |
| `APPLE_ID` | Your Apple ID email | Your Apple account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | From Step 3 above |
| `APPLE_TEAM_ID` | Your Team ID | From Step 4 above |
| `KEYCHAIN_PASSWORD` | Any secure password | Make up a strong password |

### Step 7: Push and Build!

```bash
git add .
git commit -m "Configure Mac signing"
git push
```

Go to: **Repository → Actions** tab

Watch your Mac installer build automatically! 🎉

---

## Alternative 1: Cloud Mac Service

### MacinCloud ($30/month)

1. Sign up: https://www.macincloud.com/
2. Choose "Developer Plan"
3. Access Mac via Remote Desktop
4. Clone your repo
5. Install Node.js: https://nodejs.org/
6. Run: `npm install && npm run build:mac`

### MacStadium ($79/month)

Similar to MacinCloud but dedicated Mac Mini

---

## Alternative 2: Test Build (Unsigned)

You can build unsigned Mac app right now on Windows:

```bash
npm run build:mac
```

**BUT:**
- ❌ Won't run on real Macs (Gatekeeper blocks it)
- ❌ Shows severe security warnings
- ✅ Good for checking if build works

---

## Cost Breakdown

### One-Time Setup:
- Apple Developer Account: **$99/year** (required for any option)

### Ongoing:
- **GitHub Actions**: **FREE** ✅ Recommended
- **MacinCloud**: $30/month
- **MacStadium**: $79/month
- **Buy Mac Mini**: $599 one-time

---

## Timeline

| Step | Time |
|------|------|
| Apple Developer enrollment | 1-2 days |
| Certificate creation | 30 minutes |
| GitHub Actions setup | 1 hour |
| First successful build | Minutes after setup |

---

## What Happens When You Build

1. GitHub Actions starts macOS runner
2. Checks out your code
3. Installs Node.js and dependencies
4. Imports your Apple certificates
5. Builds the Electron app
6. Signs with your Developer ID
7. Notarizes with Apple (verification)
8. Creates .dmg installer
9. Uploads as artifact (you can download it!)

---

## Troubleshooting

### App Won't Open After Signing/Notarization

**Problem**: App is properly signed and notarized but won't launch (error code 153/137)

**Cause**: Entitlements file includes capabilities not provisioned in Apple Developer account

**Solution**: Use minimal entitlements for Electron apps. Your `build/entitlements.mac.plist` should contain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
  </dict>
</plist>
```

**Note**: Only add additional entitlements (like `associated-domains` or `keychain-access-groups`) if you've properly configured them in your Apple Developer account with provisioning profiles.

### Verify Signing Status

```bash
# Check if app is properly signed and notarized
spctl -a -vvv -t install "dist/mac-universal/TrueSpan Living.app"

# Should show: source=Notarized Developer ID
```

---

## Need Help?

1. **Certificate issues**: Check error logs in Actions tab
2. **GitHub Actions failing**: Check Actions tab for error logs
3. **No Mac for CSR**: Consider MacinCloud trial or ask a friend
4. **App won't open**: See Troubleshooting section above

---

## Next Steps

Choose your approach:

- ✅ **Recommended**: Follow Steps 1-7 above for GitHub Actions
- 🌐 **Cloud Mac**: Sign up for MacinCloud/MacStadium
- 🖥️ **Buy Mac**: If you'll need it long-term

For most users, **GitHub Actions is the best choice** - it's free, automated, and requires zero Mac hardware!

