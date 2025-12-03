# Testing macOS Installer Without a Mac

## The Challenge

To verify that your Mac installer **doesn't show Gatekeeper warnings**, you need to:
1. ✅ Build and notarize the installer
2. ✅ Download the DMG to a real Mac
3. ✅ Try to open it and verify no security warnings appear

Since you don't have a Mac, here are your options:

---

## Option 1: MacinCloud (RECOMMENDED - Quick & Cheap)

**Cost:** $20 for 20 hours (or $30/month unlimited)
**Setup Time:** 5 minutes

### Steps:

1. **Sign up:** https://www.macincloud.com/
   - Choose "Developer Plan" or "Pay-as-you-go" (20 hours for $20)

2. **Access the Mac:**
   - Use Remote Desktop (Windows) or VNC
   - You get instant access to a real Mac in the cloud

3. **Test your installer:**
   ```bash
   # Download your DMG from GitHub Actions
   curl -L -o installer.dmg "https://github.com/YOUR_REPO/actions/runs/RUN_ID/artifacts/ARTIFACT_ID"
   
   # Or download from GitHub releases
   curl -L -o installer.dmg "https://github.com/YOUR_REPO/releases/latest/download/TrueSpan-Living.dmg"
   
   # Double-click to open
   open installer.dmg
   ```

4. **Verify:**
   - ✅ NO warning = Notarization succeeded!
   - ❌ Warning appears = Notarization failed, check logs

### Pros:
- ✅ Real Mac hardware
- ✅ Instant access
- ✅ Pay only for what you use
- ✅ Can test other Mac-specific features

### Cons:
- 💰 Costs money (but minimal)

---

## Option 2: Ask a Friend/Colleague

**Cost:** FREE (+ maybe buy them lunch 🍕)

### Steps:

1. **Find someone with a Mac:**
   - Friend, family, coworker, neighbor
   - Ask on social media/Slack/Discord

2. **Send them your DMG:**
   - Download from GitHub Actions artifacts
   - Share via Google Drive, Dropbox, etc.

3. **Have them test:**
   ```
   Instructions for your friend:
   
   1. Download the DMG file I sent
   2. Double-click to open it
   3. Screenshot what happens:
      - Does it open normally? ✅
      - Does it show a security warning? ❌
   
   If warning appears, right-click → Open and try again
   ```

4. **They send you screenshots**

### Pros:
- ✅ FREE
- ✅ Real-world testing

### Cons:
- 🕐 Depends on friend's availability
- 📸 Communication via screenshots

---

## Option 3: GitHub Actions Verification (FREE but Limited)

You can add automated checks to your GitHub workflow that verify signing/notarization **before** manually testing:

### Enhanced Workflow

Add this step to `.github/workflows/build-mac.yml`:

```yaml
- name: Verify signing and notarization
  run: |
    echo "🔍 Verifying code signature..."
    codesign -dv --verbose=4 "dist/mac/Truespan Neighborhood.app"
    
    echo "🔍 Verifying Gatekeeper..."
    spctl -a -vv -t install "dist/mac/Truespan Neighborhood.app"
    
    echo "🔍 Checking DMG..."
    hdiutil attach dist/*.dmg -mountpoint /tmp/test-mount
    spctl -a -vv -t install "/tmp/test-mount/Truespan Neighborhood.app"
    hdiutil detach /tmp/test-mount
    
    echo "✅ All verification checks passed!"
```

This will tell you if signing/notarization succeeded, but **won't replicate the real user experience**.

### Pros:
- ✅ FREE
- ✅ Automated
- ✅ Catches obvious errors

### Cons:
- ⚠️ Not a real user test
- ⚠️ GitHub's Mac may behave differently than user's Mac

---

## Option 4: Virtual Machine (Advanced - NOT RECOMMENDED)

**Cost:** FREE but technically challenging
**Legal:** Gray area with Apple's licensing

### Why NOT Recommended:
- ❌ Violates Apple EULA (macOS only licensed for Apple hardware)
- ❌ Difficult to set up (requires macOS image)
- ❌ Poor performance
- ❌ May not accurately test Gatekeeper

If you still want to try:
1. Install VirtualBox or VMware
2. Find macOS Ventura/Sonoma image (legal gray area)
3. Install macOS in VM
4. Test your DMG

---

## Option 5: Apple Silicon Mac Mini (Long-term Solution)

**Cost:** $599 (M2) or $499 (refurbished M1)
**Best if:** You plan to do ongoing Mac development

### Pros:
- ✅ Own hardware, test anytime
- ✅ Can use for other development
- ✅ One-time cost
- ✅ Best performance

### Cons:
- 💰 Upfront cost
- 📦 Takes space

---

## Recommended Testing Flow

### Phase 1: Automated Verification (FREE)
1. ✅ Push code to GitHub
2. ✅ Let Actions build and sign
3. ✅ Check workflow logs for signing/notarization success
4. ✅ Review `spctl` output

### Phase 2: Real Mac Testing (1-2 hours)
1. 💳 Sign up for MacinCloud ($20 for 20 hours)
2. 🖥️ Remote into cloud Mac
3. 📥 Download your DMG
4. 🖱️ Double-click and verify NO warnings
5. 📸 Take screenshots for records
6. ✅ Cancel MacinCloud if you don't need it anymore

**Total Cost:** $20 + 30 minutes of your time

---

## What to Look For When Testing

### ✅ Success (Properly Notarized):
- DMG opens immediately
- App opens without warnings
- No "unidentified developer" message
- No need to right-click → Open

### ❌ Failure (Not Notarized):
- "Truespan Neighborhood can't be opened because Apple cannot check it for malicious software"
- "Truespan Neighborhood is an app downloaded from the Internet. Are you sure you want to open it?"
- Requires right-click → Open to launch

---

## Quick Start: Testing Right Now

### If you need to test TODAY:

1. **MacinCloud Free Trial:**
   - Go to https://www.macincloud.com/
   - Sign up (credit card required, but they have trials)
   - Access Mac via Remote Desktop
   - Download your DMG from GitHub Actions
   - Test in 5 minutes

2. **Ask on Discord/Slack:**
   ```
   Hey! Does anyone have a Mac and 2 minutes to test my installer?
   Just need you to:
   1. Download this DMG: [link]
   2. Double-click it
   3. Screenshot what happens
   
   Trying to verify it doesn't show security warnings. 
   Will buy you virtual coffee! ☕
   ```

---

## After Testing Confirms Success

Once you verify the installer works:

1. ✅ Update documentation
2. ✅ Create GitHub Release
3. ✅ Distribute to users
4. ✅ Consider setting up automated release workflow

---

## Troubleshooting If Warnings Still Appear

If you test and STILL see warnings:

### Check 1: Was notarization actually enabled?
```bash
# In your GitHub Actions logs, look for:
"🔐 Starting notarization for Truespan Neighborhood..."
"✅ Successfully notarized Truespan Neighborhood"
```

### Check 2: Are credentials correct?
- Verify `APPLE_ID` is correct
- Verify `APPLE_APP_SPECIFIC_PASSWORD` is app-specific (not regular password)
- Verify `APPLE_TEAM_ID` is correct 10-character code

### Check 3: Did notarization actually run?
```bash
# On the Mac, check notarization ticket:
spctl -a -vv "Truespan Neighborhood.app"

# Should show:
# source=Notarized Developer ID
```

### Check 4: Certificate issues?
```bash
# In GitHub Actions, verify:
security find-identity -v -p codesigning

# Should show:
# 1) ABC123... "Developer ID Application: Go Icon LLC (TEAMID)"
```

---

## My Recommendation for You

**For now (testing this installer):**
- Use **MacinCloud** - $20 for 20 hours
- Takes 5 minutes to set up
- Real Mac environment
- Can cancel after testing

**For future (if you'll build Mac apps regularly):**
- Consider buying a **Mac Mini M2** ($599)
- Or keep using MacinCloud for occasional testing ($20/month as needed)

---

## Need Help?

If you run into issues:

1. **Check GitHub Actions logs** for notarization errors
2. **Look for this in logs:**
   ```
   ✅ Successfully notarized Truespan Neighborhood
   ```
3. **If you see errors**, check:
   - Apple ID credentials in GitHub Secrets
   - Certificate is valid "Developer ID Application"
   - Team ID is correct

---

## Quick Links

- **MacinCloud:** https://www.macincloud.com/
- **MacStadium:** https://www.macstadium.com/
- **Apple Developer:** https://developer.apple.com/account/
- **Notarization Docs:** https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution

