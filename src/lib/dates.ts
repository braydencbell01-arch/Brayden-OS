/** Default forward horizon (+ upcoming league fixtures). */
export const CALENDAR_RADIUS_DAYS = 100

/** Days loaded behind today on first sync / calendar start. */
export const CALENDAR_INITIAL_PAST_DAYS = 100

/** Days shown ahead of today on the home calendar. */
export const CALENDAR_FORWARD_DAYS = 100

/** How many extra past days to append when scrolling near the start. */
export const CALENDAR_PAST_CHUNK_DAYS = 60

/** ESPN scoreboard fetch slice size for historical windows. */
export const MATCH_FETCH_CHUNK_DAYS = 45

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Local calendar key YYYY-MM-DD */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dateKeyFromIso(iso: string): string {
  return toDateKey(new Date(iso))
}

export function formatEspnDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function buildCalendarDays(center: Date, radius = CALENDAR_RADIUS_DAYS): Date[] {
  const start = addDays(startOfDay(center), -radius)
  const total = radius * 2 + 1
  return Array.from({ length: total }, (_, i) => addDays(start, i))
}

/** Inclusive local-day range for the home calendar strip. */
export function buildCalendarRange(from: Date, to: Date): Date[] {
  const start = startOfDay(from)
  const end = startOfDay(to)
  if (end < start) return []

  const days: Date[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor)
  }
  return days
}

export function formatKickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMatchDayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
