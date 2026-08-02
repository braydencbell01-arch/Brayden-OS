import { useEffect, useMemo, useState } from 'react'
import {
  loadEplGameweekCalendar,
  playingTeamIdsForGw,
  type EplGameweekCalendar,
} from '../../lib/fantasy/eplResults'
import {
  isMemberAlive,
  pickForGw,
  survivalStandings,
  usedSurvivalTeamIds,
} from '../../lib/fantasy/survival'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import { FantasyButton } from './FantasyChrome'

export function FantasySurvivalPanel({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const me = fantasy.me
  const teams = fantasy.catalog?.teams ?? []
  const gw = league.currentGw
  const [calendar, setCalendar] = useState<EplGameweekCalendar | null>(null)
  const [calError, setCalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadEplGameweekCalendar()
      .then((data) => {
        if (alive) setCalendar(data)
      })
      .catch((err: unknown) => {
        if (alive) setCalError(err instanceof Error ? err.message : 'Calendar failed')
      })
    return () => {
      alive = false
    }
  }, [])

  const playing = useMemo(
    () => (calendar ? playingTeamIdsForGw(calendar, gw) : new Set<number>()),
    [calendar, gw],
  )

  const myPick = me ? pickForGw(me, gw) : undefined
  const used = me ? usedSurvivalTeamIds(me) : new Set<number>()
  const locked = league.survivalLockedGws.includes(gw)
  const scored = league.survivalScoredGws.includes(gw)
  const canPick =
    league.phase === 'regular' &&
    me &&
    isMemberAlive(me) &&
    !locked &&
    !scored

  const standings = survivalStandings(league)
  const settings = league.survival

  const run = (work: () => Promise<unknown> | unknown, ok?: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    Promise.resolve()
      .then(work)
      .then(() => {
        if (ok) setMessage(ok)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something failed'))
      .finally(() => setBusy(false))
  }

  if (league.phase === 'lobby') {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">
            Survival rules
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-mist/75">
            <li>Each gameweek, pick one Premier League club that must not lose.</li>
            <li>You can only use each club once all season.</li>
            <li>
              {settings.drawCountsAsSurvive
                ? 'Draws count as surviving.'
                : 'Draws count as a loss.'}
            </li>
            <li>
              {settings.lives} {settings.lives === 1 ? 'life' : 'lives'} — then you are out.
            </li>
            <li>
              Season GW {settings.startGw}–{settings.endGw}.
            </li>
          </ul>
          {fantasy.me?.isCommissioner ? (
            <FantasyButton
              className="mt-4"
              disabled={busy || league.members.length < 2}
              onClick={() => run(() => fantasy.startSurvival(), 'Season started')}
            >
              Start survival season
            </FantasyButton>
          ) : (
            <p className="mt-4 text-xs text-mist/55">Waiting for the commissioner to start.</p>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">
              GW {gw} pick
            </h2>
            <p className="mt-1 text-xs text-mist/60">
              {league.phase === 'complete'
                ? 'Season complete'
                : locked
                  ? 'Picks locked'
                  : scored
                    ? 'Already scored'
                    : 'Pick a club that must not lose'}
            </p>
          </div>
          {me ? (
            <div className="text-right text-xs text-mist/65">
              <p>
                Lives:{' '}
                <span className="font-semibold text-cream">
                  {me.survivalLivesRemaining ?? settings.lives}
                </span>
              </p>
              <p>{isMemberAlive(me) ? 'Alive' : `Out GW ${me.eliminatedAtGw}`}</p>
            </div>
          ) : null}
        </div>

        {myPick ? (
          <p className="mt-3 text-sm text-cream">
            Your pick:{' '}
            <span className="font-semibold text-lime">
              {teams.find((t) => t.id === myPick.teamId)?.name ??
                (myPick.teamId < 0 ? 'Missed pick' : `Club #${myPick.teamId}`)}
            </span>
            {myPick.result ? ` · ${myPick.result}` : null}
            {myPick.survived != null ? (myPick.survived ? ' · survived' : ' · lost life') : null}
          </p>
        ) : (
          <p className="mt-3 text-sm text-mist/60">No pick yet for GW {gw}.</p>
        )}

        {error ? <p className="mt-2 text-sm text-red-200">{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-lime">{message}</p> : null}
        {calError ? <p className="mt-2 text-xs text-amber-100">{calError}</p> : null}

        {canPick ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {teams.map((team) => {
              const alreadyUsed = used.has(team.id) && myPick?.teamId !== team.id
              const selected = myPick?.teamId === team.id
              const plays = playing.size === 0 || playing.has(team.id)
              const disabled = alreadyUsed || !plays
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={disabled || busy}
                  onClick={() =>
                    run(() => fantasy.setSurvivalClubPick(gw, team.id), `Picked ${team.short}`)
                  }
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? 'border-lime bg-lime/15 text-cream'
                      : disabled
                        ? 'border-white/5 bg-white/[0.02] text-mist/35'
                        : 'border-white/10 bg-white/[0.04] text-cream hover:border-lime/40'
                  }`}
                >
                  <span className="block font-semibold">{team.short}</span>
                  <span className="block text-[11px] opacity-70">{team.name}</span>
                  {alreadyUsed ? (
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-star">
                      Used
                    </span>
                  ) : !plays ? (
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-mist/45">
                      No fixture
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}

        {fantasy.me?.isCommissioner && league.phase === 'regular' ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <FantasyButton
              variant="ghost"
              disabled={busy || locked || scored}
              onClick={() => run(() => fantasy.lockSurvivalPicks(gw), `GW ${gw} locked`)}
            >
              Lock picks
            </FantasyButton>
            <FantasyButton
              variant="ghost"
              disabled={busy || scored}
              onClick={() => run(() => fantasy.autoPickSurvivalBots(), 'Bots picked')}
            >
              Fill bot picks
            </FantasyButton>
            <FantasyButton
              disabled={busy || scored}
              onClick={() =>
                run(() => fantasy.resolveSurvivalGw(gw), `GW ${gw} scored from EPL results`)
              }
            >
              Score GW from results
            </FantasyButton>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">
          Survival table
        </h2>
        <ul className="space-y-2">
          {standings.map((member, index) => {
            const pick = pickForGw(member, gw)
            const club = teams.find((t) => t.id === pick?.teamId)
            const alive = isMemberAlive(member)
            return (
              <li
                key={member.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  alive ? 'border-white/10 bg-white/[0.04]' : 'border-white/5 bg-black/20 opacity-70'
                }`}
              >
                <div>
                  <p className="font-semibold text-cream">
                    <span className="mr-2 text-lime">{index + 1}.</span>
                    {member.name}
                    {member.id === me?.id ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-mist/60">
                    {alive
                      ? `${member.survivalLivesRemaining ?? settings.lives} ${
                          (member.survivalLivesRemaining ?? settings.lives) === 1 ? 'life' : 'lives'
                        }`
                      : `Eliminated GW ${member.eliminatedAtGw}`}
                    {club ? ` · GW ${gw}: ${club.short}` : pick?.teamId === -1 ? ' · Missed pick' : ''}
                  </p>
                </div>
                <span className={`text-xs font-bold ${alive ? 'text-lime' : 'text-star'}`}>
                  {alive ? 'IN' : 'OUT'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-mist/65">
        <p className="font-semibold text-cream">How scoring works</p>
        <p className="mt-2">
          After the gameweek, the commissioner scores from live Premier League results. Your club
          must {settings.drawCountsAsSurvive ? 'avoid defeat' : 'win'}. Each club can only be chosen
          once. Missed picks cost a life.
        </p>
      </section>
    </div>
  )
}
