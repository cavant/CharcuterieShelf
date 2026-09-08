# Unified Local & Remote Server Connection

## Overview & Motivation

In previous versions of the Audiobookshelf mobile app, users who self-host an Audiobookshelf instance on their home network had to choose between two undesirable setups:
1. **Always connect via remote domain/reverse proxy** (e.g. `https://abs.example.com`):
   - Works both inside and outside the home.
   - Suffers from hairpin NAT issues on some home routers.
   - Throttles downloads and streaming to home broadband upload limits rather than utilizing gigabit/multi-gigabit local Wi-Fi speeds.
2. **Configure two separate server entries** (e.g. `http://192.168.1.100:13378` and `https://abs.example.com`):
   - Generates two completely different `serverConnectionConfig.id` values (since IDs were derived from `address@username`).
   - **Broken synchronization**: Playback progress, listening sessions, and history were tracked separately per server profile.
   - **Download mismatches**: Audiobooks downloaded via the LAN profile showed as "Media linked to a different server" when connected via the remote profile, preventing playback of offline files without switching profiles.

### The Solution

This feature introduces **Unified Local and Remote Connections** under a single server configuration profile:
- **One Unified Server Profile**: Single stable identity (`id` derived from `remoteAddress` or initial setup). All downloads, authentication tokens, reading progress, and listening sessions remain 100% synchronized whether you are connected locally or remotely.
- **Dual Endpoints**: Specify a primary **Remote URL** (e.g., `https://audiobooks.mydomain.com`) and an optional **Local URL** (e.g., `http://192.168.1.100:13378`).
- **Flexible Network Detection**: Specify Wi-Fi SSIDs and/or IP subnet patterns (e.g., `MyHomeWiFi, 192.168.1.*, 10.0.0.0/24`) or utilize the "Use Current Network" auto-detector.
- **Dynamic Endpoint Switching & Reachability Fallback**: Automatically senses network changes (Wi-Fi connected/disconnected), verifies reachability using a lightweight `/ping` probe (1500ms timeout), switches active addresses seamlessly, and reconnects the WebSocket without requiring user intervention.

---

## Architecture & Data Model

### Data Structures

#### `ServerConnectionConfig`
The configuration object persisted in the database (Android SQLite / iOS Realm / Web LocalStorage) has been extended:

```typescript
interface ServerConnectionConfig {
  id: string              // Stable ID base64(remoteAddress@username)
  index: number
  name: string
  userId: string
  username: string
  address: string         // Currently active address (local or remote)
  remoteAddress: string   // Canonical remote URL (e.g. https://abs.example.com)
  localAddress?: string   // LAN IP & port (e.g. http://192.168.1.100:13378)
  localNetworks?: string  // Comma-separated SSIDs or subnets (e.g. "Home-5G, 192.168.1.*")
  token: string           // Authentication access token
  version: string         // Server version
  customHeaders?: Record<string, string>
}
```

### Stable ID Guarantee
Previously:
```javascript
id = base64(`${serverAddress}@${username}`)
```
When switching between local IP and remote domain, the ID would change, causing database lookups for cached items, bookmarks, and downloads to miss.

Now:
```javascript
// Native & JS layer
val baseAddress = scc.remoteAddress ?: scc.serverAddress
val id = encodeBase64("${baseAddress}@${username}")
```
The `id` remains constant regardless of which endpoint is currently active.

---

## Network Resolution Algorithm

The resolution logic is encapsulated in `utils/serverAddressResolver.js`:

```
                    +-----------------------------+
                    | Network Status / App Launch |
                    +--------------+--------------+
                                   |
                     Has config.localAddress?
                                /     \
                              No       Yes
                              /         \
                 Use remoteAddress       Evaluate matching rules:
                                         1. Currently connected to Wi-Fi?
                                         2. Wi-Fi SSID matches localNetworks list?
                                                /                      \
                                              Yes                       No
                                              /                           \
                              Ping localAddress (/ping)            Ping remoteAddress (/ping)
                                    /           \                         |
                                Success        Failure              Use remoteAddress
                                  /               \
                          Use localAddress   Fallback to remoteAddress
```

### Supported Match Formats in `localNetworks`:
1. **Wi-Fi SSID**: Exact name (case-insensitive, e.g. `Home-WiFi`, `OfficeNet_5G`).
2. **Wildcard SSID**: e.g., `Home-WiFi*` (matches `Home-WiFi`, `Home-WiFi-5G`).

*Note: The app specifically and only routes to the local connection when connected to Wi-Fi whose SSID matches one of the configured names. On cellular or unknown networks, the app routes exclusively to the remote address.*

### Reachability Verification (`/ping`):
Even when connected to a matching Wi-Fi network, the resolver pings `${localAddress}/ping` with a 1500ms timeout. If the server does not respond with `{ success: true }`, the app immediately falls back to `remoteAddress`.

---

## Native Platform Implementations

### Android
- **Permissions** (`AndroidManifest.xml`):
  - `ACCESS_NETWORK_STATE`: Enumerate active network capabilities.
  - `ACCESS_WIFI_STATE`: Read connected Wi-Fi state.
  - `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: Required by Android 8.1+ to read the connected Wi-Fi SSID.
  - `NEARBY_WIFI_DEVICES`: Declared with `android:usesPermissionFlags="neverForLocation"` for Android 13+.
- **Native Plugin** (`com.audiobookshelf.app.plugins.AbsDatabase`):
  - `@PluginMethod fun getNetworkInfo(call: PluginCall)`: Requests runtime location permission when invoked with `{ requestPermission: true }` and reads the actual connected Wi-Fi SSID from `NetworkCapabilities.transportInfo` (Android 10+) or `WifiManager.connectionInfo`.
- **Download Management** (`com.audiobookshelf.app.managers.DownloadItemManager`):
  - Updated `serverUrl()` to use `DeviceManager.serverAddress` when connected to that config. Paused or queued downloads automatically utilize high-speed LAN when at home and WAN when away.

### iOS
- **Native Plugin** (`ios/App/App/plugins/AbsDatabase.swift`):
  - Implements `getNetworkInfo` using POSIX `getifaddrs` to detect active Wi-Fi interface IPv4 addresses (`en0`).
  - Persists `remoteAddress`, `localAddress`, and `localNetworks` to Realm database schema.
- **Model** (`ios/App/Shared/models/ServerConnectionConfig.swift`):
  - Added `@Persisted var remoteAddress: String?`
  - Added `@Persisted var localAddress: String?`
  - Added `@Persisted var localNetworks: String?`

---

## User Interface & Experience

1. **Server Setup (`ServerConnectForm.vue`)**:
   - New toggle: **"Local Network Connection (LAN)"**.
   - Input for **Local Server Address (IP:Port)**.
   - Input for **Local Networks (Wi-Fi SSIDs or Subnets)** with a **"Use Current Network"** quick-detect button.
2. **Live Editing (`EditServerConnectionModal.vue`)**:
   - Easily edit connection settings at any time without logging out.
   - Interactive **Test Local** and **Test Remote** buttons to diagnose reachability.
   - Accessible via the server selection list (3-dot menu) and the Account settings screen.
3. **Status Indicators**:
   - **Side Drawer**: Dynamic LAN (`lan` in green) or Cloud (`cloud` in accent color) icon next to the active server address.
   - **Account Screen**: Detailed connection mode badge showing whether you are currently connected via LAN or Remote, along with both endpoints.
4. **Unified Media Matching**:
   - Readers (`EpubReader.vue`, `ComicReader.vue`, `PdfReader.vue`) and Item pages (`pages/item/_id/index.vue`, `_episode/index.vue`) utilize `isMatchingServerAddress`, ensuring locally downloaded files are always recognized regardless of whether the app switched between LAN and remote addresses.

---

## Testing & Verification Checklist

When reviewing or testing this implementation:

- [ ] **First-Time Setup**:
  1. Open app and click "Add New Server".
  2. Enter Remote URL: `https://abs.example.com`.
  3. Turn on "Local Network Connection (LAN)".
  4. Enter Local URL: `http://192.168.1.100:13378`.
  5. Click "Use Current Network" to populate Wi-Fi SSID or subnet.
  6. Submit and log in.
- [ ] **LAN Connection**:
  - Connect to home Wi-Fi. Notice green LAN icon in the side drawer and "Connected via LAN" badge in Account screen.
  - Start download or streaming: Network traffic routes directly to local IP.
- [ ] **Remote Transition**:
  - Turn off Wi-Fi (switch to Cellular).
  - Notice the app automatically detects network switch, reconnects to `https://abs.example.com`, and shows the Cloud icon.
  - Resume playback or download: Session and progress continue without error.
- [ ] **Offline Item Matching**:
  - Download an audiobook while on LAN.
  - Switch to Cellular / Remote.
  - Open downloaded audiobook: verify there is NO "Media linked to a different server" warning and the book plays offline files normally.
