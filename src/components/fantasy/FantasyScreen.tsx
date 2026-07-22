import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { snakeMemberForPick, totalDraftPicks } from '../../lib/fantasy/draft'
import { validateStarters } from '../../lib/fantasy/lineup'
import { standingsRank, seriesAggregate } from '../../lib/fantasy/schedule'
import { SCORING_BLURB } from '../../lib/fantasy/scoring'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import type { FantasyLeague, FantasyPlayer } from '../../lib/fantasy/types'
import {
  ALLOWED_DRAFT_CLOCKS,
  ALLOWED_TEAM_COUNTS,
  DEFAULT_DRAFT_CLOCK_SECONDS,
  DEFAULT_ROSTER_SPOTS,
  POSITION_LIMITS,
  STARTER_MAX,
  STARTER_MIN,
} from '../../lib/fantasy/types'
import {
  FantasyButton,
  FantasyInput,
  FantasySelect,
  FantasyShell,
  FantasyTitle,
  phaseLabel,
} from './FantasyChrome'

type HubTab = 'home' | 'draft' | 'roster' | 'matchup' | 'waivers' | 'trades' | 'standings'

function playerLabel(p: FantasyPlayer | undefined, id: number): string {
  if (!p) return `#${id}`
  return `${p.webName} · ${p.pos} · ${p.teamShort}`
}

function useClockLabel(deadlineAt: number | undefined): string {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])
  if (!deadlineAt) return '—'
  const left = Math.max(0, Math.ceil((deadlineAt - now) / 1000))
  const m = Math.floor(left / 60)
  const s = left % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function FantasyScreen({
  fantasy,
  reduce,
}: {
  fantasy: FantasyApi
  reduce: boolean | null
}) {
  if (!fantasy.activeLeague) {
    return <FantasyHome fantasy={fantasy} reduce={reduce} />
  }
  return <FantasyLeagueHub fantasy={fantasy} reduce={reduce} />
}

function FantasyHome({ fantasy, reduce }: { fantasy: FantasyApi; reduce: boolean | null }) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const [name, setName] = useState(fantasy.identity.displayName)
  const [leagueName, setLeagueName] = useState('FPL League')
  const [teamCount, setTeamCount] = useState(8)
  const [clock, setClock] = useState(DEFAULT_DRAFT_CLOCK_SECONDS)
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <FantasyShell reduce={reduce}>
      <FantasyTitle eyebrow="Fantasy Premier League" title="Fantasy" reduce={reduce} />
      <p className="mb-6 max-w-md text-sm leading-relaxed text-mist/75">
        H2H draft leagues built like fantasy football: snake draft with a pick clock, optional
        autodraft, rolling waivers, weekly matchups, and a 10-week playoff bracket.
      </p>

      {fantasy.catalogError ? (
        <p className="mb-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {fantasy.catalogError}
        </p>
      ) : null}
      {fantasy.syncError ? (
        <p className="mb-4 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
          {fantasy.syncError}
        </p>
      ) : null}

      {mode === 'menu' ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Your manager name
          </label>
          <FantasyInput
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              fantasy.setDisplayName(e.target.value)
            }}
            placeholder="e.g. Brayden"
          />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <FantasyButton className="flex-1" onClick={() => setMode('create')}>
              Create league
            </FantasyButton>
            <FantasyButton className="flex-1" variant="ghost" onClick={() => setMode('join')}>
              Join with invite
            </FantasyButton>
          </div>

          {fantasy.leagues.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">
                Your leagues
              </h2>
              <ul className="space-y-2">
                {fantasy.leagues.map((league) => (
                  <li key={league.id}>
                    <button
                      type="button"
                      onClick={() => fantasy.setActiveLeagueId(league.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-lime/40 hover:bg-white/[0.07]"
                    >
                      <span>
                        <span className="block font-semibold text-cream">{league.name}</span>
                        <span className="text-xs text-mist/60">
                          {phaseLabel(league.phase)} · {league.members.length}/{league.teamCount} ·{' '}
                          {league.draftClockSeconds || 90}s clock
                        </span>
                      </span>
                      <span className="text-lime" aria-hidden>
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="mt-8 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-mist/70">
            <summary className="cursor-pointer font-semibold text-cream">League defaults</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
              <li>{DEFAULT_ROSTER_SPOTS} roster spots (11 starters + 7 bench)</li>
              <li>
                XI bands: GKP {STARTER_MIN.GKP} · DEF {STARTER_MIN.DEF}–{STARTER_MAX.DEF} · MID{' '}
                {STARTER_MIN.MID}–{STARTER_MAX.MID} · FWD {STARTER_MIN.FWD}–{STARTER_MAX.FWD}
              </li>
              <li>Snake draft + pick clock + optional autodraft</li>
              <li>Rolling waiver priority; drops go on waivers; clear players are open FA</li>
              <li>Playoffs: last 10 GWs — 5-game semis (1v4, 2v3) + 5-game final</li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed">{SCORING_BLURB}</p>
          </details>
        </motion.div>
      ) : null}

      {mode === 'create' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            fantasy.setDisplayName(name)
            void fantasy
              .create(leagueName, teamCount, clock)
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : 'Could not create league'),
              )
              .finally(() => setBusy(false))
          }}
        >
          <FantasyButton variant="ghost" onClick={() => setMode('menu')} className="self-start">
            ← Back
          </FantasyButton>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Manager name
          </label>
          <FantasyInput value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            League name
          </label>
          <FantasyInput value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Managers (even only)
          </label>
          <FantasySelect value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))}>
            {ALLOWED_TEAM_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n} teams
              </option>
            ))}
          </FantasySelect>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Draft pick clock
          </label>
          <FantasySelect value={clock} onChange={(e) => setClock(Number(e.target.value))}>
            {ALLOWED_DRAFT_CLOCKS.map((n) => (
              <option key={n} value={n}>
                {n} seconds
              </option>
            ))}
          </FantasySelect>
          <p className="text-xs text-mist/55">
            {DEFAULT_ROSTER_SPOTS}-man rosters · snake draft · waivers after draft. Even team count
            keeps weekly matchups clean.
          </p>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <FantasyButton type="submit" disabled={busy || fantasy.syncing}>
            {busy || fantasy.syncing ? 'Creating…' : 'Create FPL league'}
          </FantasyButton>
        </form>
      ) : null}

      {mode === 'join' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            fantasy.setDisplayName(name)
            const run = invite.includes('-')
              ? fantasy.joinByBlob(invite, name)
              : fantasy.join(invite, name)
            void run
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : 'Could not join'),
              )
              .finally(() => setBusy(false))
          }}
        >
          <FantasyButton variant="ghost" onClick={() => setMode('menu')} className="self-start">
            ← Back
          </FantasyButton>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Manager name
          </label>
          <FantasyInput value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Invite code
          </label>
          <FantasyInput
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Paste invite from commissioner"
            required
          />
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <FantasyButton type="submit" disabled={busy || fantasy.syncing}>
            {busy || fantasy.syncing ? 'Joining…' : 'Join league'}
          </FantasyButton>
        </form>
      ) : null}
    </FantasyShell>
  )
}

function FantasyLeagueHub({ fantasy, reduce }: { fantasy: FantasyApi; reduce: boolean | null }) {
  const league = fantasy.activeLeague!
  const [tab, setTab] = useState<HubTab>(
    league.phase === 'drafting' || league.phase === 'draft_setup' ? 'draft' : 'home',
  )
  const tabs: Array<{ id: HubTab; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'draft', label: 'Draft' },
    { id: 'roster', label: 'Roster' },
    { id: 'matchup', label: 'Matchup' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'standings', label: 'Table' },
  ]

  return (
    <FantasyShell reduce={reduce}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => fantasy.setActiveLeagueId(null)}
            className="text-sm font-semibold text-mist/70 transition hover:text-lime"
          >
            ← Leagues
          </button>
          <h1 className="mt-2 font-display text-4xl tracking-[0.04em] text-cream sm:text-5xl">
            {league.name}
          </h1>
          <p className="mt-1 text-xs text-mist/60">
            Premier League · {phaseLabel(league.phase)} · {league.members.length}/{league.teamCount}{' '}
            · {league.rosterSpots}-man
          </p>
        </div>
        <FantasyButton variant="ghost" onClick={() => void fantasy.refreshActive()}>
          Sync
        </FantasyButton>
      </div>

      <div className="scrollbar-hide -mx-1 mb-5 flex gap-1 overflow-x-auto px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              tab === t.id ? 'bg-lime text-ink' : 'bg-white/5 text-mist hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'home' ? <LobbyPanel fantasy={fantasy} /> : null}
      {tab === 'draft' ? <DraftPanel fantasy={fantasy} /> : null}
      {tab === 'roster' ? <RosterPanel fantasy={fantasy} /> : null}
      {tab === 'matchup' ? <MatchupPanel fantasy={fantasy} /> : null}
      {tab === 'waivers' ? <WaiversPanel fantasy={fantasy} /> : null}
      {tab === 'trades' ? <TradesPanel fantasy={fantasy} /> : null}
      {tab === 'standings' ? <StandingsPanel fantasy={fantasy} /> : null}
    </FantasyShell>
  )
}

function LobbyPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const isCommish = fantasy.me?.isCommissioner
  const [copied, setCopied] = useState(false)
  const invite = league.syncBlobId || league.inviteCode

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Invite</h2>
        <p className="mt-2 break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-xs text-cream">
          {invite}
        </p>
        <div className="mt-3 flex gap-2">
          <FantasyButton
            onClick={() => {
              void navigator.clipboard
                .writeText(invite)
                .then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                })
                .catch(() => {
                  alert('Copy failed — long-press the invite code to copy it.')
                })
            }}
          >
            {copied ? 'Copied' : 'Copy invite'}
          </FantasyButton>
        </div>
      </section>

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
            Autodraft picks the best season-projection fit when you&apos;re on the clock (or when the
            clock hits zero for anyone).
          </span>
        </div>
        {isCommish && league.phase !== 'drafting' ? (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
              Pick clock
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
          <p className="mt-3 text-xs text-mist/55">
            Pick clock: {league.draftClockSeconds || 90}s
          </p>
        )}
      </section>

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
                {m.draftSlot ? ` · Pick ${m.draftSlot}` : ''}
              </span>
            </li>
          ))}
        </ul>
        {league.members.length < league.teamCount ? (
          <p className="mt-2 text-xs text-amber-100/80">
            Waiting for {league.teamCount - league.members.length} more…
          </p>
        ) : (
          <p className="mt-2 text-xs text-lime/90">League is full — set draft order when ready.</p>
        )}
      </section>

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
            Start snake draft
          </FantasyButton>
        </section>
      ) : null}

      {league.draftOrder.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">
            Snake draft order
          </h2>
          <ol className="space-y-1">
            {league.draftOrder.map((id, i) => {
              const m = league.members.find((x) => x.id === id)
              return (
                <li key={id} className="text-sm text-cream">
                  <span className="text-lime">{i + 1}.</span> {m?.name ?? id}
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
          Regular season GW 1–{league.playoffStartGw - 1}. Playoffs last 10 matchweeks: semis GW
          29–33 (1 vs 4, 2 vs 3), finals GW 34–38. Aggregate starter points; higher seed wins ties.
        </p>
      </section>
    </div>
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
        const m = league.members.find((x) => x.id === id)
        return (
          <div key={id} className="flex items-center gap-2 text-sm">
            <span className="w-6 text-lime">{index + 1}</span>
            <span className="flex-1 text-cream">{m?.name}</span>
            <FantasyButton
              variant="ghost"
              disabled={index === 0}
              onClick={() => {
                const next = [...order]
                ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                setOrder(next)
              }}
            >
              ↑
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
              ↓
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
  const taken = useMemo(() => new Set(league.draftPicks.map((p) => p.playerId)), [league.draftPicks])
  const turn = snakeMemberForPick(league.draftOrder, league.draftPickIndex)
  const myTurn = turn?.memberId === fantasy.me?.id
  const total = totalDraftPicks(league.teamCount, league.rosterSpots)
  const clockLabel = useClockLabel(league.draftPickDeadlineAt)

  const board = useMemo(() => {
    const list = fantasy.catalog?.players ?? []
    return list
      .filter((p) => !taken.has(p.id))
      .filter((p) => (pos === 'ALL' ? true : p.pos === pos))
      .filter((p) => {
        if (!q.trim()) return true
        const s = q.toLowerCase()
        return (
          p.webName.toLowerCase().includes(s) ||
          p.secondName.toLowerCase().includes(s) ||
          p.teamShort.toLowerCase().includes(s)
        )
      })
      .slice(0, 80)
  }, [fantasy.catalog?.players, pos, q, taken])

  if (league.phase === 'lobby') {
    return (
      <p className="text-sm text-mist/70">
        Fill the league and set draft order on Home before the snake draft begins.
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
      <div className="rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
              Pick {Math.min(league.draftPickIndex + 1, total)} / {total}
              {turn ? ` · Round ${turn.round}` : ''}
            </p>
            <p className="mt-1 text-sm text-cream">
              {league.phase === 'draft_setup'
                ? 'Order set — start the draft from Home.'
                : myTurn
                  ? fantasy.me?.autodraft
                    ? 'Autodraft is on — best available will be taken for you.'
                    : 'You are on the clock.'
                  : `On the clock: ${league.members.find((m) => m.id === turn?.memberId)?.name ?? '…'}`}
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
          .join(' · ')}
      </p>

      <ul className="space-y-1.5">
        {board.map((p, index) => (
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
                Season {p.seasonProjection.toFixed(0)} · Week {p.weekProjection.toFixed(1)} · £
                {p.cost.toFixed(1)}m
              </p>
            </div>
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
          </li>
        ))}
      </ul>

      <PickList league={league} fantasy={fantasy} />
    </div>
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
              {pick.auto ? <span className="text-lime"> · auto</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RosterPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const me = fantasy.me
  const [starters, setStarters] = useState<number[]>(me?.starters ?? [])

  useEffect(() => {
    setStarters(me?.starters ?? [])
  }, [me?.id, me?.starters])

  if (!me) return <p className="text-sm text-mist/70">Join this league to manage a roster.</p>

  const lineupIssue = validateStarters(
    me.starters,
    me.roster,
    league.starterSpots,
    fantasy.playerMap,
  )

  const toggle = (id: number) => {
    setStarters((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= league.starterSpots) return prev
      return [...prev, id]
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-mist/70">
        {me.roster.length}/{league.rosterSpots} rostered · start {league.starterSpots} (
        {Object.entries(STARTER_MIN)
          .map(([k, v]) => `${v}+ ${k}`)
          .join(', ')}
        ).
      </p>
      {lineupIssue ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/90">
          Lineup incomplete — {lineupIssue}. Use Optimize XI or save a full starting XI before scoring.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <FantasyButton
          variant="ghost"
          onClick={() => {
            try {
              fantasy.optimizeLineup()
              setStarters(fantasy.me?.starters ?? starters)
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : 'Failed')
            }
          }}
        >
          Optimize XI
        </FantasyButton>
        <FantasyButton
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
      <ul className="space-y-2">
        {me.roster.map((id) => {
          const p = fantasy.playerMap.get(id)
          const on = starters.includes(id)
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-cream">{playerLabel(p, id)}</p>
                <p className="text-[11px] text-mist/50">
                  Week {p?.weekProjection.toFixed(1) ?? '—'} · Season{' '}
                  {p?.seasonProjection.toFixed(0) ?? '—'}
                </p>
              </div>
              <FantasyButton variant={on ? 'primary' : 'ghost'} onClick={() => toggle(id)}>
                {on ? 'Starting' : 'Bench'}
              </FantasyButton>
              <FantasyButton
                variant="danger"
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
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MatchupPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const gw = league.currentGw
  const [viewGw, setViewGw] = useState(gw)
  const weekMatchups = league.matchups.filter((m) => m.gw === viewGw)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FantasyButton variant="ghost" disabled={viewGw <= 1} onClick={() => setViewGw((g) => g - 1)}>
          ←
        </FantasyButton>
        <span className="text-sm font-semibold text-cream">Gameweek {viewGw}</span>
        <FantasyButton
          variant="ghost"
          disabled={viewGw >= league.seasonGws}
          onClick={() => setViewGw((g) => g + 1)}
        >
          →
        </FantasyButton>
        {fantasy.me?.isCommissioner ? (
          <FantasyButton
            className="ml-auto"
            onClick={() => {
              try {
                fantasy.runScoreGw(viewGw)
              } catch (err: unknown) {
                alert(err instanceof Error ? err.message : 'Score failed')
              }
            }}
          >
            Process & score
          </FantasyButton>
        ) : null}
      </div>
      <p className="text-xs text-mist/50">
        Commissioner scoring also processes pending waiver claims first (weekly wire).
      </p>

      {weekMatchups.length === 0 ? (
        <p className="text-sm text-mist/65">No matchups for this week yet (finish the draft first).</p>
      ) : (
        <ul className="space-y-3">
          {weekMatchups.map((mu) => {
            const home = league.members.find((m) => m.id === mu.home.memberId)
            const away = league.members.find((m) => m.id === mu.away.memberId)
            return (
              <li key={mu.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist/50">
                  {mu.kind}
                  {mu.scored ? ' · final' : ''}
                </p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-cream">{home?.name}</span>
                  <span className="font-display text-2xl text-lime">{mu.home.points}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-cream">{away?.name}</span>
                  <span className="font-display text-2xl text-cream">{mu.away.points}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {league.playoffs.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Playoff series
          </h3>
          {league.playoffs.map((series) => {
            const agg = seriesAggregate(league, series.id)
            const a = league.members.find((m) => m.id === series.memberAId)
            const b = league.members.find((m) => m.id === series.memberBId)
            return (
              <div
                key={series.id}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <p className="text-xs text-lime">
                  {series.kind} · #{series.seedA} vs #{series.seedB} · GW {series.gws[0]}–
                  {series.gws[series.gws.length - 1]}
                </p>
                <p className="mt-1 text-cream">
                  {a?.name} {agg?.a ?? 0} – {agg?.b ?? 0} {b?.name}
                </p>
                {series.winnerId ? (
                  <p className="text-xs text-mist/60">
                    Winner: {league.members.find((m) => m.id === series.winnerId)?.name}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
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
        const s = q.toLowerCase()
        return p.webName.toLowerCase().includes(s) || p.teamShort.toLowerCase().includes(s)
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
      <div className="flex gap-2">
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
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
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
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
              Pending claims
            </h3>
            <ul className="space-y-2">
              {(league.waiverClaims ?? [])
                .filter((c) => c.status === 'pending')
                .map((c) => {
                  const m = league.members.find((x) => x.id === c.memberId)
                  return (
                    <li
                      key={c.id}
                      className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
                    >
                      <p className="text-cream">
                        {m?.name}: +{fantasy.playerMap.get(c.addPlayerId)?.webName ?? c.addPlayerId}
                        {c.dropPlayerId
                          ? ` / −${fantasy.playerMap.get(c.dropPlayerId)?.webName ?? c.dropPlayerId}`
                          : ''}
                      </p>
                      {c.memberId === fantasy.identity.memberId ? (
                        <FantasyButton
                          className="mt-2"
                          variant="ghost"
                          onClick={() => fantasy.cancelClaim(c.id)}
                        >
                          Cancel
                        </FantasyButton>
                      ) : null}
                    </li>
                  )
                })}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-mist/70">
            {mode === 'wire'
              ? 'Submit a claim — processed by priority (or when the commissioner scores a GW).'
              : 'Open free agents add instantly. Drops go onto the waiver wire.'}
          </p>
          {needDrop && fantasy.me ? (
            <FantasySelect
              value={dropId}
              onChange={(e) => setDropId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Drop player…</option>
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
                    Week {p.weekProjection.toFixed(1)} · Season {p.seasonProjection.toFixed(0)}
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

function TradesPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const me = fantasy.me
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
        <FantasySelect value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">Trade partner…</option>
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
            <div>
              <p className="mb-1 text-xs text-lime">You offer</p>
              {me.roster.map((id) => (
                <label key={id} className="mb-1 flex items-center gap-2 text-xs text-cream">
                  <input
                    type="checkbox"
                    checked={offer.includes(id)}
                    onChange={() => toggle(offer, id, setOffer)}
                  />
                  {playerLabel(fantasy.playerMap.get(id), id)}
                </label>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs text-lime">You request</p>
              {partner.roster.map((id) => (
                <label key={id} className="mb-1 flex items-center gap-2 text-xs text-cream">
                  <input
                    type="checkbox"
                    checked={request.includes(id)}
                    onChange={() => toggle(request, id, setRequest)}
                  />
                  {playerLabel(fantasy.playerMap.get(id), id)}
                </label>
              ))}
            </div>
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
          {league.trades.slice(0, 20).map((t) => {
            const from = league.members.find((m) => m.id === t.fromMemberId)
            const to = league.members.find((m) => m.id === t.toMemberId)
            return (
              <li
                key={t.id}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <p className="text-cream">
                  {from?.name} → {to?.name}{' '}
                  <span className="text-xs text-mist/50">({t.status})</span>
                </p>
                <p className="mt-1 text-xs text-mist/60">
                  Offer:{' '}
                  {t.offerPlayerIds.map((id) => fantasy.playerMap.get(id)?.webName ?? id).join(', ') ||
                    '—'}
                </p>
                <p className="text-xs text-mist/60">
                  Request:{' '}
                  {t.requestPlayerIds
                    .map((id) => fantasy.playerMap.get(id)?.webName ?? id)
                    .join(', ') || '—'}
                </p>
                {t.status === 'pending' ? (
                  <div className="mt-2 flex gap-2">
                    {fantasy.identity.memberId === t.toMemberId ? (
                      <>
                        <FantasyButton
                          onClick={() => {
                            try {
                              fantasy.decideTrade(t.id, 'accepted')
                            } catch (err: unknown) {
                              alert(err instanceof Error ? err.message : 'Failed')
                            }
                          }}
                        >
                          Accept
                        </FantasyButton>
                        <FantasyButton
                          variant="danger"
                          onClick={() => fantasy.decideTrade(t.id, 'rejected')}
                        >
                          Reject
                        </FantasyButton>
                      </>
                    ) : null}
                    {fantasy.identity.memberId === t.fromMemberId ? (
                      <FantasyButton
                        variant="ghost"
                        onClick={() => fantasy.decideTrade(t.id, 'canceled')}
                      >
                        Cancel
                      </FantasyButton>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function StandingsPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const ranked = standingsRank(league.members)

  return (
    <div className="space-y-3">
      <p className="text-xs text-mist/55">
        Top 4 after GW {league.playoffStartGw - 1} make the playoffs (1v4, 2v3).
      </p>
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
