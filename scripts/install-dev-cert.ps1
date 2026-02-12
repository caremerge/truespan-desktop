# Run this script as Administrator to trust the dev signing cert for local AppX sideloading.
# Right-click -> Run with PowerShell (as Administrator)

$certPath = Join-Path $PSScriptRoot '..\dist\dev-cert.cer'

if (-not (Test-Path $certPath)) {
    Write-Error "Certificate not found at $certPath. Build the app first with 'npm run build:win'."
    pause
    exit 1
}

Write-Host "Importing dev certificate to TrustedPeople store..." -ForegroundColor Cyan
certutil -addstore TrustedPeople $certPath

Write-Host "Importing dev certificate to Root store..." -ForegroundColor Cyan
certutil -addstore Root $certPath

Write-Host ""
Write-Host "Done! Now install the AppX:" -ForegroundColor Green
Write-Host "  Add-AppxPackage -Path dist\Truespan-Neighborhood-1.0.7.appx" -ForegroundColor Yellow
Write-Host ""
pause
