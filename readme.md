<div align="center">

# CharcuterieShelf 🥪📚

### *A gourmet client for self-hosted audiobooks and podcasts with Material You theming, Pocket Casts playback controls, and smart local/remote switching.*

[![Buy Me a Coffee](https://img.shields.io/badge/Support-Buy_Me_a_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/themagicsalami)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/cavant/CharcuterieShelf)
[![Author: TheMagicSalami](https://img.shields.io/badge/Author-TheMagicSalami-red?style=for-the-badge)](https://github.com/cavant)

<br/>

<img alt="CharcuterieShelf Demo Screens" src="screenshots/DeviceDemoScreens.png" width="100%" />

</div>

---

## 📖 About CharcuterieShelf

**CharcuterieShelf** is a feature-packed fork of [Audiobookshelf](https://github.com/advplyr/audiobookshelf-app) crafted by **TheMagicSalami** ([cavant](https://github.com/cavant)). 

While the official Audiobookshelf app is phenomenal, CharcuterieShelf was created to bridge critical gaps for power listeners: seamlessly moving between high-speed home Wi-Fi and mobile data with a single server profile, integrating top playback features inspired by **Pocket Casts**, supporting **Material You** wallpaper theming, offering a polished **home screen player widget**, and achieving complete **in-app editing parity with the web client**.

---

## ✨ Key Features & Screenshots

### 🚀 Unified Local & Remote Server Switching
- Configure a single server profile with both your **LAN Address** (`http://192.168.1.x:13378`) and **Remote Address** (`https://audio.example.com`).
- Define a comma-separated list of your home **Wi-Fi SSIDs**.
- When connected to your home network, the app automatically switches to local LAN speeds for instantaneous streaming and high-speed offline downloads.
- When you step out the door, it smoothly transitions to remote streaming—all with uninterrupted session progress.

<div align="center">
  <img alt="Smart Local and Remote Server Switcher" src="screenshots/01_server_connect.png" width="360px" />
</div>

---

### 📚 Gourmet Library & Details Experience
- Full high-fidelity bookshelf layout with realistic wood shelving and cover art caching.
- Direct-to-stream and offline download management.
- Real-time progress tracking with hours/minutes remaining.

<div align="center">
  <img alt="Bookshelf Library" src="screenshots/02_bookshelf.png" width="360px" style="margin-right: 16px;" />
  <img alt="Book Details Page" src="screenshots/03_book_details.png" width="360px" />
</div>

---

### 🎙️ Pocket Casts-Inspired Podcatcher Power
- **Trim Silence**: Real-time silence skipping powered by ExoPlayer's native audio pipeline—no gaps, no pitch changes.
- **Intro & Outro Skipping**: Set custom skip durations per podcast show (e.g. skip first 45s of intro ads, skip last 30s of credits).
- **Per-Show Playback Speeds**: Automatically remembers your preferred listening speed for each podcast independently.
- **End of Episode Sleep Timer**: Automatic sleep timer calculated precisely to the end of the current podcast episode.
- **Filter Chips & Instant Search**: Quickly filter episode lists by *All*, *Unplayed*, *In Progress*, and *Downloaded*, or search episode titles and show notes in real time.

<div align="center">
  <img alt="Pocket Casts Settings Modal" src="screenshots/07_pocketcasts_settings.png" width="360px" />
</div>

---

### 🎨 Material You & 8 Curated Themes
- **Material You (Dynamic Monet)**: Extracts color accents from your Android 12+ system wallpaper and applies them across the entire app UI and player controls.
- **OLED Pitch Black**: Pure `#000000` dark mode optimized for battery saving on AMOLED displays.
- **Nord**: Cool, arctic blue-gray aesthetic inspired by the popular developer palette.
- **Catppuccin Macchiato**: Soothing pastel accents on a rich dark plum foundation.
- **Forest Evergreen**: Deep pine green backdrop with soft mint accents.
- **Sepia Paper**: Warm amber and leather tones reminiscent of reading an antique physical book.
- **Midnight Slate**: Crisp modern dark slate with cyan accents.
- **Default Dark & Light**: Balanced neutral charcoal and clean daytime themes.

<div align="center">
  <img alt="Theme Selector" src="screenshots/08_theme_picker.png" width="360px" />
</div>

---

### ✏️ Full In-App Web Client Parity
No need to open the desktop browser just to fix a typo or chapter mark:
- **Interactive Chapter Editor**: Batch-adjust chapters, shift start times, fine-tune timestamps with `+/- 1s` buttons, set from individual audio tracks, or fetch official Audible chapters by ASIN.
- **Provider Match**: Search Google Books, Audible, and OpenLibrary with granular field-by-field merge controls.
- **Cover Art Manager**: Upload new images from your device gallery/camera, paste an image URL, or search OpenLibrary/Audible for high-res cover art.

<div align="center">
  <img alt="In-App Chapter Editor" src="screenshots/04_edit_chapters.png" width="300px" style="margin-right: 12px;" />
  <img alt="In-App Match Provider" src="screenshots/05_edit_match.png" width="300px" style="margin-right: 12px;" />
  <img alt="In-App Cover Manager" src="screenshots/06_edit_cover.png" width="300px" />
</div>

---

### 📱 Modern Material 3 Playback Widget
- Home screen widget styled with Material 3 card curvature and elevated container styling.
- Smooth rounded-corner album art previews powered by Glide transformations.
- Instant responsive controls: Rewind 10s, Play/Pause, and Fast-Forward 10s directly from your Android launcher.

---

## 🔒 Privacy Policy (Zero-Data Collection)

CharcuterieShelf was designed from the ground up for total user privacy and autonomy:

1. **Zero Data Collection**: We do not collect, log, track, or transmit any personal data, usage analytics, or device identifiers.
2. **Direct Connection**: All communication takes place strictly between your device and your private, self-hosted Audiobookshelf server. There are no intermediary proxies or analytics servers.
3. **Local Storage**: Authentication tokens, media progress, and offline downloads remain encrypted and stored solely on your physical device.
4. **Zero Trackers**: Contains zero advertising SDKs, zero behavioral trackers, and zero telemetry frameworks.

---

## ☕ Support Ongoing Development

CharcuterieShelf is 100% free and open source with zero paywalls. If you enjoy using the app and want to support ongoing maintenance and new features, consider buying a coffee!

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Support_TheMagicSalami-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/themagicsalami)

**[https://buymeacoffee.com/themagicsalami](https://buymeacoffee.com/themagicsalami)**

</div>

---

## 🛠️ Building From Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 LTS recommended)
- [Git](https://git-scm.com/)
- [Java JDK 21](https://adoptium.net/)
- [Android Studio & SDK](https://developer.android.com/studio) (API 34+)

### 1. Clone the Repository
```bash
git clone https://github.com/cavant/CharcuterieShelf.git
cd CharcuterieShelf
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Compile the Web Assets & Sync Capacitor
```bash
npm run generate
npx cap sync
```

### 4. Build Android APKs
```powershell
# Windows PowerShell
$env:JAVA_HOME = "C:\Java\jdk-21"
cd android

# Build Debug APK
.\gradlew.bat assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build Signed Release APK
.\gradlew.bat assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```


---

## 📜 Credits & Attribution

CharcuterieShelf stands on the shoulders of giants. We express sincere gratitude to the upstream authors and open source communities:

- **[Audiobookshelf](https://github.com/advplyr/audiobookshelf)** & **[audiobookshelf-app](https://github.com/advplyr/audiobookshelf-app)**  
  Created by **advplyr** and contributors under the GNU General Public License v3.0.
- **[Pocket Casts Android](https://github.com/Automattic/pocket-casts-android)**  
  Maintained by **Automattic** under the GNU General Public License v3.0, which inspired our podcatcher playback and queue enhancements.
- **[TheMagicSportslami](https://github.com/cavant)**  
  Reference companion project by TheMagicSalami for legal disclaimers, support framework, and zero-data privacy architecture.
- **[Nuxt.js](https://nuxtjs.org/)** & **[Vue.js](https://vuejs.org/)** (MIT License)
- **[Capacitor](https://capacitorjs.com/)** by Ionic (MIT License)
- **[ExoPlayer / Media3](https://github.com/androidx/media)** by Google LLC (Apache 2.0)

---

## ⚖️ License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.
