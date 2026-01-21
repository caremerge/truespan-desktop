# Convert Apple Certificate to .p12 format
# This combines your .cer file (from Apple) with your private key

Write-Host "`nConverting Apple Certificate to .p12 format...`n" -ForegroundColor Cyan

# Check if OpenSSL is available
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $openssl) {
    Write-Host "ERROR: OpenSSL not found!" -ForegroundColor Red
    Write-Host "You'll need to do this on a Mac or install OpenSSL" -ForegroundColor Yellow
    exit 1
}

# Check for required files
if (-not (Test-Path "apple-dev-private-key.key")) {
    Write-Host "ERROR: apple-dev-private-key.key not found!" -ForegroundColor Red
    Write-Host "This should have been created when you generated the CSR" -ForegroundColor Yellow
    exit 1
}

Write-Host "Looking for .cer file downloaded from Apple..." -ForegroundColor Gray
$cerFile = Get-ChildItem -Filter "*.cer" | Select-Object -First 1

if (-not $cerFile) {
    Write-Host "ERROR: No .cer file found!" -ForegroundColor Red
    Write-Host "Please download your certificate from Apple Developer portal" -ForegroundColor Yellow
    Write-Host "Save it in this directory: $PWD" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found certificate: $($cerFile.Name)" -ForegroundColor Green

# Ask for password
Write-Host "`nYou need to set a password for the .p12 file" -ForegroundColor Cyan
Write-Host "This password will be used as APPLE_CERT_PASSWORD in GitHub secrets" -ForegroundColor Yellow
$password = Read-Host "Enter a password for the .p12 file" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# Convert .cer to .pem
Write-Host "`nStep 1: Converting .cer to .pem..." -ForegroundColor Gray
openssl x509 -inform der -in $cerFile.Name -out certificate.pem

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to convert certificate" -ForegroundColor Red
    exit 1
}

# Create .p12
Write-Host "Step 2: Creating .p12 file..." -ForegroundColor Gray
openssl pkcs12 -export -out apple-developer-certificate.p12 -inkey apple-dev-private-key.key -in certificate.pem -password pass:$passwordPlain

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create .p12 file" -ForegroundColor Red
    exit 1
}

# Clean up temp file
Remove-Item certificate.pem -ErrorAction SilentlyContinue

Write-Host "`nSUCCESS! Created: apple-developer-certificate.p12" -ForegroundColor Green

# Convert to base64 for GitHub
Write-Host "`nStep 3: Converting to base64 for GitHub..." -ForegroundColor Gray
$bytes = [System.IO.File]::ReadAllBytes("apple-developer-certificate.p12")
$base64 = [System.Convert]::ToBase64String($bytes)
$base64 | Out-File -FilePath "apple-cert-base64.txt" -Encoding ASCII

Write-Host "SUCCESS! Created: apple-cert-base64.txt" -ForegroundColor Green

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "GITHUB SECRETS - USE THESE VALUES:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. APPLE_CERT_DATA:" -ForegroundColor Yellow
Write-Host "   -> Open apple-cert-base64.txt and copy ALL the text" -ForegroundColor White
Write-Host ""
Write-Host "2. APPLE_CERT_PASSWORD:" -ForegroundColor Yellow
Write-Host "   -> $passwordPlain" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  - apple-developer-certificate.p12 (keep safe!)" -ForegroundColor White
Write-Host "  - apple-cert-base64.txt (use for GitHub secret)" -ForegroundColor White
Write-Host ""

