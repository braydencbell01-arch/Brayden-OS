/**
 * Favorite clubs (teams) for the Jersey Deals landing page.
 * Persisted locally; not wiped by landing generation resets.
 */

import { useEffect, useState } from 'react'
import {
  rememberLandingScroll,
  restoreLandingScroll,
  suppressLandingScrollRestore,
} from './landingScroll'

const STORAGE_KEY = 'jerseydeals.favoriteClubs.v1'
export const FAVORITES_EVENT = 'jerseydeals:favorites'
/** Full-screen favorites page (mirrors #offers). */
export const FAVORITES_HASH = '#favorites'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of ids) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function readFavoriteClubIds(): string[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalizeIds(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function writeFavoriteClubIds(ids: string[]) {
  if (!canUseStorage()) return
  const next = normalizeIds(ids)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: next }))
}

export function isFavoriteClub(clubId: string, ids?: string[]) {
  const list = ids ?? readFavoriteClubIds()
  return list.includes(clubId)
}

export function toggleFavoriteClub(clubId: string): string[] {
  const id = clubId.trim()
  if (!id) return readFavoriteClubIds()
  const current = readFavoriteClubIds()
  const next = current.includes(id) ? current.filter((row) => row !== id) : [...current, id]
  writeFavoriteClubIds(next)
  return next
}

export function clearFavoriteClubs(): string[] {
  writeFavoriteClubIds([])
  return []
}

/** Live favorite club ids — syncs across tabs/components via storage + custom event. */
export function useFavoriteClubIds(): string[] {
  const [ids, setIds] = useState<string[]>(() => readFavoriteClubIds())

  useEffect(() => {
    const sync = () => setIds(readFavoriteClubIds())
    window.addEventListener(FAVORITES_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return ids
}

export function favoriteClubIdSet(ids: string[]): Set<string> {
  return new Set(ids)
}

export function goToFavoritesScreen() {
  // Switching between subpages should not jump the landing scroll under the overlay.
  suppressLandingScrollRestore()
  rememberLandingScroll()
  window.location.hash = 'favorites'
}

export function leaveFavoritesScreen() {
  const { pathname, search } = window.location
  window.history.pushState(null, '', `${pathname}${search}`)
  window.dispatchEvent(new Event('hashchange'))
  restoreLandingScroll()
}

export function useFavoritesScreenOpen() {
  const [open, setOpen] = useState(() => window.location.hash === FAVORITES_HASH)

  useEffect(() => {
    const sync = () => {
      const next = window.location.hash === FAVORITES_HASH
      setOpen((prev) => {
        // Browser back / forward — restore landing spot when leaving.
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
