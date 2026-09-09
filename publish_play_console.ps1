<#
.SYNOPSIS
    Automated build & publisher for CharcuterieShelf on Google Play Console.
.DESCRIPTION
    Compiles Nuxt static assets, syncs Capacitor, builds signed release AAB/APK,
    copies binaries to Google Drive & OneDrive, and uploads the bundle directly
    to Google Play Console via the Developer API.
.PARAMETER Track
    The release track to publish to: 'alpha' (Closed testing, default), 'internal', 'beta', or 'production'.
.PARAMETER SkipBuild
    Skip recompilation and upload the current existing AAB bundle directly.
.EXAMPLE
    .\publish_play_console.ps1 -Track alpha
    .\publish_play_console.ps1 -Track production
#>

param (
    [ValidateSet('alpha', 'internal', 'beta', 'production')]
    [string]$Track = 'alpha',

    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CharcuterieShelf Play Store Publisher - Target: $Track" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$AppDir = "c:\audiobookshelf_app"
$AabPath = "$AppDir\android\app\build\outputs\bundle\release\app-release.aab"
$ApkPath = "$AppDir\android\app\build\outputs\apk\release\app-release.apk"

if (-not $SkipBuild) {
    # 1. Compile Nuxt
    Write-Host "`n[1/4] Compiling Nuxt Frontend Bundle..." -ForegroundColor Yellow
    Set-Location $AppDir
    npm run generate

    # 2. Capacitor Sync
    Write-Host "`n[2/4] Syncing Capacitor Native Android Project..." -ForegroundColor Yellow
    npx cap sync android

    # 3. Build Native Release Binaries
    Write-Host "`n[3/4] Building Signed Release AAB & APK with Gradle (JDK 21)..." -ForegroundColor Yellow
    $env:JAVA_HOME = "C:\Java\jdk-21"
    $env:Path = "C:\Java\jdk-21\bin;" + $env:Path
    Set-Location "$AppDir\android"
    .\gradlew.bat assembleRelease bundleRelease

    # Copy to Cloud Drives
    Write-Host "`nCopying binaries to Google Drive and OneDrive..." -ForegroundColor Cyan
    Copy-Item $ApkPath -Destination "E:\Google Drive\CharcuterieShelf.apk" -Force -ErrorAction SilentlyContinue
    Copy-Item $AabPath -Destination "E:\Google Drive\CharcuterieShelf.aab" -Force -ErrorAction SilentlyContinue
    Copy-Item $ApkPath -Destination "C:\Users\Connor\OneDrive\CharcuterieShelf.apk" -Force -ErrorAction SilentlyContinue
    Copy-Item $AabPath -Destination "C:\Users\Connor\OneDrive\CharcuterieShelf.aab" -Force -ErrorAction SilentlyContinue
}

# 4. Upload to Google Play Console
Write-Host "`n[4/4] Publishing AAB to Google Play Console ($Track track)..." -ForegroundColor Yellow
Set-Location $AppDir
python scripts/publish_to_play_store.py --track $Track

Write-Host "`nDone!" -ForegroundColor Green
