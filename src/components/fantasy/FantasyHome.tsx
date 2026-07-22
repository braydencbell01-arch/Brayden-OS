import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { scoringBlurb, SCORING_PRESET_OPTIONS } from '../../lib/fantasy/scoringPresets'
import type { DraftMode, ScoringPreset } from '../../lib/fantasy/types'
import {
  ALLOWED_DRAFT_CLOCKS,
  ALLOWED_TEAM_COUNTS,
  DEFAULT_DRAFT_CLOCK_SECONDS,
  DEFAULT_ROSTER_SPOTS,
  STARTER_FLEX_SLOTS,
  STARTER_MAX,
  STARTER_MIN,
} from '../../lib/fantasy/types'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import {
  FantasyButton,
  FantasyInput,
  FantasySelect,
  FantasyShell,
  FantasyTitle,
  phaseLabel,
} from './FantasyChrome'

type HomeMode = 'menu' | 'create' | 'join'

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
}: {
  fantasy: FantasyApi
  reduce: boolean | null
}) {
  const [mode, setMode] = useState<HomeMode>(fantasy.pendingInvite ? 'join' : 'menu')
  const [name, setName] = useState(fantasy.identity.displayName)
  const [leagueName, setLeagueName] = useState('American FF League')
  const [teamCount, setTeamCount] = useState(8)
  const [clock, setClock] = useState(DEFAULT_DRAFT_CLOCK_SECONDS)
  const [draftMode, setDraftMode] = useState<DraftMode>('snake')
  const [scoringPreset, setScoringPreset] = useState<ScoringPreset>('classic')
  const [quickFillBots, setQuickFillBots] = useState(false)
  const [invite, setInvite] = useState(fantasy.pendingInvite ?? '')
  const [error, setError] = useState<string | null>(null)
  const [reminderStatus, setReminderStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
        American fantasy football energy for Premier League: matchup center, MID/FWD flex,
        IR spots, trade veto review, snake or auction drafts, and auto-score gameweeks.
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
                          {phaseLabel(league.phase)} · {league.draftMode} · {league.members.length}/
                          {league.teamCount} · {league.draftClockSeconds || 90}s clock
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
              Quick league
            </FantasyButton>
            <FantasyButton className="sm:col-span-1" onClick={() => setMode('create')}>
              Create custom
            </FantasyButton>
            <FantasyButton className="sm:col-span-1" variant="ghost" onClick={() => setMode('join')}>
              Join with invite
            </FantasyButton>
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
            <summary className="cursor-pointer font-semibold text-cream">League defaults</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
              <li>{DEFAULT_ROSTER_SPOTS} roster spots (11 starters + 7 bench)</li>
              <li>
                XI bands: GKP {STARTER_MIN.GKP} - DEF {STARTER_MIN.DEF}-{STARTER_MAX.DEF} - MID{' '}
                {STARTER_MIN.MID}-{STARTER_MAX.MID} - FWD {STARTER_MIN.FWD}-{STARTER_MAX.FWD} -{' '}
                {STARTER_FLEX_SLOTS} FLEX
              </li>
              <li>Snake queue/autodraft or live auction nomination and bidding</li>
              <li>IR stash, trade veto review, auto-score, and playoff aggregate series</li>
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
                  draftClockSeconds: clock,
                  draftMode,
                  scoringPreset,
                  quickFillBots,
                  managerName: name,
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
            League name
          </label>
          <FantasyInput value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                Draft mode
              </span>
              <FantasySelect value={draftMode} onChange={(e) => setDraftMode(e.target.value as DraftMode)}>
                <option value="snake">Snake</option>
                <option value="auction">Auction</option>
              </FantasySelect>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
                Teams
              </span>
              <FantasySelect value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))}>
                {ALLOWED_TEAM_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n} teams
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
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Draft clock
          </label>
          <FantasySelect value={clock} onChange={(e) => setClock(Number(e.target.value))}>
            {ALLOWED_DRAFT_CLOCKS.map((n) => (
              <option key={n} value={n}>
                {n} seconds
              </option>
            ))}
          </FantasySelect>
          <label className="flex items-center gap-2 text-sm text-cream">
            <input
              type="checkbox"
              checked={quickFillBots}
              onChange={(e) => setQuickFillBots(e.target.checked)}
            />
            Fill empty seats with bots
          </label>
          <p className="text-xs text-mist/55">
            {DEFAULT_ROSTER_SPOTS}-man rosters, American FF flex, IR, veto review, and auto-score.
            Even team counts keep weekly matchups clean.
          </p>
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
