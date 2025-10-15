# macOS Installer Setup Guide (Without a Mac)

## Prerequisites

### 1. Apple Developer Account
- Go to: https://developer.apple.com/programs/
- Cost: $99/year
- Sign up with your Apple ID

### 2. Create Certificates

After enrolling in Apple Developer Program:

1. Go to: https://developer.apple.com/account/resources/certificates/
2. Click **"+"** to create new certificate
3. Select: **"Developer ID Application"** (for distribution outside App Store)
4. Follow instructions to create Certificate Signing Request (CSR)
   - You'll need to do this on a Mac OR use online tools
5. Download the certificate (.cer file)
6. Convert to .p12 format (requires Mac or OpenSSL)

### 3. Create App-Specific Password

For notarization:
1. Go to: https://appleid.apple.com/account/manage
2. Security → App-Specific Passwords
3. Generate password (save it!)

---

## Option 1: GitHub Actions (Recommended)

### Setup Steps:

#### 1. Push your code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/truespan.git
git push -u origin main
```

#### 2. Add GitHub Secrets

Go to: Repository Settings → Secrets and variables → Actions

Add these secrets:

- **APPLE_CERT_DATA**: Base64 encoded .p12 certificate
  ```bash
  # On Mac or Linux:
  base64 -i certificate.p12 | pbcopy
  ```

- **APPLE_CERT_PASSWORD**: Password for .p12 certificate

- **APPLE_ID**: Your Apple ID email

- **APPLE_APP_SPECIFIC_PASSWORD**: App-specific password from Apple

- **APPLE_TEAM_ID**: Your Team ID from Apple Developer account

- **KEYCHAIN_PASSWORD**: Any secure password (used temporarily)

#### 3. Update package.json

Add macOS signing configuration:

```json
"build": {
  "mac": {
    "target": "dmg",
    "icon": "assets/logo.png",
    "category": "public.app-category.business",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "afterSign": "scripts/notarize.js"
}
```

#### 4. Push and Build

```bash
git add .
git commit -m "Add macOS build workflow"
git push
```

GitHub Actions will automatically build and sign on macOS runners!

---

## Option 2: Cloud Mac Service

### Using MacinCloud:

1. Sign up at: https://www.macincloud.com/
2. Choose "Developer Plan" (~$30/month)
3. Access Mac via Remote Desktop
4. Install Node.js and dependencies
5. Clone your repo
6. Run: `npm run build:mac`

### Using MacStadium:

1. Sign up at: https://www.macstadium.com/
2. Rent Mac Mini (~$79/month)
3. SSH or VNC access
4. Set up build environment
5. Automate builds via scripts

---

## Option 3: Use a Friend's/Coworker's Mac

If you have occasional access to a Mac:

1. Clone your repo
2. Install certificates
3. Run build script
4. Transfer .dmg file back

---

## Notarization Script

Create `scripts/notarize.js`:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.truespanliving.desktop',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

Install notarization package:
```bash
npm install --save-dev @electron/notarize
```

---

## Entitlements File

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
  </dict>
</plist>
```

---

## Cost Comparison

| Option | Setup Cost | Monthly Cost | Ease of Use |
|--------|-----------|--------------|-------------|
| GitHub Actions | $0 | $0 | ⭐⭐⭐⭐⭐ Easy |
| MacinCloud | $30 | $30 | ⭐⭐⭐ Moderate |
| MacStadium | $79 | $79 | ⭐⭐⭐ Moderate |
| Buy Mac Mini | $599 | $0 | ⭐⭐⭐⭐ Easy |
| Borrow Mac | $0 | $0 | ⭐⭐ Manual |

**Plus Apple Developer Account: $99/year for all options**

---

## Recommended Approach

**For TrueSpan:** Use **GitHub Actions** (Option 1)
- ✅ FREE
- ✅ Automated
- ✅ No Mac needed
- ✅ Easy to set up
- ✅ Builds on every push

---

## Testing Without Signing (Development Only)

You can build unsigned Mac apps on Windows for testing:

```bash
npm run build:mac
```

This creates a .dmg but:
- ❌ Won't run on modern Macs (Gatekeeper blocks it)
- ❌ Shows severe security warnings
- ✅ Good for testing UI/layout only

---

## Next Steps

1. **Enroll in Apple Developer Program** ($99/year)
2. **Create certificates** (Developer ID Application)
3. **Set up GitHub Actions** (if using that approach)
4. **Configure notarization**
5. **Push and build!**

Need help with any of these steps? Let me know!

