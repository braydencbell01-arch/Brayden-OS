import { motion } from 'framer-motion'
import type { AttackId } from './characters'
import { getCharacter } from './characters'

type Props = {
  charId: string
  side: 'ally' | 'enemy'
  hpPct: number
  vfx: AttackId | null
}

/** 1-block troop placeholder: tiny square with initial. */
export function UnitToken({ charId, side, hpPct, vfx }: Props) {
  const def = getCharacter(charId)
  if (!def) return null
  const enemy = side === 'enemy'
  const art = `hsl(${def.hue} 60% 42%)`

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="mb-px h-0.5 w-full overflow-hidden rounded-[1px] bg-black/55">
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
        className="flex aspect-square w-full items-center justify-center rounded-[2px] border border-[#f5d76e] font-[family-name:var(--font-display)] text-[0.45rem] leading-none text-white"
        style={{
          background: art,
          boxShadow: '1px 1px 0 #00000066',
        }}
        animate={
          vfx === 'chickenWhip' || vfx === 'deathHug'
            ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }
            : vfx === 'sundaeThrow'
              ? { y: [0, -2, 0] }
              : { y: [0, -0.5, 0] }
        }
        transition={
          vfx
            ? { duration: 0.35 }
            : { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {def.initial}
      </motion.div>
    </div>
  )
}

export function SundaeDot() {
  return (
    <div className="relative h-2.5 w-2" aria-hidden>
      <div className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-[#d62828]" />
      <div className="absolute left-0 top-0.5 h-1.5 w-1.5 rounded-full bg-[#fff6e8]" />
      <div
        className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 bg-[#e8eef8]"
        style={{ clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)' }}
      />
    </div>
  )
}
