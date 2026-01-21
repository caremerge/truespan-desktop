# Test Script for eSigner Credentials
# This script verifies your eSigner credentials are working

Write-Host "`n🧪 Testing eSigner Credentials`n" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Run: .\setup-signing.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Load .env file
Write-Host "Loading credentials from .env..." -ForegroundColor Gray
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check required variables
$required = @('ESIGNER_USERNAME', 'ESIGNER_PASSWORD', 'ESIGNER_CREDENTIAL_ID', 'ESIGNER_TOTP_SECRET')
$missing = @()

foreach ($var in $required) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if (-not $value) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "❌ Missing required credentials in .env:" -ForegroundColor Red
    foreach ($var in $missing) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
    Write-Host "`nPlease edit .env and fill in all required values" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ All required credentials found`n" -ForegroundColor Green

# Test CodeSignTool
Write-Host "Testing CodeSignTool access..." -ForegroundColor Gray
$codeSignTool = "C:\Users\ryanm\CodeSignTool-v1.3.2-windows\CodeSignTool.bat"

if (Test-Path $codeSignTool) {
    Write-Host "✅ CodeSignTool found at: $codeSignTool`n" -ForegroundColor Green
} else {
    Write-Host "❌ CodeSignTool not found at: $codeSignTool" -ForegroundColor Red
    Write-Host "   Please update CODESIGNTOOL_PATH in .env if you moved it" -ForegroundColor Yellow
    exit 1
}

# Test credential ID retrieval
Write-Host "Testing credential ID with eSigner..." -ForegroundColor Gray
Write-Host "(This may take a few seconds)`n" -ForegroundColor Gray

$username = [Environment]::GetEnvironmentVariable('ESIGNER_USERNAME', "Process")
$password = [Environment]::GetEnvironmentVariable('ESIGNER_PASSWORD', "Process")
$credentialId = [Environment]::GetEnvironmentVariable('ESIGNER_CREDENTIAL_ID', "Process")
$totpSecret = [Environment]::GetEnvironmentVariable('ESIGNER_TOTP_SECRET', "Process")

Push-Location "C:\Users\ryanm\CodeSignTool-v1.3.2-windows"

try {
    $output = & .\CodeSignTool.bat credential_info `
        -username="$username" `
        -password="$password" `
        -credential_id="$credentialId" `
        -totp_secret="$totpSecret" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Credentials verified successfully!`n" -ForegroundColor Green
        Write-Host "Credential Info:" -ForegroundColor Cyan
        Write-Host $output -ForegroundColor Gray
        Write-Host "`n✅ You're all set! Run 'npm run build:win' to build with code signing" -ForegroundColor Green
    } else {
        Write-Host "❌ Credential verification failed`n" -ForegroundColor Red
        Write-Host "Error output:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor Gray
        Write-Host "`n💡 Common issues:" -ForegroundColor Cyan
        Write-Host "   - Check your username and password" -ForegroundColor White
        Write-Host "   - Verify your Credential ID from eSigner portal" -ForegroundColor White
        Write-Host "   - Ensure TOTP secret is the SECRET CODE (not the 6-digit code)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Error running CodeSignTool: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""


