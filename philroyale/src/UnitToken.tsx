import type { AttackId } from './characters'
import { getCharacter } from './characters'
import { CharacterModel, type CharacterAnim } from './characters/CharacterModel'
import { ARENA_TILT_DEG } from './camera'

type Props = {
  charId: string
  side: 'ally' | 'enemy'
  hp: number
  maxHp: number
  vfx: AttackId | null
  enraged?: boolean
  facing?: number
  moving?: boolean
}

/** Large 2.5D troop; gameplay footprint remains 1 tile. */
export function UnitToken({
  charId,
  side,
  hp,
  maxHp,
  vfx,
  enraged,
  facing,
  moving,
}: Props) {
  const def = getCharacter(charId)
  if (!def) return null
  const enemy = side === 'enemy'
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0
  const anim: CharacterAnim = vfx ? 'attack' : moving ? 'walk' : 'idle'
  const face =
    facing ?? (side === 'ally' ? -Math.PI / 2 : Math.PI / 2)

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={{
        transform: `rotateX(${-ARENA_TILT_DEG}deg)`,
        transformOrigin: '50% 100%',
      }}
    >
      <div
        className="relative w-full"
        style={{
          aspectRatio:
            charId === 'finley' ? '5 / 4' : charId === 'jeremy' ? '3 / 5.4' : '3 / 4.4',
        }}
      >
        <CharacterModel
          charId={charId}
          anim={anim}
          facing={face}
          attackId={vfx}
          hue={def.hue}
          initial={def.initial}
          enraged={enraged}
        />
      </div>
      {/* Unit HP at feet — CR-style */}
      <div className="relative mt-0.5 h-[0.5rem] w-[85%] overflow-hidden rounded-[2px] bg-black/70 ring-1 ring-black/40">
        <div
          className="h-full"
          style={{
            width: `${pct * 100}%`,
            background: enemy
              ? 'linear-gradient(180deg,#ff8a7a,#d63c2e)'
              : 'linear-gradient(180deg,#8ad0ff,#2f6fbf)',
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[0.38rem] font-extrabold leading-none text-white [text-shadow:0_1px_0_#000]">
          {Math.max(0, Math.round(hp))}
        </span>
      </div>
    </div>
  )
}

/** Flying sundae for Sundae Huck. */
export function SundaeDot() {
  return (
    <div className="relative h-4 w-3.5" aria-hidden>
      <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d62828] shadow-sm" />
      <div
        className="absolute left-1/2 top-1 h-2 w-2.5 -translate-x-1/2 rounded-full bg-[#fffaf0]"
        style={{ boxShadow: 'inset 0 1px 0 #ffffff88' }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-2 w-3 -translate-x-1/2 bg-[#fff6e8]"
        style={{
          clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)',
          boxShadow: '0 1px 1px #0004',
        }}
      />
    </div>
  )
}

export function SundaeSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 520)
  const scale = 0.4 + p * 1.4
  const opacity = 1 - p
  return (
    <div
      className="relative h-6 w-6"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 h-1.5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: deg % 90 === 0 ? '#fff6e8' : '#d62828',
            transform: `rotate(${deg}deg) translateY(-${4 + p * 6}px)`,
          }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff6e8] opacity-90" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d62828]" />
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
      className="h-1 w-2.5 rounded-full"
      style={{
        background: 'linear-gradient(90deg,#fff6c8,#ffe08a 40%,#c9a227)',
        boxShadow: '0 0 5px #ffd54fcc',
      }}
      aria-hidden
    />
  )
}

/** Small muzzle/impact explosion for Jeremy's bullets. */
export function BulletBoom({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 320)
  const scale = 0.5 + p * 1.4
  const opacity = 1 - p
  return (
    <div
      className="relative h-5 w-5"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, #fff6c8 0%, #ff9800 40%, #e5393533 70%, transparent 75%)',
        }}
      />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 h-1 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffcc80]"
          style={{ transform: `rotate(${deg}deg) translateY(-${3 + p * 5}px)` }}
        />
      ))}
    </div>
  )
}
