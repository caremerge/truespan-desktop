# Setup Script for eSigner Code Signing
# This script helps you set up code signing credentials

Write-Host "`n🔐 TrueSpan eSigner Setup`n" -ForegroundColor Cyan

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
    Write-Host "   Edit it to update your credentials`n" -ForegroundColor Gray
} else {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item "env.template" ".env"
    Write-Host "✅ Created .env file`n" -ForegroundColor Green
}

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open .env file in a text editor" -ForegroundColor White
Write-Host "   2. Fill in your eSigner credentials:" -ForegroundColor White
Write-Host "      - ESIGNER_USERNAME (your email)" -ForegroundColor Gray
Write-Host "      - ESIGNER_PASSWORD (your password)" -ForegroundColor Gray
Write-Host "      - ESIGNER_CREDENTIAL_ID (from portal)" -ForegroundColor Gray
Write-Host "      - ESIGNER_TOTP_SECRET (from portal)" -ForegroundColor Gray
Write-Host ""

Write-Host "💡 To get your credentials:" -ForegroundColor Cyan
Write-Host "   1. Go to your eSigner portal: https://www.ssl.com/esigner/" -ForegroundColor White
Write-Host "   2. Click 'SHOW MY SIGNING CREDENTIALS'" -ForegroundColor White
Write-Host "   3. Copy your Credential ID" -ForegroundColor White
Write-Host "   4. Copy the secret code from the text box (NOT the QR code)" -ForegroundColor White
Write-Host ""

Write-Host "🧪 To test your credentials:" -ForegroundColor Cyan
Write-Host "   Run: .\test-signing.ps1" -ForegroundColor White
Write-Host ""

Write-Host "🚀 To build with code signing:" -ForegroundColor Cyan
Write-Host "   Run: npm run build:win" -ForegroundColor White
Write-Host ""


