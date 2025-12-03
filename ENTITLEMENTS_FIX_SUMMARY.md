# Entitlements Fix - Quick Reference

## What Was Changed

### Before (Broken)
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
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.keychain-access-groups</key>
    <array>
      <string>C42TKCA35H.com.truespanliving.desktop</string>
    </array>
    <key>com.apple.developer.associated-domains</key>
    <array>
      <string>applinks:goicon.com</string>
      <string>applinks:*.goicon.com</string>
    </array>
  </dict>
</plist>
```

**Problem**: App signed and notarized successfully, but won't launch
- Error code 153/137 (launch failed)
- macOS kills app immediately
- Cause: Entitlements require provisioning not configured in Apple Developer account

### After (Fixed)
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

**Result**: App launches successfully ✅

## Removed Entitlements

| Entitlement | Why Removed |
|-------------|-------------|
| `com.apple.security.cs.allow-dyld-environment-variables` | Not needed for most apps |
| `com.apple.security.keychain-access-groups` | Requires provisioning profile configuration |
| `com.apple.developer.associated-domains` | Requires app ID capability setup in Apple Developer |

## Build Command

```bash
export APPLE_ID="chase.robertson@goicon.com"
export APPLE_APP_SPECIFIC_PASSWORD="yhpc-yxkp-qyqf-dqnx"
export APPLE_TEAM_ID="C42TKCA35H"

npm run build:mac
```

## Verification

```bash
# All green ✅
spctl -a -vvv -t install "dist/mac-universal/Truespan Neighborhood.app"
# Output: source=Notarized Developer ID

codesign --verify --deep --strict "dist/mac-universal/Truespan Neighborhood.app"
# No output = success

open "dist/mac-universal/Truespan Neighborhood.app"
# App launches!
```

## Files Changed

1. **build/entitlements.mac.plist** - Simplified to minimal required entitlements
2. **MAC_BUILD_QUICKSTART.md** - Added troubleshooting section
3. **MAC_TROUBLESHOOTING.md** - New comprehensive troubleshooting guide (NEW)

## When to Add Back Entitlements

Only add additional entitlements after:
1. Configuring capabilities in Apple Developer → App IDs
2. Creating/updating provisioning profiles
3. Testing that the specific feature requires the entitlement

See `MAC_TROUBLESHOOTING.md` for details on properly configuring additional entitlements.

