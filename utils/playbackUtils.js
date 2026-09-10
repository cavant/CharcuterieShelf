/**
 * Playback and duration utility functions for CharcuterieShelf.
 */

export function parseDuration(val) {
  if (!val) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val)
  const str = String(val).trim()
  if (!str) return 0
  if (!isNaN(str)) return Math.max(0, Number(str))
  const parts = str.split(':').map((p) => Number(p))
  if (parts.some((p) => isNaN(p))) return 0
  if (parts.length === 3) {
    return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2])
  } else if (parts.length === 2) {
    return Math.max(0, parts[0] * 60 + parts[1])
  }
  return 0
}

export function secondsToTimestamp(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00'
  const totalSeconds = Math.floor(seconds)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default {
  parseDuration,
  secondsToTimestamp
}
