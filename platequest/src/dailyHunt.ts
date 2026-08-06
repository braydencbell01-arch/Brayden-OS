import { JURISDICTIONS, getJurisdiction, type Jurisdiction } from './jurisdictions'
import { getMainPlate } from './plateDesigns'

const HUNT_KEY = 'platequest.dailyHunt'

export type DailyHuntState = {
  /** Local calendar date YYYY-MM-DD */
  date: string
  code: string
  completed: boolean
  streak: number
  /** Last date a hunt was completed (for streak continuity). */
  lastCompletedDate: string | null
}

function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hashDay(date: string): number {
  let h = 2166136261
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** US states + DC that have a catalog photo — good hunt targets. */
function huntPool(): Jurisdiction[] {
  return JURISDICTIONS.filter(
    (j) => (j.region === 'us-state' || j.code === 'DC') && Boolean(getMainPlate(j.code)),
  )
}

export function pickDailyCode(date: string): string {
  const pool = huntPool()
  if (!pool.length) return 'CA'
  return pool[hashDay(date) % pool.length]!.code
}

function yesterdayKey(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  dt.setDate(dt.getDate() - 1)
  return todayKey(dt)
}

export function loadDailyHunt(): DailyHuntState {
  const date = todayKey()
  const code = pickDailyCode(date)
  try {
    const raw = localStorage.getItem(HUNT_KEY)
    if (!raw) {
      return { date, code, completed: false, streak: 0, lastCompletedDate: null }
    }
    const prev = JSON.parse(raw) as DailyHuntState
    if (prev.date === date && prev.code === code) {
      return {
        date,
        code,
        completed: Boolean(prev.completed),
        streak: Number.isFinite(prev.streak) ? prev.streak : 0,
        lastCompletedDate: prev.lastCompletedDate ?? null,
      }
    }
    // New day — keep streak if yesterday was completed, else reset display streak to 0
    // (streak value preserved until broken: if lastCompleted was yesterday, keep streak)
    let streak = Number.isFinite(prev.streak) ? prev.streak : 0
    if (prev.lastCompletedDate !== yesterdayKey(date) && prev.lastCompletedDate !== date) {
      streak = 0
    }
    return {
      date,
      code,
      completed: false,
      streak,
      lastCompletedDate: prev.lastCompletedDate ?? null,
    }
  } catch {
    return { date, code, completed: false, streak: 0, lastCompletedDate: null }
  }
}

export function saveDailyHunt(state: DailyHuntState) {
  try {
    localStorage.setItem(HUNT_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/** Mark today's hunt done if code matches. Returns updated state + whether newly completed. */
export function tryCompleteDailyHunt(spottedCode: string): {
  state: DailyHuntState
  newlyCompleted: boolean
  bonusPoints: number
} {
  const state = loadDailyHunt()
  const code = spottedCode.trim().toUpperCase()
  if (state.completed || code !== state.code) {
    return { state, newlyCompleted: false, bonusPoints: 0 }
  }
  const continuing = state.lastCompletedDate === yesterdayKey(state.date)
  const next: DailyHuntState = {
    ...state,
    completed: true,
    streak: continuing ? state.streak + 1 : 1,
    lastCompletedDate: state.date,
  }
  saveDailyHunt(next)
  const j = getJurisdiction(code)
  const bonus =
    j?.rarity === 'very-rare' ? 40 : j?.rarity === 'rare' ? 30 : j?.rarity === 'uncommon' ? 20 : 15
  return { state: next, newlyCompleted: true, bonusPoints: bonus }
}

export function dailyHuntJurisdiction(state: DailyHuntState): Jurisdiction | undefined {
  return getJurisdiction(state.code)
}
