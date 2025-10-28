# Testing Mac Installer on MacinCloud (No Admin Access)

## Overview

Your Mac installer is configured as a **DMG (drag-and-drop)** which means:
- ✅ **No admin password required**
- ✅ Works perfectly on MacinCloud
- ✅ Users can install to their home directory

---

## How DMG Installation Works

When you open the DMG:
1. A window appears showing the TrueSpan Living app icon
2. An arrow or shortcut to the Applications folder
3. User **drags** the app icon to Applications (or anywhere else)
4. Done! No password needed

---

## Testing on MacinCloud (Step-by-Step)

### 1. Sign Up for MacinCloud
- Go to: https://www.macincloud.com/
- Choose "Pay As You Go" plan: **$20 for 20 hours**
- Sign up and configure remote access

### 2. Connect to Your Mac
- **Windows:** Use Remote Desktop Connection (built-in)
- **Mac:** Use Screen Sharing or VNC
- Log in with the credentials MacinCloud provides

### 3. Download Your Installer

Once connected to the Mac:

```bash
# Option 1: Download from GitHub Actions (if you have the link)
curl -L -o ~/Downloads/TrueSpan-Living.dmg "YOUR_ARTIFACT_DOWNLOAD_LINK"

# Option 2: Download from browser
# Open Safari and go to your GitHub releases page
```

Or simply use Safari in the remote Mac to download from:
- GitHub Actions artifacts
- GitHub Releases page
- Your own hosting

### 4. Install WITHOUT Admin Password

This is the **key part** - no admin needed!

```bash
# Method 1: Install to Applications folder (WILL FAIL on MacinCloud)
# Don't do this - requires admin:
# sudo cp -R "TrueSpan Living.app" /Applications/

# Method 2: Install to home directory (WORKS - NO ADMIN)
# Do this instead:

# Open the DMG
open ~/Downloads/TrueSpan-Living-1.0.0-arm64.dmg

# Wait for it to mount, then drag the app to your Desktop or home directory
# Or use Terminal:
cp -R "/Volumes/TrueSpan Living 1.0.0/TrueSpan Living.app" ~/Desktop/

# Run it from there:
open ~/Desktop/TrueSpan\ Living.app
```

### 5. Test the App

**First Launch (THE CRITICAL TEST):**

Double-click the app. You should see:
- ✅ **App opens normally** (Success - notarization worked!)
- ❌ **Security warning** (Notarization failed - check logs)

If you get the warning, right-click → Open to bypass once.

**What to Test:**
1. ✅ App launches without errors
2. ✅ Login screen appears
3. ✅ Can log in successfully
4. ✅ Main window loads
5. ✅ No JavaScript errors (check Console.app)
6. ✅ Deep links work (if applicable)

---

## Alternative Installation Locations

Since MacinCloud doesn't give admin access, you can install to:

### Option 1: Desktop (Easiest)
```bash
cp -R "/Volumes/TrueSpan Living 1.0.0/TrueSpan Living.app" ~/Desktop/
```

### Option 2: Home Applications Folder
```bash
mkdir -p ~/Applications
cp -R "/Volumes/TrueSpan Living 1.0.0/TrueSpan Living.app" ~/Applications/
```

### Option 3: Downloads Folder
```bash
cp -R "/Volumes/TrueSpan Living 1.0.0/TrueSpan Living.app" ~/Downloads/
```

**All of these work without admin!**

---

## Verifying Notarization (Without Admin)

You can verify notarization without admin access:

```bash
# Check if app is signed and notarized
spctl -a -vv -t install ~/Desktop/TrueSpan\ Living.app

# Should show:
# ~/Desktop/TrueSpan Living.app: accepted
# source=Notarized Developer ID
# origin=Developer ID Application: Go Icon LLC (YOUR_TEAM_ID)
```

If you see `source=Notarized Developer ID`, you're good! ✅

---

## Visual DMG Layout

When users open the DMG, they'll see:

```
┌─────────────────────────────────────────┐
│  TrueSpan Living 1.0.0                  │
├─────────────────────────────────────────┤
│                                         │
│      [App Icon]       →    [Applications]│
│   TrueSpan Living          Folder       │
│                                         │
│   ← Drag app here to install            │
│                                         │
└─────────────────────────────────────────┘
```

This is the standard Mac installation experience!

---

## MacinCloud Limitations

What you **CAN** do:
- ✅ Install DMG apps to home directory
- ✅ Run apps from Desktop/Downloads
- ✅ Test app functionality
- ✅ Use Terminal commands
- ✅ Browse the web
- ✅ Download files

What you **CAN'T** do:
- ❌ Install to /Applications (requires sudo)
- ❌ Install system-wide software
- ❌ Modify system settings
- ❌ Run commands with sudo

**For testing your app, you don't need any of the "CAN'T" features!**

---

## Quick Test Script

Save this as `test-installer.sh`:

```bash
#!/bin/bash

echo "🚀 Testing TrueSpan Living Mac Installer"
echo ""

# Download DMG (replace with your link)
DMG_PATH="$HOME/Downloads/TrueSpan-Living-1.0.0-arm64.dmg"

if [ ! -f "$DMG_PATH" ]; then
  echo "❌ DMG not found at: $DMG_PATH"
  echo "   Please download it first!"
  exit 1
fi

echo "✅ Found DMG at: $DMG_PATH"

# Mount the DMG
echo "📦 Mounting DMG..."
hdiutil attach "$DMG_PATH"

# Copy to Desktop
echo "📋 Copying app to Desktop..."
cp -R "/Volumes/TrueSpan Living 1.0.0/TrueSpan Living.app" ~/Desktop/

# Unmount
echo "📤 Unmounting DMG..."
hdiutil detach "/Volumes/TrueSpan Living 1.0.0"

# Verify signature
echo "🔍 Verifying notarization..."
spctl -a -vv -t install ~/Desktop/TrueSpan\ Living.app

echo ""
echo "✅ Done! Try launching the app:"
echo "   Double-click 'TrueSpan Living' on your Desktop"
echo ""
echo "Expected result:"
echo "  ✅ App opens without security warnings"
echo "  ✅ Login screen appears"
echo ""
echo "If you see a warning, notarization didn't work."
```

Run it:
```bash
chmod +x test-installer.sh
./test-installer.sh
```

---

## Troubleshooting

### Issue: "Can't be opened because Apple cannot check it"
**Cause:** Notarization failed or wasn't completed
**Fix:** 
1. Check GitHub Actions logs for notarization success
2. Look for: `✅ Successfully notarized TrueSpan Living`
3. Make sure you downloaded the correct DMG (after notarization was added)

### Issue: "Operation not permitted"
**Cause:** Trying to copy to /Applications
**Fix:** Copy to ~/Desktop or ~/Applications instead

### Issue: "No application found"
**Cause:** DMG didn't mount properly
**Fix:**
```bash
# List mounted volumes
ls /Volumes/

# Manually mount if needed
open ~/Downloads/TrueSpan-Living-1.0.0-arm64.dmg
```

---

## Cost Breakdown

| Service | Cost | Best For |
|---------|------|----------|
| MacinCloud Pay-As-Go | $20 for 20 hours | One-time testing |
| MacinCloud Monthly | $30/month | Regular testing |
| MacStadium | $79/month | Professional use |
| Buy Mac Mini M2 | $599 one-time | Long-term |

**Recommendation:** Start with **$20 MacinCloud** for this test!

---

## What Success Looks Like

1. ✅ Download DMG from GitHub Actions
2. ✅ Open DMG on MacinCloud (no admin needed)
3. ✅ Drag app to Desktop
4. ✅ Double-click app
5. ✅ **App opens immediately with no warnings**
6. ✅ Login screen appears
7. ✅ Successfully log in
8. ✅ App works as expected

**If all these pass, your Mac installer is production-ready!** 🎉

---

## Next Steps After Testing

Once testing confirms it works:

1. ✅ Create a GitHub Release
2. ✅ Upload the DMG as a release asset
3. ✅ Update your website/documentation with download link
4. ✅ Tell users: "Just download and drag to install - no admin needed!"

---

## Quick Reference: MacinCloud Testing

```bash
# 1. Download installer
curl -L -o ~/Downloads/installer.dmg "YOUR_LINK"

# 2. Mount DMG
open ~/Downloads/installer.dmg

# 3. Copy to Desktop (NO SUDO NEEDED)
cp -R "/Volumes/TrueSpan Living 1.0.0/TrueSpan Living.app" ~/Desktop/

# 4. Verify notarization
spctl -a -vv -t install ~/Desktop/TrueSpan\ Living.app

# 5. Run app
open ~/Desktop/TrueSpan\ Living.app

# Look for:
# ✅ "source=Notarized Developer ID" in spctl output
# ✅ App opens without warnings
```

That's it! No admin password needed anywhere! 🎊

