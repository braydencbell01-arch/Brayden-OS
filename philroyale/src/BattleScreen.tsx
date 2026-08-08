import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Arena } from './Arena'
import { BattleCard } from './BattleCard'
import { getCharacter } from './characters'
import { loadDeck } from './storage'

type Props = {
  onExit: () => void
  opponentName?: string | null
}

const MAX_ELIXIR = 10
const ELIXIR_TICK_MS = 900

export function BattleScreen({ onExit, opponentName }: Props) {
  const deckIds = useMemo(() => loadDeck(), [])
  const [drawPile, setDrawPile] = useState(() => [...deckIds].sort(() => Math.random() - 0.5))
  const [hand, setHand] = useState<string[]>([])
  const [nextId, setNextId] = useState<string | null>(null)
  const [elixir, setElixir] = useState(5)
  const [seconds, setSeconds] = useState(180)

  useEffect(() => {
    const pile = [...deckIds].sort(() => Math.random() - 0.5)
    setHand(pile.slice(0, 4))
    setNextId(pile[4] ?? null)
    setDrawPile(pile.slice(5))
  }, [deckIds])

  useEffect(() => {
    const id = window.setInterval(() => {
      setElixir((e) => Math.min(MAX_ELIXIR, e + 1))
    }, ELIXIR_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  function playCard(index: number) {
    const id = hand[index]
    if (!id) return
    const card = getCharacter(id)
    if (!card || elixir < card.elixir) return

    setElixir((e) => e - card.elixir)
    const incoming = nextId
    const pile = [...drawPile]
    const newNext = pile.shift() ?? null
    if (incoming) pile.push(id)
    else pile.push(id)

    setHand((h) => {
      const copy = [...h]
      copy[index] = incoming ?? id
      return copy
    })
    setNextId(newNext ?? (pile.length ? pile.shift()! : id))
    setDrawPile(pile)
  }

  const mm = String(Math.floor(seconds / 60))
  const ss = String(seconds % 60).padStart(2, '0')
  const elixirDisplay = Math.floor(elixir)

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      {/* Top HUD */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-2 pb-1 pt-[max(0.35rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onExit}
          className="rounded-md bg-[#3a2418] px-2.5 py-1.5 text-xs font-extrabold text-[#f5d76e] ring-1 ring-[#c9a227]/50"
        >
          Exit
        </button>
        <div className="flex flex-col items-center">
          <div
            className="rounded-md px-3 py-0.5 font-[family-name:var(--font-display)] text-lg tracking-wide text-[#f5d76e]"
            style={{
              background: 'linear-gradient(180deg,#5a3a22,#2a1810)',
              boxShadow: 'inset 0 1px 0 #c9a22766, 0 2px 4px #00000066',
            }}
          >
            {mm}:{ss}
          </div>
          <p className="text-[0.65rem] font-bold text-white/70">
            vs {opponentName ?? 'Trainer'}
          </p>
        </div>
        <div className="min-w-[3.2rem] text-right text-[0.65rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/80">
          Crowns 0
        </div>
      </header>

      {/* Arena */}
      <div className="relative mx-auto min-h-0 w-full max-w-[26rem] flex-1 px-1.5">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-full overflow-hidden rounded-[10px]"
          style={{ boxShadow: '0 10px 28px #00000099' }}
        >
          <Arena />
        </motion.div>
      </div>

      {/* Bottom battle bar — next card + hand + elixir (CR layout) */}
      <div className="relative z-10 mx-auto w-full max-w-[26rem] shrink-0 px-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
        <div
          className="rounded-t-lg px-2 pb-2 pt-2"
          style={{
            background: 'linear-gradient(180deg,#5a3a22 0%,#2e1a10 55%,#1a100c 100%)',
            boxShadow: 'inset 0 2px 0 #c9a22755, 0 -4px 16px #00000066',
          }}
        >
          <div className="flex items-end gap-1.5">
            {/* Next card (left peek) */}
            <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
              <span className="text-[0.55rem] font-extrabold uppercase tracking-wider text-[#f5d76e]/85">
                Next
              </span>
              <div className="opacity-90">
                <BattleCard character={nextId ? getCharacter(nextId) ?? null : null} size="next" />
              </div>
            </div>

            {/* Hand of 4 */}
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">
              {hand.map((id, i) => {
                const c = getCharacter(id) ?? null
                const cantAfford = c != null && elixir < c.elixir
                return (
                  <button
                    key={`${id}-${i}`}
                    type="button"
                    onClick={() => playCard(i)}
                    className="min-w-0 transition-transform active:scale-95"
                    aria-label={c ? `Play ${c.name}` : `Card ${i + 1}`}
                  >
                    <BattleCard character={c} dimmed={cantAfford} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Elixir bar */}
          <div className="mt-2 flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-extrabold text-white"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
                boxShadow: '0 0 0 2px #5a1848, 0 2px 4px #00000088',
              }}
              aria-label={`${elixirDisplay} elixir`}
            >
              {elixirDisplay}
            </div>
            <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-[#1a100c] ring-2 ring-[#5a1848]">
              <div
                className="elixir-bar-fill absolute inset-y-0 left-0"
                style={{ width: `${(elixir / MAX_ELIXIR) * 100}%` }}
              />
              <div className="absolute inset-0 flex">
                {Array.from({ length: MAX_ELIXIR }, (_, i) => (
                  <div key={i} className="h-full flex-1 border-r border-black/35 last:border-0" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
