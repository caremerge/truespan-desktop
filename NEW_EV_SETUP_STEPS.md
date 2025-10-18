# New EV Certificate Setup Steps

## Your New EV Certificate  Info!
- **Order Reference**: co-341ket12k37
- **Issued**: 2025-10-15 12:30:42
- **Type**: Extended Validation (EV) Code Signing
- **Free Cloud Signing**: 30 days included

---

## Step-by-Step Setup:

### ✅ Step 1: Complete Enrollment
1. The enrollment page should now be open in your browser
2. Follow the enrollment wizard
3. Set up your signing credential
4. **Save the TOTP Secret** (QR code + text secret)
5. Note down or screenshot the secret code

### ✅ Step 2: Get Your New Credential ID
1. After enrollment, click **"SHOW MY SIGNING CREDENTIALS"**
2. Copy your new **Credential ID** (UUID format)
3. Keep this handy

### ✅ Step 3: Update Your .env File
Open `.env` in the project folder and update:

```env
# Same username and password
ESIGNER_USERNAME=ryan.galea@goicon.com
ESIGNER_PASSWORD=Tigesmel23!

# NEW - Update these with values from enrollment page
ESIGNER_CREDENTIAL_ID=your-new-credential-id-here
ESIGNER_TOTP_SECRET=your-new-secret-code-here
```

**IMPORTANT**: The Credential ID and TOTP Secret will be DIFFERENT from your old certificate!

### ✅ Step 4: Test New Credentials
Run:
```powershell
.\test-new-ev-cert.ps1
```

This will verify your new EV certificate is working.

### ✅ Step 5: Build with New EV Certificate
Once the test passes:
```powershell
npm run build:win
```

Your installer will now be signed with the TRUE EV certificate!

---

## Key Differences from Previous Certificate:

### Old Certificate (EVCS - Cloud Only):
- ❌ Cloud-based EV (limited SmartScreen bypass)
- ⚠️ Treated like OV by Microsoft

### New Certificate (True EV):
- ✅ Full Extended Validation
- ✅ Better SmartScreen reputation building
- ✅ 30 days free cloud signing included
- 🎯 May still need hardware token for immediate bypass*

\* Microsoft's latest policy requires hardware tokens for immediate SmartScreen bypass. However, true EV certificates build reputation MUCH faster than OV (days vs weeks).

---

## After Building:

Check the signature:
```powershell
Get-AuthenticodeSignature "dist\TrueSpan Living Setup 1.0.0.exe" | Format-List Status, StatusMessage
```

Should show:
- Status: Valid
- StatusMessage: Signature verified

---

## Questions to Ask SSL.com (Optional):

If SmartScreen warnings persist after a few days:

1. "Does my EV certificate include a hardware USB token option?"
2. "How can I get immediate Windows SmartScreen bypass?"
3. "What's the difference between cloud EV and hardware token EV for SmartScreen?"

Contact: support@ssl.com

---

## Timeline Expectations:

- **Day 1**: Build with new EV cert, some SmartScreen warnings expected
- **Day 2-3**: Start building reputation from downloads
- **Day 4-7**: Warnings should significantly reduce
- **Week 2**: Most warnings should be gone

Much faster than the old certificate! 🚀

