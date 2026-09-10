/**
 * Semantic version parsing and comparison utilities for CharcuterieShelf.
 */

const STAGE_RANKS = {
  dev: 1,
  alpha: 2,
  a: 2,
  beta: 3,
  b: 3,
  preview: 4,
  rc: 5
}

export function parseSemver(ver) {
  if (!ver) return { major: 0, minor: 0, patch: 0, pre: null, preTag: '', preNum: 0, raw: '' }
  const clean = String(ver).replace(/^v/, '').split('+')[0].trim()
  const dashIdx = clean.indexOf('-')
  const main = dashIdx === -1 ? clean : clean.slice(0, dashIdx)
  const pre = dashIdx === -1 ? null : clean.slice(dashIdx + 1)
  const [major, minor, patch] = (main || '').split('.').map((n) => parseInt(n, 10) || 0)
  let preNum = 0
  let preTag = ''
  if (pre) {
    const match = pre.match(/\d+/)
    preNum = match ? parseInt(match[0], 10) : 0
    preTag = pre.replace(/\d+.*$/, '').replace(/[\.-]+$/, '').toLowerCase()
  }
  return { major, minor, patch, pre: pre || null, preTag, preNum, raw: clean }
}

export function isNewerVersion(currentVer, latestVer) {
  const c = parseSemver(currentVer)
  const l = parseSemver(latestVer)

  if (l.major !== c.major) return l.major > c.major
  if (l.minor !== c.minor) return l.minor > c.minor
  if (l.patch !== c.patch) return l.patch > c.patch

  // Both have same major.minor.patch
  // Non-prerelease (e.g. 0.14.7) is newer than prerelease (e.g. 0.14.7-beta)
  if (c.pre && !l.pre) return true
  if (!c.pre && l.pre) return false

  // Both are prereleases
  if (c.pre && l.pre) {
    const rankC = STAGE_RANKS[c.preTag] || 0
    const rankL = STAGE_RANKS[l.preTag] || 0

    if (rankC > 0 && rankL > 0) {
      if (rankL !== rankC) return rankL > rankC
    } else if (c.preTag !== l.preTag) {
      const cmp = l.preTag.localeCompare(c.preTag)
      if (cmp !== 0) return cmp > 0
    }

    // Same stage/prefix, compare numeric suffix
    if (l.preNum !== c.preNum) return l.preNum > c.preNum

    // If still equal or no numbers, compare pre strings
    return l.pre.localeCompare(c.pre) > 0
  }

  return false
}

export default {
  parseSemver,
  isNewerVersion
}
