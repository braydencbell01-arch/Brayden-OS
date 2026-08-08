import { motion } from 'framer-motion'
import type { AttackId } from './characters'
import { getCharacter } from './characters'

type Props = {
  charId: string
  side: 'ally' | 'enemy'
  hp: number
  maxHp: number
  vfx: AttackId | null
  enraged?: boolean
}

/** 1-block troop with always-on CR-style HP bar + number. */
export function UnitToken({ charId, side, hp, maxHp, vfx, enraged }: Props) {
  const def = getCharacter(charId)
  if (!def) return null
  const enemy = side === 'enemy'
  const art = enraged ? 'hsl(285 70% 42%)' : `hsl(${def.hue} 60% 42%)`
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="relative mb-px h-[0.45rem] w-[140%] max-w-[2.2rem] overflow-hidden rounded-[1px] bg-black/70 ring-1 ring-black/40">
        <div
          className="h-full"
          style={{
            width: `${pct * 100}%`,
            background: enemy
              ? 'linear-gradient(180deg,#ff8a7a,#d63c2e)'
              : 'linear-gradient(180deg,#8ad0ff,#2f6fbf)',
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[0.38rem] font-extrabold leading-none text-white drop-shadow-[0_1px_0_#000]">
          {Math.max(0, Math.round(hp))}
        </span>
      </div>
      <motion.div
        className="flex aspect-square w-full items-center justify-center rounded-[2px] border border-[#f5d76e] font-[family-name:var(--font-display)] text-[0.45rem] leading-none text-white"
        style={{
          background: art,
          boxShadow: enraged
            ? '0 0 6px #c44dff88, 1px 1px 0 #00000066'
            : '1px 1px 0 #00000066',
        }}
        animate={
          vfx === 'chickenWhip' || vfx === 'deathHug' || vfx === 'bite'
            ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }
            : vfx === 'sundaeThrow' || vfx === 'slobber' || vfx === 'shoot'
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

export function SlobberDot() {
  return (
    <div
      className="h-2 w-2 rounded-full"
      style={{
        background: 'radial-gradient(circle at 35% 30%, #c8f070, #6a9a28 60%, #3d5c12)',
        boxShadow: '0 0 3px #8bc34a88',
      }}
      aria-hidden
    />
  )
}

export function ShootDot() {
  return (
    <div
      className="h-1.5 w-1.5 rounded-[1px]"
      style={{
        background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
        boxShadow: '0 0 4px #ffd54f99',
      }}
      aria-hidden
    />
  )
}
