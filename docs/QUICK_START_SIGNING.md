# Quick Start: Code Signing Setup

## What You Need (From Your eSigner Portal):

1. ✅ Your **eSigner.com email** (username )
2. ✅ Your **eSigner.com password**
3. ✅ **Secret code** - Copy from the text box in your eSigner portal (visible in your screenshot)
4. ✅ **Credential ID** - Click "SHOW MY SIGNING CREDENTIALS" to find this

## Installation Steps:

### 1. Install CodeSignTool

Download from: https://www.ssl.com/guide/esigner-codesigntool-command-guide/

**Quick Install (Windows):**
```powershell
# Download CodeSignTool and extract to a folder
# Add the folder to your system PATH, or place CodeSignTool.bat in your project root
```

### 2. Create `.env` File

Create a file named `.env` in your project root:

```env
ESIGNER_USERNAME=your@email.com
ESIGNER_PASSWORD=your-password
ESIGNER_CREDENTIAL_ID=abc123-def456-ghi789
ESIGNER_TOTP_SECRET=your-totp-secret
```

**Replace with your actual values!**

### 3. Build Your Signed Installer

```bash
npm run build:win
```

That's it! The installer will be automatically signed during the build process.

## Files Already Set Up:

- ✅ `package.json` - Configured for code signing
- ✅ `sign.js` - Custom signing script for eSigner
- ✅ `.gitignore` - Protects your `.env` file from being committed

## Need Help?

See `SIGNING_SETUP.md` for detailed troubleshooting and advanced options.


