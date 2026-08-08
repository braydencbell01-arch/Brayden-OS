/**
 * Jersey Deals Rewards Club membership (browser-local).
 * Once someone joins, the form stays locked on this device.
 */

import { useEffect, useState } from 'react'
import {
  rememberLandingScroll,
  restoreLandingScroll,
  suppressLandingScrollRestore,
} from './landingScroll'
import { leaveToPreviousScreen, pushNavFrame } from './navStack'

const REWARDS_KEY = 'jerseydeals.rewardsMember.v1'
/** Older email-capture list — treat prior rewards_club signups as members. */
const LEGACY_SIGNUPS_KEY = 'jd_email_signups_v1'
export const REWARDS_MEMBER_EVENT = 'jerseydeals:rewards-member'
export const OFFERS_HASH = '#offers'

export type RewardsMember = {
  email?: string
  phone?: string
  at: string
}

function canStore() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function notifyRewardsChange() {
  try {
    window.dispatchEvent(new Event(REWARDS_MEMBER_EVENT))
  } catch {
    /* ignore */
  }
}

function fromLegacySignups(): RewardsMember | null {
  if (!canStore()) return null
  try {
    const raw = localStorage.getItem(LEGACY_SIGNUPS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Array<{
      email?: string
      source?: string
      at?: string
      phone?: string
    }>
    if (!Array.isArray(parsed)) return null
    const hit = parsed.find((row) => row?.source === 'rewards_club')
    if (!hit?.email && !hit?.phone) return null
    return {
      email: hit.email || undefined,
      phone: hit.phone || undefined,
      at: hit.at || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function readRewardsMember(): RewardsMember | null {
  if (!canStore()) return null
  try {
    const raw = localStorage.getItem(REWARDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as RewardsMember
      if (parsed && (parsed.email || parsed.phone)) return parsed
    }
  } catch {
    /* fall through */
  }
  const legacy = fromLegacySignups()
  if (legacy) {
    writeRewardsMember(legacy)
    return legacy
  }
  return null
}

export function isRewardsMember() {
  return Boolean(readRewardsMember())
}

export function writeRewardsMember(member: { email?: string; phone?: string }) {
  if (!canStore()) return
  const email = member.email?.trim().toLowerCase() || undefined
  const phone = member.phone?.trim() || undefined
  if (!email && !phone) return
  const payload: RewardsMember = {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    at: new Date().toISOString(),
  }
  try {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
  notifyRewardsChange()
}

/** Live membership for any Rewards signup UI on this device. */
export function useRewardsMember() {
  const [member, setMember] = useState<RewardsMember | null>(() => readRewardsMember())

  useEffect(() => {
    const sync = () => setMember(readRewardsMember())
    window.addEventListener(REWARDS_MEMBER_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(REWARDS_MEMBER_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return member
}

export function goToRewardsOffers() {
  if (typeof window === 'undefined') return
  if (window.location.hash === OFFERS_HASH) return
  suppressLandingScrollRestore()
  rememberLandingScroll()
  pushNavFrame()
  window.location.hash = 'offers'
}

export function leaveRewardsOffers() {
  leaveToPreviousScreen()
}

export function useRewardsOffersOpen() {
  const [open, setOpen] = useState(() => window.location.hash === OFFERS_HASH)

  useEffect(() => {
    const sync = () => {
      const next = window.location.hash === OFFERS_HASH
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
