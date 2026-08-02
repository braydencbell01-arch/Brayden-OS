import { getLeague, type LeagueId } from '../leagues'
import { dateKeyFromIso } from '../dates'

export type TeamTransfer = {
  id: string
  date: string
  dateKey: string
  playerId?: string
  playerName: string
  /** ESPN fee type: Loan, Free, Undisclosed, Fee, etc. */
  feeType: string
  /** Raw ESPN amount when provided (often 0). */
  amount?: number
  direction: 'in' | 'out'
  isLoan: boolean
  fromTeamId?: string
  fromTeamName?: string
  toTeamId?: string
  toTeamName?: string
  /** Raw ESPN displayAmount when present. */
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
    return `£${rounded}m`
  }
  if (amount >= 1_000) return `£${Math.round(amount / 1_000)}k`
  return `£${Math.round(amount)}`
}

/**
 * Human fee line: Free / Loan / Undisclosed / £12m.
 * ESPN rarely publishes exact fees; when missing we surface their label.
 */
function formatTransferFee(transfer: TeamTransfer): string {
  if (transfer.isLoan || /loan/i.test(transfer.feeType)) return 'Loan'
  if (/free/i.test(transfer.feeType) || /free/i.test(transfer.feeLabel || '')) return 'Free'

  const fromAmount = transfer.amount && transfer.amount > 0 ? formatMoneyAmount(transfer.amount) : ''
  if (fromAmount) return fromAmount

  const raw = (transfer.feeLabel || '').trim()
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
    id: `${row.date}-${row.athlete?.id || playerName}-${fromId || ''}-${toId || ''}-${feeType}`,
    date: row.date,
    dateKey: dateKeyFromIso(row.date),
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

/**
 * Recent club transfers (signings, departures, loans) from ESPN transaction feeds.
 * Newest first across recent calendar years (ESPN indexes this endpoint by calendar year).
 */
export async function fetchTeamTransfers(
  leagueId: LeagueId,
  teamId: string,
): Promise<TeamTransfer[]> {
  const league = getLeague(leagueId)
  if (league.kind === 'international') return []

  const espnCode = league.espnCode
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

  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date))
}
