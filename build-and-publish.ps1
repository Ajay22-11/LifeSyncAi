# LifeSync AI - Cloud Build & Publish Automation

param (
    [string]$Type = "all"
)

Write-Host "Starting Cloud Update Pipeline..." -ForegroundColor Cyan

# 1. Build Assets
Write-Host "Building web assets..." -ForegroundColor Yellow
npm run build

if ($Type -eq "electron" -or $Type -eq "all") {
    Write-Host "Building Desktop (Electron) Cloud Release..." -ForegroundColor Yellow
    # Explicitly publish to GitHub Releases
    npx electron-builder build --publish always
}

if ($Type -eq "mobile" -or $Type -eq "all") {
    Write-Host "Syncing Mobile (Capacitor) Assets..." -ForegroundColor Yellow
    npx cap sync
    
    Write-Host "Pushing Mobile OTA Cloud Update..." -ForegroundColor Yellow
    npx capgo upload
}

Write-Host "Pipeline complete!" -ForegroundColor Green
