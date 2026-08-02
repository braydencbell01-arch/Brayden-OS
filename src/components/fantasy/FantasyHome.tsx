import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { scoringBlurb, SCORING_PRESET_OPTIONS } from '../../lib/fantasy/scoringPresets'
import type { DraftMode, FantasyGameMode, ScoringPreset } from '../../lib/fantasy/types'
import {
  ALLOWED_DRAFT_CLOCKS,
  ALLOWED_SURVIVAL_LIVES,
  ALLOWED_SURVIVAL_TEAM_COUNTS,
  ALLOWED_TEAM_COUNTS,
  DEFAULT_DRAFT_CLOCK_SECONDS,
  DEFAULT_ROSTER_SPOTS,
  SEASON_GWS,
  STARTER_FLEX_SLOTS,
  STARTER_MAX,
  STARTER_MIN,
} from '../../lib/fantasy/types'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import type { PlayerNavRef } from '../PlayerProfileScreen'
import {
  FantasyButton,
  FantasyInput,
  FantasySelect,
  FantasyShell,
  FantasyTitle,
  phaseLabel,
} from './FantasyChrome'
import { FantasyResearchPanel } from './FantasyResearchPanel'

type HomeMode = 'menu' | 'create' | 'join'

function SeasonStatusBanner({ fantasy }: { fantasy: FantasyApi }) {
  const finished = fantasy.catalog?.finishedGws ?? 0
  const current = fantasy.catalog?.currentGw ?? 0
  if (!fantasy.catalog) return null
  if (finished >= 38 || current >= 38) {
    return (
      <div className="mb-4 border border-star/30 bg-star/10 px-4 py-3 text-sm text-cream">
        <p className="font-semibold">Between Premier League seasons</p>
        <p className="mt-1 text-xs text-mist/75">
          The FPL catalog is at GW {current} ({finished} finished). Draft rooms still work —
          weekly scoring uses projections until the new season feeds in.
        </p>
      </div>
    )
  }
  return null
}

function inviteFromInput(input: string): string {
  const raw = input.trim()
  if (!raw) return raw

  try {
    const url = new URL(raw)
    const hash = url.hash.replace(/^#/, '')
    const invite = new URLSearchParams(hash).get('fantasy-join')
    if (invite) return invite.trim()
  } catch {
    // Plain invite codes are expected most of the time.
  }

  const hashIndex = raw.indexOf('#')
  if (hashIndex >= 0) {
    const invite = new URLSearchParams(raw.slice(hashIndex + 1)).get('fantasy-join')
    if (invite) return invite.trim()
  }

  return raw
}

function isFullBlobInvite(invite: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invite)
}

export function FantasyHome({
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
  const [mode, setMode] = useState<HomeMode>(fantasy.pendingInvite ? 'join' : 'menu')
  const [researchOpen, setResearchOpen] = useState(Boolean(initialResearchTab))
  const [name, setName] = useState(fantasy.identity.displayName)
  const [gameMode, setGameMode] = useState<FantasyGameMode>('survival')
  const [leagueName, setLeagueName] = useState('EPL Survival')
  const [teamCount, setTeamCount] = useState(8)
  const [clock, setClock] = useState(DEFAULT_DRAFT_CLOCK_SECONDS)
  const [draftMode, setDraftMode] = useState<DraftMode>('snake')
  const [scoringPreset, setScoringPreset] = useState<ScoringPreset>('classic')
  const [lives, setLives] = useState(1)
  const [drawCountsAsSurvive, setDrawCountsAsSurvive] = useState(true)
  const [byeCountsAsSurvive, setByeCountsAsSurvive] = useState(true)
  const [startGw, setStartGw] = useState(1)
  const [endGw, setEndGw] = useState(SEASON_GWS)
  const [quickFillBots, setQuickFillBots] = useState(false)
  const [invite, setInvite] = useState(fantasy.pendingInvite ?? '')
  const [error, setError] = useState<string | null>(null)
  const [reminderStatus, setReminderStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const teamCountOptions =
    gameMode === 'survival' ? ALLOWED_SURVIVAL_TEAM_COUNTS : ALLOWED_TEAM_COUNTS

  useEffect(() => {
    if (!fantasy.pendingInvite) return
    setInvite(fantasy.pendingInvite)
    setMode('join')
  }, [fantasy.pendingInvite])

  const runBusy = (work: () => Promise<unknown> | unknown, fallback: string) => {
    setBusy(true)
    setError(null)
    Promise.resolve()
      .then(work)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : fallback))
      .finally(() => setBusy(false))
  }

  return (
    <FantasyShell reduce={reduce}>
      <FantasyTitle eyebrow="Fantasy Premier League" title="Fantasy" reduce={reduce} />
      <p className="mb-5 max-w-md text-sm leading-relaxed text-mist/75">
        Default mode is EPL Survival — each week pick a club that must not lose, and you can only
        use each club once. Or switch to American FF H2H drafts when you want matchups and waivers.
      </p>
      <SeasonStatusBanner fantasy={fantasy} />

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
      {error ? <p className="mb-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}

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

          {fantasy.leagues.length > 0 ? (
            <div className="mb-2">
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
                          {phaseLabel(league.phase)} ·{' '}
                          {league.gameMode === 'survival'
                            ? `survival · ${league.survival?.lives ?? 1} ${
                                (league.survival?.lives ?? 1) === 1 ? 'life' : 'lives'
                              }`
                            : `${league.draftMode} · ${league.draftClockSeconds || 90}s clock`}{' '}
                          · {league.members.length}/{league.teamCount}
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

          <div className="grid gap-2 sm:grid-cols-2">
            <FantasyButton
              disabled={busy || !fantasy.catalog}
              onClick={() => runBusy(() => fantasy.loadDemoLeague(), 'Could not load demo league')}
            >
              Spectator demo
            </FantasyButton>
            <FantasyButton
              disabled={busy || fantasy.syncing}
              variant="ghost"
              onClick={() => {
                fantasy.setDisplayName(name)
                runBusy(() => fantasy.createQuickLeague(), 'Could not create quick league')
              }}
            >
              Quick Survival
            </FantasyButton>
            <FantasyButton className="sm:col-span-1" onClick={() => setMode('create')}>
              Create custom
            </FantasyButton>
            <FantasyButton className="sm:col-span-1" variant="ghost" onClick={() => setMode('join')}>
              Join with invite
            </FantasyButton>
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
                  Draft research
                </h2>
                <p className="mt-1 text-xs text-mist/60">
                  FPL value board and player compare — moved here from Stats.
                </p>
              </div>
              <FantasyButton
                variant="ghost"
                className="shrink-0"
                onClick={() => setResearchOpen((open) => !open)}
              >
                {researchOpen ? 'Hide' : 'Open'}
              </FantasyButton>
            </div>
            {researchOpen ? (
              <div className="mt-4">
                <FantasyResearchPanel
                  catalog={fantasy.catalog}
                  onOpenPlayer={onOpenPlayer}
                  initialTab={initialResearchTab ?? 'value'}
                />
              </div>
            ) : null}
          </div>

          {!fantasy.catalog && !fantasy.catalogError ? (
            <p className="text-xs text-mist/55">Loading player catalog…</p>
          ) : null}

          <FantasyButton
            variant="ghost"
            onClick={() => {
              void fantasy.enableReminders().then((status) => {
                setReminderStatus(
                  status === 'granted'
                    ? 'Reminders enabled for draft clocks and lineup locks.'
                    : status === 'unsupported'
                      ? 'This browser does not support reminders.'
                      : 'Reminders were not enabled.',
                )
              })
            }}
          >
            Enable reminders
          </FantasyButton>
          {reminderStatus ? <p className="text-xs text-mist/60">{reminderStatus}</p> : null}

          <details className="mt-7 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-mist/70">
            <summary className="cursor-pointer font-semibold text-cream">Mode defaults</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
              <li>
                <span className="text-cream">Survival (default):</span> weekly club pick, no
                repeats, draws survive, 1 life
              </li>
              <li>
                <span className="text-cream">H2H draft:</span> {DEFAULT_ROSTER_SPOTS}-man rosters,
                GKP {STARTER_MIN.GKP} / DEF {STARTER_MIN.DEF}-{STARTER_MAX.DEF} / MID{' '}
                {STARTER_MIN.MID}-{STARTER_MAX.MID} / FWD {STARTER_MIN.FWD}-{STARTER_MAX.FWD} /{' '}
                {STARTER_FLEX_SLOTS} FLEX
              </li>
              <li>H2H also includes snake/auction drafts, IR, veto review, and playoffs</li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed">{scoringBlurb('classic')}</p>
          </details>
        </motion.div>
      ) : null}

      {mode === 'create' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            fantasy.setDisplayName(name)
            runBusy(
              () =>
                fantasy.create(leagueName, teamCount, {
                  gameMode,
                  draftClockSeconds: clock,
                  draftMode,
                  scoringPreset,
                  survival:
                    gameMode === 'survival'
                      ? {
                          lives,
                          drawCountsAsSurvive,
                          byeCountsAsSurvive,
                          startGw,
                          endGw,
                        }
                      : undefined,
                  quickFillBots,
                }),
              'Could not create league',
            )
          }}
        >
          <FantasyButton variant="ghost" onClick={() => setMode('menu')} className="self-start">
            &lt;- Back
          </FantasyButton>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Manager name
          </label>
          <FantasyInput
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              fantasy.setDisplayName(e.target.value)
            }}
            required
          />
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Game mode
          </label>
          <FantasySelect
            value={gameMode}
            onChange={(e) => {
              const next = e.target.value as FantasyGameMode
              setGameMode(next)
              setLeagueName(next === 'survival' ? 'EPL Survival' : 'American FF League')
              if (next === 'survival' && !ALLOWED_SURVIVAL_TEAM_COUNTS.includes(teamCount as (typeof ALLOWED_SURVIVAL_TEAM_COUNTS)[number])) {
                setTeamCount(8)
              }
              if (next === 'h2h' && !ALLOWED_TEAM_COUNTS.includes(teamCount as (typeof ALLOWED_TEAM_COUNTS)[number])) {
                setTeamCount(8)
              }
            }}
          >
            <option value="survival">Survival (default)</option>
            <option value="h2h">H2H draft</option>
          </FantasySelect>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            League name
          </label>
          <FantasyInput value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
              Managers
            </span>
            <FantasySelect value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))}>
              {teamCountOptions.map((n) => (
                <option key={n} value={n}>
                  {n} managers
                </option>
              ))}
            </FantasySelect>
          </label>

          {gameMode === 'survival' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                    Lives
                  </span>
                  <FantasySelect value={lives} onChange={(e) => setLives(Number(e.target.value))}>
                    {ALLOWED_SURVIVAL_LIVES.map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'life' : 'lives'}
                      </option>
                    ))}
                  </FantasySelect>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                    Start GW
                  </span>
                  <FantasySelect value={startGw} onChange={(e) => setStartGw(Number(e.target.value))}>
                    {Array.from({ length: SEASON_GWS }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        GW {n}
                      </option>
                    ))}
                  </FantasySelect>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                  End GW
                </span>
                <FantasySelect
                  value={endGw}
                  onChange={(e) => setEndGw(Math.max(startGw, Number(e.target.value)))}
                >
                  {Array.from({ length: SEASON_GWS - startGw + 1 }, (_, i) => startGw + i).map(
                    (n) => (
                      <option key={n} value={n}>
                        GW {n}
                      </option>
                    ),
                  )}
                </FantasySelect>
              </label>
              <label className="flex items-center gap-2 text-sm text-cream">
                <input
                  type="checkbox"
                  checked={drawCountsAsSurvive}
                  onChange={(e) => setDrawCountsAsSurvive(e.target.checked)}
                />
                Draws count as surviving
              </label>
              <label className="flex items-center gap-2 text-sm text-cream">
                <input
                  type="checkbox"
                  checked={byeCountsAsSurvive}
                  onChange={(e) => setByeCountsAsSurvive(e.target.checked)}
                />
                No fixture / bye counts as surviving
              </label>
              <p className="text-xs text-mist/55">
                Each match week pick one Premier League club that must not lose. You cannot reuse a
                club. Last manager standing wins.
              </p>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                    Draft mode
                  </span>
                  <FantasySelect
                    value={draftMode}
                    onChange={(e) => setDraftMode(e.target.value as DraftMode)}
                  >
                    <option value="snake">Snake</option>
                    <option value="auction">Auction</option>
                  </FantasySelect>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                    Draft clock
                  </span>
                  <FantasySelect value={clock} onChange={(e) => setClock(Number(e.target.value))}>
                    {ALLOWED_DRAFT_CLOCKS.map((n) => (
                      <option key={n} value={n}>
                        {n} seconds
                      </option>
                    ))}
                  </FantasySelect>
                </label>
              </div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                Scoring preset
              </label>
              <FantasySelect
                value={scoringPreset}
                onChange={(e) => setScoringPreset(e.target.value as ScoringPreset)}
              >
                {SCORING_PRESET_OPTIONS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </FantasySelect>
              <p className="text-xs leading-relaxed text-mist/55">{scoringBlurb(scoringPreset)}</p>
              <p className="text-xs text-mist/55">
                {DEFAULT_ROSTER_SPOTS}-man rosters, American FF flex, IR, veto review, and auto-score.
              </p>
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-cream">
            <input
              type="checkbox"
              checked={quickFillBots}
              onChange={(e) => setQuickFillBots(e.target.checked)}
            />
            Fill empty seats with bots
          </label>
          <FantasyButton type="submit" disabled={busy || fantasy.syncing}>
            {busy || fantasy.syncing ? 'Creating...' : 'Create league'}
          </FantasyButton>
        </form>
      ) : null}

      {mode === 'join' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            fantasy.setDisplayName(name)
            const parsedInvite = inviteFromInput(invite)
            runBusy(
              async () => {
                if (isFullBlobInvite(parsedInvite)) {
                  await fantasy.joinByBlob(parsedInvite, name)
                } else {
                  await fantasy.join(parsedInvite, name)
                }
                fantasy.clearPendingInvite()
              },
              'Could not join',
            )
          }}
        >
          <FantasyButton variant="ghost" onClick={() => setMode('menu')} className="self-start">
            &lt;- Back
          </FantasyButton>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Manager name
          </label>
          <FantasyInput value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Invite code or link
          </label>
          <FantasyInput
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Short code or full fantasy-join link"
            required
          />
          <p className="text-xs leading-relaxed text-mist/55">
            Commissioners share a short invite code plus a link. Paste either the short code from a
            league already on this device or the full cloud link/blob invite.
          </p>
          {fantasy.pendingInvite ? (
            <FantasyButton
              variant="ghost"
              onClick={() => {
                fantasy.clearPendingInvite()
                setInvite('')
              }}
            >
              Clear pending invite
            </FantasyButton>
          ) : null}
          <FantasyButton type="submit" disabled={busy || fantasy.syncing}>
            {busy || fantasy.syncing ? 'Joining...' : 'Join league'}
          </FantasyButton>
        </form>
      ) : null}
    </FantasyShell>
  )
}
