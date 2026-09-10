/**
 * Semantic version parsing and comparison utilities for CharcuterieShelf.
 */

export function parseSemver(ver) {
  if (!ver) return { major: 0, minor: 0, patch: 0, pre: null, preNum: 0, raw: '' }
  const clean = String(ver).replace(/^v/, '').trim()
  const [main, pre] = clean.split('-')
  const [major, minor, patch] = (main || '').split('.').map((n) => parseInt(n, 10) || 0)
  let preNum = 0
  if (pre) {
    const match = pre.match(/\d+/)
    preNum = match ? parseInt(match[0], 10) : 0
  }
  return { major, minor, patch, pre: pre || null, preNum, raw: clean }
}

export function isNewerVersion(currentVer, latestVer) {
  const c = parseSemver(currentVer)
  const l = parseSemver(latestVer)

  if (l.major !== c.major) return l.major > c.major
  if (l.minor !== c.minor) return l.minor > c.minor
  if (l.patch !== c.patch) return l.patch > c.patch

  // Both have same major.minor.patch
  // Non-prerelease (e.g. 0.14.2) is newer than prerelease (e.g. 0.14.2-beta)
  if (c.pre && !l.pre) return true
  if (!c.pre && l.pre) return false

  // Both are prereleases
  if (c.pre && l.pre) {
    if (l.preNum !== c.preNum) return l.preNum > c.preNum
    return l.raw > c.raw
  }

  return false
}

export default {
  parseSemver,
  isNewerVersion
}
