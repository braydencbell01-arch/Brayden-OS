import { useEffect, useState } from 'react'
import {
  rememberLandingScroll,
  restoreLandingScroll,
  suppressLandingScrollRestore,
} from './landingScroll'
import { leaveToPreviousScreen, pushNavFrame } from './navStack'

/** Full inventory page (hash route — safe with relative Vite base). */
export const INVENTORY_HASH = '#inventory'
export const INVENTORY_ROUTE_EVENT = 'jerseydeals:inventory-route'

export function isInventoryOpen() {
  return typeof window !== 'undefined' && window.location.hash === INVENTORY_HASH
}

/** Open the full inventory page. */
export function goToInventoryPage() {
  if (typeof window === 'undefined') return
  if (window.location.hash === INVENTORY_HASH) {
    window.dispatchEvent(new Event(INVENTORY_ROUTE_EVENT))
    return
  }
  suppressLandingScrollRestore()
  rememberLandingScroll()
  pushNavFrame()
  window.location.hash = 'inventory'
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function leaveInventoryPage() {
  if (typeof window === 'undefined') return
  leaveToPreviousScreen()
}

export function inventoryHref() {
  return INVENTORY_HASH
}

export function useInventoryPageOpen() {
  const [open, setOpen] = useState(() => isInventoryOpen())

  useEffect(() => {
    const sync = () => {
      const next = isInventoryOpen()
      setOpen((prev) => {
        // Browser back to landing — restore landing spot.
        if (prev && !next && !window.location.hash) restoreLandingScroll()
        return next
      })
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener(INVENTORY_ROUTE_EVENT, sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener(INVENTORY_ROUTE_EVENT, sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  return open
}
