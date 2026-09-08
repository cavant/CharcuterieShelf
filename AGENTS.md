# AGENTS.md — AI Agent Development Guide for CharcuterieShelf

Welcome to **CharcuterieShelf**! This repository is a community-first, feature-packed fork of [Audiobookshelf](https://github.com/advplyr/audiobookshelf-app) created and maintained by **TheMagicSalami** ([cavant](https://github.com/cavant)).

Repository: `https://github.com/cavant/CharcuterieShelf.git`  
Upstream Origin: `https://github.com/advplyr/audiobookshelf-app`  
Author: **TheMagicSalami**  
Support: [Buy Me a Coffee](https://buymeacoffee.com/themagicsalami)

---

## 1. Architectural Overview

CharcuterieShelf is a hybrid mobile client powered by **Nuxt.js (Vue 2)** embedded within a native **Capacitor 7** shell for Android and iOS.

```
┌─────────────────────────────────────────────────────────────┐
│                    CharcuterieShelf Client                  │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Webview)                                         │
│  - Nuxt 2 (Vue 2.x, Vuex, Vue Router)                       │
│  - Tailwind CSS 3.4 (CSS Variable Design Tokens)           │
│  - Pages: Bookshelf, Player, Settings, Item Edit Modal     │
├─────────────────────────────────────────────────────────────┤
│  Capacitor Bridge Plugins                                   │
│  - AbsAudioPlayer (ExoPlayer playback, speed, silence trim) │
│  - AbsDatabase (SQLite offline cache & local storage)       │
│  - AbsDownloader (Background file downloads & resume)       │
│  - AbsFileSystem (Scoped storage, cache management)         │
│  - AbsThemePlugin (Material You Monet dynamic colors)       │
├─────────────────────────────────────────────────────────────┤
│  Native Android (Kotlin)                                    │
│  - MainActivity (Edge-to-edge insets, dynamic CSS inject)   │
│  - PlayerNotificationService (ExoPlayer media session)      │
│  - MediaPlayerWidget (Home screen AppWidgetProvider)        │
│  - NetworkCallback (SSID detection & auto-switching)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Distinctive Features

### 2.1 Unified Local & Remote Server Connection
- Allows configuring one server with two addresses:
  1. `address`: Remote URL (e.g. `https://audio.mydomain.com`).
  2. `localAddress`: LAN URL (e.g. `http://192.168.1.69:13378`).
  3. `localNetworks`: Comma-separated list of Wi-Fi SSIDs where LAN connection applies.
- `plugins/serverAddressResolver.js` automatically probes network state:
  - If current Wi-Fi matches any listed SSID, LAN address is used.
  - Otherwise, smoothly falls back to remote URL.
- Media progress, sessions, and downloads remain completely unified under a single server profile.

### 2.2 Material You Dynamic Theming & Palette Engine
- Supports Android 12+ Monet wallpaper color extraction via `AbsThemePlugin.kt` and `MainActivity.kt`.
- Injected dynamic variables: `--dynamic-accent`, `--dynamic-bg`, `--dynamic-primary`, `--dynamic-secondary`, `--dynamic-fg`, etc.
- 9 Built-in Themes in `assets/tailwind.css`:
  - `dark` (Default Dark)
  - `black` (OLED Pitch Black `#000000`)
  - `material-you` (Monet dynamic colors with fallback)
  - `nord` (Arctic blue-gray `#2e3440`)
  - `catppuccin` (Macchiato `#24273a`)
  - `forest` (Deep pine evergreen `#14221c`)
  - `sepia` (Warm book & antique paper `#27211d`)
  - `slate` (Midnight blue slate `#0f172a`)
  - `light` (Crisp clean white `#ffffff`)

### 2.3 Pocket Casts-Inspired Podcatcher Playback
- **Silence Trimming**: ExoPlayer `skipSilenceEnabled = true` exposed via `AbsAudioPlayer.setSkipSilence({ enabled })`.
- **Intro & Outro Skipping**: Configurable seconds (`skipFirst` and `skipLast`) stored per-podcast in `$localStore` via `components/modals/PodcastSettingsModal.vue`.
- **Custom Playback Speeds**: Remembers playback speeds per podcast show.
- **End of Episode Sleep Timer**: Automatically computes remaining episode time in `SleepTimerModal.vue`.
- **Quick Filters & Search**: Real-time title search and horizontal status chips (`All`, `Unplayed`, `In Progress`, `Downloaded`) in `EpisodesTable.vue`.

### 2.4 Modern Material 3 Playback Widget
- Home screen widget powered by `MediaPlayerWidget.kt` and `res/layout/media_player_widget.xml`.
- 16dp rounded card with subtle outline, rounded cover art (Glide transform), bold title, artist, and media controls (Rewind, Play/Pause, Fast-Forward).

### 2.5 In-App Metadata, Chapters, Match & Cover Parity
- Full web client parity implemented in `components/modals/item/EditItemModal.vue`:
  - Details tab (Title, author, narrator, series, description, genre, tags, ISBN).
  - Chapters tab (Interactive chapter timeline with +/- 1s fine increment and Audible lookup).
  - Match tab (Online provider search via Google Books, Audible, OpenLibrary).
  - Cover tab (Upload, URL import, provider cover selection).

### 2.6 Dedicated Audiobooks & Podcasts Medium Switcher
- Two-cell top-level segmented toggle (`MediaSectionSwitcher.vue`) positioned below the Appbar.
- Instantly switches active library between books and podcasts while preserving independent navigation states.
- Automated creation modal if no podcast library exists on the server.

### 2.7 Pocket Casts OPML Import & Device Storage Integrity
- OPML / XML feed import modal (`OpmlImportModal.vue`) supporting Pocket Casts subscription exports.
- Dual-mode input (file picker and text paste), feed preview, filter search, and batch creation on the server.
- Device-first local download architecture ensures media files remain on device while syncing progress with the server.

---

## 3. Important Rules & Constraints for AI Agents

> [!CAUTION]
> **Preserve Android Application ID**:
> The internal Android package name / applicationId **MUST remain `com.audiobookshelf.app`**.
> This guarantees that newly compiled APKs install as seamless updates over previous builds without erasing the user's downloaded media, local SQLite database, or connection settings.

> [!IMPORTANT]
> **Headless Execution & No Interactive Prompts**:
> When running in headless or remote sessions, NEVER execute commands that trigger interactive UAC dialogs or prompt for user interaction in terminal.
> All Gradle commands should use `$env:JAVA_HOME = "C:\Java\jdk-21"` and run non-interactively via PowerShell.

> [!TIP]
> **Cloud Distribution Path**:
> After building release or debug APKs, copy the resulting binary to both:
> 1. `E:\Google Drive\CharcuterieShelf.apk`
> 2. `C:\Users\Connor\OneDrive\CharcuterieShelf.apk`

> [!IMPORTANT]
> **Mandatory Documentation Maintenance**:
> Any time the application is updated with new or modified features, agents MUST update project documentation to accurately reflect the current feature set. Specifically:
> 1. Maintain an up-to-date, comprehensive feature list and screenshots in `readme.md`.
> 2. Update `walkthrough.md` to document the latest feature set and verification results.
> It is not necessary to list transient bug fixes, but user-facing capabilities must always be comprehensively documented.

---

## 4. Development & Build Workflow

### 4.1 Prerequisites
- Node.js 20+
- Java JDK 21 (`C:\Java\jdk-21`)
- Android SDK (`C:\Users\Connor\AppData\Local\Android\Sdk`)

### 4.2 Compiling the Frontend & Syncing
```powershell
# Compile Nuxt static bundle into /dist
npm run generate

# Sync web assets and Capacitor configuration with Android native project
npx cap sync
```

### 4.3 Building Android APKs
```powershell
$env:JAVA_HOME = "C:\Java\jdk-21"
cd android

# Build Debug APK
.\gradlew.bat assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build Signed Release APK (applicationId: com.audiobookshelf.app)
.\gradlew.bat assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```


### 4.4 Git & Push Workflow
Remote URL: `https://github.com/cavant/CharcuterieShelf.git`
Branch: `master`
```powershell
git add .
git commit -m "Your commit message"
git push origin master
```

---

## 5. Directory Structure Reference

```
c:\audiobookshelf_app\
├── android\                     # Android native project (Kotlin & Gradle)
│   ├── app\src\main\
│   │   ├── java\com\audiobookshelf\app\
│   │   │   ├── MainActivity.kt           # Webview container, Monet color injection
│   │   │   ├── MediaPlayerWidget.kt      # Home screen AppWidgetProvider
│   │   │   ├── player\PlayerNotificationService.kt # ExoPlayer & MediaSession
│   │   │   └── plugins\                  # Capacitor native plugins
│   │   └── res\layout\media_player_widget.xml # Widget layout
├── assets\                      # Stylesheets (tailwind.css, app.css)
├── components\
│   ├── app\                     # Appbar, AudioPlayer, AudioPlayerContainer, SideDrawer
│   ├── modals\                  # Modals (PodcastSettingsModal, SleepTimerModal, EditItemModal)
│   └── tables\podcast\          # EpisodesTable, EpisodeRow
├── pages\                       # Nuxt page views (bookshelf, item, settings, connect)
├── plugins\                     # Nuxt and Capacitor frontend plugins
├── static\                      # Static assets, fonts, icons
├── capacitor.config.json        # Capacitor settings
├── package.json                 # Project dependencies & identity
└── nuxt.config.js               # Nuxt application configuration
```
