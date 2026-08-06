import { JURISDICTIONS, getJurisdiction, type Region } from './jurisdictions'
import { loadDailyHunt } from './dailyHunt'
import { loadWantedHitCount } from './wanted'

export type AchievementId =
  | 'first-spot'
  | 'five-plates'
  | 'ten-plates'
  | 'twenty-five'
  | 'half-states'
  | 'all-states'
  | 'rare-find'
  | 'very-rare'
  | 'streak-3'
  | 'streak-7'
  | 'quiz-5'
  | 'canada-spot'
  | 'multi-region'
  | 'wanted-hunter'

export type Achievement = {
  id: AchievementId
  title: string
  detail: string
  unlocked: boolean
}

const US_CODES = JURISDICTIONS.filter((j) => j.region === 'us-state').map((j) => j.code)

const QUIZ_BEST_KEY = 'platequest.quizBestStreak'

export function loadQuizBestStreak(): number {
  try {
    const n = Number(localStorage.getItem(QUIZ_BEST_KEY))
    return Number.isFinite(n) ? Math.max(0, n) : 0
  } catch {
    return 0
  }
}

export function saveQuizBestStreak(n: number) {
  try {
    const prev = loadQuizBestStreak()
    if (n > prev) localStorage.setItem(QUIZ_BEST_KEY, String(n))
  } catch {
    /* ignore */
  }
}

export function collectionStats(foundCodes: string[]) {
  const found = new Set(foundCodes.map((c) => c.toUpperCase()))
  const usFound = US_CODES.filter((c) => found.has(c)).length
  const byRegion: Record<Region, number> = {
    'us-state': 0,
    canada: 0,
    mexico: 0,
    territory: 0,
    native: 0,
    military: 0,
    federal: 0,
  }
  for (const code of found) {
    const j = getJurisdiction(code)
    if (j) byRegion[j.region] += 1
  }
  const regionsHit = (Object.keys(byRegion) as Region[]).filter((r) => byRegion[r] > 0).length
  return {
    total: found.size,
    usFound,
    usTotal: US_CODES.length,
    byRegion,
    regionsHit,
    hasRare: [...found].some((c) => {
      const r = getJurisdiction(c)?.rarity
      return r === 'rare' || r === 'very-rare'
    }),
    hasVeryRare: [...found].some((c) => getJurisdiction(c)?.rarity === 'very-rare'),
  }
}

export function listAchievements(foundCodes: string[]): Achievement[] {
  const stats = collectionStats(foundCodes)
  const hunt = loadDailyHunt()
  const quizBest = loadQuizBestStreak()

  const defs: Omit<Achievement, 'unlocked'>[] = [
    { id: 'first-spot', title: 'First spot', detail: 'Log your first plate' },
    { id: 'five-plates', title: 'Warming up', detail: 'Find 5 different plates' },
    { id: 'ten-plates', title: 'Road regular', detail: 'Find 10 different plates' },
    { id: 'twenty-five', title: 'Serious spotter', detail: 'Find 25 different plates' },
    {
      id: 'half-states',
      title: 'Halfway there',
      detail: `Spot ${Math.ceil(US_CODES.length / 2)} US states`,
    },
    { id: 'all-states', title: 'Fifty + DC', detail: 'Complete every US state plate' },
    { id: 'rare-find', title: 'Rare catch', detail: 'Spot a rare or very-rare plate' },
    { id: 'very-rare', title: 'Unicorn', detail: 'Spot a very-rare plate' },
    { id: 'streak-3', title: 'Three-day streak', detail: 'Complete 3 daily hunts in a row' },
    { id: 'streak-7', title: 'Week on the road', detail: 'Complete 7 daily hunts in a row' },
    { id: 'quiz-5', title: 'Sharp eyes', detail: 'Get a 5+ streak in Plate ID quiz' },
    { id: 'canada-spot', title: 'North of the border', detail: 'Log a Canadian plate' },
    { id: 'multi-region', title: 'Wide travels', detail: 'Log plates from 3+ regions' },
    {
      id: 'wanted-hunter',
      title: 'Hit list',
      detail: 'Spot 3 plates you marked as wanted',
    },
  ]

  const unlocked: Record<AchievementId, boolean> = {
    'first-spot': stats.total >= 1,
    'five-plates': stats.total >= 5,
    'ten-plates': stats.total >= 10,
    'twenty-five': stats.total >= 25,
    'half-states': stats.usFound >= Math.ceil(US_CODES.length / 2),
    'all-states': stats.usFound >= US_CODES.length,
    'rare-find': stats.hasRare,
    'very-rare': stats.hasVeryRare,
    'streak-3': hunt.streak >= 3 || (hunt.completed && hunt.streak >= 3),
    'streak-7': hunt.streak >= 7,
    'quiz-5': quizBest >= 5,
    'canada-spot': stats.byRegion.canada >= 1,
    'multi-region': stats.regionsHit >= 3,
    'wanted-hunter': loadWantedHitCount() >= 3,
  }

  return defs.map((d) => ({ ...d, unlocked: unlocked[d.id] }))
}
