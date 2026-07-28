import { useEffect, useState } from 'react'
import { rememberLandingScroll, restoreLandingScroll } from './landingScroll'

/** Full inventory page (hash route — safe with relative Vite base). */
export const INVENTORY_HASH = '#inventory'
export const INVENTORY_ROUTE_EVENT = 'jerseydeals:inventory-route'

export function isInventoryOpen() {
  return typeof window !== 'undefined' && window.location.hash === INVENTORY_HASH
}

/** Open the full inventory page. */
export function goToInventoryPage() {
  if (typeof window === 'undefined') return
  rememberLandingScroll()
  if (window.location.hash !== INVENTORY_HASH) {
    window.location.hash = 'inventory'
  } else {
    window.dispatchEvent(new Event(INVENTORY_ROUTE_EVENT))
  }
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function leaveInventoryPage() {
  if (typeof window === 'undefined') return
  const { pathname, search } = window.location
  window.history.pushState(null, '', `${pathname}${search}`)
  window.dispatchEvent(new Event('hashchange'))
  window.dispatchEvent(new Event(INVENTORY_ROUTE_EVENT))
  restoreLandingScroll()
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
        // Browser back / forward — restore landing spot when leaving inventory.
        if (prev && !next) restoreLandingScroll()
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
