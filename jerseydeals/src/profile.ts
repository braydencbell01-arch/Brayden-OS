/**
 * Jersey Deals profile screen (hash #profile).
 * Mirrors favorites / offers subpage navigation.
 */

import { useEffect, useState } from 'react'
import { rememberLandingScroll, restoreLandingScroll } from './landingScroll'

export const PROFILE_HASH = '#profile'

export function goToProfileScreen() {
  rememberLandingScroll()
  window.location.hash = 'profile'
}

export function leaveProfileScreen() {
  const { pathname, search } = window.location
  window.history.pushState(null, '', `${pathname}${search}`)
  window.dispatchEvent(new Event('hashchange'))
  restoreLandingScroll()
}

export function useProfileScreenOpen() {
  const [open, setOpen] = useState(() => window.location.hash === PROFILE_HASH)

  useEffect(() => {
    const sync = () => {
      const next = window.location.hash === PROFILE_HASH
      setOpen((prev) => {
        if (prev && !next) restoreLandingScroll()
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

  return open
}
