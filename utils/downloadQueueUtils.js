/**
 * Download queue and recovery utilities for CharcuterieShelf.
 *
 * Implements exponential retry backoff, URL resolution, CDN auth token isolation,
 * and item status evaluators matching Kotlin native services (DownloadItemManager.kt,
 * InternalDownloadManager.kt) and frontend downloading page.
 */

export const MAX_DOWNLOAD_RETRIES = 5

/**
 * Calculates exponential backoff retry delay in milliseconds matching
 * DownloadItemManager.kt:
 *   val backoffMs = (1000L * (1 shl (part.retryCount - 1))).coerceAtMost(30000L)
 *
 * Retry schedule:
 *   1 -> 1,000 ms (1s)
 *   2 -> 2,000 ms (2s)
 *   3 -> 4,000 ms (4s)
 *   4 -> 8,000 ms (8s)
 *   5 -> 16,000 ms (16s)
 *   >5 -> null (terminal failure, no further retry)
 */
export function calculateRetryDelayMs(retryCount) {
  if (!retryCount || retryCount <= 0) return 0
  if (retryCount > MAX_DOWNLOAD_RETRIES) return null
  const factor = Math.pow(2, retryCount - 1)
  return Math.min(1000 * factor, 30000)
}

/**
 * Resolves a download URL, preserving external podcast CDN enclosure URLs
 * (http/https) without prepending the Audiobookshelf server address.
 * Matching DownloadItemPart.kt companion make().
 */
export function resolveDownloadUrl(serverBaseUrl, serverPath) {
  if (!serverPath) return ''
  if (serverPath.startsWith('http://') || serverPath.startsWith('https://')) {
    return serverPath
  }
  const base = (serverBaseUrl || '').replace(/\/+$/, '')
  const path = serverPath.startsWith('/') ? serverPath : `/${serverPath}`
  const rawCover = path.endsWith('/cover') ? '?raw=1' : ''
  return `${base}${path}${rawCover}`
}

/**
 * Determines whether to attach server Authorization: Bearer token to a download request.
 * Only attaches token to requests directed to the user's Audiobookshelf server.
 * Third-party podcast CDNs must NEVER receive the user's server bearer token.
 * Matching InternalDownloadManager.kt.
 */
export function shouldAttachBearerToken(requestUrl, serverAddress, configAddress = '', configLocalAddress = '') {
  if (!requestUrl) return false
  try {
    const reqHost = new URL(requestUrl).host.toLowerCase()
    const targets = [serverAddress, configAddress, configLocalAddress].filter(Boolean)
    return targets.some((addr) => {
      try {
        return new URL(addr).host.toLowerCase() === reqHost
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

/**
 * Checks if a download item is marked as failed or has failed parts.
 */
export function isItemFailed(item) {
  if (!item) return false
  if (item.hasFailed || item.terminalFailureAt) return true
  return Boolean(item.downloadItemParts?.some((p) => p.failed))
}

/**
 * Checks if a download item is actively downloading or moving.
 */
export function isItemActive(item) {
  if (!item || isItemFailed(item)) return false
  return Boolean(item.downloadItemParts?.some((p) => p.downloadId != null || p.isMoving))
}

/**
 * Counts the number of failed parts for a download item.
 */
export function getFailedPartsCount(item) {
  return item?.downloadItemParts?.filter((p) => p.failed).length || 0
}

/**
 * Aggregates download queue counts.
 */
export function getQueueCounts(items = []) {
  const total = items.length
  const failed = items.filter(isItemFailed).length
  const active = items.filter(isItemActive).length
  const queued = Math.max(0, total - failed - active)
  return { total, failed, active, queued }
}

export default {
  MAX_DOWNLOAD_RETRIES,
  calculateRetryDelayMs,
  resolveDownloadUrl,
  shouldAttachBearerToken,
  isItemFailed,
  isItemActive,
  getFailedPartsCount,
  getQueueCounts
}
