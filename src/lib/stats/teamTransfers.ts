import { getLeague, inferSoccerSeasonStartYear, type LeagueId } from '../leagues'
import { dateKeyFromIso } from '../dates'

export type TeamTransfer = {
  id: string
  date: string
  dateKey: string
  playerId?: string
  playerName: string
  /** ESPN fee type: Loan, Free, Undisclosed, etc. */
  feeType: string
  direction: 'in' | 'out'
  isLoan: boolean
  fromTeamId?: string
  fromTeamName?: string
  toTeamId?: string
  toTeamName?: string
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

export { transferKindLabel }

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
 * Newest first across the current and previous couple of seasons.
 */
export async function fetchTeamTransfers(
  leagueId: LeagueId,
  teamId: string,
): Promise<TeamTransfer[]> {
  const league = getLeague(leagueId)
  if (league.kind === 'international') return []

  const espnCode = league.espnCode
  const current = inferSoccerSeasonStartYear()
  const seasons = [current, current - 1, current - 2]

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
