# AGENTS.md — AI Agent Development Guide for CharcuterieShelf

Welcome to **CharcuterieShelf**! This repository is a community-first, feature-packed fork of [Audiobookshelf](https://github.com/advplyr/audiobookshelf-app) created and maintained by **TheMagicSalami** ([cavant](https://github.com/cavant)).

Repository: `https://github.com/cavant/CharcuterieShelf.git`  
Upstream Origin: `https://github.com/advplyr/audiobookshelf-app`  
Author: **TheMagicSalami**  
Tester Support: `support@themagicsalami.net`  
Live Tester Portal: `https://cavant.github.io/CharcuterieShelf/`  
Support: [Buy Me a Coffee](https://buymeacoffee.com/themagicsalami)

---

## 1. Architectural Overview

CharcuterieShelf is a hybrid mobile client powered by **Nuxt.js (Vue 2)** embedded within a native **Capacitor 7** shell for Android (Kotlin & Gradle) and iOS.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CharcuterieShelf Client                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend Webview (Nuxt 2 / Vue 2.x / Tailwind CSS 3.4)                 │
│  - Pages: Bookshelf, Favorites, Player, Downloading, Settings, Modals   │
│  - State: Vuex Store, $localStore (Capacitor Preferences), $appUpdater  │
│  - Theming: 14 Palettes + Material You Monet Dynamic Accent Engine      │
├─────────────────────────────────────────────────────────────────────────┤
│  Capacitor Bridge Plugins                                               │
│  - AbsAudioPlayer (ExoPlayer playback, speed, silence trim, streaming)  │
│  - AbsDatabase (SQLite offline cache & local storage)                   │
│  - AbsDownloader (Foreground DownloadService, scoped storage, retry)    │
│  - AbsFileSystem (Media file resolution & cache cleanup)                │
│  - AbsThemePlugin (Android 12+ Monet dynamic wallpaper color extraction)│
│  - AbsAppUpdater (GitHub release checker, APK download & installer)     │
├─────────────────────────────────────────────────────────────────────────┤
│  Native Android (Kotlin & AndroidX)                                     │
│  - MainActivity (Edge-to-edge window insets, Monet CSS injection)       │
│  - PlayerNotificationService (ExoPlayer media session, small icon)      │
│  - MediaBrowserServiceCompat (Android Auto in-car dashboard playback)   │
│  - MediaPlayerWidget (Home screen AppWidgetProvider with Glide art)     │
│  - DownloadService & DownloadItemManager (Queue recovery, backoff)      │
│  - NetworkCallback (Local-first ping resolver & LAN/WAN auto-switch)     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Distinctive Features & Capabilities

### 2.1 Unified Local & Remote Server Connection with Local-First Priority
- Allows configuring a single server profile with two network addresses:
  1. `address` / `remoteAddress`: Remote WAN URL (e.g. `https://audio.mydomain.com`).
  2. `localAddress`: Local LAN URL (e.g. `http://192.168.1.69:13378`).
  3. `localNetworks`: Comma-separated Wi-Fi SSIDs for legacy matching.
- **Local-First Priority (`utils/serverAddressResolver.js`)**:
  - Always probes `localAddress` first with a fast 1500ms ping (`/ping` endpoint), completely bypassing Android 10+ SSID location permissions.
  - Cellular connections with private LAN IPs receive an ultra-fast 800ms ping to smoothly accommodate VPN users without delaying standard fallback.
  - Automatically falls back to `remoteAddress` if LAN is unreachable.
  - Active lifecycle listener (`plugins/init.client.js`) triggers auto-switching whenever the app returns to the foreground.

### 2.2 Material You Dynamic Theming & 14 Curated Palettes
- **Monet Dynamic Theming Engine**: Android 12+ (API 31+) wallpaper extraction via `AbsThemePlugin.kt` and `MainActivity.kt`.
- Injected dynamic CSS tokens: `--dynamic-accent`, `--dynamic-bg`, `--dynamic-primary`, `--dynamic-secondary`, `--dynamic-fg`, etc.
- **14 Built-In Hand-Crafted Themes** in `assets/tailwind.css`:
  1. `material-you`: Android 12+ Monet wallpaper extraction with adaptive neutral tones.
  2. `material-you-amoled`: True OLED pitch black (`#000000`) with Monet dynamic accents.
  3. `dark`: Default Audiobookshelf balanced charcoal dark theme.
  4. `black`: Pitch Black OLED (`#000000`) theme for AMOLED battery saving.
  5. `nord`: Arctic blue-gray developer palette (`#2e3440`).
  6. `catppuccin`: Macchiato pastel tones on rich plum (`#24273a`).
  7. `dracula`: Iconic vampire dark theme with rich purple & pink accents (`#282a36`).
  8. `tokyo-night`: Cyberpunk deep navy with electric cyan highlights (`#1a1b26`).
  9. `gruvbox`: Retro warm dark with golden yellow accents (`#282828`).
  10. `rose-pine`: Muted elegance with soft rose accents (`#191724`).
  11. `forest`: Deep pine evergreen with mint highlights (`#14221c`).
  12. `sepia`: Warm antique paper and terracotta tones (`#2e2621`).
  13. `slate`: Midnight blue slate with cyan trackbars (`#18212f`).
  14. `light`: Crisp daytime white theme (`#ffffff`).
- **Interactive Custom Accent Color Picker**: Settings page allows picking custom accent tones (Default, Emerald, Electric Cyan, Sky Blue, Royal Violet, Hot Pink, Sunset Amber, Crimson Red, Lime) that react in real-time across all components.

### 2.3 Pocket Casts-Inspired Podcatcher Playback & Feed Parity
- **Per-User Podcast Siloing**: Each user on a server maintains an independent subscription list stored in device preferences (`podcast_subs_${serverAddress}_${userId}`). Subscribed podcasts appear on personalized shelves and bookshelf grids.
- **Device-Only Downloads & Direct Streaming**: Audio files download strictly to the Android device via `AbsDownloader.kt` or stream directly over HTTP/HTTPS (`PLAYMETHOD_DIRECTSTREAM`). The server's hard drive is never filled with media files.
- **Downloaded-First Smart Sort**: Downloaded episodes automatically float to the top of the episode list with a visual section divider in `EpisodesTable.vue`.
- **Silence Trimming**: Native ExoPlayer audio pipeline integration via `AbsAudioPlayer.setSkipSilence({ enabled })`.
- **Intro & Outro Skipping**: Configurable seconds (`skipFirst` and `skipLast`) stored per-podcast in `$localStore` via `components/modals/PodcastSettingsModal.vue`.
- **Custom Playback Speeds**: Remembers playback speeds per podcast show.
- **End of Episode Sleep Timer**: Automatically computes remaining episode time in `SleepTimerModal.vue`.
- **Quick Filters & Search**: Real-time title search and horizontal status chips (`All`, `Unplayed`, `In Progress`, `Complete`, `Downloaded`) in `EpisodesTable.vue`.
- **Flexible Episode Sorting**: Newest/Oldest, Shortest/Longest duration, Title A→Z/Z→A, Season & Episode number.

### 2.4 Podcast 3-Column Reorderable Favorites Grid
- **Dedicated Favorites Tab**: Located under Podcasts navigation (`pages/bookshelf/favorites.vue`).
- **Pocket Casts-Style 3-Column Badge Grid**: Displays podcast cover art with circular unplayed episode count badges in the top-right corner.
- **Drag-and-Drop Reordering**: Long-press any show or tap the "Reorder" button to activate reorder mode with tactile wobble animation and drag-and-drop icon reordering via `vuedraggable`.
- **Per-User Local Persistence**: Ordering is saved per user and server connection profile in `$localStore` (`podcast_favs_${serverAddress}_${userId}`).
- **Batch Add & Manage Modal**: Filterable picker modal to favorite or unfavorite shows across the library with 1 tap.
- **1-Tap Seeding from Subscriptions**: Automatically populates the favorites shelf from current user subscriptions when empty.

### 2.5 Resilient Download Manager & Queue Recovery
- **Dedicated Download Queue View**: Redesigned `/downloading` page with thumbnails, real-time download percentages, MB counters, and animated indicators.
- **Error Recovery & Exponential Backoff**: Prevents download stalls with smart exponential retry backoff (1s, 2s, 4s, 8s, 16s, capped at 30s; max 5 retries) in `DownloadItemManager.kt` and `utils/downloadQueueUtils.js`.
- **Granular Item Controls**: Individual **Retry** and **Cancel / Remove** actions on every active or failed media download.
- **Global Batch Management**: 1-tap **Retry All Failed**, **Clear Failed**, and **Cancel All** batch controls.
- **Collapsible File-by-File Breakdown**: Inspect individual files and parts within a multi-file audiobook with specific progress and error diagnostics.
- **Safe Enclosure & CDN Auth Isolation**: Enclosure URLs starting with `http://` or `https://` are never prepended with the server address, and the server's `Authorization: Bearer` header is never leaked to external third-party podcast CDNs.

### 2.6 In-App Update Detection & Installation from GitHub Releases
- **Automated Update Detection**: CharcuterieShelf checks GitHub Releases API for newer versions automatically in the background on startup (`plugins/appUpdater.js`).
- **One-Tap Download & Install**: Streamlines APK downloading with a live progress bar and automatically launches Android's system package installer via `FileProvider` (`AbsAppUpdater.kt`).
- **On-Demand Checking & Release Notes**: Check for updates anytime from **Settings → App Updates**, read formatted changelogs, or tap the pulsing **Update Available** badge in `SideDrawer.vue`.
- **Permission & Security**: Uses `REQUEST_INSTALL_PACKAGES` permission and secure `FileProvider` content URIs (`com.CharcuterieShelf.fileprovider`).

### 2.7 Android Auto In-Car Dashboard Playback
- **MediaBrowserServiceCompat Integration**: Full in-car dashboard playback, media browsing, and search support directly through Android Auto (`PlayerNotificationService.kt`).
- **Automotive Whitelist Support**: Built-in support for Android Auto projection (`com.google.android.projection.gearhead`), `carservice`, Google Quick Search Box, and Bluetooth head unit AVRCP browsing.
- **Automotive Metadata**: Declares `automotive_app_desc.xml` and small car icon metadata in `AndroidManifest.xml`.

### 2.8 Modern Material 3 Playback Widget
- Home screen widget powered by `MediaPlayerWidget.kt` and `res/layout/media_player_widget.xml`.
- 16dp rounded card with subtle outline (`widget_card_background.xml`), rounded cover art (Glide transform), bold title, artist, and media controls (Rewind, Play/Pause, Fast-Forward).

### 2.9 Small Notification Icons & Bitmap Notifications
- **Small Notification Icon**: Monochrome vector icon `R.drawable.icon_monochrome` used in `DownloadService.kt` and `PlayerNotificationService.kt` to ensure sharp rendering on Android status bars without gray clipping boxes.
- **Media Notification Artwork**: Full-color bitmap artwork rendered into system media controls.

### 2.10 In-App Metadata, Chapters, Match & Cover Parity
- Full web client parity implemented in `components/modals/item/EditItemModal.vue`:
  - **Details Tab**: Title, author, narrator, series, description, genre, tags, ISBN, ASIN.
  - **Chapters Tab**: Interactive chapter timeline with `+/- 1s` fine increment and Audible lookup.
  - **Match Tab**: Online provider search via Google Books, Audible, OpenLibrary.
  - **Cover Tab**: Camera/gallery upload, URL import, provider cover selection.

### 2.11 Dedicated Audiobooks & Podcasts Medium Switcher
- Two-cell top-level segmented toggle (`MediaSectionSwitcher.vue`) positioned below the Appbar.
- Instantly switches active library between books and podcasts while preserving independent navigation states.
- Automated creation modal if no podcast library exists on the server.

### 2.12 Pocket Casts OPML Import & Device Storage Integrity
- OPML / XML feed import modal (`OpmlImportModal.vue`) supporting Pocket Casts subscription exports.
- Dual-mode input (file picker and text paste), feed preview, filter search, and batch creation on the server.
- Device-first local download architecture ensures media files remain on device while syncing progress with the server.

---

## 3. Important Rules & Constraints for AI Agents

> [!CAUTION]
> **Preserve Android Application ID**:
> The internal Android package name / applicationId is **`com.CharcuterieShelf`**.
> This provides complete autonomy from the upstream Play Store app, avoids signature conflicts or Play Store update ownership blocks, and allows side-by-side installation. All future APK builds must retain `com.CharcuterieShelf`.

> [!IMPORTANT]
> **Headless Execution & No Interactive Prompts**:
> When running in headless or remote sessions, NEVER execute commands that trigger interactive UAC dialogs or prompt for user interaction in terminal.
> All Gradle commands should use `$env:JAVA_HOME = "C:\Java\jdk-21"` and run non-interactively via PowerShell.

> [!TIP]
> **Cloud Distribution Path**:
> After building release or debug APKs/AABs, copy the resulting binaries to:
> 1. `E:\Google Drive\CharcuterieShelf.apk` and `E:\Google Drive\CharcuterieShelf.aab`
> 2. `C:\Users\Connor\OneDrive\CharcuterieShelf.apk` and `C:\Users\Connor\OneDrive\CharcuterieShelf.aab`

> [!IMPORTANT]
> **Tester Contact & Google Play Closed Testing**:
> Tester contact email in documentation and Google Play callouts must be **`support@themagicsalami.net`**.
> Closed testing requires 14–20 opted-in testers active for 14 consecutive days. Issue templates and workflows must accommodate tester request submissions without auto-closing them.

> [!IMPORTANT]
> **Mandatory Documentation Maintenance**:
> Any time the application is updated with new or modified features, agents MUST update project documentation to accurately reflect the current feature set. Specifically:
> 1. Maintain an up-to-date, comprehensive feature list and screenshots in `readme.md`.
> 2. Update `walkthrough.md` to document the latest feature set and verification results.
> 3. Ensure `AGENTS.md` remains 100% comprehensive and synchronized.

---

## 4. Full-Stack End-to-End Testing & Code Review Harness

CharcuterieShelf includes an end-to-end automated testing and code review harness in `tests/` executed via `scripts/run-qa-harness.js`.

### 4.1 Running the Harness
```powershell
# Run entire test harness (all 10 verification suites)
npm run test:qa
# or
node scripts/run-qa-harness.js --all

# Run full end-to-end suite including static Nuxt generation AND native Android debug compilation
npm run test:full
# or
node scripts/run-qa-harness.js --full

# Run individual verification suites
npm test                  # Frontend unit & regression suite
npm run test:i18n         # i18n syntax & ASCII sort check
npm run test:branding     # Application ID, manifests, and branding assets
npm run test:github       # GitHub Actions workflow & issue template validation
npm run test:build        # Nuxt generate & static bundle health
npm run test:android      # Gradle environment, SDK & JDK 21 integrity
npm run test:android:compile # Execute native Android gradle debug compilation
```

### 4.2 Reusable Antigravity Skill
The harness is packaged as a reusable agent skill located at:
- `.agents/skills/charcuterieshelf-qa-review/SKILL.md`
- `.gemini/skills/charcuterieshelf-qa-review/SKILL.md`
Agents can activate this skill whenever reviewing PRs, onboarding new features, or certifying releases for deployment.

---

## 5. Development & Build Workflow

### 5.1 Prerequisites
- Node.js 20+ (Node 24 supported)
- Java JDK 21 (`C:\Java\jdk-21`)
- Android SDK (`C:\Android\Sdk`)

### 5.2 Compiling the Frontend & Syncing
```powershell
# Compile Nuxt static bundle into /dist
npm run generate

# Sync web assets and Capacitor configuration with Android native project
npx cap sync
```

### 5.3 Building Android APKs & AAB (Play Store)
```powershell
$env:JAVA_HOME = "C:\Java\jdk-21"
$env:Path = "C:\Java\jdk-21\bin;" + $env:Path
cd android

# Build Debug APK
.\gradlew.bat assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build Signed Release APK (applicationId: com.CharcuterieShelf)
.\gradlew.bat assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk

# Build Signed Release Android App Bundle (AAB for Google Play)
.\gradlew.bat bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 5.4 Git & Push Workflow
Remote URL: `https://github.com/cavant/CharcuterieShelf.git`  
Branch: `master`
```powershell
git add .
git commit -m "Your commit message"
git push origin master
```

---

## 6. Directory Structure Reference

```
c:\audiobookshelf_app\
├── .agents/
│   └── skills/charcuterieshelf-qa-review/ # Reusable Antigravity QA skill
├── .github/
│   ├── ISSUE_TEMPLATE/                   # Bug report, feature request, tester request
│   ├── workflows/                        # build-apk, deploy-apk, i18n-check, close_blank_issues
│   └── testing-page-template.html        # GitHub Pages test deployment template
├── android\                              # Android native project (Kotlin & Gradle)
│   ├── app\src\main\
│   │   ├── java\com\audiobookshelf\app\
│   │   │   ├── MainActivity.kt           # Webview container, Monet color injection
│   │   │   ├── MediaPlayerWidget.kt      # Home screen AppWidgetProvider
│   │   │   ├── managers\                 # DownloadItemManager, DbManager
│   │   │   ├── player\                   # PlayerNotificationService (ExoPlayer & MediaSession)
│   │   │   ├── plugins\                  # AbsAudioPlayer, AbsDownloader, AbsAppUpdater, AbsThemePlugin
│   │   │   └── services\                 # DownloadService, DownloadServiceHost
│   │   └── res\
│   │       ├── drawable/                 # Vector assets, icon_monochrome, widget_card_background
│   │       ├── layout\                   # media_player_widget.xml
│   │       ├── values\strings.xml        # App branding & URL scheme
│   │       └── xml\                      # automotive_app_desc.xml, file_paths.xml
├── assets\                               # Stylesheets (tailwind.css - 14 themes, app.css)
├── components\
│   ├── app\                              # Appbar, AudioPlayer, SideDrawer, MediaSectionSwitcher
│   ├── modals\                           # AppUpdateModal, PodcastSettingsModal, SleepTimerModal
│   ├── tables\podcast\                   # EpisodesTable, EpisodeRow, LatestEpisodeRow
│   └── widgets\                          # DownloadProgressIndicator, LoadingSpinner
├── pages\
│   ├── bookshelf\                        # Bookshelf index, favorites.vue, latest.vue
│   ├── downloading.vue                   # Download queue manager & error recovery
│   ├── item\_id\                         # Audiobook / Podcast details screen
│   └── settings.vue                      # App updates, 14 themes, accent picker, Android Auto guide
├── plugins\
│   ├── appUpdater.js                     # GitHub releases update checker & semver
│   ├── localStore.js                     # Per-user podcast subscriptions & favorites
│   └── serverAddressResolver.js          # Local-first LAN ping probe & WAN fallback
├── scripts\
│   ├── run-qa-harness.js                 # Master QA test harness runner
│   └── publish_to_play_store.py          # Google Play Developer API publisher
├── tests\                                # Full-stack automated unit & regression test suites
│   ├── unit/                             # update-checker, duration, favorites, theming, queue, i18n
│   ├── branding/                         # Application ID, manifests, and assets
│   ├── github/                           # Workflow linting and issue templates
│   └── e2e/                              # Static bundle health & android gradle integrity
├── strings\                              # 42 localization JSON files (en-us.json, etc.)
├── capacitor.config.json                 # Capacitor settings (com.CharcuterieShelf)
├── package.json                          # Project dependencies, scripts & metadata
└── nuxt.config.js                        # Nuxt application configuration
```
