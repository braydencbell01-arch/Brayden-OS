/**
 * Jersey Deals profile screen (hash #profile).
 * Mirrors favorites / offers subpage navigation.
 */

import { useEffect, useState } from 'react'
import {
  rememberLandingScroll,
  restoreLandingScroll,
  suppressLandingScrollRestore,
} from './landingScroll'
import { leaveToPreviousScreen, pushNavFrame } from './navStack'

export const PROFILE_HASH = '#profile'

export function goToProfileScreen() {
  if (typeof window === 'undefined') return
  if (window.location.hash === PROFILE_HASH) return
  suppressLandingScrollRestore()
  rememberLandingScroll()
  pushNavFrame()
  window.location.hash = 'profile'
}

export function leaveProfileScreen() {
  leaveToPreviousScreen()
}

export function useProfileScreenOpen() {
  const [open, setOpen] = useState(() => window.location.hash === PROFILE_HASH)

  useEffect(() => {
    const sync = () => {
      const next = window.location.hash === PROFILE_HASH
      setOpen((prev) => {
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

  return open
}
