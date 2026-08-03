import { getLeague, type LeagueId } from '../leagues'
import { dateKeyFromIso } from '../dates'
import {
  fetchFotmobClubTransfers,
  resolveFotmobTeamId,
  type FotmobClubTransfer,
} from './fotmob'

export type TeamTransfer = {
  id: string
  date: string
  dateKey: string
  playerId?: string
  playerName: string
  /** Fee type: Loan, Free, Undisclosed, Fee, etc. */
  feeType: string
  /** Fee amount when known (FotMob values are EUR). */
  amount?: number
  direction: 'in' | 'out'
  isLoan: boolean
  fromTeamId?: string
  fromTeamName?: string
  toTeamId?: string
  toTeamName?: string
  /** Display fee label when present (e.g. "€48m"). */
  feeLabel?: string
}

type EspnTransactionTeam = {
  id?: string
  displayName?: string
  shortDisplayName?: string
  abbreviation?: string
}

type EspnTransaction = {
  date?: string
  type?: string
  amount?: number
  displayAmount?: string
  athlete?: {
    id?: string
    displayName?: string
    firstName?: string
    lastName?: string
  }
  from?: EspnTransactionTeam
  to?: EspnTransactionTeam
}

type EspnTransactionsPayload = {
  count?: number
  pageIndex?: number
  pageCount?: number
  transactions?: EspnTransaction[]
}

function teamLabel(team: EspnTransactionTeam | undefined): string | undefined {
  return team?.displayName || team?.shortDisplayName || team?.abbreviation || undefined
}

function transferKindLabel(transfer: TeamTransfer): string {
  if (transfer.isLoan) return transfer.direction === 'in' ? 'Loan in' : 'Loan out'
  return transfer.direction === 'in' ? 'Signed' : 'Departed'
}

/** Transfer date with year (e.g. "Mon, Sep 1, 2025"). */
function formatTransferDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMoneyAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10
    return `€${rounded}m`
  }
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}k`
  return `€${Math.round(amount)}`
}

/**
 * Human fee line: Free / Loan / Undisclosed / €12m.
 * Prefer an explicit feeLabel (FotMob) when present.
 */
function formatTransferFee(transfer: TeamTransfer): string {
  if (transfer.isLoan || /loan/i.test(transfer.feeType)) return 'Loan'
  if (/free/i.test(transfer.feeType) || /free/i.test(transfer.feeLabel || '')) return 'Free'

  const labeled = (transfer.feeLabel || '').trim()
  if (labeled && /[€£$]/.test(labeled)) return labeled

  const fromAmount = transfer.amount && transfer.amount > 0 ? formatMoneyAmount(transfer.amount) : ''
  if (fromAmount) return fromAmount

  const raw = labeled
  if (raw && /^\d+(\.\d+)?$/.test(raw)) {
    const money = formatMoneyAmount(Number(raw))
    if (money) return money
  }
  if (raw && !/^(fee|transfer|undisclosed)$/i.test(raw)) return raw
  if (/undisclosed/i.test(transfer.feeType) || /undisclosed/i.test(raw)) return 'Undisclosed'
  return transfer.feeType || 'Undisclosed'
}

export { transferKindLabel, formatTransferDate, formatTransferFee }

function normalizeTransfer(
  row: EspnTransaction,
  teamId: string,
): TeamTransfer | null {
  const fromId = row.from?.id
  const toId = row.to?.id
  if (fromId !== teamId && toId !== teamId) return null
  if (!row.date) return null

  const playerName =
    row.athlete?.displayName ||
    [row.athlete?.firstName, row.athlete?.lastName].filter(Boolean).join(' ')
  if (!playerName) return null

  const direction: 'in' | 'out' = toId === teamId ? 'in' : 'out'
  const feeType = (row.type || 'Transfer').trim() || 'Transfer'
  const isLoan = /loan/i.test(feeType)

  return {
    id: `espn-${row.date}-${row.athlete?.id || playerName}-${fromId || ''}-${toId || ''}-${feeType}`,
    date: row.date,
    dateKey: transferDateKey(row.date),
    playerId: row.athlete?.id,
    playerName,
    feeType,
    amount: typeof row.amount === 'number' && row.amount > 0 ? row.amount : undefined,
    direction,
    isLoan,
    fromTeamId: fromId,
    fromTeamName: teamLabel(row.from),
    toTeamId: toId,
    toTeamName: teamLabel(row.to),
    feeLabel: row.displayAmount || undefined,
  }
}

function transferDateKey(iso: string): string {
  // Prefer the calendar day in the source timestamp so UTC evening deals
  // don't shift to the previous local day.
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso)
  if (match?.[1]) return match[1]
  return dateKeyFromIso(iso)
}

function fromFotmob(row: FotmobClubTransfer): TeamTransfer {
  return {
    id: row.id,
    date: row.date,
    dateKey: transferDateKey(row.date),
    // FotMob player ids are not ESPN athlete ids — omit so profile links stay valid.
    playerName: row.playerName,
    feeType: row.feeType,
    amount: row.amount,
    direction: row.direction,
    isLoan: row.isLoan,
    fromTeamId: row.fromTeamId,
    fromTeamName: row.fromTeamName,
    toTeamId: row.toTeamId,
    toTeamName: row.toTeamName,
    feeLabel: row.feeLabel,
  }
}

function playerDedupeKey(transfer: TeamTransfer): string {
  if (transfer.playerId) return `id:${transfer.playerId}`
  return `name:${transfer.playerName.trim().toLowerCase()}`
}

function counterpartyKey(transfer: TeamTransfer): string {
  const id = transfer.direction === 'in' ? transfer.fromTeamId : transfer.toTeamId
  const name = transfer.direction === 'in' ? transfer.fromTeamName : transfer.toTeamName
  if (id) return `id:${id}`
  if (name) return `name:${name.trim().toLowerCase()}`
  return ''
}

function daysBetween(a: string, b: string): number {
  const left = Date.parse(`${a}T12:00:00Z`)
  const right = Date.parse(`${b}T12:00:00Z`)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.POSITIVE_INFINITY
  return Math.abs(left - right) / 86_400_000
}

function transferQuality(transfer: TeamTransfer): number {
  let score = 0
  if (transfer.amount && transfer.amount > 0) score += 100
  if (transfer.feeLabel && /[€£$]/.test(transfer.feeLabel)) score += 80
  if (transfer.isLoan || /loan/i.test(transfer.feeType)) score += 25
  if (/free/i.test(transfer.feeType) || /free/i.test(transfer.feeLabel || '')) score += 20
  if (/undisclosed/i.test(transfer.feeType) || /undisclosed/i.test(transfer.feeLabel || '')) {
    score += 8
  }
  // ESPN sometimes emits a weak "Contract" twin of the same deal.
  if (/contract/i.test(transfer.feeType)) score -= 15
  if (transfer.playerId) score += 10
  if (transfer.id.startsWith('fotmob')) score += 6
  // Prefer the later announcement date when quality ties.
  score += Math.min(5, Number(transfer.dateKey.replace(/-/g, '').slice(-4)) % 5)
  return score
}

function isSameTransferMove(a: TeamTransfer, b: TeamTransfer): boolean {
  if (a.direction !== b.direction) return false
  if (playerDedupeKey(a) !== playerDedupeKey(b)) return false
  if (Boolean(a.isLoan) !== Boolean(b.isLoan)) return false
  const leftClub = counterpartyKey(a)
  const rightClub = counterpartyKey(b)
  if (leftClub && rightClub && leftClub !== rightClub) return false
  // ESPN/FotMob often publish the same deal one calendar day apart.
  return daysBetween(a.dateKey, b.dateKey) <= 3
}

/** Collapse near-duplicate ESPN/FotMob rows for the same player move. */
export function collapseDuplicateTransfers(rows: TeamTransfer[]): TeamTransfer[] {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
  const kept: TeamTransfer[] = []

  for (const row of sorted) {
    const matchIndex = kept.findIndex((existing) => isSameTransferMove(existing, row))
    if (matchIndex < 0) {
      kept.push(row)
      continue
    }
    const existing = kept[matchIndex]!
    kept[matchIndex] =
      transferQuality(row) > transferQuality(existing) ? row : existing
  }

  return kept.sort((a, b) => b.date.localeCompare(a.date))
}

async function fetchLeagueSeasonTransactions(
  espnCode: string,
  seasonYear: number,
): Promise<EspnTransaction[]> {
  const collected: EspnTransaction[] = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount && page <= 12) {
    const url = new URL(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/transactions`,
    )
    url.searchParams.set('season', String(seasonYear))
    url.searchParams.set('limit', '100')
    url.searchParams.set('page', String(page))
    const res = await fetch(url)
    if (!res.ok) break
    const data = (await res.json()) as EspnTransactionsPayload
    const batch = data.transactions ?? []
    collected.push(...batch)
    pageCount = Math.max(1, data.pageCount || 1)
    if (batch.length === 0) break
    page += 1
  }

  return collected
}

async function fetchEspnTeamDisplayName(
  espnCode: string,
  teamId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/teams/${encodeURIComponent(teamId)}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      team?: { displayName?: string; name?: string; shortDisplayName?: string }
    }
    return (
      data.team?.displayName ||
      data.team?.name ||
      data.team?.shortDisplayName ||
      null
    )
  } catch {
    return null
  }
}

async function fetchEspnTeamTransfers(
  espnCode: string,
  teamId: string,
): Promise<TeamTransfer[]> {
  // ESPN's soccer transactions `season` param is calendar year (Jan–Dec), not
  // soccer season-start year. Fetch current + previous two calendar years.
  const calendarYear = new Date().getFullYear()
  const seasons = [calendarYear, calendarYear - 1, calendarYear - 2]

  const bySeason = await Promise.all(
    seasons.map(async (year) => {
      try {
        return await fetchLeagueSeasonTransactions(espnCode, year)
      } catch {
        return [] as EspnTransaction[]
      }
    }),
  )

  const byId = new Map<string, TeamTransfer>()
  for (const rows of bySeason) {
    for (const row of rows) {
      const transfer = normalizeTransfer(row, teamId)
      if (!transfer) continue
      if (!byId.has(transfer.id)) byId.set(transfer.id, transfer)
    }
  }

  return [...byId.values()]
}

/**
 * Recent club transfers (signings, departures, loans).
 * Prefers FotMob (current window / newest deals) and merges older ESPN rows.
 */
export async function fetchTeamTransfers(
  leagueId: LeagueId,
  teamId: string,
): Promise<TeamTransfer[]> {
  const league = getLeague(leagueId)
  if (league.kind === 'international') return []

  const espnCode = league.espnCode
  const teamName = await fetchEspnTeamDisplayName(espnCode, teamId)

  const [fotmobRows, espnRows] = await Promise.all([
    (async () => {
      if (!teamName) return [] as TeamTransfer[]
      try {
        const fotmobId = await resolveFotmobTeamId(teamName, leagueId)
        if (!fotmobId) return []
        const rows = await fetchFotmobClubTransfers(fotmobId)
        return rows.map(fromFotmob)
      } catch {
        return [] as TeamTransfer[]
      }
    })(),
    fetchEspnTeamTransfers(espnCode, teamId).catch(() => [] as TeamTransfer[]),
  ])

  const byKey = new Map<string, TeamTransfer>()
  // FotMob first so newest / fee-rich rows win on exact key collisions.
  for (const row of fotmobRows) {
    byKey.set(row.id, row)
  }
  for (const row of espnRows) {
    if (!byKey.has(row.id)) byKey.set(row.id, row)
  }

  return collapseDuplicateTransfers([...byKey.values()])
}
