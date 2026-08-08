/**
 * Remember where the shopper was on the landing page so Back from
 * inventory / favorites / offers can restore that spot instead of top.
 */

const SUBPAGE_HASHES = new Set(['#inventory', '#favorites', '#offers', '#profile'])

let savedScrollY = 0
let hasSaved = false
let restoreToken = 0
let suppressUntil = 0

function isSubpageHash(hash: string) {
  if (!hash) return false
  if (SUBPAGE_HASHES.has(hash)) return true
  return hash.startsWith('#item/')
}

function isLandingHash() {
  if (typeof window === 'undefined') return true
  const hash = window.location.hash
  return !isSubpageHash(hash)
}

/** Capture current window scroll while still on the landing page. */
export function rememberLandingScroll() {
  if (typeof window === 'undefined') return
  if (!isLandingHash()) return
  savedScrollY = window.scrollY || window.pageYOffset || 0
  hasSaved = true
}

/**
 * Skip the next restore window (e.g. nav is about to scroll to a section).
 * Also cancels any in-flight restore timers.
 */
export function suppressLandingScrollRestore(ms = 250) {
  restoreToken += 1
  suppressUntil = Date.now() + ms
}

/** Restore the remembered landing scroll after a subpage closes. */
export function restoreLandingScroll() {
  if (typeof window === 'undefined' || !hasSaved) return
  if (Date.now() < suppressUntil) return
  const y = Math.max(0, savedScrollY)
  const token = ++restoreToken
  const apply = () => {
    if (token !== restoreToken) return
    if (Date.now() < suppressUntil) return
    window.scrollTo({ top: y, left: 0, behavior: 'auto' })
  }
  apply()
  // Landing remounts when inventory closes — re-apply after layout.
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
  window.setTimeout(apply, 0)
  window.setTimeout(apply, 40)
  window.setTimeout(apply, 120)
}
