# Generate Apple Certificate Signing Request (CSR) on Windows
# This creates the files needed for Apple Developer certificate

Write-Host "`nGenerating Apple Certificate Signing Request (CSR)...`n" -ForegroundColor Cyan

# Check if OpenSSL is available
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $openssl) {
    Write-Host "ERROR: OpenSSL not found!" -ForegroundColor Red
    Write-Host "`nTo install OpenSSL on Windows:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "2. Install 'Win64 OpenSSL v3.x.x Light'" -ForegroundColor White
    Write-Host "3. Add to PATH: C:\Program Files\OpenSSL-Win64\bin" -ForegroundColor White
    Write-Host "4. Restart terminal and run this script again" -ForegroundColor White
    exit 1
}

Write-Host "OpenSSL found: $($openssl.Source)`n" -ForegroundColor Green

# Get user information
Write-Host "Enter your information for the certificate:" -ForegroundColor Cyan
$email = Read-Host "Email (your Apple ID)"
$name = Read-Host "Common Name (e.g., VoiceFriend, LLC)"
$org = Read-Host "Organization (e.g., Icon)"
$city = Read-Host "City (e.g., Boston)"
$state = Read-Host "State (e.g., Massachusetts)"
$country = Read-Host "Country Code (e.g., US)"

# Generate private key
Write-Host "`nGenerating private key..." -ForegroundColor Gray
openssl genrsa -out apple-dev-private-key.key 2048

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate private key" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: Private key generated: apple-dev-private-key.key" -ForegroundColor Green

# Generate CSR
Write-Host "`nGenerating Certificate Signing Request..." -ForegroundColor Gray
$subject = "/emailAddress=$email/CN=$name/O=$org/L=$city/ST=$state/C=$country"

# Use -config flag to bypass config file requirement, or use -batch to skip interactive prompts
openssl req -new -key apple-dev-private-key.key -out CertificateSigningRequest.certSigningRequest -subj $subject -batch 2>$null
if ($LASTEXITCODE -ne 0) {
    # Try without config if first attempt fails
    openssl req -new -key apple-dev-private-key.key -out CertificateSigningRequest.certSigningRequest -subj $subject -nodes 2>$null
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate CSR" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: CSR generated: CertificateSigningRequest.certSigningRequest`n" -ForegroundColor Green

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "FILES CREATED:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "1. apple-dev-private-key.key" -ForegroundColor Yellow
Write-Host "   -> KEEP THIS SAFE! You'll need it to use the certificate" -ForegroundColor White
Write-Host ""
Write-Host "2. CertificateSigningRequest.certSigningRequest" -ForegroundColor Yellow
Write-Host "   -> Upload this to Apple Developer portal" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "1. In Apple Developer portal, click 'Choose File'" -ForegroundColor White
Write-Host "2. Upload: CertificateSigningRequest.certSigningRequest" -ForegroundColor White
Write-Host "3. Download the certificate (.cer file)" -ForegroundColor White
Write-Host "4. Convert to .p12 format (see instructions below)" -ForegroundColor White
Write-Host ""

# Keep files safe
Write-Host "WARNING: Keep apple-dev-private-key.key SECURE!" -ForegroundColor Red
Write-Host "Anyone with this key can sign apps as your organization!" -ForegroundColor Red
Write-Host ""

