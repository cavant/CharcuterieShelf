import { CapacitorHttp } from '@capacitor/core'

/**
 * Checks whether an IP address belongs to RFC 1918 private address ranges or loopback.
 * @param {string} hostname 
 * @returns {boolean}
 */
export function isPrivateNetwork(hostname) {
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
  
  // Check 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  // Check 172.16.0.0/12
  const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/)
  if (match172) {
    const octet = parseInt(match172[1], 10)
    if (octet >= 16 && octet <= 31) return true
  }
  // Check 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  // Check link-local 169.254.0.0/16
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true

  // Check .local mDNS domains
  if (hostname.endsWith('.local')) return true

  return false
}

/**
 * Checks if a given IP address matches a pattern (such as 192.168.1.* or 192.168.1.0/24).
 * @param {string} ip 
 * @param {string} pattern 
 * @returns {boolean}
 */
export function ipMatchesPattern(ip, pattern) {
  if (!ip || !pattern) return false
  const trimmedPattern = pattern.trim()
  const trimmedIp = ip.trim()

  if (trimmedPattern === '*' || trimmedPattern === trimmedIp) return true

  // Wildcard pattern e.g. 192.168.1.* or 10.0.*
  if (trimmedPattern.includes('*')) {
    const regexPattern = '^' + trimmedPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    return new RegExp(regexPattern).test(trimmedIp)
  }

  // CIDR notation e.g. 192.168.1.0/24
  if (trimmedPattern.includes('/')) {
    const [range, bitsStr] = trimmedPattern.split('/')
    const bits = parseInt(bitsStr, 10)
    if (isNaN(bits) || bits < 0 || bits > 32) return false

    const ipToInt = (addr) => {
      const parts = addr.split('.').map((p) => parseInt(p, 10))
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null
      return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)
    }

    const ipInt = ipToInt(trimmedIp)
    const rangeInt = ipToInt(range)
    if (ipInt === null || rangeInt === null) return false

    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (ipInt & mask) === (rangeInt & mask)
  }

  return false
}

/**
 * Tests whether currently connected Wi-Fi SSID matches a comma-separated list of allowed SSIDs.
 * @param {string} localNetworks - Comma-separated list of network SSIDs (e.g. "Home-WiFi, Home-WiFi-5G")
 * @param {{ isWifi?: boolean, ssid?: string|null }} networkInfo 
 * @returns {boolean}
 */
export function matchesLocalNetworks(localNetworks, networkInfo) {
  if (!localNetworks || !networkInfo) return false
  if (!networkInfo.isWifi || !networkInfo.ssid) return false

  const currentSsid = networkInfo.ssid.trim()
  if (!currentSsid || currentSsid === '<unknown ssid>') return false

  const allowedSsids = localNetworks
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (allowedSsids.length === 0) return false
  if (allowedSsids.includes('*')) return true

  const currentSsidLower = currentSsid.toLowerCase()

  for (const pattern of allowedSsids) {
    const patternLower = pattern.toLowerCase()
    if (patternLower === currentSsidLower) return true

    // Support simple wildcard in SSID e.g. "Home-WiFi*"
    if (patternLower.includes('*')) {
      const regexStr = '^' + patternLower.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      if (new RegExp(regexStr, 'i').test(currentSsidLower)) return true
    }
  }

  return false
}

export class ServerAddressResolver {
  constructor(store, db) {
    this.$store = store
    this.$db = db
  }

  /**
   * Pings a server address with a fast timeout.
   * @param {string} address 
   * @param {Object} [customHeaders] 
   * @param {number} [timeout=1500] 
   * @returns {Promise<boolean>}
   */
  async pingAddress(address, customHeaders = {}, timeout = 1500) {
    if (!address) return false
    try {
      const cleanAddress = address.replace(/\/$/, '')
      const response = await CapacitorHttp.get({
        url: `${cleanAddress}/ping`,
        headers: { ...(customHeaders || {}) },
        connectTimeout: timeout,
        readTimeout: timeout
      })
      return response.status === 200 && response.data?.success !== false
    } catch (error) {
      return false
    }
  }

  /**
   * Retrieves current network details from native layer and store.
   * @returns {Promise<{ isWifi: boolean, ssid: string|null, ipAddress: string|null, connectionType: string|null }>}
   */
  async getCurrentNetworkInfo() {
    let nativeInfo = { isWifi: false, ssid: null, ipAddress: null }
    if (this.$db?.getNetworkInfo) {
      try {
        nativeInfo = await this.$db.getNetworkInfo()
      } catch (err) {
        console.warn('[ServerAddressResolver] getNetworkInfo failed', err)
      }
    }

    const connectionType = this.$store?.state?.networkConnectionType || null
    const isWifi = nativeInfo.isWifi || connectionType === 'wifi'

    return {
      isWifi,
      ssid: nativeInfo.ssid || null,
      ipAddress: nativeInfo.ipAddress || null,
      connectionType
    }
  }

  /**
   * Resolves whether localAddress or remoteAddress should be active for a given server config.
   * Alias for resolve(config, options)
   */
  async resolveServerAddress(config, options = {}) {
    return this.resolve(config, options)
  }

  /**
   * Resolves whether localAddress or remoteAddress should be active for a given server config.
   * 
   * @param {Object} config - ServerConnectionConfig
   * @param {Object} [options]
   * @param {boolean} [options.forcePing] - Always ping localAddress even without SSID match
   * @returns {Promise<{ activeAddress: string, isLocal: boolean, reason: string }>}
   */
  async resolve(config, options = {}) {
    if (!config) {
      return { activeAddress: null, isLocal: false, reason: 'no_config' }
    }

    const remoteUrl = (config.remoteAddress || config.address || '').replace(/\/$/, '')
    const localUrl = (config.localAddress || '').replace(/\/$/, '')

    // If no local address is configured, remote is the only choice
    if (!localUrl) {
      return { activeAddress: remoteUrl, isLocal: false, reason: 'no_local_address' }
    }

    // If offline, maintain current address
    const networkConnected = this.$store?.state?.networkConnected ?? true
    if (!networkConnected) {
      return { activeAddress: config.address || remoteUrl, isLocal: config.address === localUrl, reason: 'network_offline' }
    }

    const networkInfo = await this.getCurrentNetworkInfo()

    // Evaluate local address reachability
    // On Wi-Fi or when local address is provided, always test local address first
    const isPureCellular = networkInfo.connectionType === 'cellular' && !networkInfo.isWifi
    let shouldTestLocal = true

    try {
      const localUrlObj = new URL(localUrl)
      if (isPureCellular && isPrivateNetwork(localUrlObj.hostname) && !options.forcePing) {
        // On cellular without explicit forcePing, private IP won't resolve unless on VPN
        // Test with a short 800ms timeout to support VPNs without delaying connection
        console.log(`[ServerAddressResolver] Cellular connection detected with private LAN IP (${localUrlObj.hostname}), checking VPN/connectivity with fast 800ms ping...`)
        const reachableOverVpn = await this.pingAddress(localUrl, config.customHeaders, 800)
        if (reachableOverVpn) {
          console.log(`[ServerAddressResolver] Local address reachable over VPN (${localUrl}). Using LAN connection!`)
          return { activeAddress: localUrl, isLocal: true, reason: 'local_reachable_vpn' }
        }
        shouldTestLocal = false
      }
    } catch (e) {
      console.warn('[ServerAddressResolver] Invalid local URL format:', localUrl)
      return { activeAddress: remoteUrl, isLocal: false, reason: 'invalid_local_url' }
    }

    if (shouldTestLocal) {
      console.log(`[ServerAddressResolver] Prioritizing local address ${localUrl}, pinging with 1500ms timeout... (SSID: ${networkInfo.ssid || 'unknown'})`)
      const reachable = await this.pingAddress(localUrl, config.customHeaders, 1500)
      if (reachable) {
        console.log(`[ServerAddressResolver] Local address ${localUrl} responded successfully! Using local LAN connection.`)
        return { activeAddress: localUrl, isLocal: true, reason: 'local_reachable' }
      } else {
        console.log(`[ServerAddressResolver] Local address ${localUrl} ping failed or timed out. Falling back to remote ${remoteUrl}.`)
        return { activeAddress: remoteUrl, isLocal: false, reason: 'local_ping_failed' }
      }
    }

    console.log(`[ServerAddressResolver] Skipping local ping on cellular. Using remote address ${remoteUrl}.`)
    return { activeAddress: remoteUrl, isLocal: false, reason: 'cellular_fallback' }
  }
}
