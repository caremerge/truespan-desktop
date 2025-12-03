# Microsoft SmartScreen Submission Guide

## Step 1: Prepare Your Information

You'll need:
- ✅ **Installer file**: `Truespan Neighborhood Setup 1.0.0.exe`
- ✅ **Company**: VoiceFriend, LLC
- ✅ **Application Name**: Truespan Neighborhood
- ✅ **Website**: Your company/product website
- ✅ **Contact Email**: Your support email

## Step 2: Submit to Microsoft

### Option A: Microsoft Security Intelligence Submission Portal

1. Go to: https://www.microsoft.com/en-us/wdsi/filesubmission

2. Click **"Submit a file for malware analysis"**

3. Fill out the form:
   - **File to submit**: Upload `Truespan Neighborhood Setup 1.0.0.exe`
   - **Submission type**: Select "I think this file is clean"
   - **Email**: Your contact email
   - **Product name**: Truespan Neighborhood
   - **Company name**: VoiceFriend, LLC
   - **Description**: "This is a legitimate business application installer, digitally signed with an EV code signing certificate from SSL.com"

4. Submit and wait for confirmation email

### Option B: Microsoft Feedback Hub (for faster results)

1. Open **Feedback Hub** in Windows (search for it in Start menu)

2. Click **"Report a problem"**

3. Category: **Security and Privacy > Windows Security**

4. Title: "False positive SmartScreen warning for legitimately signed application"

5. Description:
   ```
   Application: Truespan Neighborhood Setup 1.0.0.exe
   Company: VoiceFriend, LLC
   Certificate: EV Code Signing from SSL.com
   
   Our installer is showing SmartScreen warnings despite being signed with 
   a valid Extended Validation (EV) code signing certificate. The application 
   is legitimate business software and we request review for SmartScreen 
   reputation building.
   
   Certificate Details:
   - Subject: CN="VoiceFriend, LLC", O=Icon, L=Boston, ST=Massachusetts, C=US
   - Issuer: SSL.com Code Signing Intermediate CA RSA R1
   - Valid until: October 14, 2027
   ```

6. Attach screenshots of the SmartScreen warning

7. Submit

## Step 3: Alternative - Direct Contact

If you have a Microsoft Partner account or business relationship:

- Contact your Microsoft account manager
- Email: secure@microsoft.com (for security-related inquiries)
- Provide installer details and certificate information

## Step 4: While Waiting for Microsoft

### Speed up reputation naturally:

1. **Host on your website** - Download from consistent, reputable domain
2. **Multiple downloads** - Have team members download from different IPs
3. **Successful installs** - Complete installations (don't just download)
4. **Wait 24-48 hours** - EV certs build reputation faster
5. **Use consistent naming** - Keep filename and product name consistent

### Verify your submission worked:

After 3-5 days, test on a fresh Windows machine to see if warnings reduced.

## Important Notes

- ✅ Your installer IS properly signed
- ✅ The certificate is valid and trusted
- ✅ This is a reputation issue, not a security issue
- ⏰ Typical reputation building: 1-2 weeks for EV certs (vs 4-8 weeks for OV)
- 🚀 Microsoft submission can reduce this to 3-5 days

## Expected Timeline

- **Day 1-2**: Submit to Microsoft
- **Day 3-5**: Microsoft reviews and may add to allowlist
- **Day 7-14**: Natural reputation builds from user downloads
- **After 2 weeks**: Most SmartScreen warnings should be gone

## Verification

To check if your app is allowlisted:
```powershell
Get-AuthenticodeSignature "Truespan Neighborhood Setup 1.0.0.exe"
```

Status should remain "Valid" - if SmartScreen warnings reduce, reputation is building!


