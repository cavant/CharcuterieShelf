---
name: charcuterieshelf-qa-review
description: Full-stack end-to-end testing, code review, and release readiness verification harness for CharcuterieShelf (Nuxt 2, Capacitor 7, Android Kotlin, GitHub Actions CI/CD).
---

# CharcuterieShelf QA & Code Review Harness

This skill provides comprehensive instructions and tooling to perform full-stack quality assurance, code review, and pre-release readiness checks for **CharcuterieShelf** (`c:\audiobookshelf_app`).

## Overview

CharcuterieShelf is a hybrid mobile app using **Nuxt 2 (Vue 2.x, Vuex, Tailwind CSS 3.4)** wrapped in a **Capacitor 7** shell for Android (Kotlin & Gradle) and iOS.

This QA harness validates all system layers before builds or releases are published to testers or the Google Play Store:
1. **Frontend Unit & Logic Integrity**:
   - Update Checker & Semver engine (`utils/semverUtils.js`)
   - Duration and timestamp parsing (`utils/playbackUtils.js`)
   - Podcast favorites and subscription isolation per user/server (`plugins/localStore.js`)
   - 14-Theme palette engine and Material You Monet variables (`assets/tailwind.css`)
   - Resilient download queue exponential backoff, external CDN enclosure isolation, and auth token security
2. **Localization Health**:
   - Validates all 42 locale files in `strings/` parse as JSON, end with newlines, and follow standard ASCII sorting
   - Checks presence of required CharcuterieShelf keys in `en-us.json`
3. **Branding, Security & Native Manifests**:
   - Preserves `applicationId "com.CharcuterieShelf"` strictly
   - Verifies target SDK is API 36 (Android 16), compliant with Google Play target API rules
   - Verifies Android 13+ (API 33+) granular media permission (`READ_MEDIA_AUDIO`) and `READ_EXTERNAL_STORAGE` `maxSdkVersion="32"`
   - Verifies native code / 16 KB page size compatibility (managed Kotlin/Java + Webview, 0 unaligned NDK `.so` binaries)
   - Checks custom URL scheme (`charcuterieshelf://`) and app branding strings
   - Verifies `FileProvider`, `PlayerNotificationService` (`mediaPlayback`), and `DownloadService` (`dataSync`) service types
   - Verifies presence of native drawables and monochrome status bar icons (`icon_monochrome.xml`)
4. **GitHub Actions CI/CD & Issue Templates**:
   - Workflow syntax, explicit `permissions:` declarations
   - `chmod +x ./android/gradlew` execution guards
   - Safe sed delimiters (`s|__DATE__|...|g`)
   - Closed testing issue template (`tester_request.yml`) and `close_blank_issues.yaml` whitelist
5. **Static Bundle Health**:
   - Pre-rendered route HTML verification (`dist/bookshelf/favorites/index.html`, etc.)
6. **Android Gradle Build Readiness**:
   - JDK 21 environment verification (`$env:JAVA_HOME = "C:\Java\jdk-21"`)
   - Signed release keystore verification (`android/app/release-key.jks`)

---

## Quick Start & Verification Commands

Run the harness directly using npm or node from the project root (`c:\audiobookshelf_app`):

```powershell
# 1. Run the entire full-stack QA suite (all 10 verification suites)
npm run test:qa
# or
node scripts/run-qa-harness.js --all

# 2. Run full end-to-end compilation + verification (Nuxt generate + Android compileDebugSources)
npm run test:full
# or
node scripts/run-qa-harness.js --full

# 3. Run frontend unit tests only
npm test
# or
node scripts/run-qa-harness.js --unit

# 4. Run localization checks
npm run test:i18n

# 5. Run branding and manifest integrity checks
npm run test:branding

# 6. Run GitHub Actions workflow & template validation
npm run test:github

# 7. Verify static Nuxt bundle compilation
npm run test:build

# 8. Verify Android build environment and prerequisites
npm run test:android

# 9. Execute native Android gradle debug compilation
npm run test:android:compile
```

---

## Pre-Release Deployment Checklist

When preparing a new release of CharcuterieShelf for testers or Google Play, execute these steps in order:

### 1. Execute the Full QA Harness
```powershell
npm run test:qa
```
Ensure all 10 suites pass with 0 failures.

### 2. Compile Web Assets & Sync Capacitor
```powershell
npm run generate
npx cap sync
```

### 3. Build Signed Production Binaries
```powershell
$env:JAVA_HOME = "C:\Java\jdk-21"
$env:Path = "C:\Java\jdk-21\bin;" + $env:Path
cd android

# Build release APK
.\gradlew.bat assembleRelease

# Build release AAB for Google Play
.\gradlew.bat bundleRelease
cd ..
```

### 4. Distribute to Cloud Storage
Copy output artifacts to:
- `E:\Google Drive\CharcuterieShelf.apk` and `E:\Google Drive\CharcuterieShelf.aab`
- `C:\Users\Connor\OneDrive\CharcuterieShelf.apk` and `C:\Users\Connor\OneDrive\CharcuterieShelf.aab`

### 5. Document Changes
- Keep `AGENTS.md`, `readme.md`, and `walkthrough.md` synchronized with any new user-facing features or bug fixes.
- Contact tester email: `support@themagicsalami.net`.
- Live tester portal: `https://cavant.github.io/CharcuterieShelf/`.
