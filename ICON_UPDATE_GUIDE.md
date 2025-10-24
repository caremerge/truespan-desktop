# Icon Update Guide

## Overview

Switching from the old logo to the new TrueSpan "T" icon for:
- ✅ Windows app icon (.ico)
- ✅ Mac app icon (.png/.icns)
- ✅ DMG installer icon
- ✅ App window icons
- ✅ Desktop shortcut icons

---

## Quick Start

### Option 1: Automated (Requires ImageMagick)

**Install ImageMagick:**
1. Download: https://imagemagick.org/script/download.php
2. Choose: "Win64 dynamic at 16 bits-per-pixel component"
3. Run installer, **check "Add to PATH"**
4. Restart PowerShell

**Run conversion script:**
```powershell
.\convert-icon.ps1
```

This creates:
- `assets/icon.png` (1024x1024) - for Mac
- `assets/icon.ico` (multi-size) - for Windows

### Option 2: Online Converters (No Installation)

**Step 1: SVG → PNG**
1. Go to: https://cloudconvert.com/svg-to-png
2. Upload: `assets/TrueSpan-T-icon-Notification-1000px (1).svg`
3. Set dimensions: 1024 x 1024
4. Convert and download
5. Save as: `assets/icon.png`

**Step 2: PNG → ICO**
1. Go to: https://cloudconvert.com/png-to-ico
2. Upload the PNG you just created
3. In "Advanced Options", set:
   - Sizes: 16, 32, 48, 64, 96, 128, 256
4. Convert and download
5. Save as: `assets/icon.ico`

---

## What Was Changed

### Files Updated:

1. **package.json**
   - Windows icon: `assets/icon.ico`
   - Mac icon: `assets/icon.png`
   - DMG icon: `assets/icon.png`

2. **src/main.js**
   - All window icons updated to use `assets/icon.png`

### Files to Create:

- ✅ `assets/icon.png` - 1024x1024 PNG (Mac, DMG, Windows base)
- ✅ `assets/icon.ico` - Multi-size ICO (Windows installer/exe)

---

## Icon Specifications

### Windows (.ico)
- Format: ICO
- Sizes included: 16x16, 32x32, 48x48, 64x64, 96x96, 128x128, 256x256
- Used for:
  - Desktop shortcut
  - Taskbar
  - Start menu
  - Installer

### macOS (.png)
- Format: PNG
- Size: 1024x1024
- Used for:
  - App icon
  - Dock
  - Launchpad
  - DMG window
- electron-builder automatically generates .icns from this

---

## Testing

After creating the icons:

### Test Locally:
```bash
# Windows
npm run build:win

# Mac (on Mac or via GitHub Actions)
npm run build:mac
```

### Verify Icons:

**Windows:**
- Check the `.exe` in `dist/` - right-click → Properties → should show new icon
- Install the app - desktop shortcut should show new icon

**Mac:**
- Open the `.dmg` in `dist/` - should show new icon
- Install the app - Dock should show new icon

---

## Icon Design Notes

The new TrueSpan "T" icon:
- ✅ Clean, minimal design
- ✅ Works well at small sizes (16x16)
- ✅ Strong brand identity
- ✅ High contrast colors (blue #1d43fe, purple #1b1464)

---

## Troubleshooting

### ImageMagick not found
- Make sure you checked "Add to PATH" during installation
- Restart PowerShell/Command Prompt
- Test: `magick -version`

### Icons not showing after build
- Clear icon cache:
  - **Windows:** Delete `IconCache.db` files
  - **Mac:** Run `sudo find /private/var/folders/ -name com.apple.dock.iconcache -exec rm {} \;`
- Restart Explorer (Windows) or Dock (Mac)

### ICO file too large
- Reduce number of sizes included
- Use PNG compression before converting

---

## Alternative: Keep Old Icons for Comparison

If you want to keep the old icons:
```bash
# Backup old icons
mv assets/logo.png assets/logo-old.png
mv assets/logo-1024.png assets/logo-1024-old.png

# Then create new icons
# assets/icon.png
# assets/icon.ico
```

---

## After Conversion

1. ✅ Run conversion script or use online tools
2. ✅ Verify files exist:
   - `assets/icon.png` (should be ~50-200KB)
   - `assets/icon.ico` (should be ~50-150KB)
3. ✅ Test build locally
4. ✅ Commit and push:
   ```bash
   git add assets/icon.png assets/icon.ico package.json src/main.js
   git commit -m "Update app icon to new TrueSpan T logo"
   git push
   ```
5. ✅ Download from GitHub Actions and verify

---

## Visual Preview

### Source SVG:
```
assets/TrueSpan-T-icon-Notification-1000px (1).svg
```

### Generated Files:
```
assets/
├── icon.png       (1024x1024, ~100KB)
└── icon.ico       (multi-size, ~80KB)
```

### Used In:
- Windows installer/exe: `icon.ico`
- Mac app bundle: `icon.png` (converted to .icns)
- DMG installer: `icon.png`
- All app windows: `icon.png`

---

## Quick Command Reference

```powershell
# Convert using ImageMagick (Windows)
magick "assets\TrueSpan-T-icon-Notification-1000px (1).svg" -resize 1024x1024 -background none assets\icon.png
magick assets\icon.png -define icon:auto-resize=256,128,96,64,48,32,16 assets\icon.ico

# Build Windows app
npm run build:win

# Build Mac app (via GitHub Actions or on Mac)
npm run build:mac

# Test locally (dev mode)
npm start
```

---

## Need Help?

If icons still don't work after conversion:
1. Check file sizes (should be reasonable, not 0KB)
2. Open PNG in image viewer - should be 1024x1024
3. Verify ICO contains multiple sizes
4. Try a clean build: `rm -rf dist node_modules && npm install && npm run build`

