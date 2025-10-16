# For Web Developer - Quick Setup Guide

## What You Need to Do

Host **1 file** on goicon.com to enable app deep linking.

---

## The File

**File:** `apple-app-site-association` (NO file extension!)

**Location:** `/.well-known/apple-app-site-association`

**Full URL:** https://goicon.com/.well-known/apple-app-site-association

**Content:** See `apple-app-site-association` file in this project

---

## Step-by-Step

### 1. Get the File

The file `apple-app-site-association` is included in this project folder.

**⚠️ IMPORTANT:** Before uploading, replace `TEAMID` with the actual Team ID from Apple Developer portal (will be provided separately)

### 2. Create .well-known Folder

In your web root, create folder: `.well-known`

```
/var/www/html/.well-known/
```

or wherever your goicon.com files are served from.

### 3. Upload the File

Copy `apple-app-site-association` to `.well-known/` folder

**Final path:**
```
/.well-known/apple-app-site-association
```

### 4. Verify

Open in browser:
```
https://goicon.com/.well-known/apple-app-site-association
```

Should see JSON content (not 404 error).

---

## Requirements Checklist

- [x] File is at `/.well-known/apple-app-site-association`
- [x] Served via HTTPS (not HTTP)
- [x] Returns HTTP 200 status
- [x] Content-Type is `application/json` (or no content-type)
- [x] No redirects (301/302)
- [x] File size under 128 KB (our file is ~400 bytes)
- [x] Accessible without authentication

---

## Testing

```bash
# Test if accessible
curl -I https://goicon.com/.well-known/apple-app-site-association

# Expected: HTTP/2 200

# Test content
curl https://goicon.com/.well-known/apple-app-site-association

# Expected: JSON output
```

---

## What This Does

After hosting this file:
- Users with TrueSpan app installed: Clicking `https://goicon.com/...` links in emails opens the desktop app
- Users without app: Links open in browser normally
- **No changes needed to any email templates or website links!**

---

## Common Issues

### 404 Error
- Make sure `.well-known` folder exists
- Check file permissions (should be readable)
- Verify file name is exactly `apple-app-site-association` with no extension

### Server Blocks .well-known
Add to `.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteRule ^\.well-known - [L]
</IfModule>
```

### Wrong Content-Type
Add to `.htaccess`:
```apache
<FilesMatch "apple-app-site-association">
  Header set Content-Type "application/json"
</FilesMatch>
```

---

## Questions?

Contact the desktop app developer if you run into any issues!

**Estimated setup time: 5 minutes** ⏱️

