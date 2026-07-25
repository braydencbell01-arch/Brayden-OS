/**
 * Lightweight app preferences + first-run onboarding (localStorage).
 */

const STORAGE_KEY = 'brayden-stats-settings-v1'

export type AppSettings = {
  onboardingDone: boolean
  preferredLeagueId: string | null
  preferredTeamId: string | null
  preferredTeamName: string | null
  density: 'comfortable' | 'compact'
  showPredictions: boolean
  notificationsEnabled: boolean
}

const DEFAULTS: AppSettings = {
  onboardingDone: false,
  preferredLeagueId: null,
  preferredTeamId: null,
  preferredTeamName: null,
  density: 'comfortable',
  showPredictions: true,
  notificationsEnabled: false,
}

function read(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

function write(next: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota — keep in-memory defaults only */
  }
}

export function loadSettings(): AppSettings {
  return read()
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...read(), ...patch }
  write(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('braystats:settings', { detail: next }))
  }
  return next
}

export function clearSettings() {
  localStorage.removeItem(STORAGE_KEY)
}
