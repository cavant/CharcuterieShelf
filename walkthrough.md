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

## 11. In-App Updating & Android Package Installer (v0.14.3-beta)

### Problem Solved
As a sideloaded or independent Android client (`com.CharcuterieShelf`), users previously had to manually check GitHub Releases in an external browser, download the APK, navigate their device file manager, and trigger the install dialog manually.

### Implementation
- **Native Android Package Installer (`AbsAppUpdater.kt`)**:
  - `canRequestPackageInstalls()`: Checks Android 8+ (API 26–36) package installation authorization.
  - `openInstallPermissionSettings()`: Automatically routes users to `Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES` for `package:com.CharcuterieShelf` if permission is required.
  - `downloadAndInstall()`: Streams the APK download using OkHttp with progress notification events (`downloadProgress` emitted to Vue). Saves safely into `getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)`.
  - Automatically builds a secure `FileProvider` URI (`com.CharcuterieShelf.fileprovider`) and starts the system package installer intent (`ACTION_VIEW`, `application/vnd.android.package-archive`, `FLAG_GRANT_READ_URI_PERMISSION`).
- **Capacitor & Nuxt Plugin (`plugins/appUpdater.js`)**:
  - Automatically queries the GitHub Releases API (`/repos/cavant/CharcuterieShelf/releases`) for published releases.
  - Compares versions via robust semantic versioning logic (`isNewerVersion`) that correctly handles `v` prefixes and `-beta` increments.
  - Emits `app-update-available` event and maintains reactive observable state for download progress, active version, and latest release metadata.
- **Update Dialog & Presentation (`AppUpdateModal.vue`)**:
  - Clean Material 3 style modal with installed vs latest version badges, APK file size, and scrollable release notes.
  - Real-time animated progress bar showing live download percentage.
  - In-line warning with 1-tap "Open Permission Settings" button if unknown app installation permissions are missing.
- **Settings & Navigation Drawer Integration**:
  - **Settings (`pages/settings.vue`)**: Added dedicated "App Updates" card with current version status, "Check for Updates" button, and GitHub release link.
  - **Navigation Drawer (`SideDrawer.vue`)**: Added a prominent "Update Available" banner button and pulsing status badge next to the version footer.
  - **Default Layout (`layouts/default.vue`)**: Checks for updates non-blockingly in the background on app startup.

---

## 12. Deployment & Distribution

### Cloud Drive Distribution
The signed release APK and Play Store developer AAB bundle (`com.CharcuterieShelf`, API 36, Version Code 123) have been copied to:
1. `E:\Google Drive\CharcuterieShelf.apk` & `E:\Google Drive\CharcuterieShelf.aab`
2. `C:\Users\Connor\OneDrive\CharcuterieShelf.apk` & `C:\Users\Connor\OneDrive\CharcuterieShelf.aab`

---

## 13. Resilient Download Manager & Queue Recovery

### Problem Solved
1. When downloading audiobooks with multiple parts or large files, intermittent network drops or file timeouts caused downloads to silently stall.
2. In `DownloadItemManager.kt`, when a part exceeded `MAX_RETRIES` (5), it set `failed = true` but did not dispatch `onDownloadItemPartUpdate` or `onDownloadItem` failure events, leaving the item stalled in the UI without any error badge or status indication.
3. Rapid retry loops without delays burned through all 5 retries in seconds on transient glitches.
4. There were no native or UI methods to cancel an individual download, retry an individual item, clear failed downloads, or inspect file-level progress.
5. In `DownloadProgressIndicator.vue`, `onQueueChanged` would blindly clear the UI queue whenever `hasWork` became false, wiping failed items from the UI while they stayed stuck in the SQLite database and background queue.

### Implementation
- **Exponential Retry Backoff (`DownloadItemManager.kt`)**:
  - Implemented backoff delays (2s, 4s, 8s, 16s, 32s) between retries to prevent premature failure during brief Wi-Fi or cellular hiccups.
  - On reaching `MAX_RETRIES`, dispatches `clientEventEmitter.onDownloadItemPartUpdate(part)` and `clientEventEmitter.onDownloadItem(item)` with terminal failure metadata.
- **Queue Controls & Bridge Methods (`AbsDownloader.kt` & `plugins/capacitor/AbsDownloader.js`)**:
  - `cancelDownloadItem(id)`: Cancels active OkHttp calls, deletes partial `.part` staging files, removes from database and queue, and emits `onDownloadItemCancelled`.
  - `retryDownloadItem(id)`: Resets failure flags, retry counters, and immediately restarts the download pipeline.
  - `clearFailedDownloads()`: Cancels and cleans up all failed jobs in one operation.
  - `retryAllFailed()`: Retries all failed downloads in one tap.
  - `getDownloadQueue()`: Returns the full native download queue to keep the frontend synchronized.
- **Redesigned Download Manager (`pages/downloading.vue`)**:
  - Redesigned with media card layouts featuring cover art thumbnails, item title, author/podcast, and status badges (`Downloading`, `Queued`, `Failed`).
  - Progress bar with percentage and downloaded MB vs total MB.
  - Individual **Retry** and **Cancel / Delete** action buttons on every download item.
  - Header batch actions: **Retry All Failed**, **Clear Failed**, and **Cancel All**.
  - Filter tabs: **All**, **Active & Queued**, and **Failed**.
  - Collapsible file-by-file breakdown showing individual part completion, file size, progress, and error diagnostics.

---

## 14. Android Auto Integration & In-Car Dashboard Playback

### Problem Solved
1. `PlayerNotificationService.kt` implemented `MediaBrowserServiceCompat` but maintained an outdated package whitelist (`VALID_MEDIA_BROWSERS`) containing only `com.audiobookshelf.app`. When `com.CharcuterieShelf` connected, `isValid()` returned `false`, rejecting the connection with `BrowserRoot == null`.
2. Sideloaded Android Auto media apps (`com.CharcuterieShelf` installed outside Google Play closed track) require "Unknown sources" enabled in Android Auto Developer Settings to appear on vehicle screens.

### Implementation
- **Automotive Whitelist & Process Validation (`PlayerNotificationService.kt`)**:
  - Added `"com.CharcuterieShelf"`, `"com.CharcuterieShelf.debug"`, and `this.packageName` to `VALID_MEDIA_BROWSERS`.
  - Added automotive projection packages: `com.google.android.projection.gearhead` (Android Auto), `com.google.android.apps.auto.carservice`, and `com.android.bluetooth` (Bluetooth AVRCP).
  - Allowed `uid == Process.myUid()` and self-package matches to pass verification unconditionally.
- **In-App Android Auto Setup Guide (`pages/settings.vue`)**:
  - Added a dedicated setup card under **Settings → Android Auto** explaining step-by-step how to enable "Unknown sources" in Android Auto Developer Settings (tap Version 10 times → 3 dots → Developer settings → check Unknown sources).

---

## 15. Morphe-Grade Dynamic Theming & Palette Options

### Problem Solved
1. `tailwind.config.js` hardcoded `accent: '#1ad691'`, which blocked dynamic accent colors from reaching Tailwind UI elements (buttons, sliders, progress bars, chips, and icons).
2. Users wanted expanded theming parity with popular open-source Android apps like Morphe Manager, including pure AMOLED Monet theming and popular color themes.

### Implementation
- **Dynamic Accent in Tailwind (`tailwind.config.js`)**:
  - Updated `accent` to `rgb(var(--color-accent, 26 214 145) / <alpha-value>)`.
- **14 Built-In Themes (`assets/tailwind.css` & `pages/settings.vue`)**:
  - `material-you`: Monet dynamic wallpaper palette extraction for Android 12+.
  - `material-you-amoled`: Pitch Black `#000000` background combined with Monet dynamic wallpaper accent tokens.
  - `dracula`: Dracula purple (`#bd93f9`) and pink (`#ff79c6`) on dark foundation (`#282a36`).
  - `tokyo-night`: Cyberpunk navy (`#1a1b26`) with electric cyan (`#7dcfff`).
  - `gruvbox`: Retro warm dark (`#282828`) with golden yellow (`#fabd2f`).
  - `rose-pine`: Muted dark (`#191724`) with soft rose (`#ebbcba`).
  - `black`: OLED Pitch Black `#000000`.
  - `nord`: Arctic blue-gray (`#2e3440`).
  - `catppuccin`: Macchiato (`#24273a`).
  - `forest`: Evergreen pine (`#14221c`).
  - `sepia`: Warm book paper (`#27211d`).
  - `slate`: Midnight blue slate (`#0f172a`).
  - `dark`: Default Audiobookshelf dark.
  - `light`: Crisp daytime white.
- **Interactive Custom Accent Color Picker (`pages/settings.vue` & `plugins/localStore.js`)**:
  - Added horizontal swatch palette picker in Settings: Theme Default, Emerald, Electric Cyan, Sky Blue, Royal Violet, Hot Pink, Sunset Amber, Crimson Red, and Lime.
  - Persisted in `$localStore` and dynamically applied to `--color-accent` across the application.

---

## 17. Podcast Favorites & Custom Reorder Grid (Pocket Casts Style)

### User Request
Add an option to favorite podcasts and have a dedicated tab under the podcasts section for favorites that allows custom drag-and-drop icon reordering in a 3-column badge grid matching Pocket Casts.

### Implementation
- **Per-User, Per-Server Favorites Persistence (`plugins/localStore.js`)**:
  - Implemented `getUserPodcastFavorites()`, `setUserPodcastFavorites()`, `isUserPodcastFavorite()`, and `toggleUserPodcastFavorite()` storing ordered podcast ID arrays into Capacitor Preferences (`podcast_favs_<serverAddress>_<userId>`).
  - Emits `podcast-favorites-changed` across the global `$eventBus`.
- **Top-Level Navigation Tab (`components/home/BookshelfNavBar.vue` & `pages/bookshelf.vue`)**:
  - Added the **Favorites** tab (`/bookshelf/favorites`) to the top podcast navbar between Home and Latest with a star icon.
  - Updated `hideToolbar` in `pages/bookshelf.vue` for full screen vertical immersion.
- **Pocket Casts-Style 3-Column Grid (`pages/bookshelf/favorites.vue`)**:
  - Responsive 3-column grid (`grid grid-cols-3 gap-2.5 sm:gap-3 p-3`).
  - Square 1:1 cover art with `rounded-2xl` corners, shadow, and clean borders.
  - Circular badge in the top-right corner showing unplayed episode counts (`numEpisodesIncomplete`, e.g. "97", "20", "7", "99") matching Pocket Casts.
- **Fluid Drag-and-Drop Reordering**:
  - Powered by `vuedraggable` with touch press-and-hold delay and smooth animations.
  - Dedicated **Reorder** ↔ **Done** mode toggle displaying drag handles and quick-remove ("✕") badges.
  - Reordering automatically updates and saves the user's custom sequence to storage on drag end.
- **1-Tap Favorite Toggles**:
  - Added gold star Favorite button on the Podcast detail page (`pages/item/_id/index.vue`).
  - Added "Add to Favorites" / "Remove from Favorites" in the Item More Menu (`components/modals/ItemMoreMenuModal.vue`).
- **Batch Add Picker & Empty State Seeding**:
  - Batch "Manage Favorite Podcasts" modal allows multi-selecting shows with instant search.
  - Empty state includes a 1-tap **"Add Subscribed Shows"** button to immediately seed the shelf.

---

---

## 19. Notification Icon & System UI Polish

### Problem Solved
On modern Android (Android 10 through Android 16 / Samsung One UI), notification icons displayed with two visual glitches during downloads:
1. The small status bar notification icon appeared as a washed-out or solid white square because Android tints the small icon monochomatically, and `R.drawable.icon` is a multi-color launcher graphic.
2. The large squircle card on the notification panel displayed completely empty / blank because `setLargeIcon()` was never called on `NotificationCompat.Builder`.

### Implementation
- **Monochrome Small Icon (`DownloadService.kt`)**:
  - Replaced `.setSmallIcon(R.drawable.icon)` with `.setSmallIcon(R.drawable.icon_monochrome)`.
  - Uses the official clean vector path with transparent alpha masking, rendering crisp white/accent outlines on status bars and always-on displays.
- **Dynamic Large Icon Decoding (`DownloadService.kt`)**:
  - Implemented `getAppIconBitmap()` with caching.
  - Safely extracts `R.mipmap.ic_launcher` via `ContextCompat.getDrawable()`, accurately rasterizing adaptive drawables or bitmap drawables to a clean ARGB_8888 bitmap.
  - Injects `builder.setLargeIcon(it)` into the download foreground notification, displaying the full-color CharcuterieShelf brand icon inside the notification squircle.

---

## 20. Official Audiobookshelf Documentation Fork & Community Apps Listing

### Implementation
- **Official Docs Fork**:
  - Forked `audiobookshelf/audiobookshelf-docs` to `cavant/audiobookshelf-docs`.
  - Cloned locally into `C:\audiobookshelf-docs`.
  - Created isolated branch `add-charcuterieshelf`.
- **Community Apps Listing Entry (`src/components/CommunityAppsPage/communityAppsData.js`)**:
  - Added entry for **CharcuterieShelf** with tags `['Audiobooks', 'Podcasts']` and platforms `['Android', 'AAOS']`.
  - Accurately described the core feature set (Material You dynamic Monet theming, 14 built-in palettes, Pocket Casts-style podcatcher with 3-column reorderable favorites, Android Auto support, device-only podcast downloads, and in-app metadata & chapter parity).
- **Docusaurus Production Build Verification**:
  - Tested local compilation with `npm run build`: verified clean build with 0 errors.
  - Confirmed generated HTML and client chunks contain the CharcuterieShelf listing.
- **Google Play Closed Testing Callout (`readme.md`)**:
  - Added dedicated section inviting community members to join the 14-day closed test track via email (`support@themagicsalami.net`), web opt-in link, and direct Play Store download.
  - Updated theme descriptions removing third-party brand names and highlighting the native Monet dynamic extraction engine.

---

## 22. Podcast Favorites Drag-and-Drop Blank Screen Resolution

### Problem Discovered
When users tapped the "Reorder" button or long-pressed a favorite podcast tile on the `/bookshelf/favorites` page to drag and drop icons, the entire screen below the top toolbar went blank.

### Root Cause Analysis
1. **Template Condition Collision**:
   The instruction notice (`<div v-if="isReordering && favoriteItems.length > 1">`) was placed directly preceding the main grid container (`<div v-else-if="favoriteItems.length">`). Because the notice used a top-level `v-if`, when `isReordering` became `true`, Vue matched the notice condition and **skipped the entire `v-else-if` block containing the grid**. The grid was completely unmounted from the DOM.
2. **`vuedraggable` Model Mismatch & SortableJS Desync**:
   `<draggable>` had `v-model="favoriteItems"`, but the inner loop iterated over the computed property `displayedItems` (`v-for="item in displayedItems"`). When SortableJS triggered DOM mutations on drag, index mismatches between the rendered VNodes and `favoriteItems` caused DOM patch collisions.
3. **Event Bus Re-render Conflict**:
   On drag completion, `persistFavoritesOrder()` emitted `'podcast-favorites-changed'`, which was caught by `favorites.vue`'s own event listener, triggering an uncoordinated `loadFavorites()` network fetch while SortableJS was finalizing its drag transition.

### Implementation
- **Restructured Template Hierarchy (`pages/bookshelf/favorites.vue`)**:
  - Wrapped the entire content state in `<div v-else-if="favoriteItems.length" class="flex-1 min-h-0 flex flex-col overflow-hidden">`.
  - The reorder notice is now nested inside this container, preserving the grid in the DOM at all times.
- **Dedicated Mode Separation**:
  - **Normal Mode (`v-else`)**: Clean, native Vue grid iterating over `displayedItems` with active click navigation, long-press detection, and real-time search filtering. Zero SortableJS event overhead.
  - **Reorder Mode (`v-if="isReordering"`)**: Isolated `<draggable>` instance bound strictly 1:1 to `favoriteItems` (`v-for="item in favoriteItems"`), with `touchStartThreshold: 5`, `delay: 50`, `delayOnTouchOnly: true`, and quick-remove buttons.
- **Persistence Lock Guard**:
  - Introduced `isPersistingLocally` flag during order saving to prevent `favorites.vue` from triggering redundant server reloads while actively reordering.
  - Automatically resets search query and closes search bar upon entering reorder mode for a clean editing canvas.

---

### 24. GitHub Actions CI/CD Audit & Build Pipeline Optimization

### Overview & Issues Identified
An audit of GitHub Actions on repository [`cavant/CharcuterieShelf`](https://github.com/cavant/CharcuterieShelf) revealed failing runs across three primary automated workflows:
1. **`Verify all i18n files are alphabetized` (`i18n-check.yml`)**:
   - *Failure Reason*: The action `audiobookshelf/audiobookshelf-i18n-updater@v1.3.0` failed with `Keys are not alphabetized in en-us.json`. In addition, the `push:` trigger had no path filter, running on every commit regardless of whether translations changed.
2. **`Build APK` (`build-apk.yml`)**:
   - *Failure Reason*: `./android/gradlew: Permission denied` (exit code 126). Git tracking on Windows platforms did not preserve Unix executable flags.
3. **`Publish Test App` (`deploy-apk.yml`)**:
   - *Failure Reason 1*: `./android/gradlew: Permission denied` (exit code 126).
   - *Failure Reason 2*: `actions/deploy-pages@v4` threw HTTP `404 Not Found` because GitHub Pages was not provisioned for the repository.

### Solutions & Improvements Implemented
- **Automated i18n Alphabetization**:
  - Alphabetized and sorted all keys across 46 localization JSON files in `strings/*.json`.
  - Added `paths: ['strings/**']` trigger filter to `.github/workflows/i18n-check.yml` to eliminate redundant pipeline runs on non-translation changes.
- **Android Gradle Wrapper Executable Permissions**:
  - Configured git file mode to executable (`100755`) for `android/gradlew` via `git update-index --chmod=+x android/gradlew`.
  - Added explicit defensive step `chmod +x ./android/gradlew` in GitHub Actions workflow definitions before invocation.
- **Automated Continuous Delivery & GitHub Pages Deployment**:
  - Enabled GitHub Pages via GitHub API configured with `build_type: "workflow"`.
  - Rebranded `.github/testing-page-template.html` to `CharcuterieShelf :: Testers` linking directly to `cavant/CharcuterieShelf`.
  - Upgraded GitHub Actions steps to `@v4` standards and standardized artifact naming to `CharcuterieShelf-${build}.apk`.

### CI/CD Verification Results
All GitHub Actions pipelines achieved 100% green status on commit `727a6b2`:
- **Verify all i18n files are alphabetized**: ✅ **SUCCESS** (Run `34430336962`)
- **Build APK**: ✅ **SUCCESS** (Run `34430336978`)
- **Publish Test App**: ✅ **SUCCESS** (Run `34430336995`)
- **Live Testers Website**: ✅ **ONLINE & DEPLOYED** at [https://cavant.github.io/CharcuterieShelf/](https://cavant.github.io/CharcuterieShelf/) serving automated test APK builds directly.

---

---

## 25. Android 13–16 Platform Readiness, Documentation Alignment & Skill Maintenance

### 1. Android Auto Documentation Alignment
- **Inherited Upstream Feature**: Android Auto is a native feature inherited directly from upstream Audiobookshelf (`MediaBrowserServiceCompat`).
- **Cleaned Public Descriptions**:
  - Removed dedicated Android Auto feature section and intro highlights from [`readme.md`](file:///c:/audiobookshelf_app/readme.md).
  - Updated [`C:\audiobookshelf-docs\src\components\CommunityAppsPage\communityAppsData.js`](file:///C:/audiobookshelf-docs/src/components/CommunityAppsPage/communityAppsData.js) removing `'AAOS'` and `Android Auto support` from the CharcuterieShelf listing.
  - Clarified in [`AGENTS.md`](file:///c:/audiobookshelf_app/AGENTS.md) that Android Auto is an inherited core capability to prevent future agent misattributions.

### 2. Outside Sources & Google Play Pitfalls Audit
1. **Granular Media Permissions on Android 13+ (API 33+)**:
   - Google Play policy flags apps targeting API 33+ that declare `READ_EXTERNAL_STORAGE` without `maxSdkVersion="32"`.
   - Updated [`android/app/src/main/AndroidManifest.xml`](file:///c:/audiobookshelf_app/android/app/src/main/AndroidManifest.xml):
     - Added `android:maxSdkVersion="32"` to `android.permission.READ_EXTERNAL_STORAGE`.
     - Added `<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />`.
   - Updated [`MainActivity.kt`](file:///c:/audiobookshelf_app/android/app/src/main/java/com/audiobookshelf/app/MainActivity.kt) `requestNeededPermissions()` to dynamically request `READ_MEDIA_AUDIO` on `Build.VERSION_CODES.TIRAMISU`+ and `READ_EXTERNAL_STORAGE` on older APIs.
2. **16 KB Memory Page Size Support (Android 15 / 16)**:
   - Google Play mandates 16 KB page size compatibility for apps targeting Android 15+ by 2026/2027.
   - Inspected release APK binaries: confirmed CharcuterieShelf contains **0 unaligned NDK `.so` libraries**, relying purely on managed Kotlin/Java and Webview. Inherent 16 KB page compatibility is satisfied.
3. **Google Play 14-Day Closed Testing**:
   - Confirmed Google Play personal developer accounts require 12–20 testers opted in for 14 continuous days. Documented in `readme.md` and tester request templates.

### 3. QA Harness & Skill Synchronization
- Updated `tests/branding/manifest-branding.test.mjs` with assertions for `READ_MEDIA_AUDIO`, `READ_EXTERNAL_STORAGE` `maxSdkVersion="32"`, and 16 KB page size architecture compliance.
- Synchronized [`.agents/skills/charcuterieshelf-qa-review/SKILL.md`](file:///c:/audiobookshelf_app/.agents/skills/charcuterieshelf-qa-review/SKILL.md) and [`.gemini/skills/charcuterieshelf-qa-review/SKILL.md`](file:///c:/audiobookshelf_app/.gemini/skills/charcuterieshelf-qa-review/SKILL.md).
- Verified full verification suite: 10 / 10 suites passed in 1.68s, followed by native Android Kotlin compilation (`BUILD SUCCESSFUL in 25s`).

---

## 26. Android Auto Driving Restriction ("Isn't Available While Driving") & Sideload Enabler Compatibility

### Root Cause Analysis
1. **Google Automotive Driver Distraction Policy**:
   - In Android Auto (`Gearhead`), Google enforces strict safety rules regarding the origin/installer package of applications that register an automotive service (`com.google.android.gms.car.application` / `MediaBrowserService`).
   - When an app is sideloaded (installed via browser, downloaded APK, or default package installer), the system package manager does not assign `com.android.vending` (Google Play Store) as the installer package.
   - Even when "Unknown sources" is checked in Android Auto Developer Settings, Android Auto restricts full interaction or browsing while the vehicle is in gear or driving, presenting the warning: **"isn't available while driving"**.
   - Media playback itself (mini-player controls at the bottom) still works because ExoPlayer's `MediaSessionCompat` is active, but clicking the app to open the full UI is blocked by the driver distraction filter.

2. **In-Code Fixes in CharcuterieShelf (`v0.14.10-beta`)**:
   - **`distractionOptimized="true"` Manifest Declaration**: Added `<meta-data android:name="distractionOptimized" android:value="true" />` at both the `<application>` level and `<activity android:name=".MainActivity">` level in `AndroidManifest.xml`. This informs Android Auto and Android Automotive OS that the application meets driving distraction safety guidelines.
   - **Session Activity Handshake**: Maintained `sessionActivityPendingIntent` on `mediaSession` so the system media session handshake with Android Auto remains intact.
   - **Deterministic JDK 21 in Gradle**: Added `org.gradle.java.home=C:\\Java\\jdk-21` to `android/gradle.properties` so release APKs and Google Play AAB bundles compile with Java 21 without depending on shell environment path quirks.

3. **Android Auto Enabler Utilities (Sideload Workaround)**:
   - For sideloaded installs prior to Google Play Store distribution, users can install `CharcuterieShelf.apk` using:
     - **AAEnabler** (`malebuffy/AAEnabler` on GitHub): Selects local APK and installs it with the Google Play installer tag.
     - **KingInstaller** (`fcaronte/KingInstaller` on GitHub): Installs any local APK while spoofing `com.android.vending` as the source.
     - **ADB**: `adb shell pm install -i "com.android.vending" -r CharcuterieShelf.apk`

---

## 27. Automatic Deletion of Played Podcasts & Manual Download Management (v0.14.11-beta)

### Problem Solved
1. Downloaded podcast episodes remained on the mobile device indefinitely even after listeners finished them, silently consuming gigabytes of internal storage unless the user opened deep storage settings.
2. Users had no quick, direct way to manually delete downloaded episode audio files from episode lists without deleting the show or using Android system settings.
3. Server disk integrity must be strictly maintained: deleting an episode from device storage should NEVER trigger server-side audio file deletion or wipe listening progress on the Audiobookshelf server.

### Native & Frontend Architecture
1. **Foreground Service Playback-End Hook (`PlayerNotificationService.kt`)**:
   - Integrated `deletePlayedPodcastDownload(session: PlaybackSession)` directly into `handlePlaybackEnded()`.
   - When an episode completes (EOF reached):
     - Checks the global preference `autoDeletePlayedPodcasts` (default `true`) and per-podcast override in `$localStore` (`podcast_settings_${podcastId}`).
     - Deletes the local media file via `DocumentFileCompat` / `java.io.File`.
     - Removes track metadata from `LocalLibraryItem`. If zero tracks remain, purges the parent `LocalLibraryItem` container from SQLite `DbManager` to prevent orphaned database records.
     - Emits `onLocalEpisodeDeleted(localLibraryItemId, localEpisodeId, serverEpisodeId)` to `AbsAudioPlayer.kt` and the Capacitor Webview.
2. **Capacitor Bridge & Event Bus (`AbsAudioPlayer.kt` & `AudioPlayer.vue`)**:
   - `AbsAudioPlayer.kt` bridges native events to the webview via `notifyListeners("onLocalEpisodeDeleted", ret)`.
   - `AudioPlayer.vue` listens to `onLocalEpisodeDeleted` and emits `local-episode-deleted` on the root `$eventBus`.
3. **Reactive UI State (`EpisodesTable.vue`, `EpisodeRow.vue`, `LatestEpisodeRow.vue`)**:
   - **Interactive Download Badges**: Replaced static `download_done` badges with interactive button targets. Tapping prompts the user: *"Delete downloaded episode audio from this device? (Server progress will be preserved)"*.
   - **Local File Deletion**: Calls `AbsFileSystem.deleteTrackFromItem()`, purges empty containers, and emits `local-episode-deleted`.
   - **Instant List Reactivity**: `EpisodesTable.vue` tracks `deletedLocalEpisodeIds` and dynamically filters `localEpisodeMap`, instantly updating the UI from downloaded badge to cloud download icon without requiring a page reload.
   - `pages/item/_id/index.vue` and `pages/bookshelf/latest.vue` listen to `local-episode-deleted` to keep cached local library items synchronized.
4. **Configuration Controls**:
   - **Global Settings (`pages/settings.vue`)**: Added a master "Auto-Delete Played Podcasts" toggle switch in the "Podcasts & Downloads" section with an explanatory info dialog.
   - **Per-Podcast Override (`PodcastSettingsModal.vue`)**: Added an independent "Auto-Delete Played Episodes" switch per show saved in `$localStore`.
   - **Data Layer (`DeviceClasses.kt`)**: Added `autoDeletePlayedPodcasts: Boolean = true` to `DeviceSettings` with backward-compatible defaults.

### Verification Results
- **Automated QA Harness (`npm run test:qa`)**: All 11 test suites passed 100% (including new `podcast-auto-delete.test.mjs`).
- **Static Nuxt Generation (`npm run generate`)**: Built 15 static client pages into `dist/` with 0 errors.
- **Native Android Compilation (`assembleRelease bundleRelease`)**: Signed release APK (`app-release.apk`, 16.2 MB) and Google Play AAB bundle (`app-release.aab`, 15.6 MB) built successfully with JDK 21.
- **Cloud Distribution Sync**: Copied to `E:\Google Drive\` and `C:\Users\Connor\OneDrive\`.

---

## 28. Android Auto In-Car Screen Isolation vs Phone Activity Launch Fix (v0.14.12-beta)

### Problem Solved
1. After installing with an Android Auto enabler, the "isn't available while driving" message disappeared, but tapping the CharcuterieShelf icon in the Android Auto launcher or tapping the Now Playing card on the car dashboard caused the app to **open on the phone screen** instead of projecting the Media Browser UI on the car's infotainment display.
2. In Google Automotive guidelines, `distractionOptimized="true"` metadata must **never** be applied to phone activities (`MainActivity`) in Media Apps. Doing so instructs Android Auto to treat `MainActivity` as a standalone Car App activity, prompting Android Auto to launch `MainActivity` directly via `startActivity`. Since `MainActivity` is a standard Capacitor WebView activity that cannot render into Android Auto's projection stream, Android OS launched it on the phone display.
3. Similarly, providing `sessionActivityPendingIntent` (which points to `MainActivity`) to `mediaSession.setSessionActivity(...)` caused Android Auto's media player controller to fire the pending intent when tapped, redirecting focus to the phone.

### Native Android Architecture & Fix
1. **Removed `distractionOptimized` from Manifest**:
   - Removed `<meta-data android:name="distractionOptimized" android:value="true" />` from `<application>` in `AndroidManifest.xml`.
   - Removed `<meta-data android:name="distractionOptimized" android:value="true" />` from `<activity android:name=".MainActivity">` in `AndroidManifest.xml`.
   - Result: Android Auto strictly categorizes CharcuterieShelf as a **Media App** (`automotive_app_desc.xml` with `<uses name="media"/>`) rather than an Activity-based Car App.
2. **Cleared `sessionActivity` on Android Auto Connection (`PlayerNotificationService.kt`)**:
   - In `PlayerNotificationService.kt:onGetRoot()`, added `mediaSession.setSessionActivity(null)` upon connection.
   - When Android Auto's in-car MediaController queries `getSessionActivity()`, it receives `null`. Instead of triggering a phone activity launch, Android Auto renders and expands its native in-car Now Playing screen and Media Browser directly on the head unit display.
   - Phone notification tray interactions remain completely unaffected: `AbMediaDescriptionAdapter.kt:createCurrentContentIntent` directly references `playerNotificationService.sessionActivityPendingIntent`, ensuring tapping notifications on the phone continues to seamlessly bring `MainActivity` to the foreground.

### Verification Results
- **Automated QA Harness (`npm run test:qa`)**: All 11 verification suites passed 100% in 1.85s.
- **Native Android Compilation (`assembleRelease bundleRelease`)**: Signed release APK (`app-release.apk`, 16.2 MB) and Google Play AAB bundle (`app-release.aab`, 15.6 MB) built successfully with JDK 21 in 1m 1s.
- **Cloud Distribution Sync**: Copied `CharcuterieShelf.apk` and `CharcuterieShelf.aab` to `E:\Google Drive\` and `C:\Users\Connor\OneDrive\`.
- **GitHub Release Live**: Published release `v0.14.12-beta` with `CharcuterieShelf.apk` attached and set as the latest release.
