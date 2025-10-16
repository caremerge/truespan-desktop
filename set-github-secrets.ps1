# Set GitHub secrets programmatically to avoid paste issues
# Requires GitHub CLI: https://cli.github.com/

Write-Host "`nSetting GitHub Secrets Programmatically..." -ForegroundColor Cyan

# Check if GitHub CLI is installed
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
    Write-Host "`nERROR: GitHub CLI not found!" -ForegroundColor Red
    Write-Host "Install from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "Or set secrets manually in GitHub UI" -ForegroundColor Yellow
    exit 1
}

# Read the base64 file
$base64 = Get-Content "apple-cert-base64-clean.txt" -Raw
$base64 = $base64.Trim()  # Remove any whitespace

Write-Host "`nBase64 length: $($base64.Length) characters" -ForegroundColor Gray

# Set APPLE_CERT_PASSWORD
Write-Host "`nSetting APPLE_CERT_PASSWORD..." -ForegroundColor Gray
echo "Goicon2025" | gh secret set APPLE_CERT_PASSWORD --repo ryangalea23/truespan

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: APPLE_CERT_PASSWORD set" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not set APPLE_CERT_PASSWORD" -ForegroundColor Red
}

# Set APPLE_CERT_DATA
Write-Host "`nSetting APPLE_CERT_DATA..." -ForegroundColor Gray
echo $base64 | gh secret set APPLE_CERT_DATA --repo ryangalea23/truespan

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: APPLE_CERT_DATA set" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not set APPLE_CERT_DATA" -ForegroundColor Red
}

Write-Host "`nDone! Try running the GitHub Action again." -ForegroundColor Cyan

