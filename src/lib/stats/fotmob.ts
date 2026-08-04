import type { LeagueId } from '../leagues'
import type { LeagueSeasonOption } from './types'

/** FotMob tournament ids (xG boards + team/transfer resolution). */
const FOTMOB_LEAGUE_IDS: Partial<Record<LeagueId, number>> = {
  'premier-league': 47,
  'eng-championship': 48,
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
  brasileirao: 268,
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
  withXg.sort((a, b) => b.year - a.year)
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

type FotmobStatItem = {
  localizedTitleId?: string
  title?: string
  statValue?: string | number
  value?: number
}

type FotmobStatsSection = {
  statsSection?: {
    items?: Array<{
      items?: FotmobStatItem[]
    }>
  }
}

type FotmobPlayerPayload = {
  id?: number
  name?: string
  injuryInformation?: { name?: string; description?: string; expectedReturn?: string } | null
  marketValues?: {
    values?: Array<{ value?: number; currency?: string }>
  }
  firstSeasonStats?: FotmobStatsSection
  mainLeague?: {
    season?: string
    leagueName?: string
    leagueId?: number
    stats?: FotmobStatItem[]
  }
  primaryTeam?: { teamId?: number; teamName?: string }
  statSeasons?: Array<{
    seasonName?: string
    tournaments?: Array<{
      name?: string
      tournamentId?: number
      entryId?: string
      hasDeepStats?: boolean
    }>
  }>
}

/** Exact id match only — never substring (`goals` must not hit `expected_goals`). */
function readStatFromItems(items: FotmobStatItem[] | undefined, ids: string[]): number | null {
  if (!items?.length) return null
  const want = new Set(ids.map((id) => id.toLowerCase()))
  for (const item of items) {
    const key = (item.localizedTitleId || '').toLowerCase()
    if (!key || !want.has(key)) continue
    const raw = item.statValue ?? item.value
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(n)) return n
  }
  return null
}

function readStatFromSections(
  section: FotmobStatsSection | null | undefined,
  ids: string[],
): number | null {
  const groups = section?.statsSection?.items ?? []
  for (const group of groups) {
    const hit = readStatFromItems(group.items, ids)
    if (hit != null) return hit
  }
  return null
}

function mainLeagueEntryId(payload: FotmobPlayerPayload): string | null {
  const season = payload.mainLeague?.season
  const leagueId = payload.mainLeague?.leagueId
  const leagueName = (payload.mainLeague?.leagueName || '').toLowerCase()
  if (!season) return null
  const seasonRow = (payload.statSeasons ?? []).find((row) => row.seasonName === season)
  const tournaments = seasonRow?.tournaments ?? []
  const byId =
    leagueId != null
      ? tournaments.find((t) => t.tournamentId === leagueId && t.entryId)
      : null
  if (byId?.entryId) return byId.entryId
  const byName = tournaments.find(
    (t) => t.entryId && leagueName && (t.name || '').toLowerCase() === leagueName,
  )
  return byName?.entryId ?? tournaments.find((t) => t.hasDeepStats && t.entryId)?.entryId ?? null
}

async function searchFotmobPlayerId(name: string): Promise<string | null> {
  const q = name.trim()
  if (!q) return null
  const data = await fetchJson<FotmobSuggest>(
    `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(q)}`,
  )
  const options = data?.squadMemberSuggest?.[0]?.options ?? []
  const qLower = q.toLowerCase()
  const scored = options
    .map((option) => {
      const id = option.payload?.id ?? option.text?.split('|')[1]
      const label = (option.payload?.name || option.text?.split('|')[0] || '').toLowerCase()
      if (id == null || !label) return null
      const exact = label === qLower
      const starts = label.startsWith(qLower) || qLower.startsWith(label)
      const includes = label.includes(qLower) || qLower.includes(label)
      if (!exact && !starts && !includes) return null
      return { id: String(id), score: exact ? 3 : starts ? 2 : 1 }
    })
    .filter((row): row is { id: string; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score)
  if (scored[0]) return scored[0].id

  // Surname fallback only when a single strong full-name match appears.
  const parts = q.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    const surname = parts[parts.length - 1]!
    const again = await fetchJson<FotmobSuggest>(
      `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(surname)}`,
    )
    const opts = again?.squadMemberSuggest?.[0]?.options ?? []
    const matches = opts.filter((opt) => {
      const label = (opt.payload?.name || opt.text || '').toLowerCase()
      return label === qLower || label.includes(qLower)
    })
    if (matches.length === 1) {
      const id = matches[0]?.payload?.id ?? matches[0]?.text?.split('|')[1]
      if (id != null) return String(id)
    }
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

  // Prefer deep stats for the player's main club league season (not the default
  // firstSeasonStats window, which is often a cup or short competition).
  const entryId = mainLeagueEntryId(payload)
  const deepStats = entryId
    ? await fetchJson<FotmobStatsSection>(
        `https://www.fotmob.com/api/data/playerStats?playerId=${encodeURIComponent(fotmobPlayerId)}&seasonId=${encodeURIComponent(entryId)}`,
      )
    : null

  const section = deepStats?.statsSection ? deepStats : payload.firstSeasonStats
  const xg = readStatFromSections(section, ['expected_goals'])
  const xgot = readStatFromSections(section, ['expected_goals_on_target'])
  const xa = readStatFromSections(section, ['expected_assists'])
  const goals =
    readStatFromSections(section, ['goals']) ??
    readStatFromItems(payload.mainLeague?.stats, ['goals'])
  const assists =
    readStatFromSections(section, ['assists']) ??
    readStatFromItems(payload.mainLeague?.stats, ['assists'])
  const values = payload.marketValues?.values ?? []
  const latest = values.length > 0 ? values[values.length - 1] : null
  const marketRaw = typeof latest?.value === 'number' ? latest.value : null
  const injury =
    payload.injuryInformation?.name ||
    payload.injuryInformation?.description ||
    null
  const seasonLabel = payload.mainLeague?.season
    ? `${payload.mainLeague.leagueName || 'League'} · ${payload.mainLeague.season}`
    : payload.mainLeague?.leagueName

  return {
    fotmobPlayerId,
    seasonLabel,
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
  const needle = teamName.trim().toLowerCase().replace(/^afc\s+|^fc\s+/, '')
  if (!needle || rows.length === 0) return null
  const exact = rows.find((row) => row.name.toLowerCase() === needle)
  if (exact) return exact
  const normalized = rows.map((row) => ({
    row,
    name: row.name.toLowerCase().replace(/^afc\s+|^fc\s+/, ''),
  }))
  const full = normalized.find(
    (item) => item.name === needle || item.name.includes(needle) || needle.includes(item.name),
  )
  // Avoid short ambiguous tokens like "city" / "united" matching the wrong club.
  if (full && (needle.length >= 6 || full.name === needle)) return full.row
  return null
}

type FotmobTeamSuggest = {
  teamSuggest?: Array<{
    options?: Array<{
      text?: string
      score?: number
      payload?: { id?: string | number; leagueId?: number; leagueName?: string }
    }>
  }>
}

const YOUTH_OR_WOMEN =
  /\b(u1[89]|u2[013]|u23|\(w\)|women|wfc| ladies| girls|\s+b$|\s+ii$)/i

function teamSuggestLabel(text: string | undefined): string {
  return (text || '').split('|')[0]?.trim() || ''
}

const fotmobTeamIdCache = new Map<string, string | null>()

/**
 * Resolve a club name to a FotMob team id (prefers the club's domestic league).
 * Skips youth / women's sides when a senior men's club matches.
 */
export async function resolveFotmobTeamId(
  teamName: string,
  leagueId?: LeagueId,
): Promise<string | null> {
  const name = teamName.trim()
  if (!name) return null
  const preferredLeague = leagueId ? fotmobLeagueId(leagueId) : null
  const cacheKey = `${leagueId || ''}:${name.toLowerCase()}`
  if (fotmobTeamIdCache.has(cacheKey)) return fotmobTeamIdCache.get(cacheKey) ?? null

  const data = await fetchJson<FotmobTeamSuggest>(
    `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(name)}`,
  )
  const options = data?.teamSuggest?.[0]?.options ?? []
  const needle = name.toLowerCase().replace(/^afc\s+|^fc\s+/, '')

  const scored = options
    .map((option) => {
      const label = teamSuggestLabel(option.text)
      const id = option.payload?.id != null ? String(option.payload.id) : null
      const idFromText = option.text?.includes('|') ? option.text.split('|')[1]?.trim() : null
      const teamId = id || (idFromText || null)
      if (!teamId || !label) return null
      if (YOUTH_OR_WOMEN.test(label)) return null
      const normalized = label.toLowerCase().replace(/^afc\s+|^fc\s+/, '')
      const exact = normalized === needle
      const starts = normalized.startsWith(needle) || needle.startsWith(normalized)
      const includes = normalized.includes(needle) || needle.includes(normalized)
      if (!exact && !starts && !includes) return null
      // Avoid short ambiguous tokens matching the wrong club.
      if (!exact && needle.length < 6 && !starts) return null
      let score = exact ? 100 : starts ? 60 : 30
      if (preferredLeague != null && option.payload?.leagueId === preferredLeague) score += 50
      score += Math.min(20, Math.max(0, Number(option.score) / 50_000))
      return { id: teamId, score }
    })
    .filter((row): row is { id: string; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score)

  const resolved = scored[0]?.id ?? null
  fotmobTeamIdCache.set(cacheKey, resolved)
  return resolved
}

export type FotmobClubTransfer = {
  id: string
  date: string
  playerName: string
  direction: 'in' | 'out'
  isLoan: boolean
  feeType: string
  amount?: number
  feeLabel?: string
  fromTeamName?: string
  toTeamName?: string
  fromTeamId?: string
  toTeamId?: string
}

type FotmobTransferFee = {
  feeText?: string
  localizedFeeText?: string
  value?: number | null
}

type FotmobTransferRow = {
  name?: string
  playerId?: number
  transferDate?: string
  fromClub?: string
  toClub?: string
  fromClubId?: number
  toClubId?: number
  fee?: FotmobTransferFee | null
  transferType?: { text?: string } | null
}

type FotmobTeamTransfersPayload = {
  transfers?: {
    data?: {
      'Players in'?: FotmobTransferRow[]
      'Players out'?: FotmobTransferRow[]
    }
  }
}

function normalizeFotmobFee(row: FotmobTransferRow): {
  feeType: string
  isLoan: boolean
  amount?: number
  feeLabel?: string
} {
  const feeText = (row.fee?.feeText || row.transferType?.text || '').trim()
  const localized = (row.fee?.localizedFeeText || '').trim()
  const combined = `${feeText} ${localized}`.toLowerCase()
  const isLoan = /\bloan\b/.test(combined)
  if (isLoan) return { feeType: 'Loan', isLoan: true }

  if (/free/.test(combined)) return { feeType: 'Free', isLoan: false }
  if (/undisclosed/.test(combined)) return { feeType: 'Undisclosed', isLoan: false }

  const value = typeof row.fee?.value === 'number' && row.fee.value > 0 ? row.fee.value : undefined
  if (value != null) {
    return {
      feeType: 'Fee',
      isLoan: false,
      amount: value,
      feeLabel: formatEuro(value),
    }
  }
  if (feeText) return { feeType: feeText.replace(/^\w/, (c) => c.toUpperCase()), isLoan: false }
  return { feeType: 'Transfer', isLoan: false }
}

function mapFotmobTransferRow(
  row: FotmobTransferRow,
  direction: 'in' | 'out',
): FotmobClubTransfer | null {
  const playerName = (row.name || '').trim()
  const date = (row.transferDate || '').trim()
  if (!playerName || !date) return null
  const fee = normalizeFotmobFee(row)
  return {
    id: `fotmob-${direction}-${row.playerId || playerName}-${date}-${row.fromClubId || ''}-${row.toClubId || ''}`,
    date,
    playerName,
    direction,
    isLoan: fee.isLoan,
    feeType: fee.feeType,
    amount: fee.amount,
    feeLabel: fee.feeLabel,
    fromTeamName: row.fromClub || undefined,
    toTeamName: row.toClub || undefined,
    fromTeamId: row.fromClubId != null ? String(row.fromClubId) : undefined,
    toTeamId: row.toClubId != null ? String(row.toClubId) : undefined,
  }
}

/** Latest club arrivals / departures from FotMob’s team page (includes current window). */
export async function fetchFotmobClubTransfers(
  fotmobTeamId: string,
): Promise<FotmobClubTransfer[]> {
  const payload = await fetchJson<FotmobTeamTransfersPayload>(
    `https://www.fotmob.com/api/data/teams?id=${encodeURIComponent(fotmobTeamId)}`,
  )
  const data = payload?.transfers?.data
  if (!data) return []

  const rows: FotmobClubTransfer[] = []
  for (const row of data['Players in'] ?? []) {
    const mapped = mapFotmobTransferRow(row, 'in')
    if (mapped) rows.push(mapped)
  }
  for (const row of data['Players out'] ?? []) {
    const mapped = mapFotmobTransferRow(row, 'out')
    if (mapped) rows.push(mapped)
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date))
}
