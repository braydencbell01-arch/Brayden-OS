import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Place } from './geo'
import { getJurisdiction } from './jurisdictions'
import { TownPicker } from './TownPicker'
import {
  DEFAULT_SETTINGS,
  createGame,
  decodeInvite,
  encodeInvite,
  inviteUrl,
  joinFromInvite,
  loadGame,
  logPlate,
  rebuildPlatePoints,
  saveGame,
  sortedTally,
  type GameSettings,
  type RoadTripGame,
} from './roadTripGame'

type Props = {
  onGameScoreChange?: (score: number, foundCodes: string[]) => void
  /** Bumps when App applies a camera plate so GamesTab reloads from storage. */
  reloadToken?: number
  /** Invite code from ?join= — opens join flow immediately. */
  initialJoinCode?: string | null
  onJoinHandled?: () => void
}

function SettingsPanel({
  settings,
  onChange,
  onClose,
  onEndGame,
}: {
  settings: GameSettings
  onChange: (s: GameSettings) => void
  onClose: () => void
  onEndGame: () => void
}) {
  function toggle<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label="Game settings"
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-sm border border-line bg-paper p-4 shadow-xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink">Game settings</h2>
          <button type="button" className="text-sm text-fog hover:text-ink" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-fog">
          Your name
        </label>
        <input
          value={settings.playerName}
          onChange={(e) => toggle('playerName', e.target.value)}
          className="mt-1.5 mb-4 w-full rounded-sm border border-line px-3 py-2 text-sm outline-none focus:border-plate"
        />

        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-fog">
          Target plate count
        </label>
        <input
          type="number"
          min={5}
          max={51}
          value={settings.targetPlateCount}
          onChange={(e) => toggle('targetPlateCount', Math.max(5, Math.min(51, Number(e.target.value) || 5)))}
          className="mt-1.5 mb-4 w-full rounded-sm border border-line px-3 py-2 text-sm outline-none focus:border-plate"
        />

        <ul className="flex flex-col gap-3 text-sm text-ink">
          {(
            [
              ['allowManualLog', 'Allow manual “log spot” (not only camera)'],
              ['showFoundPlates', 'Show found plates in the tally'],
              ['confirmBeforeLog', 'Confirm before logging a plate'],
              ['includeDc', 'Include Washington, D.C. plates'],
              ['inviteOpen', 'Allow others to join with invite link'],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <span>{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings[key]}
                onClick={() => toggle(key, !settings[key])}
                className={`h-7 w-12 rounded-full transition ${settings[key] ? 'bg-plate' : 'bg-lane'}`}
              >
                <span
                  className={`block h-5 w-5 translate-y-1 rounded-full bg-paper shadow transition ${
                    settings[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-fog">
          Scoring is 1–100 from how close your drive comes to each state, then population
          for states farther away. Driving past DC cannot score high just because DC is small.
          Any plate from a state counts once — designs are not separate targets.
        </p>

        <button
          type="button"
          onClick={onEndGame}
          className="mt-5 w-full rounded-sm border border-signal/40 px-4 py-2.5 text-sm font-medium text-signal hover:bg-signal/5"
        >
          End game
        </button>
      </motion.div>
    </motion.div>
  )
}

export function GamesTab({
  onGameScoreChange,
  reloadToken = 0,
  initialJoinCode = null,
  onJoinHandled,
}: Props) {
  const [game, setGame] = useState<RoadTripGame | null>(() => loadGame())
  const [mode, setMode] = useState<'lobby' | 'create' | 'join'>(() =>
    initialJoinCode ? 'join' : 'lobby',
  )
  const [start, setStart] = useState<Place | null>(null)
  const [end, setEnd] = useState<Place | null>(null)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [joinCode, setJoinCode] = useState(() => initialJoinCode ?? '')
  const [joinName, setJoinName] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const hydratedJoin = useRef(false)

  useEffect(() => {
    if (!game) return
    saveGame(game)
    onGameScoreChange?.(game.score, game.foundCodes)
  }, [game, onGameScoreChange])

  useEffect(() => {
    if (reloadToken <= 0) return
    setGame(loadGame())
  }, [reloadToken])

  // Deep-link join: ?join=CODE (from App or direct)
  useEffect(() => {
    if (hydratedJoin.current) return
    hydratedJoin.current = true
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('join')
      const code = initialJoinCode || fromUrl
      if (!code) return
      setJoinCode(code)
      setMode('join')
      onJoinHandled?.()
    } catch {
      /* ignore */
    }
  }, [initialJoinCode, onJoinHandled])

  const tally = useMemo(() => (game ? sortedTally(game) : []), [game])

  function persistGame(next: RoadTripGame | null) {
    setGame(next)
  }

  function startNewGame() {
    setStart(null)
    setEnd(null)
    setSettings({ ...DEFAULT_SETTINGS, playerName: settings.playerName })
    setSetupError(null)
    setMode('create')
  }

  function confirmCreate() {
    if (!start || !end) {
      setSetupError('Pick both a starting town and an ending town.')
      return
    }
    if (start.id === end.id) {
      setSetupError('Start and end should be different places.')
      return
    }
    const g = createGame(start, end, settings)
    persistGame(g)
    setMode('lobby')
    setSetupError(null)
  }

  function confirmJoin() {
    setJoinError(null)
    const payload = decodeInvite(joinCode.trim())
    if (!payload) {
      setJoinError('That invite code is not valid.')
      return
    }
    if (!payload.settings.inviteOpen) {
      setJoinError('This game is not accepting new players.')
      return
    }
    const g = joinFromInvite(payload, joinName || 'Guest')
    persistGame(g)
    setMode('lobby')
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      window.history.replaceState({}, '', url.pathname + url.hash)
    } catch {
      /* ignore */
    }
  }

  async function copyInvite() {
    if (!game) return
    const url = inviteUrl(game)
    try {
      await navigator.clipboard.writeText(url)
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      window.prompt('Copy this invite link:', url)
    }
  }

  function applySettings(next: GameSettings) {
    if (!game) {
      setSettings(next)
      return
    }
    let updated: RoadTripGame = {
      ...game,
      settings: next,
      players: game.players.map((p, i) => (i === 0 ? { ...p, name: next.playerName } : p)),
    }
    if (next.includeDc !== game.settings.includeDc) {
      updated = rebuildPlatePoints(updated)
    }
    persistGame(updated)
    setSettings(next)
  }

  function tryManualLog(code: string) {
    if (!game || !game.settings.allowManualLog) return
    if (game.settings.confirmBeforeLog) {
      const j = getJurisdiction(code)
      const pts = game.platePoints[code]
      const ok = window.confirm(`Log ${j?.name ?? code} for ${pts} points?`)
      if (!ok) return
    }
    const next = logPlate(game, code)
    if (next) persistGame(next)
  }

  // —— Active game view ——
  if (game && game.status === 'active' && mode !== 'create' && mode !== 'join') {
    const visible = game.settings.showFoundPlates ? tally : tally.filter((t) => !t.found)
    return (
      <section className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Road trip</p>
            <h1 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Plate tally</h1>
            <p className="mt-1 text-sm text-fog">
              {game.start.label.split(',')[0]} → {game.end.label.split(',')[0]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSettings(game.settings)
              setShowSettings(true)
            }}
            className="rounded-sm border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink hover:border-plate/50"
            aria-label="Game settings"
          >
            Settings
          </button>
        </header>

        <div className="plate-face flex items-center justify-between rounded-sm px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Your score</p>
            <p className="font-display text-3xl">{game.score}</p>
          </div>
          <p className="max-w-[11rem] text-right text-xs opacity-80">
            {game.foundCodes.length} / {Object.keys(game.platePoints).length} standard plates
            <br />
            Goal {game.settings.targetPlateCount}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyInvite()}
            disabled={!game.settings.inviteOpen}
            className="rounded-sm bg-plate px-4 py-2.5 text-sm font-semibold text-asphalt enabled:hover:bg-plate-hot disabled:opacity-40"
          >
            {inviteCopied ? 'Invite link copied' : 'Invite players'}
          </button>
          <button
            type="button"
            onClick={() => {
              const code = encodeInvite(game)
              window.prompt('Share this invite code:', code)
            }}
            disabled={!game.settings.inviteOpen}
            className="rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
          >
            Show invite code
          </button>
        </div>

        <div className="rounded-sm border border-line bg-asphalt-lift px-3 py-2 text-sm text-fog">
          <p className="font-medium text-ink">Players</p>
          <p className="mt-1">
            {game.players.map((p) => p.name).join(', ')}
            {game.settings.inviteOpen ? ' · invite open' : ' · invite closed'}
          </p>
        </div>

        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fog">
          Points by rarity on your route (1–100)
        </h2>
        <p className="text-xs text-fog">
          Closest approach on your drive, then population if you’re far away. Any plate from the state
          counts.
        </p>
        <ul className="flex flex-col gap-2">
          {visible.map((row) => {
            const j = getJurisdiction(row.code)
            return (
              <li
                key={row.code}
                className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 ${
                  row.found ? 'border-plate/50 bg-plate/10' : 'border-line bg-paper'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {row.code}
                    {j ? ` · ${j.name}` : ''}
                  </p>
                  <p className="text-xs text-fog">Any plate from this state</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-plate-hot">{row.points}</span>
                  {row.found ? (
                    <span className="text-xs font-semibold uppercase tracking-wider text-plate-hot">Found</span>
                  ) : game.settings.allowManualLog ? (
                    <button
                      type="button"
                      onClick={() => tryManualLog(row.code)}
                      className="rounded-sm border border-line px-2 py-1 text-xs hover:border-plate/60"
                    >
                      Log
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <AnimatePresence>
          {showSettings && (
            <SettingsPanel
              settings={game.settings}
              onChange={applySettings}
              onClose={() => setShowSettings(false)}
              onEndGame={() => {
                saveGame(null)
                setGame(null)
                setShowSettings(false)
                setMode('lobby')
              }}
            />
          )}
        </AnimatePresence>
      </section>
    )
  }

  // —— Create flow ——
  if (mode === 'create') {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={() => setMode('lobby')}
          className="self-start text-sm text-fog underline-offset-2 hover:text-ink hover:underline"
        >
          ← Back
        </button>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">New game</p>
          <h1 className="font-display mt-1 text-3xl text-ink">Where will your roadtrip take you?</h1>
          <p className="mt-2 max-w-md text-sm text-fog">
            Search a starting town and an ending town. PlateQuest scores each state 1–100 by how far
            it is from your route and how large its population is — any plate from that state counts.
          </p>
        </header>

        <TownPicker label="Start from" value={start} onPick={setStart} />
        <TownPicker label="Ending point" value={end} onPick={setEnd} />

        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-fog">Your name</label>
        <input
          value={settings.playerName}
          onChange={(e) => setSettings({ ...settings, playerName: e.target.value })}
          className="rounded-sm border border-line px-3 py-2.5 text-sm outline-none focus:border-plate"
          placeholder="Driver name"
        />

        {setupError && (
          <p className="text-sm text-signal" role="status">
            {setupError}
          </p>
        )}

        <button
          type="button"
          onClick={confirmCreate}
          className="mt-2 rounded-sm bg-plate px-5 py-3 font-semibold text-asphalt hover:bg-plate-hot"
        >
          Start road trip
        </button>
      </section>
    )
  }

  // —— Join flow ——
  if (mode === 'join') {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={() => setMode('lobby')}
          className="self-start text-sm text-fog underline-offset-2 hover:text-ink hover:underline"
        >
          ← Back
        </button>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Join game</p>
          <h1 className="font-display mt-1 text-3xl text-ink">Enter invite</h1>
          <p className="mt-2 text-sm text-fog">
            Paste an invite code or open a shared link to use the same road-trip route and point values.
          </p>
        </header>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-fog">Your name</label>
        <input
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          className="rounded-sm border border-line px-3 py-2.5 text-sm outline-none focus:border-plate"
          placeholder="Guest name"
        />
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-fog">Invite code</label>
        <textarea
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          rows={4}
          className="rounded-sm border border-line px-3 py-2.5 font-mono text-xs outline-none focus:border-plate"
          placeholder="Paste code here"
        />
        {joinError && <p className="text-sm text-signal">{joinError}</p>}
        <button
          type="button"
          onClick={confirmJoin}
          className="rounded-sm bg-plate px-5 py-3 font-semibold text-asphalt hover:bg-plate-hot"
        >
          Join road trip
        </button>
      </section>
    )
  }

  // —— Lobby ——
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Games</p>
        <h1 className="font-display mt-1 text-3xl text-ink">Road trip</h1>
        <p className="mt-1 max-w-md text-sm text-fog">
          One game: plan a route, invite friends, and score standard state plates by how rare they are
          where you are driving.
        </p>
      </header>

      <button
        type="button"
        onClick={startNewGame}
        className="rounded-sm bg-plate px-5 py-4 text-left font-semibold text-asphalt hover:bg-plate-hot"
      >
        <span className="font-display text-2xl tracking-normal">Start new game</span>
        <span className="mt-1 block text-sm font-normal opacity-80">
          Set your towns, share an invite, chase plates
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          setJoinError(null)
          setMode('join')
        }}
        className="rounded-sm border border-line px-5 py-3 text-sm font-medium text-ink hover:border-plate/50"
      >
        Join with invite code
      </button>
    </section>
  )
}
