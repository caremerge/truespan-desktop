# Test Script for New EV Certificate
# Run this after updating .env with new credentials

Write-Host "`nTesting New EV Certificate Credentials`n" -ForegroundColor Cyan

# Load .env file
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Loading new credentials from .env..." -ForegroundColor Gray
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$username = [Environment]::GetEnvironmentVariable('ESIGNER_USERNAME', "Process")
$password = [Environment]::GetEnvironmentVariable('ESIGNER_PASSWORD', "Process")
$credentialId = [Environment]::GetEnvironmentVariable('ESIGNER_CREDENTIAL_ID', "Process")
$totpSecret = [Environment]::GetEnvironmentVariable('ESIGNER_TOTP_SECRET', "Process")

Write-Host "`nTesting new EV certificate credentials...`n" -ForegroundColor Gray

Push-Location "C:\Users\ryanm\CodeSignTool-v1.3.2-windows"

try {
    Write-Host "Fetching credential info..." -ForegroundColor Gray
    $output = & .\CodeSignTool.bat credential_info `
        -username="$username" `
        -password="$password" `
        -credential_id="$credentialId" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: New EV Certificate Verified!`n" -ForegroundColor Green
        Write-Host $output -ForegroundColor Gray
        
        Write-Host "`nSUCCESS! Your new EV certificate is ready!" -ForegroundColor Green
        Write-Host "`nNext step: Run 'npm run build:win' to build with your new EV certificate" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: Credential verification failed`n" -ForegroundColor Red
        Write-Host $output -ForegroundColor Gray
        Write-Host "`nTIP: Make sure you've updated .env with the NEW credentials from the enrollment page" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""

