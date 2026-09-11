# Walkthrough: CharcuterieShelf Fork & Features

CharcuterieShelf is a community-first, feature-rich fork of Audiobookshelf created and maintained by **TheMagicSalami** ([cavant](https://github.com/cavant)).

Repository: `https://github.com/cavant/CharcuterieShelf.git`  
Upstream Origin: `https://github.com/advplyr/audiobookshelf-app`  
Author: **TheMagicSalami**  
Support: [Buy Me a Coffee](https://buymeacoffee.com/themagicsalami)

---

## 1. Unified Local & Remote Server Connection with Local-First Priority

### Problem Solved
1. On Android 10+ (API 29–36), Wi-Fi SSID access requires precise location permissions and GPS enabled, otherwise returning `<unknown ssid>`. This caused the network resolver to skip local LAN addresses and default to remote WAN.
2. Initial setup and connection sequences prioritized remote URLs, causing connections to stay on WAN even when the local server was online and responding within 5ms.
3. In `store/index.js`, the network change listener threw an unhandled reference error (`dispatch is not defined`), preventing auto-switching when network state changed.

### Implementation
- **Local-First Priority (`utils/serverAddressResolver.js`)**:
  - Always probes `localAddress` first with a fast 1500ms ping (`/ping` endpoint).
  - If reachable, the app immediately selects LAN, completely bypassing Android SSID restrictions.
  - Cellular connections with private LAN IPs receive an ultra-fast 800ms ping to smoothly accommodate VPN users without delaying standard fallback.
  - If local fails, smoothly falls back to `remoteAddress` with zero interruption.
- **Server Connect Form (`ServerConnectForm.vue`)**:
  - During server registration, `localAddress` is tested first if provided.
- **Active Lifecycle Switching (`plugins/init.client.js`)**:
  - Registered `App.addListener('appStateChange')` listener to trigger `checkServerNetworkSwitch` whenever the app returns to the foreground.
- **Store Listener Fix (`store/index.js`)**:
  - Destructured `{ state, commit, dispatch }` in `setupNetworkListener` to resolve runtime exceptions.

---

## 2. Device-Only Podcast Downloads & Direct RSS Streaming

### Problem Solved
Previously, tapping episodes in the RSS catalog triggered server-side download requests (`POST /api/podcasts/.../download-episodes`), causing audio files to be downloaded to the server machine's hard drive (`D:/Podcasts/...`). Furthermore, un-downloaded episodes could not be streamed without first downloading them to the server.

### Implementation
- **Zero Server Audio Downloads**:
  - Removed all `POST /api/podcasts/.../download-episodes` calls in `EpisodesTable.vue` and `EpisodeRow.vue`.
  - Enforced `autoDownloadEpisodes: false` across `OpmlImportModal.vue` and `NewPodcastForm.vue` to ensure server storage remains untouched.
- **Direct Device-Only Downloads (`AbsDownloader.kt` & `DownloadItemPart.kt`)**:
  - Updated `DownloadItemPart.make()` and `AbsDownloader.startLibraryItemDownload()` to accept external HTTP/HTTPS enclosure URLs directly.
  - Audio files download exclusively into device storage (`filesDir/downloads/...` or scoped storage) via Android's foreground `DownloadService`.
- **Direct RSS Feed Streaming (`PlaybackSession.kt` & `AbsAudioPlayer.kt`)**:
  - Added direct URL streaming support to ExoPlayer (`PLAYMETHOD_DIRECTSTREAM`).
  - Un-downloaded episodes stream instantly over HTTP/HTTPS with artwork and metadata, requiring no server disk storage.
- **Synchronized Playback Progress**:
  - Progress updates, finished marks, and session history sync back to the Audiobookshelf server for unified cross-device state.
- **Show Notes & Descriptions (`EpisodeRow.vue`)**:
  - Tapping any RSS episode smoothly expands its full description and show notes inline.
  - Downloaded episodes float to the top of the list with a clean visual divider, followed by all remaining episodes.

---

## 3. In-App Book Management (Web Client Parity)

Brought complete parity with the web client directly inside the mobile app:
1. **Metadata Editing (`EditItemDetailsTab.vue`)**:
   - Title, subtitle, authors, narrators, series sequence, description, publisher, year, ISBN, ASIN, flags.
   - 1-tap Audible fast-match.
2. **Interactive Chapter Editor (`EditItemChaptersTab.vue`)**:
   - Timeline editor with `+/- 1s` fine-tuning steppers.
   - Batch time-shifting, automatic generation from audio tracks, and Audible chapter import.
3. **Cover Art Manager (`EditItemCoverTab.vue`)**:
   - Camera/gallery file upload, direct URL fetch, provider cover search (Audible, Google Books, OpenLibrary), and cover removal.
4. **Interactive Provider Match (`EditItemMatchTab.vue`)**:
   - Provider search with granular field selection (selectively apply title, author, description, tags, or covers).

---

## 4. Material You Dynamic Monet Theming & Palette Engine

- **Native Monet Wallpaper Color Extraction**:
  - `AbsThemePlugin.kt` extracts dynamic theme colors on Android 12+ (API 31+) using `android.R.color.system_accent1_*` and `system_neutral1_*`.
  - Injected dynamic CSS tokens: `--dynamic-accent`, `--dynamic-bg`, `--dynamic-primary`, `--dynamic-secondary`, `--dynamic-fg`, etc.
- **9 Hand-Crafted Built-in Themes in `assets/tailwind.css`**:
  - `dark` (Classic Audiobookshelf Dark)
  - `black` (True Pitch OLED `#000000`)
  - `material-you` (Monet Dynamic Theming with fallback)
  - `nord` (Arctic blue-gray `#2e3440`)
  - `catppuccin` (Macchiato `#24273a`)
  - `forest` (Deep pine evergreen `#14221c`)
  - `sepia` (Warm book & antique paper `#27211d`)
  - `slate` (Midnight blue slate `#0f172a`)
  - `light` (Crisp clean white `#ffffff`)
- **Theme Selector UI**: Interactive grid preview in `pages/settings.vue` with real-time `$applyTheme` reactivity.

---

## 5. Modern Material 3 Playback Widget

- **Home Screen Widget**:
  - Custom `res/layout/media_player_widget.xml` adhering to Material 3 design guidelines.
  - 16dp rounded card background with subtle outline (`widget_card_background.xml`).
  - Cover art with 24px rounded corners using Glide transformations.
  - Interactive playback controls: Previous / Rewind, Play / Pause toggle, Next / Fast-Forward.

---

## 6. Pocket Casts-Inspired Podcatcher Playback & RSS Feed Parity

1. **Per-User Podcast Siloing**:
   - Each user maintains an isolated subscription list stored in device preferences (`podcast_subs_${serverAddress}_${userId}`).
   - When a user logs in, only their subscribed shows appear on the Bookshelf grid (`LazyBookshelf.vue`), Home personalized shelves (`pages/bookshelf/index.vue`), and Latest episodes feed (`latest.vue`).
   - 1-tap **Subscribe / Unsubscribe** badge toggle on every podcast detail view (`pages/item/_id/index.vue`).
2. **Full RSS Feed Inline Browsing & Floating Download Sort**:
   - Downloaded episodes float to the top with a clear visual section divider.
   - Tap any episode row to view full show notes.
3. **Flexible Pocket Casts Episode Sorting**:
   - Date: *Newest to Oldest* & *Oldest to Newest*
   - Duration: *Shortest to Longest* & *Longest to Shortest*
   - Title: *A → Z* & *Z → A*
   - Season & Episode Number
4. **Trim Silence**: Native ExoPlayer audio pipeline integration via `setSkipSilence`.
5. **Intro & Outro Skipping**: Configurable `skipFirst` and `skipLast` second offsets per podcast show via `PodcastSettingsModal.vue`.
6. **Custom Playback Speeds**: Remembers custom playback speed per podcast show.
7. **End of Episode Sleep Timer**: Dynamically calculates remaining episode time in `SleepTimerModal.vue`.
8. **Filter Chips & Instant Search**: Filter chips: `All`, `Incomplete`, `InProgress`, `Complete`, `Downloaded`.

---

## 7. Dedicated Audiobooks & Podcasts Medium Switcher

- **Two-Cell Top-Level Segmented Switcher (`MediaSectionSwitcher.vue`)**:
  - Positioned directly below the Appbar and above the sub-nav tabs: `[ 📚 Audiobooks | 🎙️ Podcasts ]`.
  - Seamlessly switches the active library between audiobooks and podcasts while maintaining independent tab states.
- **Inline Podcast Library Creation Modal**:
  - Automatically guides the user to set up a podcast library if none exists on the server.

---

## 8. Android Package Branding & Target API 36

- **Application ID Autonomous Branding**:
  - `applicationId "com.CharcuterieShelf"` provides complete autonomy from upstream Play Store app, avoids signature conflicts, and allows side-by-side installation.
- **Targeting Android API 36 (Android 16)**:
  - `compileSdkVersion = 36`
  - `targetSdkVersion = 36`
  - Version Code: `121` (`versionName "0.14.1-beta"`)
- **Automated Release Signing**:
  - Dedicated release keystore: `android/app/release-key.jks`.
  - Gradle `assembleRelease` produces signed APK.
  - Gradle `bundleRelease` produces signed AAB ready for Google Play Developer Console.

---

## 9. Per-User Siloing & Resubscription Reliability (v0.14.1-beta)

### Problems Solved
1. **Podcast Resubscription Error**: Unsubscribing a podcast previously removed it from local preferences while the entity remained on the server. If the user tried to re-subscribe via "Add Podcast", the server rejected it with `HTTP 400: Podcast already exists`.
2. **OPML Import Subscription Leak**: During OPML import, all podcasts in the server library were automatically subscribed to the importing user, leaking other users' podcasts across profiles.
3. **LAN/WAN Network Switch Subscription Desync**: Subscriptions were previously keyed by the raw server address string (e.g. LAN IP vs WAN URL). Switching networks caused the app to look up a different storage key and appear to lose subscribed podcasts.

### Implementation
- **Smart Existing Item Resubscription (`NewPodcastForm.vue`)**:
  - Pre-checks library items by `feedUrl` and title before requesting server creation.
  - If the show already exists on the server, it instantly adds the show to the user's `$localStore` subscriptions, dispatches `podcast-subscription-changed`, and opens the podcast screen directly without erroring.
  - Fallback error handler intercepts `400 Podcast already exists` responses to gracefully recover and subscribe the user.
- **Strict OPML Siloing (`OpmlImportModal.vue`)**:
  - OPML batch import now subscribes the user strictly to the selected feeds they imported (`selectedFeedUrls`), rather than subscribing to every item in the library.
- **Connection Profile Keying (`plugins/localStore.js`)**:
  - Subscription storage keys now use the persistent server connection configuration ID (`serverConnectionConfig.id`) rather than the active network address string, keeping subscriptions synchronized whether connected via LAN Wi-Fi or remote WAN.
- **Server Podcast Library Reset**:
  - Safely purged all 46 test podcast items from library `ca46934c-7545-4e5c-af41-635477115a25` via the API while keeping the audiobook library (`Casa-Server`, 406 items) completely untouched.

---

## 10. Podcast Duration & Download Crash Prevention (v0.14.2-beta)

### Problems Solved
1. **Direct Stream Duration Missing**: Podcast episodes streamed directly or browsed via RSS showed 0:00 or missing duration because RSS feeds often format durations as `HH:MM:SS` (e.g. `01:23:45`), which evaluated to `NaN` when parsed with `Number()`. Furthermore, ExoPlayer's true stream length was never updated back into `PlaybackSession` or sent to Android's `MediaSessionCompat` and the Vue UI.
2. **Download Hard Crash**: When downloading podcast episodes with direct enclosure URLs, `DownloadItemManager.kt` was prepending the local server URL (`http://192.168.1.69:13378https://...`), causing OkHttp to throw an uncaught `IllegalArgumentException` on the main thread and instantly crash the app.
3. **External CDN 401/403 Errors**: `InternalDownloadManager.kt` was sending the server's `Authorization: Bearer <token>` header to third-party podcast CDNs (Podtrac, Megaphone, Simplecast, Cloudflare), which rejected the request.
4. **Missing Server Audio File Handshake**: If an episode existed on the server without pre-downloaded server audio files, `AbsDownloader.kt` attempted to download from `/api/items/.../file/null/download` instead of falling back to direct enclosure downloading.

### Implementation
- **Robust Duration Parsing (`EpisodesTable.vue` & `EpisodeRow.vue`)**:
  - Added `parseDuration(val)` supporting `HH:MM:SS`, `MM:SS`, and raw numeric/integer seconds strings without producing `NaN`.
  - Displayed parsed duration in episode pills (`{{ timeRemaining }}`) and passed numeric seconds to `play-item`.
- **ExoPlayer Live Duration Sync (`PlaybackSession.kt` & `PlayerNotificationService.kt`)**:
  - `PlaybackSession.getTotalDuration()` now safely falls back to `duration` if `audioTracks` sum is 0.
  - Added `MediaMetadataCompat.METADATA_KEY_DURATION` to Android OS media metadata.
  - `PlayerNotificationService.sendClientMetadata()` dynamically retrieves `currentPlayer.duration` upon `Player.STATE_READY`, updates `session.duration` and `session.audioTracks[0].duration`, invalidates media session metadata, and emits updated metadata to the UI.
  - `AudioPlayer.vue` now immediately initializes and protects `this.totalDuration`.
- **Download Item URL & Auth Guard (`DownloadItemManager.kt` & `InternalDownloadManager.kt`)**:
  - `serverUrl()` checks if `part.serverPath` starts with `http://` or `https://` and returns the URL directly.
  - Added try-catch around `activeCalls` invocation to prevent any unhandled exception.
  - `InternalDownloadManager.kt` strictly gates the `Authorization: Bearer` header to the configured Audiobookshelf server addresses.
- **Enclosure Fallback in Native Downloader (`AbsDownloader.kt`)**:
  - Automatically synthesizes `AudioTrack` and `AudioFile` using `call.getString("enclosureUrl")` if the episode exists on the server without server-side files.
  - All downloads wrapped in try-catch blocks with clean UI error toasts.

---

## 11. Deployment & Distribution

### Cloud Drive Distribution
The signed release APK and Play Store developer AAB bundle (`com.CharcuterieShelf`, API 36, Version Code 122) have been copied to:
1. `E:\Google Drive\CharcuterieShelf.apk` & `E:\Google Drive\CharcuterieShelf.aab`
2. `C:\Users\Connor\OneDrive\CharcuterieShelf.apk` & `C:\Users\Connor\OneDrive\CharcuterieShelf.aab`

### Remote Git Repository & GitHub Releases
- **Remote**: `https://github.com/cavant/CharcuterieShelf.git`
- **Branch**: `master`
- **GitHub Release**: [`v0.14.2-beta`](https://github.com/cavant/CharcuterieShelf/releases/tag/v0.14.2-beta)
- **Direct APK Download**: [`CharcuterieShelf.apk`](https://github.com/cavant/CharcuterieShelf/releases/download/v0.14.2-beta/CharcuterieShelf.apk) (16.17 MB)
- **Direct AAB Download**: [`CharcuterieShelf.aab`](https://github.com/cavant/CharcuterieShelf/releases/download/v0.14.2-beta/CharcuterieShelf.aab) (15.58 MB)

---

## 12. Verification Results (v0.14.2-beta)

| Test / Check | Result | Notes |
| :--- | :--- | :--- |
| **Duration Parsing Tests** | ✅ PASSED | `HH:MM:SS`, `MM:SS`, and raw integer seconds parsed without `NaN` |
| **ExoPlayer Live Duration Sync** | ✅ PASSED | `STATE_READY` captures `currentPlayer.duration`, updates `session`, `MediaMetadataCompat`, and Vue |
| **Direct Enclosure URL Safety** | ✅ PASSED | `serverUrl()` preserves external `https://` URLs without prepending server address |
| **CDN Auth Isolation** | ✅ PASSED | Bearer token omitted for 3rd-party podcast hosts; included for ABS server |
| **Frontend Bundle (`npm run generate`)** | ✅ PASSED | Nuxt production static bundle generated cleanly |
| **Capacitor Sync (`npx cap sync android`)** | ✅ PASSED | Web assets synced to Android native shell |
| **Release APK Build (`assembleRelease`)** | ✅ PASSED | Signed release APK created with JDK 21 (16.17 MB) |
| **Play Store AAB Build (`bundleRelease`)** | ✅ PASSED | Signed Android App Bundle created (15.58 MB) |
| **Package Name Verification (`aapt`)** | ✅ PASSED | `package: name='com.CharcuterieShelf'` |
| **SDK Target Verification (`aapt`)** | ✅ PASSED | `compileSdkVersion='36'`, `targetSdkVersion='36'` |
| **Version Code & Name (`aapt`)** | ✅ PASSED | `versionCode='122'`, `versionName='0.14.2-beta'` |
| **Cloud Drive Copy** | ✅ PASSED | Both `.apk` and `.aab` copied to Google Drive and OneDrive |
| **GitHub Release Upload** | ✅ PASSED | Release `v0.14.2-beta` created with `CharcuterieShelf.apk` and `CharcuterieShelf.aab` |

---

## 13. In-App Updates via GitHub Releases (v0.14.3-beta)

- **Semantic Versioning & Update Engine (`utils/semverUtils.js` & `plugins/appUpdater.js`)**:
  - Automatically queries GitHub Releases API (`api.github.com/repos/cavant/CharcuterieShelf/releases`) in the background on launch.
  - Compares running app version against latest published release using semantic version comparator (`isNewerVersion`).
  - Displays release changelog, download progress indicator, and APK package installer intent via `FileProvider` (`AbsAppUpdater.kt`).
  - Pulsing navigation badge in `SideDrawer.vue` and on-demand check button in `pages/settings.vue`.

---

## 14. Download Queue Recovery & Android Auto Support (v0.14.4-beta)

- **Resilient Download Manager (`pages/downloading.vue` & `DownloadItemManager.kt`)**:
  - Dedicated `/downloading` management console with progress indicators, MB transferred counters, and active/queued/failed filter chips.
  - Exponential retry backoff on failure (2s, 4s, 8s, 16s, 32s) before terminal failure notifications.
  - Granular controls: per-item Retry/Cancel and global batch actions ("Retry All Failed", "Clear Failed", "Cancel All").
  - Multi-file audiobook collapsible breakdown displaying status of individual audio parts.
- **Android Auto Dashboard Playback (`PlayerNotificationService.kt`)**:
  - `PlayerNotificationService` extends `MediaBrowserServiceCompat` to provide media tree browsing on car head units.
  - Automotive whitelist support for `com.google.android.projection.gearhead`, `carservice`, Google Quick Search Box, and Bluetooth head unit AVRCP browsing.
  - In-app setup instructions in `pages/settings.vue` for sideloaded packages.

---

## 15. Material You Monet Dynamic Theming & 14 Curated Palettes

- **Dynamic Wallpaper Color Extraction (`AbsThemePlugin.kt`)**:
  - Extracts Android 12+ Monet wallpaper colors and injects dynamic CSS variables (`--dynamic-accent`, `--dynamic-bg`, `--dynamic-primary`, etc.).
- **14 Built-In Palettes (`assets/tailwind.css` & `pages/settings.vue`)**:
  - `material-you`: Monet dynamic wallpaper tones.
  - `material-you-amoled`: Pitch black `#000000` base with Monet accents.
  - `dracula`: Classic vampire dark with purple/pink tones.
  - `tokyo-night`: Cyberpunk navy and neon cyan.
  - `gruvbox`: Retro warm dark with golden yellow accents.
  - `rose-pine`: Muted elegance with soft rose accents.
  - `black`: Pitch black OLED `#000000`.
  - `nord`: Arctic blue-gray developer theme.
  - `catppuccin`: Macchiato pastel plum.
  - `forest`: Deep evergreen pine.
  - `sepia`: Warm book paper and terracotta.
  - `slate`: Midnight blue slate.
  - `dark`: Default neutral charcoal.
  - `light`: Crisp clean daytime white.
- **Interactive Accent Tone Engine**: Instant accent picker in settings across 9 vibrant color choices.

---

## 16. Pocket Casts 3-Column Reorderable Favorites Grid (v0.14.5-beta – v0.14.7-beta)

- **Dedicated Favorites Shelf (`pages/bookshelf/favorites.vue`)**:
  - 3-column Pocket Casts-style cover art grid with circular unplayed episode count badges.
  - Long-press or tap "Reorder" to enter tactile drag-and-drop reorder mode powered by `vuedraggable`.
  - Stored per user and server profile in `$localStore` (`podcast_favs_${serverAddress}_${userId}`).
  - Filterable batch add/remove modal and 1-tap seeding from current subscriptions.
  - Fixed blank-screen drag regression in v0.14.7-beta.

---

## 17. CI/CD Pipeline Repair & Google Play Closed Testing Onboarding

- **GitHub Actions Workflows**:
  - `build-apk.yml`: Added explicit permissions and executable `gradlew` permissions.
  - `deploy-apk.yml`: Configured GitHub Pages test APK deployment to `https://cavant.github.io/CharcuterieShelf/` with delimiter-safe sed syntax.
  - `i18n-check.yml`: Automated localization validation and uncommitted diff check.
  - `close_blank_issues.yaml`: Whitelisted closed testing requests from being automatically closed.
  - `.github/ISSUE_TEMPLATE/tester_request.yml`: Dedicated intake form for Google Play 14-day closed testers.
  - Contact email: `support@themagicsalami.net`.

---

## 18. Full-Stack Automated QA Test Harness & Reusable Agent Skill

### Test Suites Implemented (`tests/` & `scripts/run-qa-harness.js`)
1. **Frontend Unit Suite**:
   - `update-checker.test.mjs`: Validates `utils/semverUtils.js` semantic versioning, major/minor/patch increments, GA release precedence over prereleases, lifecycle stage ranking (alpha < beta < rc), and build metadata stripping.
   - `duration-parser.test.mjs`: Validates `utils/playbackUtils.js` duration parser across `HH:MM:SS`, `MM:SS`, and seconds, with bounds checking and formatted timestamp output.
   - `favorites-store.test.mjs`: Directly tests the production `LocalStorage` class in `plugins/localStore.js` via pluggable preferences adapter, testing key generation, server config ID priority over LAN/WAN switches, CRUD/toggle operations, subscriptions, and drag-and-drop order persistence.
   - `theming.test.mjs`: CSS variable mapping and settings theme parity across all 14 palettes.
   - `download-queue.test.mjs`: Validates `utils/downloadQueueUtils.js` exponential retry backoff schedule matching Kotlin `DownloadItemManager.kt` (1s, 2s, 4s, 8s, 16s capped at 30s; max 5 retries), URL resolution preserving external CDNs and appending cover query params, and queue item failure/active states.
2. **Localization Suite**:
   - `i18n-syntax-sort.test.mjs`: Validates all 42 locale JSON files for valid JSON, trailing newlines, and ASCII alphabetical sorting.
3. **Branding & Native Manifest Suite**:
   - `manifest-branding.test.mjs`: Validates `com.CharcuterieShelf` applicationId, custom URL scheme intent-filters, target API 36, version synchronization with `package.json`, release signing config, and required vector drawables.
4. **CI/CD & Workflows Suite**:
   - `workflows-templates.test.mjs`: Validates workflow permissions, gradlew execution, automated QA step execution in build/deploy pipelines, issue templates, and tester whitelisting.
5. **Static Bundle Suite**:
   - `bundle-build.test.mjs`: Verifies Nuxt static bundle output and pre-rendered route files (`dist/bookshelf/favorites/index.html`, etc.).
6. **Android Native Shell Suite**:
   - `gradle-build.test.mjs`: Cross-platform verification of Gradle wrappers, Java 21 JDK (local path or `$JAVA_HOME`), Android SDK (local path or `$ANDROID_HOME`), and signed release keystore.

### Verification Results (Current Master)

| Verification Suite | Test Count | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **Frontend Unit: Update Checker & Semver** | 8 tests | ✅ PASSED | 182ms |
| **Frontend Unit: Playback Duration & Timestamp** | 6 tests | ✅ PASSED | 189ms |
| **Frontend Unit: Podcast Favorites Store** | 6 tests | ✅ PASSED | 163ms |
| **Frontend Unit: 14 Theme Palettes & Monet** | 5 tests | ✅ PASSED | 163ms |
| **Frontend Unit: Download Queue & Recovery** | 5 tests | ✅ PASSED | 161ms |
| **Localization: i18n Syntax & Alphabetization** | 44 tests | ✅ PASSED | 189ms |
| **Branding & Manifest: com.CharcuterieShelf** | 8 tests | ✅ PASSED | 161ms |
| **CI/CD & Workflows: GitHub Actions & Templates** | 7 tests | ✅ PASSED | 173ms |
| **Static Bundle: Nuxt Pre-Rendered Routes** | 3 tests | ✅ PASSED | 160ms |
| **Android Native: Shell & Gradle Environment** | 5 tests | ✅ PASSED | 164ms |
| **TOTALS** | **97 tests (10 suites)** | **✅ 100% PASSED** | **1.71s** |

---

## 19. Podcast Downloads Stalling, Android Auto Driving Restriction & Icon Refresh (v0.14.8-beta Patch)

### 19.1 Podcast Downloads Queue Stalling Fixed
- **Root Causes**:
  1. `DownloadItemManager.kt`: Disk headroom check calculated `max(100MB, totalStorage / 20)`. On modern devices with 256GB–512GB internal storage, this demanded 12.8GB–25.6GB of contiguous free space before allowing any download, instantly failing or freezing downloads on active phones. Furthermore, parts with stream size 0 were rejected.
  2. `InternalDownloadManager.kt`: OkHttp requests lacked a mobile User-Agent, using standard OkHttp strings that triggered HTTP 403 Forbidden rejections from CDN podcast hosts (Megaphone, Omny, Libsyn).
  3. `ApiHandler.kt`: For synthesized RSS episodes (starting with `rss_`), calling `/api/items/...&episode=rss_...` resulted in HTTP 404 "Episode not found".
  4. `EpisodeRow.vue`: `enclosureUrl` failed to resolve nested feed enclosures (`_rssEpisodeData.enclosure.url`).
- **Fixes Applied**:
  - `DownloadItemManager.kt`: Headroom capped to a safe fixed `MIN_FREE_SPACE_BYTES` (100MB) and allowed stream parts without known ahead-of-time length.
  - `InternalDownloadManager.kt`: Added explicit `User-Agent: CharcuterieShelf/0.14.8 (Linux; Android; Mobile; +https://github.com/cavant/CharcuterieShelf)`.
  - `ApiHandler.kt`: Guarded `!episodeId.startsWith("rss_")` in `getLibraryItemWithProgress`.
  - `EpisodeRow.vue`: Expanded `enclosureUrl` computed property to inspect all enclosure sources.

### 19.2 Android Auto "Isn't Available While Driving" & Browse Tree Performance
- **Root Causes**:
  1. `PlayerNotificationService.kt`: `mediaSession.setSessionActivity(sessionActivityPendingIntent)` was set to launch `MainActivity`. When users interacted with the media playback screen or bottom bar in Android Auto, Android Auto attempted to launch this `sessionActivity`. Because `MainActivity` is a WebView activity without automotive distraction optimization, Android Auto blocked it and displayed **"For your safety, this activity isn't available while driving"**.
  2. `isValid()` in `PlayerNotificationService.kt`: Enforced a strict 10-package whitelist, blocking modern car head units, wireless adapters (AAWireless, Carlinkit), and automotive launcher packages from connecting to the media browser (`onGetRoot` returned null).
  3. `onLoadChildren("/")`: Performed blocking server network pings before returning root items, exceeding Android Auto's 5-second binder timeout and failing to render menu items.
  4. Redundant `result.detach()` call on line 1433 caused `IllegalStateException` crashes.
- **Fixes Applied**:
  - `PlayerNotificationService.kt`: When Android Auto connects (`onGetRoot`), `mediaSession.setSessionActivity(null)` is set. Android Auto smoothly renders its built-in full-screen media player and queue without attempting to launch an external non-distraction-optimized activity.
  - `AbMediaDescriptionAdapter.kt`: Preserves `sessionActivityPendingIntent` from `PlayerNotificationService` so phone notifications (lockscreen and shade) continue to open `MainActivity` when tapped.
  - `isValid()`: Relaxed to accept all media browser clients (`return true`).
  - `onLoadChildren("/")`: Instantly initializes `browseTree` with available local/cached items (downloads are always accessible) and sends results synchronously (<5ms), then triggers `mediaManager.loadAndroidAutoItems` in the background with `notifyChildrenChanged("/")` to refresh.
  - Removed duplicate `result.detach()` call.

### 19.3 Complete CharcuterieShelf Branding & Icon Refresh Everywhere
- **Root Causes**:
  1. Status bar and notification shade small icons used `R.drawable.icon_monochrome`, which still contained the old Audiobookshelf headphones + books vector path.
  2. Android Auto small icon metadata declared `com.google.android.gms.car.notification.SmallIcon` pointing to `@drawable/icon_monochrome`.
  3. `abs_audiobookshelf.xml` (library folder icon in Android Auto) still contained the upstream vector.
  4. `ic_launcher-playstore.png` was still the old Audiobookshelf 512x512 graphic.
- **Fixes Applied**:
  - `android/app/src/main/res/drawable/icon_monochrome.xml`: Replaced with high-precision, sharp CharcuterieShelf VectorDrawable silhouette (cutting board with handle, sliced cured salami roll with marbling, and audiobook spines with play controls).
  - `android/app/src/main/res/drawable/abs_audiobookshelf.xml`: Updated to matching CharcuterieShelf VectorDrawable.
  - `android/app/src/main/ic_launcher-playstore.png`: Overwritten with 512x512 `static/Logo.png`.
  - Android Auto metadata and status bar notifications now render the CharcuterieShelf silhouette with zero clipping.
