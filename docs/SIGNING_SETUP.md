# eSigner.com Cloud Code Signing Setup

## Prerequisites

1. **Download and Install CodeSignTool**
   - Go to: https://www.ssl.com/guide/esigner-codesigntool-command-guide/
   - Download CodeSignTool for Windows
   - Add it to your system PATH or place it in your project directory

2. **Get Your eSigner Credentials**
   - Username: Your eSigner.com email address
   - Password: Your eSigner.com password
   - Credential ID: Found in eSigner portal under "SHOW MY SIGNING CREDENTIALS"
   - TOTP Secret: The secret code shown in your eSigner portal (visible in the screenshot you shared)

## Setup Steps

### 1. Create a `.env` file in your project root with these variables:

```env
# eSigner.com Cloud Code Signing Credentials
ESIGNER_USERNAME=your-email@example.com
ESIGNER_PASSWORD=your-password
ESIGNER_CREDENTIAL_ID=your-credential-id
ESIGNER_TOTP_SECRET=your-totp-secret
```

**⚠️ IMPORTANT:** The `.env` file is already in `.gitignore` - never commit credentials to Git!

### 2. Get Your TOTP Secret Code

From your eSigner portal screenshot, copy the **secret code** (the long string in the text box below the QR code).

Example from your portal: `your-totp-secret`

### 3. Get Your Credential ID

Click "SHOW MY SIGNING CREDENTIALS" in your eSigner portal to find your Credential ID.

### 4. Test the Setup

Run the build command:

```bash
npm run build:win
```

The signing process will automatically use your eSigner cloud credentials.

## Troubleshooting

### CodeSignTool Not Found
- Make sure CodeSignTool is installed and in your PATH
- Download from: https://www.ssl.com/guide/esigner-codesigntool-command-guide/
- On Windows, you may need to restart your terminal after adding to PATH

### Invalid Credentials
- Double-check all environment variables in `.env`
- Make sure there are no extra spaces or quotes
- Verify your TOTP secret is copied exactly as shown in eSigner portal

### OTP Errors
- The TOTP secret generates time-based codes automatically
- Ensure your system clock is accurate
- The secret code remains the same (don't use the 6-digit codes from your authenticator app)

## Security Notes

- Never commit `.env` file to version control
- Store credentials securely (consider using a password manager)
- For CI/CD, use encrypted environment variables in your build pipeline
- Regularly rotate your eSigner password

## Alternative: Manual Signing

If you prefer to sign manually after building:

```bash
CodeSignTool sign \
  -username="your@email.com" \
  -password="your-password" \
  -credential_id="your-credential-id" \
  -totp_secret="your-secret" \
  -input_file_path="dist/Truespan Setup 1.0.0.exe" \
  -override=true
```


