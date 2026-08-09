import { useState } from 'react'
import { SEASON_FREE_TRACK } from './clubMeta'
import {
  claimEventReward,
  claimSeasonReward,
  kingInfo,
  loadEvents,
  loadProfile,
  loadSeason,
  noteEventWin,
  saveProfile,
  type EventsState,
  type SeasonState,
} from './storage'

type Props = {
  onPlay: (opponentName?: string | null) => void
}

export function EventsScreen({ onPlay }: Props) {
  const [season, setSeason] = useState<SeasonState>(() => loadSeason())
  const [events, setEvents] = useState<EventsState>(() => loadEvents())
  const [toast, setToast] = useState<string | null>(null)
  const [tourWins, setTourWins] = useState(0)
  const king = kingInfo()
  const profile = loadProfile()

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function refresh() {
    setEvents(loadEvents())
    setSeason(loadSeason())
  }

  function playClassic() {
    const win = Math.random() < 0.6
    if (win) {
      noteEventWin('classic')
      const p = loadProfile()
      p.gold += 30
      p.xp += 25
      saveProfile(p)
      flash('Classic challenge win! +30g')
    } else {
      flash('Classic challenge loss — try again')
    }
    refresh()
  }

  function playSudden() {
    const win = Math.random() < 0.5
    if (win) {
      noteEventWin('sudden')
      const p = loadProfile()
      p.gold += 40
      p.xp += 30
      saveProfile(p)
      flash('Sudden death win! +40g')
    } else {
      flash('Sudden death loss')
    }
    refresh()
  }

  function playTournament() {
    const win = Math.random() < 0.55
    if (!win) {
      flash('Tournament loss — streak reset')
      setTourWins(0)
      return
    }
    const next = tourWins + 1
    setTourWins(next)
    const p = loadProfile()
    p.gold += 25 + next * 15
    p.xp += 20
    if (next >= 5) {
      p.gems += 10
      p.gold += 300
      saveProfile(p)
      setTourWins(0)
      flash('Global Tournament complete! +10 gems · +300g')
    } else {
      saveProfile(p)
      flash(`Tournament win ${next}/5`)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Events
        </h1>
        <p className="text-sm font-semibold text-white/70">
          King Lv {king.level} · {king.into}/{king.need} XP · Season {season.seasonId}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#5a3a9a,#2a1848)' }}
        >
          <p className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
            Season Pass
          </p>
          <p className="text-xs font-bold text-white/80">
            {season.points} points · free track rewards
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/35">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round((season.points / 400) * 100))}%`,
                background: 'linear-gradient(90deg,#ffe08a,#f5d76e)',
              }}
            />
          </div>
          <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
            {SEASON_FREE_TRACK.map((tier, i) => {
              const claimed = season.claimed.includes(i)
              const ready = season.points >= tier.points && !claimed
              const label = [
                tier.gold ? `${tier.gold}g` : null,
                tier.gems ? `${tier.gems} gems` : null,
                tier.chest ? `${tier.chest} chest` : null,
                tier.copies ? `${tier.copies.amount}× ${tier.copies.rarity}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => {
                      const r = claimSeasonReward(i)
                      flash(r.message)
                      setSeason(loadSeason())
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left disabled:opacity-50"
                    style={{
                      background: claimed
                        ? '#1a4024'
                        : ready
                          ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                          : '#1a100c',
                      color: claimed || ready ? '#fff' : '#fff6e8',
                    }}
                  >
                    <span
                      className={`text-xs font-extrabold ${ready && !claimed ? 'text-[#1a1410]' : ''}`}
                    >
                      {tier.points} pts · {label}
                    </span>
                    <span
                      className={`text-[0.65rem] font-black uppercase ${ready && !claimed ? 'text-[#1a1410]' : 'text-white/70'}`}
                    >
                      {claimed ? 'Done' : ready ? 'Claim' : 'Locked'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[0.65rem] font-semibold text-white/60">
            Earn points by battling on the ladder ({profile.battlesPlayed} battles played).
          </p>
        </section>

        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#2f6fbf,#1d4a86)' }}
        >
          <p className="font-[family-name:var(--font-display)] text-lg text-[#f5d76e]">
            Classic Challenge
          </p>
          <p className="text-xs font-bold text-white/85">
            Win 3 for a Rare Chest · {events.classicWins}/3
            {events.classicClaimed ? ' · claimed' : ''}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={playClassic}
              className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Play challenge
            </button>
            <button
              type="button"
              disabled={events.classicClaimed || events.classicWins < 3}
              onClick={() => {
                const r = claimEventReward('classic')
                flash(r.message)
                setEvents(loadEvents())
              }}
              className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-white disabled:opacity-45"
              style={{ background: '#1a100c' }}
            >
              Claim
            </button>
          </div>
        </section>

        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#8a3a62,#4a1838)' }}
        >
          <p className="font-[family-name:var(--font-display)] text-lg text-[#f5d76e]">
            Sudden Death
          </p>
          <p className="text-xs font-bold text-white/85">
            Fast wins · {events.suddenWins}/2
            {events.suddenClaimed ? ' · claimed' : ''}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={playSudden}
              className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Play
            </button>
            <button
              type="button"
              disabled={events.suddenClaimed || events.suddenWins < 2}
              onClick={() => {
                const r = claimEventReward('sudden')
                flash(r.message)
                setEvents(loadEvents())
              }}
              className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-white disabled:opacity-45"
              style={{ background: '#1a100c' }}
            >
              Claim
            </button>
          </div>
        </section>

        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#1a5a4a,#0e3028)' }}
        >
          <p className="font-[family-name:var(--font-display)] text-lg text-[#f5d76e]">
            Global Tournament
          </p>
          <p className="text-xs font-bold text-white/85">
            Best of 5 streak · {tourWins}/5 · big gem payout
          </p>
          <button
            type="button"
            onClick={playTournament}
            className="mt-2 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
            style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
          >
            Enter match
          </button>
        </section>

        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
        >
          <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">Ladder</p>
          <p className="text-sm font-semibold text-white/80">
            Full battles earn trophies, season points, XP, and club crowns.
          </p>
          <button
            type="button"
            onClick={() => onPlay(null)}
            className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
            style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
          >
            Battle on ladder
          </button>
        </section>

        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
        >
          <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">Party modes</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ['Draft practice', 'Build as you fight'],
                ['Touchdown', 'Race the river'],
                ['Mirror', 'Same decks'],
                ['Ramp up', 'Elixir climbs'],
              ] as const
            ).map(([title, sub]) => (
              <button
                key={title}
                type="button"
                onClick={() => onPlay(null)}
                className="rounded-lg bg-[#221610] px-2 py-2.5 text-left ring-1 ring-white/10"
              >
                <p className="text-xs font-extrabold text-white">{title}</p>
                <p className="text-[0.65rem] font-semibold text-white/55">{sub}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/90 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/45">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}
