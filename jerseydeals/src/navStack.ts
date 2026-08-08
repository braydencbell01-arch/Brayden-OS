/**
 * Return-stack for Jersey Deals hash screens.
 * Back restores the previous screen + scroll instead of always jumping home.
 */

import { suppressLandingScrollRestore, restoreLandingScroll } from './landingScroll'

/** Keep in sync with inventoryRoute.INVENTORY_ROUTE_EVENT (avoid circular import). */
const INVENTORY_ROUTE_EVENT = 'jerseydeals:inventory-route'

export type NavFrame = {
  hash: string
  overlayScroll: number
  windowScroll: number
}

const stack: NavFrame[] = []

function activeOverlayScroller(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const nodes = document.querySelectorAll<HTMLElement>('.jd-overlay-scroll')
  // Topmost visible overlay scroller (last in DOM among displayed ones).
  for (let i = nodes.length - 1; i >= 0; i--) {
    const el = nodes[i]!
    if (el.offsetParent != null || el.getClientRects().length > 0) return el
  }
  return nodes[nodes.length - 1] ?? null
}

export function captureNavFrame(): NavFrame {
  if (typeof window === 'undefined') {
    return { hash: '', overlayScroll: 0, windowScroll: 0 }
  }
  return {
    hash: window.location.hash || '',
    overlayScroll: activeOverlayScroller()?.scrollTop ?? 0,
    windowScroll: window.scrollY || window.pageYOffset || 0,
  }
}

/** Call before navigating to a new hash screen so Back can return here. */
export function pushNavFrame(frame: NavFrame = captureNavFrame()) {
  stack.push(frame)
}

export function clearNavStack() {
  stack.length = 0
}

export function peekNavFrame(): NavFrame | null {
  return stack.length ? stack[stack.length - 1]! : null
}

function applyOverlayScroll(y: number) {
  const apply = () => {
    const el = activeOverlayScroller()
    if (el) el.scrollTop = y
  }
  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
  window.setTimeout(apply, 0)
  window.setTimeout(apply, 40)
  window.setTimeout(apply, 120)
}

function applyWindowScroll(y: number) {
  const top = Math.max(0, y)
  const apply = () => window.scrollTo({ top, left: 0, behavior: 'auto' })
  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
  window.setTimeout(apply, 0)
  window.setTimeout(apply, 40)
  window.setTimeout(apply, 120)
}

function setLocationHash(hash: string) {
  const { pathname, search } = window.location
  const next = hash ? `${pathname}${search}${hash}` : `${pathname}${search}`
  window.history.pushState(null, '', next)
  window.dispatchEvent(new Event('hashchange'))
  if (hash === '#inventory') {
    window.dispatchEvent(new Event(INVENTORY_ROUTE_EVENT))
  }
}

/**
 * Leave the current hash screen: restore the previous stack frame, or landing.
 */
export function leaveToPreviousScreen() {
  if (typeof window === 'undefined') return
  suppressLandingScrollRestore()
  const frame = stack.pop() ?? null

  if (!frame || !frame.hash) {
    setLocationHash('')
    if (frame) applyWindowScroll(frame.windowScroll)
    else restoreLandingScroll()
    return
  }

  setLocationHash(frame.hash)
  if (frame.hash.startsWith('#item/') || frame.hash === '#inventory' || frame.hash === '#favorites' || frame.hash === '#offers' || frame.hash === '#profile') {
    applyOverlayScroll(frame.overlayScroll)
  } else {
    applyWindowScroll(frame.windowScroll)
  }
}

/** Hard home — clear stack and land on the shop root. */
export function leaveToHome() {
  if (typeof window === 'undefined') return
  clearNavStack()
  suppressLandingScrollRestore()
  setLocationHash('')
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}
