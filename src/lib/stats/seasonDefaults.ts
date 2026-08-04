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
 * Ensure the open/current season is in the picker list (newest first),
 * even when no fixtures, standings, or leaders exist yet.
 */
export function ensureCurrentSeasonOption(
  leagueId: LeagueId,
  options: LeagueSeasonOption[],
  date = new Date(),
): LeagueSeasonOption[] {
  const current = currentSeasonStartYear(leagueId, date)
  if (options.some((option) => option.year === current)) {
    return [...options].sort((a, b) => b.year - a.year)
  }
  return [makeCurrentSeasonOption(current), ...options].sort((a, b) => b.year - a.year)
}

/** Prefer the current season; fall back to newest listed option. */
export function pickDefaultSeasonYear(
  leagueId: LeagueId,
  options: LeagueSeasonOption[],
  date = new Date(),
): number | null {
  if (options.length === 0) return currentSeasonStartYear(leagueId, date)
  const current = currentSeasonStartYear(leagueId, date)
  return options.find((option) => option.year === current)?.year ?? options[0]?.year ?? current
}
