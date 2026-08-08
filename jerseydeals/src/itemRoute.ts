/**
 * Jersey Deals item profile page (hash #item/<listingId>).
 */

import { useEffect, useState } from 'react'
import {
  rememberLandingScroll,
  restoreLandingScroll,
  suppressLandingScrollRestore,
} from './landingScroll'
import { leaveToPreviousScreen, pushNavFrame } from './navStack'

export const ITEM_HASH_PREFIX = '#item/'

export function itemHash(id: string) {
  return `item/${encodeURIComponent(id)}`
}

export function parseItemIdFromHash(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  if (!hash.startsWith(ITEM_HASH_PREFIX)) return null
  const raw = hash.slice(ITEM_HASH_PREFIX.length)
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function goToItemPage(id: string) {
  if (typeof window === 'undefined') return
  const next = itemHash(id)
  if (window.location.hash === `#${next}`) {
    window.dispatchEvent(new Event('hashchange'))
    return
  }
  suppressLandingScrollRestore()
  rememberLandingScroll()
  pushNavFrame()
  window.location.hash = next
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function leaveItemPage() {
  if (typeof window === 'undefined') return
  leaveToPreviousScreen()
}

export function useItemPageId() {
  const [id, setId] = useState(() => parseItemIdFromHash())

  useEffect(() => {
    const sync = () => {
      const next = parseItemIdFromHash()
      setId((prev) => {
        // Browser back to landing only — subpage returns handle their own scroll.
        if (prev && !next && !window.location.hash) restoreLandingScroll()
        return next
      })
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  return id
}
