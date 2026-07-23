import type { LeagueId } from '../leagues'
import type { LeagueSeasonOption } from './types'

/** FotMob tournament ids for leagues where advanced stats (xG) are published. */
const FOTMOB_LEAGUE_IDS: Partial<Record<LeagueId, number>> = {
  'premier-league': 47,
  'la-liga': 87,
  'serie-a': 55,
  bundesliga: 54,
  'ligue-1': 53,
  eredivisie: 57,
  'primeira-liga': 61,
  mls: 130,
  'liga-mx': 230,
  'belgian-pro-league': 40,
  'turkish-super-lig': 71,
  'scottish-premiership': 64,
  'austrian-bundesliga': 38,
  'liga-profesional': 112,
}

export function fotmobLeagueId(leagueId: LeagueId): number | null {
  return FOTMOB_LEAGUE_IDS[leagueId] ?? null
}

export function hasFotmobAdvancedStats(leagueId: LeagueId): boolean {
  return fotmobLeagueId(leagueId) != null
}

type FotmobSeasonLink = {
  Name?: string
  RelativePath?: string
  TournamentId?: number
}

type FotmobLeaguePayload = {
  details?: { selectedSeason?: string; latestSeason?: string; name?: string }
  stats?: { seasonStatLinks?: FotmobSeasonLink[] }
}

type FotmobStatRow = {
  ParticipantName?: string
  ParticiantId?: number
  TeamId?: number
  TeamName?: string
  StatValue?: number
  SubStatValue?: number
  MinutesPlayed?: number
  MatchesPlayed?: number
  Rank?: number
}

type FotmobTopList = {
  StatName?: string
  Title?: string
  Subtitle?: string
  StatList?: FotmobStatRow[]
}

type FotmobTopStats = {
  TopLists?: FotmobTopList[]
  LeagueName?: string
}

export type ExpectedGoalsLeader = {
  rank: number
  fotmobPlayerId: string
  name: string
  teamName?: string
  fotmobTeamId?: string
  xg: number
  goals: number | null
  /** goals − xG (positive = overperforming). */
  overperformance: number | null
  minutes?: number
  matches?: number
}

export type ExpectedAssistsLeader = {
  rank: number
  fotmobPlayerId: string
  name: string
  teamName?: string
  fotmobTeamId?: string
  xa: number
  assists: number | null
  overperformance: number | null
}

export type TeamExpectedGoalsRow = {
  rank: number
  fotmobTeamId: string
  name: string
  xg: number
  goals: number | null
  overperformance: number | null
}

export type LeagueExpectedGoals = {
  leagueId: LeagueId
  seasonLabel: string
  fotmobSeasonId: number
  playersXg: ExpectedGoalsLeader[]
  playersXa: ExpectedAssistsLeader[]
  teamsXg: TeamExpectedGoalsRow[]
  fetchedAt: number
  source: 'fotmob'
}

export type PlayerAdvancedExtras = {
  fotmobPlayerId: string
  seasonLabel?: string
  xg: number | null
  xgot: number | null
  xa: number | null
  goals: number | null
  assists: number | null
  /** goals − xG */
  goalsMinusXg: number | null
  marketValue: string | null
  marketValueRaw: number | null
  injury: string | null
  fetchedAt: number
  source: 'fotmob'
}

const UA = 'Mozilla/5.0 (compatible; BrayStats/1.0)'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function formatEuro(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `€${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}m`
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}k`
  }
  return `€${Math.round(value)}`
}

async function loadTopLists(
  leagueId: LeagueId,
  preferredSeasonYear?: number,
): Promise<{ lists: FotmobTopList[]; seasonLabel: string; seasonId: number } | null> {
  const fotId = fotmobLeagueId(leagueId)
  if (fotId == null) return null

  const league = await fetchJson<FotmobLeaguePayload>(
    `https://www.fotmob.com/api/data/leagues?id=${fotId}`,
  )
  if (!league) return null

  const links = league.stats?.seasonStatLinks ?? []

  if (preferredSeasonYear != null) {
    const matching = links.filter(
      (l) => l.RelativePath && fotmobSeasonYear(l.Name) === preferredSeasonYear,
    )
    for (const link of matching) {
      const path = link.RelativePath!
      const url = path.startsWith('http') ? path : `https://data.fotmob.com/${path.replace(/^\//, '')}`
      const top = await fetchJson<FotmobTopStats>(url)
      const lists = top?.TopLists ?? []
      const xgList = lists.find((item) => item.StatName === 'expected_goals')
      if (xgList?.StatList && xgList.StatList.length > 0) {
        return {
          lists,
          seasonLabel: link.Name || league.details?.selectedSeason || 'Season',
          seasonId: link.TournamentId || 0,
        }
      }
    }
    return null
  }

  const ordered = [
    ...links.filter((l) => l.Name === league.details?.selectedSeason),
    ...links.filter((l) => l.Name === league.details?.latestSeason),
    ...links,
  ].filter((l, i, arr) => l.RelativePath && arr.findIndex((x) => x.RelativePath === l.RelativePath) === i)

  for (const link of ordered.slice(0, 6)) {
    const path = link.RelativePath!
    const url = path.startsWith('http') ? path : `https://data.fotmob.com/${path.replace(/^\//, '')}`
    const top = await fetchJson<FotmobTopStats>(url)
    const lists = top?.TopLists ?? []
    const xgList = lists.find((item) => item.StatName === 'expected_goals')
    if (xgList?.StatList && xgList.StatList.length > 0) {
      return {
        lists,
        seasonLabel: link.Name || league.details?.selectedSeason || 'Season',
        seasonId: link.TournamentId || 0,
      }
    }
  }
  return null
}

function fotmobSeasonYear(name: string | undefined): number | null {
  if (!name) return null
  const match = name.match(/^(\d{4})/)
  if (!match?.[1]) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

function fotmobSeasonShortLabel(name: string): string {
  const cross = name.match(/^(\d{4})\s*[/-]\s*(\d{2,4})$/)
  if (cross) {
    const end = cross[2]!.length === 4 ? cross[2]!.slice(2) : cross[2]!
    return `${cross[1]!.slice(2)}/${end}`
  }
  return name
}

const fotmobSeasonOptionsCache = new Map<string, LeagueSeasonOption[]>()

/** FotMob season links that actually publish an xG board (newest first). */
export async function fetchFotmobSeasonOptions(
  leagueId: LeagueId,
): Promise<LeagueSeasonOption[]> {
  const cached = fotmobSeasonOptionsCache.get(leagueId)
  if (cached) return cached

  const fotId = fotmobLeagueId(leagueId)
  if (fotId == null) return []
  const league = await fetchJson<FotmobLeaguePayload>(
    `https://www.fotmob.com/api/data/leagues?id=${fotId}`,
  )
  if (!league) return []

  const links = (league.stats?.seasonStatLinks ?? []).filter(
    (link) => link.Name && link.RelativePath,
  )
  const withXg: LeagueSeasonOption[] = []
  const concurrency = 4
  for (let i = 0; i < links.length; i += concurrency) {
    const chunk = links.slice(i, i + concurrency)
    const checks = await Promise.all(
      chunk.map(async (link) => {
        const year = fotmobSeasonYear(link.Name)
        if (year == null) return null
        const path = link.RelativePath!
        const url = path.startsWith('http')
          ? path
          : `https://data.fotmob.com/${path.replace(/^\//, '')}`
        const top = await fetchJson<FotmobTopStats>(url)
        const hasXg = Boolean(
          top?.TopLists?.some(
            (item) => item.StatName === 'expected_goals' && (item.StatList?.length ?? 0) > 0,
          ),
        )
        if (!hasXg) return null
        return {
          year,
          label: link.Name!,
          shortLabel: fotmobSeasonShortLabel(link.Name!),
        } satisfies LeagueSeasonOption
      }),
    )
    for (const option of checks) {
      if (option && !withXg.some((row) => row.year === option.year)) {
        withXg.push(option)
      }
    }
  }
  fotmobSeasonOptionsCache.set(leagueId, withXg)
  return withXg
}

function mapPlayerXg(row: FotmobStatRow, rank: number): ExpectedGoalsLeader {
  const xg = typeof row.StatValue === 'number' ? row.StatValue : 0
  const goals = typeof row.SubStatValue === 'number' ? row.SubStatValue : null
  return {
    rank: row.Rank || rank,
    fotmobPlayerId: String(row.ParticiantId ?? ''),
    name: row.ParticipantName || '',
    teamName: row.TeamName,
    fotmobTeamId: row.TeamId != null ? String(row.TeamId) : undefined,
    xg,
    goals,
    overperformance: goals != null ? Number((goals - xg).toFixed(2)) : null,
    minutes: row.MinutesPlayed,
    matches: row.MatchesPlayed,
  }
}

function mapPlayerXa(row: FotmobStatRow, rank: number): ExpectedAssistsLeader {
  const xa = typeof row.StatValue === 'number' ? row.StatValue : 0
  const assists = typeof row.SubStatValue === 'number' ? row.SubStatValue : null
  return {
    rank: row.Rank || rank,
    fotmobPlayerId: String(row.ParticiantId ?? ''),
    name: row.ParticipantName || '',
    teamName: row.TeamName,
    fotmobTeamId: row.TeamId != null ? String(row.TeamId) : undefined,
    xa,
    assists,
    overperformance: assists != null ? Number((assists - xa).toFixed(2)) : null,
  }
}

function mapTeamXg(row: FotmobStatRow, rank: number): TeamExpectedGoalsRow {
  const xg = typeof row.StatValue === 'number' ? row.StatValue : 0
  const goals = typeof row.SubStatValue === 'number' ? row.SubStatValue : null
  return {
    rank: row.Rank || rank,
    fotmobTeamId: String(row.ParticiantId ?? row.TeamId ?? ''),
    name: row.ParticipantName || row.TeamName || '',
    xg,
    goals,
    overperformance: goals != null ? Number((goals - xg).toFixed(2)) : null,
  }
}

/** League xG / xA boards + team xG from FotMob (Big 5 and other covered comps). */
export async function fetchLeagueExpectedGoals(
  leagueId: LeagueId,
  limit = 10,
  seasonYear?: number,
): Promise<LeagueExpectedGoals> {
  const loaded = await loadTopLists(leagueId, seasonYear)
  if (!loaded) {
    throw new Error(
      seasonYear != null
        ? 'Expected goals are not available for that season yet'
        : 'Expected goals are not available for this competition yet',
    )
  }

  const { lists, seasonLabel, seasonId } = loaded
  const cap = Math.max(1, Math.min(limit, 20))

  const xgBoard = lists.find((item) => item.StatName === 'expected_goals')
  const xaBoard = lists.find((item) => item.StatName === 'expected_assists')
  const teamBoard = lists.find((item) => item.StatName === 'expected_goals_team')

  return {
    leagueId,
    seasonLabel,
    fotmobSeasonId: seasonId,
    playersXg: (xgBoard?.StatList ?? []).slice(0, cap).map(mapPlayerXg),
    playersXa: (xaBoard?.StatList ?? []).slice(0, cap).map(mapPlayerXa),
    teamsXg: (teamBoard?.StatList ?? []).slice(0, cap).map(mapTeamXg),
    fetchedAt: Date.now(),
    source: 'fotmob',
  }
}

type FotmobSuggest = {
  squadMemberSuggest?: Array<{
    options?: Array<{
      text?: string
      payload?: { type?: string; id?: string | number; name?: string }
    }>
  }>
}

type FotmobPlayerPayload = {
  id?: number
  name?: string
  injuryInformation?: { name?: string; description?: string; expectedReturn?: string } | null
  marketValues?: {
    values?: Array<{ value?: number; currency?: string }>
  }
  firstSeasonStats?: {
    statsSection?: {
      items?: Array<{
        items?: Array<{
          localizedTitleId?: string
          title?: string
          statValue?: string
        }>
      }>
    }
  }
  mainLeague?: { season?: string; leagueName?: string }
}

function readStatValue(
  payload: FotmobPlayerPayload,
  ids: string[],
): number | null {
  const groups = payload.firstSeasonStats?.statsSection?.items ?? []
  for (const group of groups) {
    for (const item of group.items ?? []) {
      const key = (item.localizedTitleId || item.title || '').toLowerCase()
      if (!ids.some((id) => key === id.toLowerCase() || key.includes(id.toLowerCase()))) continue
      const n = Number(item.statValue)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

async function searchFotmobPlayerId(name: string): Promise<string | null> {
  const q = name.trim()
  if (!q) return null
  const data = await fetchJson<FotmobSuggest>(
    `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(q)}`,
  )
  const options = data?.squadMemberSuggest?.[0]?.options ?? []
  for (const option of options) {
    const id = option.payload?.id ?? option.text?.split('|')[1]
    if (id != null && String(id)) return String(id)
  }
  // Try last token (surname) if full name missed.
  const parts = q.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    const surname = parts[parts.length - 1]!
    const again = await fetchJson<FotmobSuggest>(
      `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(surname)}`,
    )
    const opts = again?.squadMemberSuggest?.[0]?.options ?? []
    const match = opts.find((opt) =>
      (opt.payload?.name || opt.text || '').toLowerCase().includes(q.toLowerCase().slice(0, 6)),
    )
    const id = match?.payload?.id ?? match?.text?.split('|')[1] ?? opts[0]?.payload?.id
    if (id != null) return String(id)
  }
  return null
}

/** Player xG / xA / market value / injury via FotMob name search. */
export async function fetchPlayerAdvancedExtras(
  playerName: string,
): Promise<PlayerAdvancedExtras | null> {
  const fotmobPlayerId = await searchFotmobPlayerId(playerName)
  if (!fotmobPlayerId) return null

  const payload = await fetchJson<FotmobPlayerPayload>(
    `https://www.fotmob.com/api/data/playerData?id=${encodeURIComponent(fotmobPlayerId)}`,
  )
  if (!payload) return null

  const xg = readStatValue(payload, ['expected_goals', 'xg'])
  const xgot = readStatValue(payload, ['expected_goals_on_target', 'xgot'])
  const xa = readStatValue(payload, ['expected_assists', 'xa'])
  const goals = readStatValue(payload, ['goals'])
  const assists = readStatValue(payload, ['assists'])
  const values = payload.marketValues?.values ?? []
  const latest = values.length > 0 ? values[values.length - 1] : null
  const marketRaw = typeof latest?.value === 'number' ? latest.value : null
  const injury =
    payload.injuryInformation?.name ||
    payload.injuryInformation?.description ||
    null

  return {
    fotmobPlayerId,
    seasonLabel: payload.mainLeague?.season || payload.mainLeague?.leagueName,
    xg,
    xgot,
    xa,
    goals,
    assists,
    goalsMinusXg: xg != null && goals != null ? Number((goals - xg).toFixed(2)) : null,
    marketValue: marketRaw != null ? formatEuro(marketRaw) : null,
    marketValueRaw: marketRaw,
    injury,
    fetchedAt: Date.now(),
    source: 'fotmob',
  }
}

/** Find a club’s season xG row by fuzzy team name. */
export function teamXgForName(
  rows: TeamExpectedGoalsRow[],
  teamName: string,
): TeamExpectedGoalsRow | null {
  const needle = teamName.trim().toLowerCase()
  if (!needle || rows.length === 0) return null
  const exact = rows.find((row) => row.name.toLowerCase() === needle)
  if (exact) return exact
  const partial = rows.find(
    (row) =>
      row.name.toLowerCase().includes(needle) ||
      needle.includes(row.name.toLowerCase()) ||
      row.name
        .toLowerCase()
        .replace(/^afc\s+|^fc\s+|^\w+\s/, '')
        .includes(needle.replace(/^afc\s+|^fc\s+/, '')),
  )
  return partial ?? null
}
