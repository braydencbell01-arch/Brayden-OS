import { useEffect, useMemo, useState } from 'react'
import { MISSING_SHORT } from '../../lib/display'
import { snakeMemberForPick, totalDraftPicks } from '../../lib/fantasy/draft'
import { suggestStartersDetailed } from '../../lib/fantasy/lineup'
import { standingsRank } from '../../lib/fantasy/schedule'
import { scoringBlurb } from '../../lib/fantasy/scoringPresets'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import type { FantasyLeague, FantasyPlayer, TradeOffer } from '../../lib/fantasy/types'
import {
  ALLOWED_DRAFT_CLOCKS,
  MAX_IR_SLOTS,
  POSITION_LIMITS,
  STARTER_FLEX_SLOTS,
  STARTER_MAX,
  STARTER_MIN,
} from '../../lib/fantasy/types'
import { FantasyActivityFeed } from './FantasyActivityFeed'
import { FantasyBracket } from './FantasyBracket'
import {
  FantasyButton,
  FantasyInput,
  FantasySelect,
  FantasyShell,
  phaseLabel,
} from './FantasyChrome'
import { FantasyCommissionerChecklist } from './FantasyCommissionerChecklist'
import { FantasyHome } from './FantasyHome'
import { FantasyMatchupCenter } from './FantasyMatchupCenter'
import { FantasyResearchPanel } from './FantasyResearchPanel'
import { downloadLeagueJson, parseLeagueImport } from '../../lib/fantasy/exportImport'
import { matchesInclusive } from '../../lib/inclusiveSearch'
import type { PlayerNavRef } from '../PlayerProfileScreen'

type HubTab =
  | 'home'
  | 'draft'
  | 'roster'
  | 'matchup'
  | 'waivers'
  | 'trades'
  | 'standings'
  | 'bracket'
  | 'research'

function playerLabel(p: FantasyPlayer | undefined, id: number): string {
  if (!p) return `#${id}`
  return `${p.webName} - ${p.pos} - ${p.teamShort}`
}

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

function useClockLabel(deadlineAt: number | undefined): string {
  const now = useNow(250)
  if (!deadlineAt) return MISSING_SHORT
  const left = Math.max(0, Math.ceil((deadlineAt - now) / 1000))
  const m = Math.floor(left / 60)
  const s = left % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function defaultTab(league: FantasyLeague): HubTab {
  if (league.phase === 'drafting' || league.phase === 'draft_setup') return 'draft'
  if (league.phase === 'regular' || league.phase === 'semifinals' || league.phase === 'finals') {
    return 'matchup'
  }
  return 'home'
}

function shareInviteText(league: FantasyLeague): string {
  const lines = [`Join ${league.name} on BrayStats Fantasy \u2014 code ${league.inviteCode}`]
  if (league.syncBlobId && typeof window !== 'undefined') {
    lines.push(`${window.location.origin}${import.meta.env.BASE_URL}#fantasy-join=${league.syncBlobId}`)
  }
  return lines.join('\n')
}

export function FantasyScreen({
  fantasy,
  reduce,
  onOpenPlayer,
  initialResearchTab,
}: {
  fantasy: FantasyApi
  reduce: boolean | null
  onOpenPlayer?: (player: PlayerNavRef) => void
  initialResearchTab?: 'value' | 'compare'
}) {
  if (!fantasy.activeLeague) {
    return (
      <FantasyHome
        fantasy={fantasy}
        reduce={reduce}
        onOpenPlayer={onOpenPlayer}
        initialResearchTab={initialResearchTab}
      />
    )
  }
  return (
    <FantasyLeagueHub
      key={fantasy.activeLeague.id}
      fantasy={fantasy}
      reduce={reduce}
      onOpenPlayer={onOpenPlayer}
      initialResearchTab={initialResearchTab}
    />
  )
}

function FantasyLeagueHub({
  fantasy,
  reduce,
  onOpenPlayer,
  initialResearchTab,
}: {
  fantasy: FantasyApi
  reduce: boolean | null
  onOpenPlayer?: (player: PlayerNavRef) => void
  initialResearchTab?: 'value' | 'compare'
}) {
  const league = fantasy.activeLeague!
  const [tab, setTab] = useState<HubTab>(() =>
    initialResearchTab ? 'research' : defaultTab(league),
  )

  const draftPhase =
    league.phase === 'lobby' || league.phase === 'draft_setup' || league.phase === 'drafting'
  const tabs: Array<{ id: HubTab; label: string; hidden?: boolean }> = [
    { id: 'home', label: 'Home' },
    { id: 'draft', label: 'Draft', hidden: !draftPhase },
    { id: 'matchup', label: 'Matchup', hidden: draftPhase },
    { id: 'roster', label: 'Roster' },
    { id: 'research', label: 'Research' },
    { id: 'waivers', label: 'Waivers', hidden: draftPhase },
    { id: 'trades', label: 'Trades', hidden: draftPhase },
    { id: 'standings', label: 'Table', hidden: draftPhase },
    { id: 'bracket', label: 'Bracket', hidden: league.playoffs.length === 0 },
  ]

  useEffect(() => {
    const hidden =
      (!draftPhase && tab === 'draft') ||
      (draftPhase &&
        (tab === 'matchup' ||
          tab === 'waivers' ||
          tab === 'trades' ||
          tab === 'standings')) ||
      (league.playoffs.length === 0 && tab === 'bracket')
    if (hidden) setTab(defaultTab(league))
  }, [league, tab, draftPhase])

  return (
    <FantasyShell reduce={reduce}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => fantasy.setActiveLeagueId(null)}
            className="text-sm font-semibold text-mist/70 transition hover:text-lime"
          >
            &lt;- Leagues
          </button>
          <h1 className="mt-2 font-display text-4xl tracking-[0.04em] text-cream sm:text-5xl">
            {league.name}
          </h1>
          <p className="mt-1 text-xs text-mist/60">
            Premier League - {phaseLabel(league.phase)} - {league.draftMode} - {league.scoringPreset} -{' '}
            {league.members.length}/{league.teamCount} - {league.rosterSpots}-man
          </p>
        </div>
        <FantasyButton variant="ghost" onClick={() => void fantasy.refreshActive()}>
          Sync
        </FantasyButton>
      </div>

      <div className="scrollbar-hide -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold transition ${
                tab === t.id ? 'bg-lime text-ink' : 'bg-white/5 text-mist hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === 'home' ? <LobbyPanel fantasy={fantasy} /> : null}
      {tab === 'draft' ? <DraftPanel fantasy={fantasy} /> : null}
      {tab === 'matchup' ? (
        <FantasyMatchupCenter fantasy={fantasy} onOpenBracket={() => setTab('bracket')} />
      ) : null}
      {tab === 'roster' ? <RosterPanel fantasy={fantasy} /> : null}
      {tab === 'research' ? (
        <div className="space-y-3">
          <p className="text-sm text-mist/70">
            FPL value and compare tools for draft, waivers, and trades.
          </p>
          <FantasyResearchPanel
            catalog={fantasy.catalog}
            onOpenPlayer={onOpenPlayer}
            initialTab={initialResearchTab ?? 'value'}
          />
        </div>
      ) : null}
      {tab === 'waivers' ? <WaiversPanel fantasy={fantasy} /> : null}
      {tab === 'trades' ? <TradesPanel fantasy={fantasy} /> : null}
      {tab === 'standings' ? <StandingsPanel fantasy={fantasy} onOpenBracket={() => setTab('bracket')} /> : null}
      {tab === 'bracket' ? <FantasyBracket league={league} /> : null}
    </FantasyShell>
  )
}

function LobbyPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const isCommish = fantasy.me?.isCommissioner
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Invite</h2>
        <p className="mt-2 text-xs text-mist/55">Share the short code and link with managers.</p>
        <div className="mt-3 rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">Code</p>
          <p className="font-display text-4xl tracking-[0.12em] text-cream">{league.inviteCode}</p>
        </div>
        {league.syncBlobId ? (
          <p className="mt-2 break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-xs text-mist/70">
            {league.syncBlobId}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FantasyButton
            onClick={() => {
              setCopyError(null)
              const text = shareInviteText(league)
              void navigator.clipboard
                .writeText(text)
                .then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                })
                .catch(() => {
                  setCopyError('Clipboard blocked — copy the code above manually.')
                })
            }}
          >
            {copied ? 'Copied' : 'Share invite'}
          </FantasyButton>
          {copyError ? <p className="text-xs text-star">{copyError}</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <FantasyButton
            variant="ghost"
            onClick={() => {
              try {
                downloadLeagueJson(league)
              } catch (err: unknown) {
                setCopyError(err instanceof Error ? err.message : 'Export failed')
              }
            }}
          >
            Export JSON
          </FantasyButton>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-mist hover:border-lime/40 hover:text-lime">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void file.text().then((text) => {
                  try {
                    fantasy.importLeague(parseLeagueImport(text))
                  } catch (err: unknown) {
                    setCopyError(err instanceof Error ? err.message : 'Import failed')
                  }
                })
              }}
            />
          </label>
        </div>
      </section>

      <FantasyCommissionerChecklist fantasy={fantasy} />

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Your draft</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-cream">
            <input
              type="checkbox"
              checked={Boolean(fantasy.me?.autodraft)}
              onChange={(e) => {
                try {
                  fantasy.setAutodraft(e.target.checked)
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed')
                }
              }}
            />
            Enable autodraft
          </label>
          <span className="text-xs text-mist/55">
            Snake drafts use your queue first, then the best season-projection roster fit.
          </span>
        </div>
        {isCommish && league.phase !== 'drafting' ? (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
              Draft clock
            </label>
            <FantasySelect
              className="mt-1"
              value={league.draftClockSeconds || 90}
              onChange={(e) => {
                try {
                  fantasy.setClock(Number(e.target.value))
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed')
                }
              }}
            >
              {ALLOWED_DRAFT_CLOCKS.map((n) => (
                <option key={n} value={n}>
                  {n}s
                </option>
              ))}
            </FantasySelect>
          </div>
        ) : (
          <p className="mt-3 text-xs text-mist/55">Clock: {league.draftClockSeconds || 90}s</p>
        )}
      </section>

      <ManagersList league={league} fantasy={fantasy} />

      {isCommish && (league.phase === 'lobby' || league.phase === 'draft_setup') ? (
        <section className="flex flex-wrap gap-2">
          <FantasyButton
            disabled={league.members.length !== league.teamCount}
            onClick={() => {
              try {
                fantasy.randomizeOrder()
              } catch (err: unknown) {
                alert(err instanceof Error ? err.message : 'Failed')
              }
            }}
          >
            Randomize draft order
          </FantasyButton>
          <FantasyButton
            disabled={league.draftOrder.length !== league.teamCount}
            onClick={() => {
              try {
                fantasy.startDraft()
              } catch (err: unknown) {
                alert(err instanceof Error ? err.message : 'Failed')
              }
            }}
          >
            Start {league.draftMode === 'auction' ? 'auction' : 'snake'} draft
          </FantasyButton>
        </section>
      ) : null}

      {league.draftOrder.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">
            Draft order
          </h2>
          <ol className="space-y-1">
            {league.draftOrder.map((id, i) => {
              const member = league.members.find((x) => x.id === id)
              return (
                <li key={id} className="text-sm text-cream">
                  <span className="text-lime">{i + 1}.</span> {member?.name ?? id}
                </li>
              )
            })}
          </ol>
          {isCommish ? <DraftOrderEditor fantasy={fantasy} /> : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-mist/65">
        <p className="font-semibold text-cream">Season format</p>
        <p className="mt-2">
          Regular season GW 1-{league.playoffStartGw - 1}. Playoffs use aggregate scoring:
          semis GW 29-33 (1 vs 4, 2 vs 3), finals GW 34-38. Higher seed wins ties.
        </p>
        <p className="mt-2">{scoringBlurb(league.scoringPreset)}</p>
      </section>

      <FantasyActivityFeed league={league} />
    </div>
  )
}

function ManagersList({ league, fantasy }: { league: FantasyLeague; fantasy: FantasyApi }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">
        Managers
      </h2>
      <ul className="space-y-2">
        {league.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
          >
            <span className="font-semibold text-cream">
              {m.name}
              {m.id === fantasy.identity.memberId ? ' (you)' : ''}
              {m.autodraft ? <span className="ml-2 text-[10px] text-lime">AUTO</span> : null}
            </span>
            <span className="text-xs text-mist/50">
              {m.isCommissioner ? 'Commissioner' : 'Member'}
              {m.draftSlot ? ` - Pick ${m.draftSlot}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {league.members.length < league.teamCount ? (
        <p className="mt-2 text-xs text-amber-100/80">
          Waiting for {league.teamCount - league.members.length} more...
        </p>
      ) : (
        <p className="mt-2 text-xs text-lime/90">League is full. Set draft order when ready.</p>
      )}
    </section>
  )
}

function DraftOrderEditor({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const [order, setOrder] = useState(league.draftOrder)

  useEffect(() => {
    setOrder(league.draftOrder)
  }, [league.draftOrder])

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-mist/55">Use arrows to reorder before starting.</p>
      {order.map((id, index) => {
        const member = league.members.find((x) => x.id === id)
        return (
          <div key={id} className="flex items-center gap-2 text-sm">
            <span className="w-6 text-lime">{index + 1}</span>
            <span className="flex-1 text-cream">{member?.name}</span>
            <FantasyButton
              variant="ghost"
              disabled={index === 0}
              onClick={() => {
                const next = [...order]
                ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                setOrder(next)
              }}
            >
              Up
            </FantasyButton>
            <FantasyButton
              variant="ghost"
              disabled={index === order.length - 1}
              onClick={() => {
                const next = [...order]
                ;[next[index + 1], next[index]] = [next[index]!, next[index + 1]!]
                setOrder(next)
              }}
            >
              Down
            </FantasyButton>
          </div>
        )
      })}
      <FantasyButton
        onClick={() => {
          try {
            fantasy.setOrder(order)
          } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed')
          }
        }}
      >
        Save order
      </FantasyButton>
    </div>
  )
}

function DraftPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const [q, setQ] = useState('')
  const [pos, setPos] = useState<'ALL' | FantasyPlayer['pos']>('ALL')
  const [auctionOpeningBid, setAuctionOpeningBid] = useState(1)
  const taken = useMemo(() => new Set(league.draftPicks.map((p) => p.playerId)), [league.draftPicks])
  const board = useMemo(() => {
    const list = fantasy.catalog?.players ?? []
    return list
      .filter((p) => !taken.has(p.id))
      .filter((p) => (pos === 'ALL' ? true : p.pos === pos))
      .filter((p) => {
        if (!q.trim()) return true
        return matchesInclusive(
          [p.webName, p.secondName, p.firstName, p.teamShort, p.teamName, p.pos],
          q,
        )
      })
      .slice(0, 80)
  }, [fantasy.catalog?.players, pos, q, taken])

  if (league.phase === 'lobby') {
    return (
      <p className="text-sm text-mist/70">
        Fill the league and set draft order on Home before the {league.draftMode} draft begins.
      </p>
    )
  }

  if (league.phase !== 'drafting' && league.phase !== 'draft_setup') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-mist/70">Draft complete. Recent picks:</p>
        <PickList league={league} fantasy={fantasy} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {league.draftMode === 'auction' ? (
        <AuctionDraftPanel
          fantasy={fantasy}
          board={board}
          openingBid={auctionOpeningBid}
          setOpeningBid={setAuctionOpeningBid}
        />
      ) : (
        <SnakeDraftPanel fantasy={fantasy} board={board} />
      )}

      <div className="flex gap-2">
        <FantasyInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search players"
          className="flex-1"
        />
        <FantasySelect
          value={pos}
          onChange={(e) => setPos(e.target.value as typeof pos)}
          className="w-24"
        >
          <option value="ALL">ALL</option>
          <option value="GKP">GKP</option>
          <option value="DEF">DEF</option>
          <option value="MID">MID</option>
          <option value="FWD">FWD</option>
        </FantasySelect>
      </div>

      <p className="text-xs text-mist/50">
        Ranked by season projection. Roster caps:{' '}
        {Object.entries(POSITION_LIMITS)
          .map(([k, v]) => `${v} ${k}`)
          .join(' - ')}
      </p>

      <DraftBoard fantasy={fantasy} board={board} openingBid={auctionOpeningBid} />
      <PickList league={league} fantasy={fantasy} />
    </div>
  )
}

function SnakeDraftPanel({ fantasy, board }: { fantasy: FantasyApi; board: FantasyPlayer[] }) {
  const league = fantasy.activeLeague!
  const queue = fantasy.me?.draftQueue ?? []
  const turn = snakeMemberForPick(league.draftOrder, league.draftPickIndex)
  const myTurn = turn?.memberId === fantasy.me?.id
  const total = totalDraftPicks(league.teamCount, league.rosterSpots)
  const clockLabel = useClockLabel(league.draftPickDeadlineAt)
  const setQueue = (next: number[]) => {
    try {
      fantasy.setDraftQueue(next)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Queue failed')
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
              Pick {Math.min(league.draftPickIndex + 1, total)} / {total}
              {turn ? ` - Round ${turn.round}` : ''}
            </p>
            <p className="mt-1 text-sm text-cream">
              {league.phase === 'draft_setup'
                ? 'Order set. Start the draft from Home.'
                : myTurn
                  ? fantasy.me?.autodraft
                    ? 'Autodraft is on. Your queue is first priority.'
                    : 'You are on the clock.'
                  : `On the clock: ${league.members.find((m) => m.id === turn?.memberId)?.name ?? '...'}`}
            </p>
          </div>
          {league.phase === 'drafting' ? (
            <div className="text-right">
              <p className="font-display text-3xl leading-none text-lime">{clockLabel}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-mist/50">Pick clock</p>
            </div>
          ) : null}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-cream">
          <input
            type="checkbox"
            checked={Boolean(fantasy.me?.autodraft)}
            onChange={(e) => fantasy.setAutodraft(e.target.checked)}
          />
          Autodraft for me
        </label>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">Draft queue</h3>
        {queue.length === 0 ? (
          <p className="mt-2 text-sm text-mist/60">Add players from the board for autodraft priority.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {queue.map((id, index) => (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                <span className="w-6 text-lime">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-cream">
                  {playerLabel(fantasy.playerMap.get(id), id)}
                </span>
                <FantasyButton
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...queue]
                    ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                    setQueue(next)
                  }}
                >
                  Up
                </FantasyButton>
                <FantasyButton
                  variant="ghost"
                  disabled={index === queue.length - 1}
                  onClick={() => {
                    const next = [...queue]
                    ;[next[index + 1], next[index]] = [next[index]!, next[index + 1]!]
                    setQueue(next)
                  }}
                >
                  Down
                </FantasyButton>
                <FantasyButton variant="danger" onClick={() => setQueue(queue.filter((x) => x !== id))}>
                  Remove
                </FantasyButton>
              </li>
            ))}
          </ol>
        )}
        {board.length > 0 ? (
          <FantasyButton
            className="mt-3"
            variant="ghost"
            onClick={() => setQueue([...queue, ...board.slice(0, 5).map((p) => p.id)].filter((id, i, arr) => arr.indexOf(id) === i))}
          >
            Queue top 5 visible
          </FantasyButton>
        ) : null}
      </section>
    </>
  )
}

function AuctionDraftPanel({
  fantasy,
  board,
  openingBid,
  setOpeningBid,
}: {
  fantasy: FantasyApi
  board: FantasyPlayer[]
  openingBid: number
  setOpeningBid: (value: number) => void
}) {
  const league = fantasy.activeLeague!
  const nominated = league.auctionNomPlayerId ? fantasy.playerMap.get(league.auctionNomPlayerId) : null
  const clockLabel = useClockLabel(league.auctionBidDeadlineAt)
  const [bidAmount, setBidAmount] = useState((league.auctionHighBid ?? 0) + 1)
  const nominator = league.members.find((m) => m.id === league.auctionNominatingMemberId)
  const highBidder = league.members.find((m) => m.id === league.auctionHighBidderId)
  const myNomination = league.auctionNominatingMemberId === fantasy.me?.id && !nominated
  const total = totalDraftPicks(league.teamCount, league.rosterSpots)

  useEffect(() => {
    setBidAmount((league.auctionHighBid ?? 0) + 1)
  }, [league.auctionHighBid, league.auctionNomPlayerId])

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
              Auction pick {Math.min(league.draftPickIndex + 1, total)} / {total}
            </p>
            <p className="mt-1 text-sm text-cream">
              {league.phase === 'draft_setup'
                ? 'Order set. Start the auction from Home.'
                : nominated
                  ? `${nominated.webName} is nominated.`
                  : myNomination
                    ? 'You are up to nominate.'
                    : `Waiting for ${nominator?.name ?? 'next manager'} to nominate.`}
            </p>
          </div>
          {nominated ? (
            <div className="text-right">
              <p className="font-display text-3xl leading-none text-lime">{clockLabel}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-mist/50">Bid clock</p>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-mist/55">
          Budget remaining: {fantasy.me?.auctionBudget ?? league.auctionBudget} / {league.auctionBudget}
        </p>
      </div>

      {nominated ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-cream">
            High bid: {league.auctionHighBid ?? 0} by {highBidder?.name ?? 'none'}
          </p>
          <div className="mt-3 flex gap-2">
            <FantasyInput
              type="number"
              min={(league.auctionHighBid ?? 0) + 1}
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
            />
            <FantasyButton
              disabled={league.phase !== 'drafting' || bidAmount <= (league.auctionHighBid ?? 0)}
              onClick={() => {
                try {
                  fantasy.bid(bidAmount)
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Bid failed')
                }
              }}
            >
              Bid
            </FantasyButton>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Opening bid
          </label>
          <FantasyInput
            className="mt-1"
            type="number"
            min={1}
            value={openingBid}
            onChange={(e) => setOpeningBid(Number(e.target.value))}
          />
          <p className="mt-2 text-xs text-mist/55">
            Use Nominate on a player below when it is your turn. First visible option:{' '}
            {board[0]?.webName ?? 'none'}
          </p>
        </section>
      )}
    </div>
  )
}

function DraftBoard({
  fantasy,
  board,
  openingBid,
}: {
  fantasy: FantasyApi
  board: FantasyPlayer[]
  openingBid: number
}) {
  const league = fantasy.activeLeague!
  const queue = fantasy.me?.draftQueue ?? []
  const turn = snakeMemberForPick(league.draftOrder, league.draftPickIndex)
  const myTurn = turn?.memberId === fantasy.me?.id
  const nominated = league.auctionNomPlayerId != null
  const myNomination = league.auctionNominatingMemberId === fantasy.me?.id && !nominated
  const setQueue = (next: number[]) => {
    try {
      fantasy.setDraftQueue(next)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Queue failed')
    }
  }

  return (
    <ul className="space-y-1.5">
      {board.map((p, index) => {
        const queued = queue.includes(p.id)
        return (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
          >
            <span className="w-7 text-xs text-mist/45">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-cream">
                {p.webName}{' '}
                <span className="font-normal text-mist/55">
                  {p.pos} {p.teamShort}
                </span>
              </p>
              <p className="text-[11px] text-mist/50">
                Season {p.seasonProjection.toFixed(0)} - Week {p.weekProjection.toFixed(1)} - GBP{' '}
                {p.cost.toFixed(1)}m
              </p>
            </div>
            {league.draftMode === 'snake' ? (
              <>
                <FantasyButton
                  variant={queued ? 'danger' : 'ghost'}
                  onClick={() => setQueue(queued ? queue.filter((id) => id !== p.id) : [...queue, p.id])}
                >
                  {queued ? 'Unqueue' : 'Queue'}
                </FantasyButton>
                <FantasyButton
                  disabled={league.phase !== 'drafting' || !myTurn || Boolean(fantasy.me?.autodraft)}
                  onClick={() => {
                    try {
                      fantasy.pick(p.id)
                    } catch (err: unknown) {
                      alert(err instanceof Error ? err.message : 'Pick failed')
                    }
                  }}
                >
                  Draft
                </FantasyButton>
              </>
            ) : (
              <FantasyButton
                disabled={league.phase !== 'drafting' || !myNomination}
                onClick={() => {
                  try {
                    fantasy.nominate(p.id, openingBid)
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'Nomination failed')
                  }
                }}
              >
                Nominate
              </FantasyButton>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function PickList({ league, fantasy }: { league: FantasyLeague; fantasy: FantasyApi }) {
  const recent = [...league.draftPicks].reverse().slice(0, 16)
  if (recent.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
        Recent picks
      </h3>
      <ul className="space-y-1 text-sm text-mist/80">
        {recent.map((pick) => {
          const p = fantasy.playerMap.get(pick.playerId)
          const m = league.members.find((x) => x.id === pick.memberId)
          return (
            <li key={pick.overall}>
              R{pick.round}.{pick.slot} {m?.name}: {playerLabel(p, pick.playerId)}
              {pick.auto ? <span className="text-lime"> - auto</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function flexPlayerId(ids: number[], playerMap: Map<number, FantasyPlayer>): number | null {
  const flexPool = ids
    .map((id) => playerMap.get(id))
    .filter((p): p is FantasyPlayer => p != null && (p.pos === 'MID' || p.pos === 'FWD'))
  if (flexPool.length === 0) return null
  return [...flexPool].sort(
    (a, b) =>
      (a.weekProjection || a.seasonProjection) - (b.weekProjection || b.seasonProjection) ||
      a.webName.localeCompare(b.webName),
  )[0]?.id ?? null
}

function RosterPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const me = fantasy.me
  const [starters, setStarters] = useState<number[]>(me?.starters ?? [])
  const [optimizeReasons, setOptimizeReasons] = useState<string[]>([])

  useEffect(() => {
    setStarters(me?.starters ?? [])
  }, [me])

  if (!me) return <p className="text-sm text-mist/70">Join this league to manage a roster.</p>

  const locked = league.lineupLockedGws.includes(league.currentGw)
  const activeStarterIds = starters.filter((id) => me.roster.includes(id))
  const benchIds = me.roster.filter((id) => !activeStarterIds.includes(id))
  const irIds = me.ir ?? []
  const flexId = flexPlayerId(activeStarterIds, fantasy.playerMap)

  const toggle = (id: number) => {
    if (locked) return
    setStarters((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= league.starterSpots) return prev
      return [...prev, id]
    })
  }

  return (
    <div className="space-y-4">
      {locked ? (
        <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
          GW {league.currentGw} is locked. Roster edits are disabled for this gameweek.
        </p>
      ) : null}
      <p className="text-sm text-mist/70">
        {me.roster.length}/{league.rosterSpots} active rostered - {irIds.length}/{MAX_IR_SLOTS} IR - start{' '}
        {league.starterSpots}. Flex: {STARTER_FLEX_SLOTS} MID/FWD.
      </p>
      <p className="text-xs text-mist/50">
        Lineup bands: GKP {STARTER_MIN.GKP}, DEF {STARTER_MIN.DEF}-{STARTER_MAX.DEF}, MID{' '}
        {STARTER_MIN.MID}-{STARTER_MAX.MID}, FWD {STARTER_MIN.FWD}-{STARTER_MAX.FWD}, plus FLEX.
      </p>
      <div className="flex flex-wrap gap-2">
        <FantasyButton
          variant="ghost"
          disabled={locked}
          onClick={() => {
            try {
              const suggestion = suggestStartersDetailed(me.roster, league.starterSpots, fantasy.playerMap)
              setOptimizeReasons(suggestion.reasons)
              setStarters(suggestion.starterIds)
              fantasy.optimizeLineup()
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : 'Failed')
            }
          }}
        >
          Optimize XI
        </FantasyButton>
        <FantasyButton
          disabled={locked}
          onClick={() => {
            try {
              fantasy.setMyStarters(starters)
              alert('Lineup saved')
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : 'Failed')
            }
          }}
        >
          Save lineup ({starters.length}/{league.starterSpots})
        </FantasyButton>
      </div>
      {optimizeReasons.length > 0 ? (
        <ul className="rounded-xl border border-lime/20 bg-lime/10 px-3 py-2 text-xs text-cream">
          {optimizeReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <RosterSection
        title="Starters"
        ids={activeStarterIds}
        fantasy={fantasy}
        locked={locked}
        flexId={flexId}
        onToggle={toggle}
      />
      <RosterSection
        title="Bench"
        ids={benchIds}
        fantasy={fantasy}
        locked={locked}
        onToggle={toggle}
      />
      <RosterSection
        title="IR"
        ids={irIds}
        fantasy={fantasy}
        locked={locked}
        ir
      />
    </div>
  )
}

function RosterSection({
  title,
  ids,
  fantasy,
  locked,
  flexId,
  ir = false,
  onToggle,
}: {
  title: string
  ids: number[]
  fantasy: FantasyApi
  locked: boolean
  flexId?: number | null
  ir?: boolean
  onToggle?: (id: number) => void
}) {
  if (ids.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">{title}</h3>
        <p className="text-sm text-mist/55">No players.</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">{title}</h3>
      <ul className="space-y-2">
        {ids.map((id) => {
          const p = fantasy.playerMap.get(id)
          return (
            <li
              key={id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-cream">
                  {playerLabel(p, id)}
                  {id === flexId ? <span className="ml-2 text-[10px] text-lime">FLEX</span> : null}
                </p>
                <p className="text-[11px] text-mist/50">
                  Week {p?.weekProjection.toFixed(1) ?? MISSING_SHORT} - Season{' '}
                  {p?.seasonProjection.toFixed(0) ?? MISSING_SHORT}
                  {p?.status && p.status !== 'a' ? ` - status ${p.status}` : ''}
                </p>
              </div>
              {ir ? (
                <FantasyButton
                  disabled={locked}
                  onClick={() => {
                    try {
                      fantasy.activateIr(id)
                    } catch (err: unknown) {
                      alert(err instanceof Error ? err.message : 'Failed')
                    }
                  }}
                >
                  Activate
                </FantasyButton>
              ) : (
                <>
                  <FantasyButton variant={title === 'Starters' ? 'primary' : 'ghost'} disabled={locked} onClick={() => onToggle?.(id)}>
                    {title === 'Starters' ? 'Starting' : 'Start'}
                  </FantasyButton>
                  <FantasyButton
                    variant="ghost"
                    disabled={locked}
                    onClick={() => {
                      try {
                        fantasy.moveIr(id)
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Failed')
                      }
                    }}
                  >
                    Move to IR
                  </FantasyButton>
                  <FantasyButton
                    variant="danger"
                    disabled={locked}
                    onClick={() => {
                      if (!confirm(`Drop ${p?.webName ?? id} to waivers?`)) return
                      try {
                        fantasy.dropPlayer(id)
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Failed')
                      }
                    }}
                  >
                    Drop
                  </FantasyButton>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function WaiversPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const [q, setQ] = useState('')
  const [dropId, setDropId] = useState<number | ''>('')
  const [mode, setMode] = useState<'fa' | 'wire' | 'priority'>('fa')
  const owned = useMemo(() => new Set(league.members.flatMap((m) => m.roster)), [league.members])
  const waiverSet = useMemo(() => new Set(league.waiverPool ?? []), [league.waiverPool])

  const players = useMemo(() => {
    return (fantasy.catalog?.players ?? [])
      .filter((p) => !owned.has(p.id))
      .filter((p) => {
        if (!q.trim()) return true
        return matchesInclusive(
          [p.webName, p.secondName, p.firstName, p.teamShort, p.teamName, p.pos],
          q,
        )
      })
      .filter((p) => (mode === 'wire' ? waiverSet.has(p.id) : !waiverSet.has(p.id)))
      .slice(0, 60)
  }, [fantasy.catalog?.players, mode, owned, q, waiverSet])

  const needDrop = (fantasy.me?.roster.length ?? 0) >= league.rosterSpots

  if (league.phase === 'lobby' || league.phase === 'draft_setup' || league.phase === 'drafting') {
    return <p className="text-sm text-mist/70">Waivers & free agency open after the draft.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {(
          [
            ['fa', 'Free agents'],
            ['wire', 'On waivers'],
            ['priority', 'Priority'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${
              mode === id ? 'bg-lime text-ink' : 'bg-white/5 text-mist'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'priority' ? (
        <div className="space-y-3">
          <ol className="space-y-1">
            {(league.waiverOrder ?? []).map((id, i) => {
              const m = league.members.find((x) => x.id === id)
              return (
                <li key={id} className="text-sm text-cream">
                  <span className="text-lime">{i + 1}.</span> {m?.name ?? id}
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-mist/55">
            Successful claims move you to the end of the list (rolling waivers).
          </p>
          {fantasy.me?.isCommissioner ? (
            <FantasyButton onClick={() => fantasy.processWaivers()}>Process claims now</FantasyButton>
          ) : null}
          <PendingClaims league={league} fantasy={fantasy} />
        </div>
      ) : (
        <>
          <p className="text-sm text-mist/70">
            {mode === 'wire'
              ? 'Submit a claim, processed by priority or when the commissioner scores a GW.'
              : 'Open free agents add instantly. Drops go onto the waiver wire.'}
          </p>
          {needDrop && fantasy.me ? (
            <FantasySelect
              value={dropId}
              onChange={(e) => setDropId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Drop player...</option>
              {fantasy.me.roster.map((id) => (
                <option key={id} value={id}>
                  {playerLabel(fantasy.playerMap.get(id), id)}
                </option>
              ))}
            </FantasySelect>
          ) : null}
          <FantasyInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === 'wire' ? 'Search waivers' : 'Search free agents'}
          />
          <ul className="space-y-1.5">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream">
                    {p.webName}{' '}
                    <span className="font-normal text-mist/55">
                      {p.pos} {p.teamShort}
                    </span>
                  </p>
                  <p className="text-[11px] text-mist/50">
                    Week {p.weekProjection.toFixed(1)} - Season {p.seasonProjection.toFixed(0)}
                  </p>
                </div>
                <FantasyButton
                  disabled={needDrop && dropId === ''}
                  onClick={() => {
                    try {
                      if (mode === 'wire') {
                        fantasy.submitClaim(p.id, needDrop ? Number(dropId) : null)
                      } else {
                        fantasy.claimFreeAgent(p.id, needDrop ? Number(dropId) : null)
                      }
                      setDropId('')
                    } catch (err: unknown) {
                      alert(err instanceof Error ? err.message : 'Failed')
                    }
                  }}
                >
                  {mode === 'wire' ? 'Claim' : 'Add'}
                </FantasyButton>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function PendingClaims({ league, fantasy }: { league: FantasyLeague; fantasy: FantasyApi }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
        Pending claims
      </h3>
      <ul className="space-y-2">
        {(league.waiverClaims ?? [])
          .filter((claim) => claim.status === 'pending')
          .map((claim) => {
            const m = league.members.find((x) => x.id === claim.memberId)
            return (
              <li
                key={claim.id}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <p className="text-cream">
                  {m?.name}: +{fantasy.playerMap.get(claim.addPlayerId)?.webName ?? claim.addPlayerId}
                  {claim.dropPlayerId
                    ? ` / -${fantasy.playerMap.get(claim.dropPlayerId)?.webName ?? claim.dropPlayerId}`
                    : ''}
                </p>
                {claim.memberId === fantasy.identity.memberId ? (
                  <FantasyButton
                    className="mt-2"
                    variant="ghost"
                    onClick={() => fantasy.cancelClaim(claim.id)}
                  >
                    Cancel
                  </FantasyButton>
                ) : null}
              </li>
            )
          })}
      </ul>
    </div>
  )
}

function tradeCountdown(deadlineAt: number | undefined, now: number): string {
  if (!deadlineAt) return 'pending'
  const left = Math.max(0, deadlineAt - now)
  const hours = Math.floor(left / 3_600_000)
  const minutes = Math.floor((left % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

function TradesPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const me = fantasy.me
  const now = useNow(30_000)
  const [toId, setToId] = useState('')
  const [offer, setOffer] = useState<number[]>([])
  const [request, setRequest] = useState<number[]>([])

  if (!me) return <p className="text-sm text-mist/70">Join to trade.</p>
  if (league.phase === 'lobby' || league.phase === 'draft_setup' || league.phase === 'drafting') {
    return <p className="text-sm text-mist/70">Trades open after the draft.</p>
  }

  const partner = league.members.find((m) => m.id === toId)
  const toggle = (list: number[], id: number, set: (v: number[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
          Propose trade
        </h3>
        <p className="text-xs text-mist/55">
          Accepted trades enter a {league.tradeVetoHours || 24}h review window. Non-parties can vote
          to veto during that countdown.
        </p>
        <FantasySelect value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">Trade partner...</option>
          {league.members
            .filter((m) => m.id !== me.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </FantasySelect>

        {partner ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <TradePlayerChecklist
              title="You offer"
              ids={me.roster}
              selected={offer}
              fantasy={fantasy}
              onToggle={(id) => toggle(offer, id, setOffer)}
            />
            <TradePlayerChecklist
              title="You request"
              ids={partner.roster}
              selected={request}
              fantasy={fantasy}
              onToggle={(id) => toggle(request, id, setRequest)}
            />
          </div>
        ) : null}

        <FantasyButton
          disabled={!toId}
          onClick={() => {
            try {
              fantasy.sendTrade(toId, offer, request)
              setOffer([])
              setRequest([])
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : 'Failed')
            }
          }}
        >
          Send trade
        </FantasyButton>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
          Trade inbox
        </h3>
        <ul className="space-y-2">
          {league.trades.slice(0, 20).map((trade) => (
            <TradeCard key={trade.id} trade={trade} fantasy={fantasy} now={now} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function TradePlayerChecklist({
  title,
  ids,
  selected,
  fantasy,
  onToggle,
}: {
  title: string
  ids: number[]
  selected: number[]
  fantasy: FantasyApi
  onToggle: (id: number) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-lime">{title}</p>
      {ids.map((id) => (
        <label key={id} className="mb-1 flex items-center gap-2 text-xs text-cream">
          <input type="checkbox" checked={selected.includes(id)} onChange={() => onToggle(id)} />
          {playerLabel(fantasy.playerMap.get(id), id)}
        </label>
      ))}
    </div>
  )
}

function TradeCard({ trade, fantasy, now }: { trade: TradeOffer; fantasy: FantasyApi; now: number }) {
  const league = fantasy.activeLeague!
  const from = league.members.find((m) => m.id === trade.fromMemberId)
  const to = league.members.find((m) => m.id === trade.toMemberId)
  const meId = fantasy.identity.memberId
  const isParty = meId === trade.fromMemberId || meId === trade.toMemberId
  const vetoVotes = trade.vetoVotes ?? []
  const hasVoted = vetoVotes.includes(meId)

  return (
    <li className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
      <p className="text-cream">
        {from?.name} -&gt; {to?.name} <span className="text-xs text-mist/50">({trade.status})</span>
      </p>
      <p className="mt-1 text-xs text-mist/60">
        Offer:{' '}
        {trade.offerPlayerIds.map((id) => fantasy.playerMap.get(id)?.webName ?? id).join(', ') ||
          MISSING_SHORT}
      </p>
      <p className="text-xs text-mist/60">
        Request:{' '}
        {trade.requestPlayerIds.map((id) => fantasy.playerMap.get(id)?.webName ?? id).join(', ') ||
          MISSING_SHORT}
      </p>
      {trade.status === 'pending' ? (
        <div className="mt-2 flex gap-2">
          {meId === trade.toMemberId ? (
            <>
              <FantasyButton
                onClick={() => {
                  try {
                    fantasy.decideTrade(trade.id, 'accepted')
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'Failed')
                  }
                }}
              >
                Accept
              </FantasyButton>
              <FantasyButton variant="danger" onClick={() => fantasy.decideTrade(trade.id, 'rejected')}>
                Reject
              </FantasyButton>
            </>
          ) : null}
          {meId === trade.fromMemberId ? (
            <FantasyButton variant="ghost" onClick={() => fantasy.decideTrade(trade.id, 'canceled')}>
              Cancel
            </FantasyButton>
          ) : null}
        </div>
      ) : null}
      {trade.status === 'veto_pending' ? (
        <div className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <p>
            Veto review: {tradeCountdown(trade.vetoDeadlineAt, now)} left - {vetoVotes.length} vote
            {vetoVotes.length === 1 ? '' : 's'}
          </p>
          {!isParty ? (
            <FantasyButton
              className="mt-2"
              variant="danger"
              disabled={hasVoted}
              onClick={() => {
                try {
                  fantasy.voteVeto(trade.id)
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed')
                }
              }}
            >
              {hasVoted ? 'Veto voted' : 'Vote to veto'}
            </FantasyButton>
          ) : (
            <p className="mt-1 text-mist/60">Trade parties cannot vote during review.</p>
          )}
        </div>
      ) : null}
    </li>
  )
}

function StandingsPanel({
  fantasy,
  onOpenBracket,
}: {
  fantasy: FantasyApi
  onOpenBracket: () => void
}) {
  const league = fantasy.activeLeague!
  const ranked = standingsRank(league.members)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-mist/55">
          Top 4 after GW {league.playoffStartGw - 1} make the playoffs (1v4, 2v3).
        </p>
        {league.playoffs.length > 0 ? (
          <FantasyButton variant="ghost" onClick={onOpenBracket}>
            View bracket
          </FantasyButton>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/30 text-[10px] uppercase tracking-[0.14em] text-mist/50">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">W</th>
              <th className="px-3 py-2">L</th>
              <th className="px-3 py-2">T</th>
              <th className="px-3 py-2">PF</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((m, i) => (
              <tr key={m.id} className="border-t border-white/8">
                <td className="px-3 py-2 text-lime">{i + 1}</td>
                <td className="px-3 py-2 font-semibold text-cream">
                  {m.name}
                  {i < 4 ? <span className="ml-1 text-[10px] text-lime/80">PLAYOFF</span> : null}
                </td>
                <td className="px-3 py-2">{m.wins}</td>
                <td className="px-3 py-2">{m.losses}</td>
                <td className="px-3 py-2">{m.ties}</td>
                <td className="px-3 py-2">{Math.round(m.pointsFor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
