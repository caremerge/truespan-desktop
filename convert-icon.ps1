# PowerShell Script to Convert SVG Icon to Required Formats
# Requires ImageMagick: https://imagemagick.org/script/download.php

Write-Host "🎨 Converting TrueSpan Icon..." -ForegroundColor Cyan
Write-Host ""

# Check if ImageMagick is installed
try {
    $null = magick -version
} catch {
    Write-Host "❌ ImageMagick not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install ImageMagick:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://imagemagick.org/script/download.php" -ForegroundColor Yellow
    Write-Host "2. Choose 'Win64 dynamic at 16 bits-per-pixel component'" -ForegroundColor Yellow
    Write-Host "3. Run installer and check 'Add to PATH'" -ForegroundColor Yellow
    Write-Host "4. Restart PowerShell and run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OR use online converter:" -ForegroundColor Yellow
    Write-Host "https://cloudconvert.com/svg-to-png" -ForegroundColor Yellow
    exit 1
}

$svgFile = "assets\TrueSpan-T-icon-Notification-1000px (1).svg"
$pngFile = "assets\icon.png"
$icoFile = "assets\icon.ico"

if (-not (Test-Path $svgFile)) {
    Write-Host "❌ Source file not found: $svgFile" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Converting SVG to PNG (1024x1024)..." -ForegroundColor Yellow
magick "$svgFile" -resize 1024x1024 -background none "$pngFile"

if (Test-Path $pngFile) {
    Write-Host "✅ Created: $pngFile" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create PNG" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Converting PNG to ICO (multi-size)..." -ForegroundColor Yellow
magick "$pngFile" -define icon:auto-resize=256,128,96,64,48,32,16 "$icoFile"

if (Test-Path $icoFile) {
    Write-Host "✅ Created: $icoFile" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create ICO" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Icon conversion complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Get-ChildItem "assets\icon.*" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  $($_.Name) - ${size}KB" -ForegroundColor White
}
Write-Host ""
Write-Host "✅ Ready to build! Run: npm run build" -ForegroundColor Green

