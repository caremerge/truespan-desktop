# Test if your .p12 file can be opened with your password
# This simulates what GitHub Actions does

Write-Host "`nTesting .p12 file and password...`n" -ForegroundColor Cyan

# Prompt for password
$password = Read-Host "Enter your APPLE_CERT_PASSWORD (the one you used when creating .p12)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host "`nTesting .p12 file with provided password..." -ForegroundColor Gray

# Try to read the .p12 file
openssl pkcs12 -info -in apple-developer-certificate.p12 -noout -passin pass:$passwordPlain 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS! Password is correct!" -ForegroundColor Green
    Write-Host "The .p12 file can be opened with this password." -ForegroundColor Green
    Write-Host "`nThis is the password you should use in GitHub for APPLE_CERT_PASSWORD" -ForegroundColor Cyan
} else {
    Write-Host "`nFAILED! Password is incorrect!" -ForegroundColor Red
    Write-Host "The .p12 file cannot be opened with this password." -ForegroundColor Red
    Write-Host "`nYou may need to recreate the .p12 file with a known password." -ForegroundColor Yellow
}

Write-Host ""

