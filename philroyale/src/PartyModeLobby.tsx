import { useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS, DECK_SIZE, getCharacter } from './characters'
import { BattleCard } from './BattleCard'
import {
  publishBattle,
  subscribeBattle,
  type BattleNet,
  type BattleRoomMessage,
} from './battleSync'
import type { GameMode } from './gameModes'
import { modeLabel } from './gameModes'

type Props = {
  mode: 'draft' | 'undraft' | 'infiniteElixir'
  net: BattleNet
  onReady: (deckIds: string[]) => void
  onCancel: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function randomIds(count: number, exclude: Set<string> = new Set()): string[] {
  const pool = shuffle(CHARACTERS.map((c) => c.id).filter((id) => !exclude.has(id)))
  return pool.slice(0, count)
}

/** Friend-only party lobby: Draft, Undraft, or Infinite Elixir deck build. */
export function PartyModeLobby({ mode, net, onReady, onCancel }: Props) {
  const role = net.role === 'spectator' ? 'guest' : net.role
  const [myPicks, setMyPicks] = useState<string[]>([])
  const [fromPeer, setFromPeer] = useState<string[]>([])
  const [peerDeckReady, setPeerDeckReady] = useState<string[] | null>(null)
  const [round, setRound] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [status, setStatus] = useState('Waiting for friend…')
  const usedRef = useRef(new Set<string>())
  const finishedRef = useRef(false)
  const myPicksRef = useRef(myPicks)
  myPicksRef.current = myPicks
  const fromPeerRef = useRef(fromPeer)
  fromPeerRef.current = fromPeer

  const title = modeLabel(mode as GameMode)
  const draftRounds = 4
  const undraftRounds = DECK_SIZE

  // Seed first round of choices.
  useEffect(() => {
    if (mode === 'infiniteElixir') {
      setOptions([])
      setStatus('Pick any 8 cards — locked cards allowed.')
      return
    }
    const n = mode === 'draft' ? 2 : 3
    const ids = randomIds(n)
    ids.forEach((id) => usedRef.current.add(id))
    setOptions(ids)
    setStatus(
      mode === 'draft'
        ? 'Pick 1 of 2 — the other goes to your friend.'
        : 'Pick 1 of 3 — that card goes to your friend.',
    )
  }, [mode])

  // Sync party cards / decks with peer.
  useEffect(() => {
    if (!net.challengeId) return
    const unsub = subscribeBattle(net.challengeId, (msg: BattleRoomMessage) => {
      if (msg.type === 'party_card' && msg.role !== role) {
        setFromPeer((prev) => {
          if (prev.includes(msg.charId) || prev.length >= DECK_SIZE) return prev
          return [...prev, msg.charId]
        })
      }
      if (msg.type === 'party_deck_ready' && msg.role !== role) {
        setPeerDeckReady(msg.deckIds.slice(0, DECK_SIZE))
      }
      if (msg.type === 'battle_ready' && msg.role !== role) {
        setStatus((s) => (s.includes('friend') ? s : 'Friend connected — keep picking.'))
      }
    })
    void publishBattle(net.challengeId, {
      type: 'battle_ready',
      challengeId: net.challengeId,
      role,
      name: role,
      at: new Date().toISOString(),
    })
    return unsub
  }, [net.challengeId, role])

  // Assemble draft deck when we have 4 picks + 4 from peer.
  useEffect(() => {
    if (mode !== 'draft' || finishedRef.current) return
    if (myPicks.length < draftRounds || fromPeer.length < draftRounds) return
    const deck = [...myPicks.slice(0, draftRounds), ...fromPeer.slice(0, draftRounds)]
    finish(deck)
  }, [mode, myPicks, fromPeer])

  // Undraft: my deck is what peer gifted me (8 cards).
  useEffect(() => {
    if (mode !== 'undraft' || finishedRef.current) return
    if (fromPeer.length < undraftRounds || myPicks.length < undraftRounds) return
    finish(fromPeer.slice(0, undraftRounds))
  }, [mode, fromPeer, myPicks])

  // Infinite: both must declare deck ready (local pick + peer ready).
  useEffect(() => {
    if (mode !== 'infiniteElixir' || finishedRef.current) return
    if (myPicks.length < DECK_SIZE || !peerDeckReady) return
    finish(myPicks.slice(0, DECK_SIZE))
  }, [mode, myPicks, peerDeckReady])

  function finish(deck: string[]) {
    if (finishedRef.current) return
    finishedRef.current = true
    setStatus('Deck locked — starting…')
    void publishBattle(net.challengeId, {
      type: 'party_deck_ready',
      challengeId: net.challengeId,
      role,
      deckIds: deck,
      at: Date.now(),
    })
    onReady(deck)
  }

  function nextDraftOptions() {
    const ids = randomIds(2, usedRef.current)
    ids.forEach((id) => usedRef.current.add(id))
    setOptions(ids)
  }

  function nextUndraftOptions() {
    const ids = randomIds(3, usedRef.current)
    ids.forEach((id) => usedRef.current.add(id))
    setOptions(ids)
  }

  function pickDraft(chosen: string) {
    const other = options.find((id) => id !== chosen)
    if (!other) return
    setMyPicks((p) => [...p, chosen])
    void publishBattle(net.challengeId, {
      type: 'party_card',
      challengeId: net.challengeId,
      role,
      charId: other,
      round,
      at: Date.now(),
    })
    const next = round + 1
    setRound(next)
    if (next < draftRounds) nextDraftOptions()
    else {
      setOptions([])
      setStatus(
        fromPeerRef.current.length >= draftRounds
          ? 'Deck locked — starting…'
          : 'Waiting for friend’s rejects…',
      )
    }
  }

  function pickUndraft(chosen: string) {
    setMyPicks((p) => [...p, chosen])
    void publishBattle(net.challengeId, {
      type: 'party_card',
      challengeId: net.challengeId,
      role,
      charId: chosen,
      round,
      at: Date.now(),
    })
    const next = round + 1
    setRound(next)
    if (next < undraftRounds) nextUndraftOptions()
    else {
      setOptions([])
      setStatus(
        fromPeerRef.current.length >= undraftRounds
          ? 'Deck locked — starting…'
          : 'Waiting for friend to finish gifting…',
      )
    }
  }

  function toggleInfinite(id: string) {
    setMyPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= DECK_SIZE) return prev
      return [...prev, id]
    })
  }

  function confirmInfinite() {
    if (myPicks.length < DECK_SIZE) return
    void publishBattle(net.challengeId, {
      type: 'party_deck_ready',
      challengeId: net.challengeId,
      role,
      deckIds: myPicks.slice(0, DECK_SIZE),
      at: Date.now(),
    })
    setStatus(peerDeckReady ? 'Starting…' : 'Waiting for friend to lock their deck…')
    if (peerDeckReady) finish(myPicks.slice(0, DECK_SIZE))
  }

  const progressLabel = useMemo(() => {
    if (mode === 'draft') {
      return `Your picks ${myPicks.length}/${draftRounds} · From friend ${fromPeer.length}/${draftRounds}`
    }
    if (mode === 'undraft') {
      return `Gifted ${myPicks.length}/${undraftRounds} · Received ${fromPeer.length}/${undraftRounds}`
    }
    return `Selected ${myPicks.length}/${DECK_SIZE}`
  }, [mode, myPicks.length, fromPeer.length])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a] px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
        {title}
      </h1>
      <p className="mt-1 text-sm font-semibold text-white/75">{status}</p>
      <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
        {progressLabel} · Party · no trophies
      </p>

      {mode === 'infiniteElixir' ? (
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {CHARACTERS.map((c) => {
              const selected = myPicks.includes(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggleInfinite(c.id)}
                    className="w-full text-left"
                    style={{
                      outline: selected ? '3px solid #f5d76e' : 'none',
                      borderRadius: '0.45rem',
                    }}
                  >
                    <BattleCard character={c} size="collection" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
          <ul className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map((id) => {
              const c = getCharacter(id)
              if (!c) return null
              return (
                <li key={id} className={mode === 'undraft' ? '' : options.length === 2 ? 'col-span-1' : ''}>
                  <button
                    type="button"
                    onClick={() => (mode === 'draft' ? pickDraft(id) : pickUndraft(id))}
                    className="w-full"
                  >
                    <BattleCard character={c} size="collection" />
                  </button>
                </li>
              )
            })}
          </ul>
          {options.length === 0 ? (
            <p className="text-sm font-semibold text-white/60">
              {fromPeer.length < (mode === 'draft' ? draftRounds : undraftRounds)
                ? 'Hang tight — syncing with friend…'
                : 'Ready!'}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-[#2a1a12] py-3 text-sm font-extrabold text-[#ff8a7a] ring-1 ring-white/15"
        >
          Cancel
        </button>
        {mode === 'infiniteElixir' ? (
          <button
            type="button"
            disabled={myPicks.length < DECK_SIZE}
            onClick={confirmInfinite}
            className="flex-[2] rounded-lg py-3 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
            style={{
              background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
              boxShadow: '0 3px 0 #1a7a3a',
            }}
          >
            Lock deck
          </button>
        ) : null}
      </div>
    </div>
  )
}
