# macOS Notarization Fix Guide

## Problem Identified

Your Mac installer is showing Gatekeeper warnings because the app is **signed but not notarized** by Apple.

### The Errors You're Seeing:
1. **"The application 'TrueSpan Living' can't be opened"** - Initial Gatekeeper block
2. **"TrueSpan Living is an app downloaded from the Internet"** - Security warning

### Root Cause:
- `package.json` line 49 had `"notarize": false` ❌
- This was changed to `"notarize": true` ✅

---

## What Is Notarization?

**Notarization** is Apple's automated security scan that:
- ✅ Verifies the app is signed with a valid Developer ID
- ✅ Scans for malware
- ✅ Checks for proper entitlements
- ✅ Allows Gatekeeper to trust the app on first launch

**Without notarization:**
- ❌ Users see scary security warnings
- ❌ App can only be opened via right-click → Open
- ❌ Looks unprofessional and damages trust

**With notarization:**
- ✅ App opens normally with no warnings
- ✅ Professional user experience
- ✅ Full Gatekeeper approval

---

## Required Setup

### 1. Apple Developer Account
- **Cost:** $99/year
- **Sign up:** https://developer.apple.com/programs/

### 2. Get Your Team ID
1. Go to: https://developer.apple.com/account
2. Look for **"Team ID"** in the top right
3. Copy the 10-character code (e.g., `ABC123XYZ0`)

### 3. Create App-Specific Password
1. Go to: https://appleid.apple.com/account/manage
2. Navigate to **Security → App-Specific Passwords**
3. Click **Generate Password**
4. Name it: "TrueSpan Notarization"
5. **Save the password** - you can't see it again!

### 4. Set Environment Variables

Create a `.env` file in your project root (copy from `env.template`):

```bash
# Apple macOS Notarization Credentials
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABC123XYZ0
```

⚠️ **IMPORTANT:** The `.env` file is already in `.gitignore` - never commit it!

---

## Building on Mac

If you're building **locally on a Mac**:

```bash
# Make sure .env is configured
npm run build:mac
```

The build process will automatically:
1. ✅ Sign the app with your Developer ID certificate
2. ✅ Apply entitlements
3. ✅ Upload to Apple for notarization
4. ✅ Wait for Apple's approval (2-5 minutes)
5. ✅ Staple the notarization ticket to the .dmg

---

## Building via GitHub Actions

If you're using **GitHub Actions** to build (recommended):

### 1. Add GitHub Secrets

Go to: **Repository Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `APPLE_ID` | Your Apple ID email | The email for your Apple Developer account |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | https://appleid.apple.com/account/manage → Security |
| `APPLE_TEAM_ID` | 10-character team ID | https://developer.apple.com/account (top right) |
| `APPLE_CERT_DATA` | Base64 certificate | See certificate setup below |
| `APPLE_CERT_PASSWORD` | Certificate password | Password you set when creating .p12 |

### 2. Certificate Setup

You need a **Developer ID Application** certificate:

1. **Create Certificate Signing Request (CSR):**
   - On Mac: Use Keychain Access → Certificate Assistant → Request a Certificate
   - On Windows: Use the `generate-apple-csr.ps1` script in this repo

2. **Download Certificate:**
   - Go to: https://developer.apple.com/account/resources/certificates/
   - Click **"+"** → **"Developer ID Application"**
   - Upload your CSR
   - Download the `.cer` file

3. **Convert to .p12 (on Mac):**
   ```bash
   # Import .cer into Keychain
   # Export as .p12 with password
   ```

4. **Base64 Encode:**
   ```bash
   # On Mac:
   base64 -i certificate.p12 | pbcopy
   
   # On Windows:
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.p12")) | Set-Clipboard
   ```

5. **Add to GitHub Secrets** as `APPLE_CERT_DATA`

### 3. GitHub Workflow

Your workflow should look like this:

```yaml
- name: Build macOS
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    APPLE_CERT_DATA: ${{ secrets.APPLE_CERT_DATA }}
    APPLE_CERT_PASSWORD: ${{ secrets.APPLE_CERT_PASSWORD }}
  run: |
    # Import certificate
    echo "$APPLE_CERT_DATA" | base64 --decode > certificate.p12
    security create-keychain -p actions temp.keychain
    security import certificate.p12 -k temp.keychain -P "$APPLE_CERT_PASSWORD"
    
    # Build
    npm run build:mac
```

---

## Verifying Notarization

After building, verify the app is properly notarized:

```bash
# Check signature
codesign -dv --verbose=4 "dist/mac/TrueSpan Living.app"

# Check notarization
spctl -a -vv -t install "dist/mac/TrueSpan Living.app"

# Check DMG
spctl -a -vv -t open --context context:primary-signature "dist/TrueSpan Living-1.0.0-arm64.dmg"
```

Expected output:
```
source=Notarized Developer ID
origin=Developer ID Application: Go Icon LLC (ABC123XYZ0)
```

---

## Troubleshooting

### "Missing Apple credentials"
- ✅ Check that all 3 environment variables are set
- ✅ Verify APPLE_ID is correct email
- ✅ Verify APPLE_TEAM_ID is 10 characters

### "Notarization failed: Invalid credentials"
- ✅ Make sure you're using an **app-specific password**, not your regular Apple ID password
- ✅ Regenerate the app-specific password if needed

### "Certificate not found"
- ✅ Verify certificate is installed in keychain
- ✅ Check identity name matches: `"identity": "Go Icon LLC"`
- ✅ Run: `security find-identity -v -p codesigning` to list available certificates

### "The application can't be opened" (still happening after notarization)
- ✅ Wait 5-10 minutes after notarization completes
- ✅ Apple's servers may need time to propagate
- ✅ Try downloading the DMG again (don't use cached version)
- ✅ Verify with `spctl` command above

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| GitHub Actions (macOS runner) | ~$0.08/min | Per build |
| Total (approx) | ~$99-150 | Annual |

*GitHub Actions gives 2,000 free minutes/month for private repos, 50,000 for public repos*

---

## Next Steps

1. ✅ **Complete** - Changed `notarize: false` to `notarize: true` in package.json
2. ⏳ **TODO** - Set up `.env` file with Apple credentials
3. ⏳ **TODO** - Get Developer ID certificate
4. ⏳ **TODO** - Rebuild Mac installer
5. ⏳ **TODO** - Test on a Mac to verify no warnings

---

## Quick Reference

### Environment Variables Needed
```bash
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABC123XYZ0
```

### Build Command
```bash
npm run build:mac
```

### Check Notarization Status
```bash
xcrun notarytool history --apple-id your-apple-id@email.com --team-id ABC123XYZ0
```

---

**Questions?** Check the official docs:
- [Notarizing macOS Software Before Distribution](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Builder - macOS Signing](https://www.electron.build/code-signing#macos)

