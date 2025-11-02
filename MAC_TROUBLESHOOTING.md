# Mac Build Troubleshooting Guide

## Issue: App Won't Open (Signed & Notarized)

### Symptoms
- App builds successfully
- `spctl` shows: `source=Notarized Developer ID` ✅
- Code signature is valid ✅
- But app won't launch when double-clicked
- Error: "Application cannot be opened for an unexpected reason"
- System logs show error code 153 or exit code 137

### Root Cause
The entitlements file includes capabilities that require explicit provisioning in your Apple Developer account:
- `com.apple.developer.associated-domains` - Requires app ID configuration
- `com.apple.security.keychain-access-groups` - Requires capability provisioning
- `com.apple.security.cs.allow-dyld-environment-variables` - Often unnecessary

Without proper provisioning profiles, macOS kills the app at launch.

### Solution: Use Minimal Entitlements

For most Electron apps, you only need these three entitlements:

**File**: `build/entitlements.mac.plist`
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

**What each entitlement does**:
- `allow-jit`: Required for JavaScript JIT compilation (Electron/V8)
- `allow-unsigned-executable-memory`: Required for Electron's architecture
- `disable-library-validation`: Allows loading Electron's frameworks

### Rebuild After Fix

```bash
# Set your credentials
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Rebuild
npm run build:mac
```

### Verify It Works

```bash
# Check signing and notarization
spctl -a -vvv -t install "dist/mac-universal/TrueSpan Living.app"
# Should show: source=Notarized Developer ID

# Verify signature
codesign --verify --deep --strict "dist/mac-universal/TrueSpan Living.app"
# Should complete with no output = success

# Check entitlements
codesign -d --entitlements :- "dist/mac-universal/TrueSpan Living.app"
# Should only show the three minimal entitlements

# Try to open
open "dist/mac-universal/TrueSpan Living.app"
# Should launch successfully
```

---

## When to Add More Entitlements

Only add additional entitlements if you need specific features AND have configured them in Apple Developer:

### Associated Domains (Universal Links)
```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:yourdomain.com</string>
</array>
```

**Requirements**:
1. Configure in Apple Developer → Certificates, Identifiers & Profiles → App IDs
2. Add "Associated Domains" capability to your app ID
3. Host `apple-app-site-association` file on your domain
4. Domain must be verified in your Apple Developer account

### Keychain Access
```xml
<key>com.apple.security.keychain-access-groups</key>
<array>
  <string>TEAMID.com.yourcompany.appname</string>
</array>
```

**Requirements**:
1. Configure in Apple Developer account
2. May require provisioning profile

---

## Other Common Issues

### "Unnotarized Developer ID"

**Symptoms**: `spctl` shows `source=Unnotarized Developer ID`

**Cause**: Missing or incorrect notarization credentials

**Solution**: Ensure environment variables are set:
```bash
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

### "Identity not found"

**Symptoms**: Build fails with "Code signing identity not found"

**Cause**: Certificate not installed or incorrect identity name

**Solution**:
```bash
# List available identities
security find-identity -v -p codesigning

# Update package.json with correct identity name
"identity": "Developer ID Application: Your Company Name"
```

### DMG Creation Fails

**Symptoms**: App builds but DMG creation fails with hdiutil errors

**Cause**: Often just a temporary hdiutil issue

**Solution**: The .app file is already built and usable:
```bash
# Use the app directly from:
dist/mac-universal/TrueSpan Living.app

# Or build without DMG temporarily
npm run build -- --mac --dir
```

---

## Quick Diagnostic Commands

```bash
# Check if certificate is valid
security find-identity -v -p codesigning

# Verify code signature
codesign --verify --deep --strict "YourApp.app"

# Check Gatekeeper status
spctl -a -vvv -t install "YourApp.app"

# View entitlements
codesign -d --entitlements :- "YourApp.app"

# Check notarization ticket
xcrun stapler validate "YourApp.app"

# View system logs for app launch issues
log show --predicate 'process == "kernel"' --style syslog --last 5m | grep -i "your-app-name"
```

---

## Summary: Fix for "Can't Open" Issue

1. ✅ **Simplified entitlements** to only essential three
2. ✅ Removed `associated-domains` (requires provisioning)
3. ✅ Removed `keychain-access-groups` (requires provisioning)
4. ✅ Removed `allow-dyld-environment-variables` (unnecessary)
5. ✅ Rebuilt with signing and notarization
6. ✅ App now launches successfully

**Result**: Fully signed, notarized, and working Mac app! 🎉

