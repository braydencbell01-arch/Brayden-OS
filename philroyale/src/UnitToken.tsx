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
            charId === 'finley' || charId === 'beans'
              ? '5 / 4'
              : charId === 'jeremy'
                ? '3 / 5.4'
                : charId === 'pete'
                  ? '3 / 4.2'
                  : charId === 'kathie'
                    ? '3 / 4.0'
                    : charId === 'todd'
                      ? '3 / 4.3'
                      : charId === 'mike'
                        ? '3 / 5.0'
                        : charId === 'lynne'
                          ? '3 / 4.5'
                          : '3 / 4.4',
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
      className="relative h-3.5 w-4"
      style={{
        background: 'radial-gradient(circle at 35% 30%, #d8f090, #8bc34a 55%, #4a7018)',
        borderRadius: '55% 45% 60% 40%',
        boxShadow: '0 0 6px #8bc34aaa, 0 2px 2px #0004',
      }}
      aria-hidden
    >
      <div className="absolute -bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-[#8bc34a] opacity-80" />
      <div className="absolute -bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-[#aed581]" />
    </div>
  )
}

/** Beans slobber impact — goo explodes everywhere. */
export function SlobberSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 780)
  const scale = 0.45 + p * 1.9
  const opacity = 1 - p * 0.95
  return (
    <div
      className="relative h-10 w-10"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, #d8f090 0%, #8bc34a 45%, #5a8a1833 70%, transparent 75%)',
        }}
      />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: deg % 60 === 0 ? 10 : 7,
            height: deg % 60 === 0 ? 7 : 5,
            background: deg % 90 === 0 ? '#c8f070' : '#7cb342',
            transform: `rotate(${deg}deg) translateY(-${5 + p * 10}px)`,
            borderRadius: '60% 40% 55% 45%',
          }}
        />
      ))}
      {[15, 105, 195, 285].map((deg) => (
        <div
          key={`d-${deg}`}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#aed581]"
          style={{ transform: `rotate(${deg}deg) translateY(-${8 + p * 12}px)` }}
        />
      ))}
    </div>
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

export function DumbbellDot() {
  return (
    <div className="relative h-3.5 w-5" aria-hidden>
      <div className="absolute left-0 top-0.5 h-2.5 w-1.5 rounded-[2px] bg-[#1a1a20] ring-1 ring-black/50" />
      <div className="absolute right-0 top-0.5 h-2.5 w-1.5 rounded-[2px] bg-[#1a1a20] ring-1 ring-black/50" />
      <div
        className="absolute left-1/2 top-[7px] h-1 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm"
        style={{ background: 'linear-gradient(180deg,#c0c0c8,#6a6a74)' }}
      />
    </div>
  )
}

export function DumbbellSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 480)
  const scale = 0.5 + p * 1.2
  const opacity = 1 - p
  return (
    <div
      className="relative h-6 w-6"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-1 rounded-full"
        style={{ background: 'radial-gradient(circle,#ffecb366 0%,#8a8a9633 45%,transparent 70%)' }}
      />
      <div className="absolute left-1/2 top-1/2 h-2 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-12">
        <div className="absolute left-0 top-0 h-2 w-1 rounded-[1px] bg-[#1a1a20]" />
        <div className="absolute right-0 top-0 h-2 w-1 rounded-[1px] bg-[#1a1a20]" />
        <div className="absolute left-1/2 top-1/2 h-0.5 w-2 -translate-x-1/2 -translate-y-1/2 bg-[#9a9aa4]" />
      </div>
    </div>
  )
}

/** Princess tower archer arrow — wood shaft + iron tip. */
export function TowerArrow({ angleDeg = 90 }: { angleDeg?: number }) {
  return (
    <div
      className="relative h-1 w-5"
      style={{ transform: `rotate(${angleDeg}deg)` }}
      aria-hidden
    >
      <div
        className="absolute inset-y-[2px] left-0.5 right-1 rounded-sm"
        style={{ background: 'linear-gradient(90deg,#8a5a28,#c9a06a,#6a3a14)' }}
      />
      <div
        className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2"
        style={{
          borderTop: '3px solid transparent',
          borderBottom: '3px solid transparent',
          borderLeft: '5px solid #4a4a54',
        }}
      />
      <div
        className="absolute left-0 top-1/2 h-0 w-0 -translate-y-1/2"
        style={{
          borderTop: '2.5px solid transparent',
          borderBottom: '2.5px solid transparent',
          borderRight: '4px solid #c62828',
        }}
      />
    </div>
  )
}

/** King tower cannon ball. */
export function CannonBall() {
  return (
    <div
      className="relative h-3 w-3 rounded-full"
      style={{
        background: 'radial-gradient(circle at 32% 28%, #9a9aa8, #3a3a44 55%, #121218)',
        boxShadow: '0 1px 2px #0008, inset 0 -1px 2px #0006',
      }}
      aria-hidden
    >
      <div className="absolute left-[22%] top-[18%] h-1 w-1 rounded-full bg-white/35" />
    </div>
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
