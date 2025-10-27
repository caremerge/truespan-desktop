# macOS Build Instructions - Idiot Proof Edition

## Prerequisites
- Mac computer (MacinCloud or physical Mac)
- Node.js installed (v16 or newer)
- Access to a terminal

---

## Step-by-Step Instructions

### 1. Clone the Repository
```bash
cd ~/Desktop
git clone <your-repo-url>
cd Truespan
```

*(Replace `<your-repo-url>` with your actual repository URL)*

---

### 2. Install Dependencies
```bash
npm install
```

---

### 3. Create the .p12 Certificate File

Copy and paste this ENTIRE command (it's one long line):

```bash
echo "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" | base64 -D > /tmp/certificate.p12
```

**This creates the certificate file at `/tmp/certificate.p12`**

---

### 4. Import the .p12 into Your Apple Keychain

```bash
security import /tmp/certificate.p12 -k ~/Library/Keychains/login.keychain-db -P "Goicon2025" -T /usr/bin/codesign -T /usr/bin/productsign
```

---

### 5. Verify the Certificate Imported with the Private Key (Optional but Recommended)

```bash
security find-identity -v -p codesigning
```

**Expected output:**
```
1) XXXXXXXX "Developer ID Application: Go Icon LLC (C42TKCA35H)"
     1 valid identities found
```

If you see `0 valid identities found`, something went wrong. Go back to step 4.

---

### 6. Delete the Temporary .p12 File

```bash
rm /tmp/certificate.p12
```

---

### 7. Create .env File for Notarization

```bash
cat > .env << 'EOF'
APPLE_ID=Ryan@GoIcon.io
APPLE_APP_SPECIFIC_PASSWORD=<get-from-GITHUB_SECRETS_EXACT_VALUES.txt>
APPLE_TEAM_ID=C42TKCA35H
EOF
```

*(Get the `APPLE_APP_SPECIFIC_PASSWORD` from the `GITHUB_SECRETS_EXACT_VALUES.txt` file)*

---

### 8. Build the macOS Installer

```bash
npm run build:mac
```

---

### 9. Find Your DMG

```bash
ls -lh dist/*.dmg
```

Your signed and notarized DMG will be in the `dist` folder!

---

## Troubleshooting

**Problem: "no valid identity" errors**
- Re-run step 5 to check if the certificate was imported
- Make sure you see `1 valid identities found`
- If not, delete the certificate and start over from step 3

**Problem: Notarization fails**
- Check your `.env` file has the correct credentials
- Make sure `APPLE_APP_SPECIFIC_PASSWORD` is correct

**Problem: "wrong password" when importing**
- Make sure you copied the ENTIRE command from step 3
- The base64 string is very long - make sure it's complete

---

## Important Notes

- The password for the .p12 is: `Goicon2025`
- This .p12 file contains both the certificate AND the private key
- This is the SAME certificate that GitHub Actions uses successfully
- After step 5, you should see exactly 1 valid identity

