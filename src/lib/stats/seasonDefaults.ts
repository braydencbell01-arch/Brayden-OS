import {
  getLeague,
  inferInternationalSeasonStartYear,
  inferSoccerSeasonStartYear,
  soccerSeasonShortLabel,
  type LeagueId,
} from '../leagues'
import type { LeagueSeasonOption } from './types'

/** Current Aug–Jul start year for a competition (club or national). */
export function currentSeasonStartYear(leagueId: LeagueId, date = new Date()): number {
  const league = getLeague(leagueId)
  return league.kind === 'international'
    ? inferInternationalSeasonStartYear(date)
    : inferSoccerSeasonStartYear(date)
}

/** Synthetic option for a season ESPN/FotMob has not published yet. */
export function makeCurrentSeasonOption(year: number): LeagueSeasonOption {
  const shortLabel = soccerSeasonShortLabel(year)
  return {
    year,
    label: `${shortLabel} season`,
    shortLabel,
  }
}

/**
 * Keep the open/current season in the picker only when ESPN already lists it.
 * Do not invent empty future editions (e.g. Club World Cup 26/27).
 */
export function ensureCurrentSeasonOption(
  leagueId: LeagueId,
  options: LeagueSeasonOption[],
  date = new Date(),
): LeagueSeasonOption[] {
  const sorted = [...options].sort((a, b) => b.year - a.year)
  const current = currentSeasonStartYear(leagueId, date)
  if (sorted.some((option) => option.year === current)) return sorted
  // Domestic leagues often publish the new Aug–Jul year slightly late — keep a
  // synthetic current row so the table/stats pickers still open on this season.
  const league = getLeague(leagueId)
  if (league.format === 'league' && league.hasStandings) {
    return [makeCurrentSeasonOption(current), ...sorted]
  }
  return sorted
}

/**
 * Prefer the current Aug–Jul season when ESPN has it; otherwise the newest
 * real edition (last played / in progress) — never a blank future year.
 */
export function pickDefaultSeasonYear(
  leagueId: LeagueId,
  options: LeagueSeasonOption[],
  date = new Date(),
): number | null {
  if (options.length === 0) return currentSeasonStartYear(leagueId, date)
  const sorted = [...options].sort((a, b) => b.year - a.year)
  const current = currentSeasonStartYear(leagueId, date)
  return sorted.find((option) => option.year === current)?.year ?? sorted[0]?.year ?? current
}

/**
 * Tournament / cup edition is between cycles when the selected ESPN season is
 * not the open Aug–Jul year (e.g. Club World Cup on 2025 while calendar is 26/27).
 */
export function isBetweenCompetitionEditions(
  leagueId: LeagueId,
  selectedSeason: number | null,
  date = new Date(),
): boolean {
  if (selectedSeason == null) return false
  const league = getLeague(leagueId)
  if (league.format !== 'tournament' && league.format !== 'cup') return false
  return selectedSeason !== currentSeasonStartYear(leagueId, date)
}
