# Universal Links / App Links Setup for Web Developer

## Overview

This allows `https://goicon.com/...` URLs to open the Truespan Neighborhood desktop app automatically (if installed). If the app is not installed, the URL opens in the browser normally.

**No code changes needed on your end** - just host 2 small JSON files.

---

## Files to Host

You need to host these files on **goicon.com**:

### 1. For Mac Users (Universal Links)

**File location:** `https://goicon.com/.well-known/apple-app-site-association`

**Important:** No `.json` extension! Just name it `apple-app-site-association`

**Content:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.truespanliving.desktop",
        "paths": ["*"]
      }
    ]
  }
}
```

**Replace `TEAMID`** with the actual Apple Team ID (will be provided after Apple Developer enrollment completes)

### 2. For Windows Users (App Links) - COMING SOON

Windows App Links require the app to be in the Microsoft Store, which we're not doing yet. For now, Mac Universal Links will work immediately.

---

## Hosting Instructions

### Option A: Direct File Upload

1. Create folder: `.well-known` in your web root
2. Create file: `apple-app-site-association` (no extension)
3. Upload to: `/.well-known/apple-app-site-association`
4. Verify URL works: https://goicon.com/.well-known/apple-app-site-association

### Option B: Using .htaccess (if needed)

If your server doesn't allow `.well-known` folder, add this to `.htaccess`:

```apache
# Allow .well-known folder
<IfModule mod_rewrite.c>
  RewriteRule ^\.well-known - [L]
</IfModule>

# Serve apple-app-site-association with correct content type
<FilesMatch "apple-app-site-association">
  Header set Content-Type "application/json"
</FilesMatch>
```

### Option C: Nginx Configuration

```nginx
location /.well-known/apple-app-site-association {
    default_type application/json;
}
```

---

## Important Requirements

### ✅ HTTPS Only
- File MUST be served over HTTPS
- http://goicon.com/.well-known/... will NOT work
- Must be https://goicon.com/.well-known/...

### ✅ Content-Type
- **Preferred:** `application/json`
- **Also acceptable:** `application/pkcs7-mime` or no content-type

### ✅ No Redirects
- File must return HTTP 200 status
- No 301/302 redirects allowed
- Direct file access only

### ✅ File Size
- Must be under 128 KB (our file is ~300 bytes, so we're good!)

---

## Testing

### Test if File is Accessible:

```bash
curl -I https://goicon.com/.well-known/apple-app-site-association
```

**Expected response:**
```
HTTP/2 200
content-type: application/json
content-length: 200
```

### Test File Content:

```bash
curl https://goicon.com/.well-known/apple-app-site-association
```

**Should return the JSON content**

---

## Subdomains

If you want this to work on subdomains like `app.goicon.com` or `api.goicon.com`:

### Option 1: Copy file to each subdomain

Host the same file at:
- `https://api.goicon.com/.well-known/apple-app-site-association`
- `https://app.goicon.com/.well-known/apple-app-site-association`
- etc.

### Option 2: Wildcard (already configured in app)

The app is configured to handle `*.goicon.com`, so once the main file is hosted, it should work for all subdomains (though Apple recommends hosting on each subdomain for reliability).

---

## Timeline

1. **You host the file** (5 minutes)
2. **We verify it's working** (1 minute)
3. **Build and release new app version** (already configured!)
4. **Users install new app** → Universal Links work immediately!

---

## What Users Will See

### Before (current):
```
User clicks: https://goicon.com/social in email
→ Opens in web browser
```

### After (with Universal Links):
```
User clicks: https://goicon.com/social in email

If TrueSpan app is installed:
  → Opens TrueSpan app to /social page ✨

If TrueSpan app is NOT installed:
  → Opens in web browser (normal behavior)
```

**No code changes in emails needed!** Everything stays the same.

---

## FAQ

### Do I need to change any email links?
**No!** Keep using normal `https://goicon.com/...` URLs. The OS handles routing to the app automatically.

### What if users don't have the app?
The URL opens in their browser normally. No error, no broken links.

### Does this work on mobile?
Not yet - this is desktop only (Mac and Windows). Mobile would need separate setup.

### How do I update the file later?
Just replace the file on your server. Changes take effect immediately (though Apple caches for ~24 hours).

### What paths does this affect?
Currently `"paths": ["*"]` means ALL goicon.com URLs can open the app. We can restrict this later if needed:

```json
"paths": ["/social", "/dashboard/*", "/facilities/*"]
```

---

## Next Steps

1. **Host the `apple-app-site-association` file** at the location above
2. **Verify it's accessible** via curl or browser
3. **Let us know** when it's live
4. **We'll verify** and test
5. **Done!** ✅

---

## Support

Questions? Need help with hosting? Let me know!

The file is super tiny and needs zero maintenance. Once it's up, it works forever! 🚀

