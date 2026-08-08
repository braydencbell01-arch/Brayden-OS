import { motion } from 'framer-motion'
import type { AttackId } from './characters'
import { getCharacter } from './characters'

type Props = {
  charId: string
  side: 'ally' | 'enemy'
  hpPct: number
  vfx: AttackId | null
}

/** Placeholder troop: colored square with initial (graphics later). */
export function UnitToken({ charId, side, hpPct, vfx }: Props) {
  const def = getCharacter(charId)
  if (!def) return null
  const enemy = side === 'enemy'
  const art = `hsl(${def.hue} 60% 42%)`

  return (
    <div className="relative flex w-8 flex-col items-center sm:w-9">
      <div className="mb-0.5 h-1 w-full overflow-hidden rounded-sm bg-black/55">
        <div
          className="h-full"
          style={{
            width: `${Math.max(0, Math.min(1, hpPct)) * 100}%`,
            background: enemy
              ? 'linear-gradient(180deg,#ff7a6a,#c63c2e)'
              : 'linear-gradient(180deg,#7ec8ff,#2f6fbf)',
          }}
        />
      </div>
      <motion.div
        className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-[#f5d76e] font-[family-name:var(--font-display)] text-base text-white shadow-lg sm:text-lg"
        style={{
          background: art,
          boxShadow: '2px 3px 0 #00000066, inset 0 1px 0 #ffffff33',
        }}
        animate={
          vfx === 'chickenWhip' || vfx === 'deathHug'
            ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }
            : vfx === 'sundaeThrow'
              ? { y: [0, -3, 0] }
              : { y: [0, -1.5, 0] }
        }
        transition={
          vfx
            ? { duration: 0.4 }
            : { duration: 0.75, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {def.initial}
      </motion.div>
    </div>
  )
}

export function SundaeDot() {
  return (
    <div className="relative h-4 w-3" aria-hidden>
      <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d62828]" />
      <div className="absolute left-[1px] top-1 h-2 w-2 rounded-full bg-[#fff6e8]" />
      <div className="absolute right-0 top-1.5 h-2 w-2 rounded-full bg-[#ffb4c8]" />
      <div
        className="absolute bottom-0 left-1/2 h-2 w-2.5 -translate-x-1/2 bg-[#e8eef8]"
        style={{ clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)' }}
      />
    </div>
  )
}
