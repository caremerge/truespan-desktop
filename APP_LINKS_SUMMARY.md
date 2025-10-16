# Universal Links / App Links - Setup Complete ✅

## What I Did

### ✅ Configured the Desktop App

1. **Updated `package.json`:**
   - Removed custom protocol (`truespanliving://`)
   - Added Universal Links support for Mac
   - Configured to handle `goicon.com` and `*.goicon.com` URLs

2. **Updated `build/entitlements.mac.plist`:**
   - Added `com.apple.developer.associated-domains`
   - Registered `applinks:goicon.com` and `applinks:*.goicon.com`

3. **Updated `src/main.js`:**
   - Modified to handle `https://goicon.com/...` URLs
   - Stores URL to open after login if user clicks link before logging in
   - Brings app to foreground if already running
   - Opens correct page directly

4. **Created Verification File:**
   - `apple-app-site-association` (ready for web developer)

5. **Created Documentation:**
   - `UNIVERSAL_LINKS_SETUP.md` - Detailed technical guide
   - `FOR_WEB_DEVELOPER.md` - Quick setup instructions
   - This summary!

---

## What Needs to Happen Next

### Step 1: Get Apple Team ID (REQUIRED)

After your Apple Developer enrollment completes:
1. Go to: https://developer.apple.com/account/
2. Find your **Team ID** (10-character code like `ABC123XYZ`)
3. Replace `TEAMID` in the `apple-app-site-association` file with your actual Team ID

**Example:**
```json
"appID": "TEAMID.com.truespanliving.desktop"
```
becomes:
```json
"appID": "ABC123XYZ.com.truespanliving.desktop"
```

### Step 2: Give Files to Web Developer

Send them:
1. ✅ `apple-app-site-association` file (after updating TEAMID)
2. ✅ `FOR_WEB_DEVELOPER.md` - Quick setup guide
3. ✅ `UNIVERSAL_LINKS_SETUP.md` - Detailed guide (if they need it)

**What they need to do:**
- Host the file at: `https://goicon.com/.well-known/apple-app-site-association`
- That's it! (~5 minutes of work)

### Step 3: Verify Setup

After web developer hosts the file:

```bash
# Test if accessible
curl https://goicon.com/.well-known/apple-app-site-association

# Should return JSON content
```

### Step 4: Build & Release

Once verified:
```bash
npm run build:win  # Windows installer (already working)
npm run build:mac  # Mac installer (via GitHub Actions)
```

Both will have Universal Links support built-in!

---

## How It Will Work for Users

### Scenario 1: User Has App Installed

```
User clicks: https://goicon.com/social (in email)
         ↓
OS detects: "TrueSpan Living app handles goicon.com"
         ↓
Opens: TrueSpan Living app → navigates to /social
```

### Scenario 2: User Doesn't Have App

```
User clicks: https://goicon.com/social (in email)
         ↓
OS detects: "No app handles goicon.com"
         ↓
Opens: Default web browser → https://goicon.com/social
```

### Scenario 3: User Clicks Link While Not Logged In

```
User clicks: https://goicon.com/dashboard (in email)
         ↓
Opens: TrueSpan Living app → shows login screen
         ↓
User logs in successfully
         ↓
App navigates to: /dashboard (the URL they clicked!)
```

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS** | ✅ Ready | Works immediately after file hosted |
| **Windows** | 🔜 Coming | Requires Microsoft Store (future enhancement) |

**For now:** Mac users get seamless experience, Windows users use normal browser links (or we can add the custom protocol back as fallback)

---

## Email Template - No Changes Needed!

Your existing email links work as-is:

```html
<a href="https://goicon.com/social">View Social Feed</a>
<a href="https://goicon.com/dashboard">Go to Dashboard</a>
<a href="https://goicon.com/facilities/123">View Facility</a>
```

**That's it!** No `truespanliving://` prefixes, no JavaScript detection, nothing special. Just normal URLs that magically open the app if installed! ✨

---

## Timeline

1. **✅ App configured** - DONE
2. **⏳ Get Apple Team ID** - After Apple Developer enrollment completes
3. **⏳ Update verification file** - Replace TEAMID (30 seconds)
4. **⏳ Web developer hosts file** - 5 minutes
5. **⏳ Verify setup** - 1 minute
6. **⏳ Build & release** - Ready to go!
7. **✅ Users get seamless experience!**

---

## What If We Want Windows Support Too?

For Windows to work the same way (without Microsoft Store), we have two options:

### Option A: Custom Protocol Fallback

Re-enable `truespanliving://` protocol for Windows users:
- Mac: Uses Universal Links (`https://goicon.com/...`)
- Windows: Uses custom protocol (`truespanliving://...`)

### Option B: Smart Email Links

Use JavaScript in emails to detect platform:

```html
<a href="https://goicon.com/social" 
   onclick="if(navigator.platform.indexOf('Win')>=0) { this.href='truespanliving://social'; }">
  View Social
</a>
```

Let me know if you want either of these!

---

## Questions?

- Need help getting the Team ID?
- Want to test before rolling out?
- Need Windows support added?
- Want to restrict which paths open in app?

Just ask! The hard part is done. 🚀

