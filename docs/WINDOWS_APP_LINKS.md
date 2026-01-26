## Windows App Links (https://goicon.com → app)

Windows App Links require an MSIX/AppX package. The NSIS installer cannot claim `https://` links.

### 1) Build an AppX/MSIX package
- Update `build/appx.json` with your real values:
  - `identityName`
  - `publisher`
  - `publisherDisplayName`
- Build the package:
  - `npm run build:win:appx`

### 2) Install the AppX/MSIX and get the Package Family Name
After installing, run in PowerShell:
```
Get-AppxPackage -Name "*Truespan*" | Select Name, PackageFamilyName
```

### 3) Host the Windows association file
Host the `windows-app-web-link` file at:
```
https://goicon.com/.well-known/windows-app-web-link
```
Update `packageFamilyName` inside the file with the value from step 2.

### 4) Verify association
On Windows:
- Settings → Apps → Apps for websites
- Ensure `goicon.com` is mapped to Truespan Neighborhood

### Notes
- The file name **must** be `windows-app-web-link` (no extension).
- The file must be served over HTTPS with `application/json`.
