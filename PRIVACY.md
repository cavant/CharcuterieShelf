# Privacy Policy for CharcuterieShelf

**Effective Date**: September 8, 2026  
**Last Updated**: September 8, 2026  
**Application Name**: CharcuterieShelf (`com.CharcuterieShelf`)  
**Developer**: TheMagicSalami ([cavant](https://github.com/cavant))  
**Repository**: [https://github.com/cavant/CharcuterieShelf](https://github.com/cavant/CharcuterieShelf)

---

## 1. Overview & Commitment to Privacy

CharcuterieShelf is a free, open-source mobile client for self-hosted audiobooks and podcasts powered by [Audiobookshelf](https://www.audiobookshelf.org/). 

We believe that personal media and listening habits should remain completely private. CharcuterieShelf does not collect, sell, monetize, or track your personal information, listening history, or device data.

---

## 2. Information We Collect (Zero-Data Collection)

CharcuterieShelf **does NOT collect, transmit, store, or share any personal information or telemetry** with the developer, third-party advertising platforms, or external analytics vendors.

Specifically:
- **No Personal Identifiers**: We do not collect names, email addresses, phone numbers, or user IDs.
- **No Device Identifiers**: We do not collect IMEI numbers, MAC addresses, Advertising IDs, or hardware identifiers.
- **No Analytics or Telemetry**: We do not include Google Analytics, Firebase Analytics, Crashlytics, Mixpanel, or any tracking SDKs.
- **No Advertisements**: CharcuterieShelf is 100% ad-free. No advertising networks are bundled within the application.

---

## 3. Communication with Your Self-Hosted Server

CharcuterieShelf functions exclusively as a client interface between your mobile device and your chosen, self-hosted Audiobookshelf server:
- **Direct Connection**: All network traffic (such as streaming audio, downloading episodes, fetching book covers, and updating playback progress) occurs strictly between your device and the server address you configure (LAN or WAN).
- **Authentication**: Your login credentials and authentication tokens are exchanged solely with your designated server over HTTPS/HTTP and stored securely on your local device using Android scoped storage and preferences.
- **No Proxy Servers**: The developer operates no intermediary relay servers, proxies, or cloud databases.

---

## 4. Third-Party Media Providers & RSS Feeds

If you choose to use optional online features within the app:
- **Podcast RSS Feeds**: When you browse or stream podcasts directly, your device connects directly to the podcast host's publicly published RSS feed and media enclosures.
- **Metadata Matching & Cover Art**: When you use the in-app book metadata search, your search query is sent directly to the public APIs of the providers you select (e.g. Google Books, OpenLibrary, Audible).

No user identity or private account data is sent during these queries.

---

## 5. Device Permissions Used

CharcuterieShelf requests only the minimal Android permissions necessary to function as an audio player:
- **Internet (`android.permission.INTERNET`)**: Required to stream media from your server and fetch podcast feeds.
- **Foreground Service & Media Playback (`android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`)**: Required to maintain uninterrupted audio playback when the app is in the background or the screen is turned off.
- **Post Notifications (`android.permission.POST_NOTIFICATIONS`)**: Required to display media player playback controls in the Android notification drawer and lock screen.
- **Wake Lock (`android.permission.WAKE_LOCK`)**: Required to prevent the device CPU from sleeping during active audio playback.

CharcuterieShelf does **not** request access to your contacts, camera, location, microphone, or SMS.

---

## 6. Children's Privacy

CharcuterieShelf does not knowingly collect or solicit any personal information from children under the age of 13. The application is a self-hosted media client with zero tracking.

---

## 7. Security of Your Data

Because all media playback and account tokens are stored locally on your device or on your personal server, you maintain total control over your data security. We strongly recommend configuring HTTPS/TLS on your self-hosted Audiobookshelf server.

---

## 8. Open Source Verification

CharcuterieShelf is fully open source under the GNU General Public License v3.0 (GPL-3.0). Anyone can inspect the complete source code to independently verify our privacy practices at:  
[https://github.com/cavant/CharcuterieShelf](https://github.com/cavant/CharcuterieShelf)

---

## 9. Contact Information

If you have any questions regarding this Privacy Policy, please open an issue or reach out:
- **GitHub Issues**: [https://github.com/cavant/CharcuterieShelf/issues](https://github.com/cavant/CharcuterieShelf/issues)
- **Developer**: Connor Avant ([cavant](https://github.com/cavant))
