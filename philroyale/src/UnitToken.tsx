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
        className="relative w-full overflow-visible"
        style={{
          // Taller boxes so full-body sprites (feet/paws) are never cropped.
          aspectRatio:
            charId === 'dogHut'
              ? '5 / 4.6'
              : charId === 'philsCar'
                ? '5 / 3.4'
              : charId === 'iceCream' || charId === 'footballHuck'
                ? '3 / 4'
              : charId === 'finley' || charId === 'beans' || charId === 'shay'
              ? '4 / 4.85'
              : charId === 'jeremy'
                ? '3 / 6.1'
                : charId === 'pete' || charId === 'scott'
                  ? '3 / 5.9'
                  : charId === 'mike'
                    ? '3 / 5.55'
                    : charId === 'dan'
                      ? '3 / 4.85'
                      : charId === 'kathie'
                        ? '3 / 4.45'
                        : charId === 'todd'
                          ? '3 / 4.85'
                          : charId === 'lynne'
                            ? '3 / 4.9'
                            : charId === 'phil'
                              ? '3 / 4.9'
                              : '3 / 4.9',
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

/** Flying rocket for Phil's Car. */
export function RocketDot() {
  return (
    <div
      className="relative h-3 w-7 rounded-sm"
      style={{
        background: 'linear-gradient(90deg,#f5d76e 0%,#e85a20 45%,#6a6a70 45%,#3a3a40 100%)',
        boxShadow: '0 0 6px #ff6a2088, 0 1px 2px #000a',
      }}
      aria-hidden
    >
      <div
        className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, #fff6a0, #ff6a20 60%, transparent)' }}
      />
    </div>
  )
}

/** Rocket impact boom. */
export function RocketSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 700)
  const scale = 0.5 + p * 2.6
  const opacity = 1 - p * 0.9
  return (
    <div
      className="relative h-14 w-14"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, #fff2a0 0%, #ff8a30cc 35%, #c0301088 55%, transparent 70%)',
        }}
      />
    </div>
  )
}

/** Flying cash wad for Scott's Cash Gun. */
export function CashDot() {
  return (
    <div className="relative h-5 w-7" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-[2px]"
          style={{
            left: `${i * 4}px`,
            top: `${2 - i}px`,
            width: '14px',
            height: '9px',
            background: 'linear-gradient(180deg,#7dff9a,#2a9a4a)',
            boxShadow: '0 1px 1px #0008, inset 0 0 0 1px #1a5a28',
            transform: `rotate(${-12 + i * 10}deg)`,
          }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.45rem] font-black text-[#0a3a14]">
        $
      </span>
    </div>
  )
}

/** Flying football for Football Huck. */
export function FootballDot() {
  return (
    <div
      className="relative h-4 w-6 rounded-full"
      style={{
        background: 'radial-gradient(circle at 30% 30%, #c48a4a, #6a3a18 70%, #3a1a08)',
        boxShadow: '0 1px 2px #000a',
      }}
      aria-hidden
    >
      <div className="absolute inset-x-[20%] top-1/2 h-[1px] -translate-y-1/2 bg-white/80" />
      <div className="absolute left-1/2 top-[20%] h-[60%] w-[1px] -translate-x-1/2 bg-white/70" />
    </div>
  )
}

/** Flying ice cream sundae for Sundae Huck. */
export function SundaeDot() {
  return (
    <div className="relative h-6 w-5" aria-hidden>
      {/* Wafer cone */}
      <div
        className="absolute bottom-0 left-1/2 h-3 w-[14px] -translate-x-1/2"
        style={{
          background: 'linear-gradient(180deg,#e8b86a 0%,#c48a3a 55%,#9a6420 100%)',
          clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)',
          boxShadow: 'inset 0 1px 0 #f5d49a88',
        }}
      />
      {/* Cone waffle lines */}
      <div
        className="absolute bottom-[1px] left-1/2 h-[10px] w-[12px] -translate-x-1/2 opacity-40"
        style={{
          background:
            'repeating-linear-gradient(135deg, transparent 0 2px, #7a4a18 2px 3px)',
          clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)',
        }}
      />
      {/* Vanilla scoop */}
      <div
        className="absolute left-1/2 top-[7px] h-[11px] w-[15px] -translate-x-1/2 rounded-[50%]"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #ffffff, #fff4e0 55%, #f0e0c0)',
          boxShadow: '0 1px 1px #0003',
        }}
      />
      {/* Chocolate scoop */}
      <div
        className="absolute left-[3px] top-[3px] h-[9px] w-[10px] rounded-[50%]"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #8b5a2b, #5a3010 70%)',
        }}
      />
      {/* Strawberry scoop */}
      <div
        className="absolute right-[2px] top-[2px] h-[9px] w-[10px] rounded-[50%]"
        style={{
          background: 'radial-gradient(circle at 40% 30%, #ff8aa0, #d62848 70%)',
        }}
      />
      {/* Cherry */}
      <div
        className="absolute left-1/2 top-0 h-[6px] w-[6px] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #ff4d5a, #b01020)',
          boxShadow: '0 0 3px #ff607088',
        }}
      />
      <div className="absolute left-[52%] top-[-1px] h-[4px] w-[1.5px] -translate-x-1/2 rounded-full bg-[#2e7d32]" />
    </div>
  )
}

export function SundaeSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 820)
  const scale = 0.55 + p * 2.4
  const opacity = 1 - p * 0.95
  const scoops = [
    { deg: 0, c: '#fff6e8', r: 11 },
    { deg: 28, c: '#ff8aa0', r: 13 },
    { deg: 55, c: '#8b5a2b', r: 10 },
    { deg: 85, c: '#fffaf0', r: 14 },
    { deg: 115, c: '#d62848', r: 12 },
    { deg: 145, c: '#c48a3a', r: 11 },
    { deg: 175, c: '#ffe0e8', r: 13 },
    { deg: 205, c: '#5a3010', r: 10 },
    { deg: 235, c: '#fff4e0', r: 14 },
    { deg: 265, c: '#ff6b7a', r: 12 },
    { deg: 295, c: '#e8b86a', r: 11 },
    { deg: 325, c: '#ffffff', r: 13 },
  ]
  return (
    <div
      className="relative h-14 w-14"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      {/* Melty puddle */}
      <div
        className="absolute left-1/2 top-1/2 h-8 w-10 -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          background:
            'radial-gradient(ellipse, #fff6e8ee 0%, #ffc0cb88 35%, #8b5a2b55 55%, transparent 70%)',
        }}
      />
      {scoops.map(({ deg, c, r }) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[55%_45%_60%_40%]"
          style={{
            width: deg % 2 === 0 ? 9 : 7,
            height: deg % 3 === 0 ? 7 : 5,
            background: c,
            transform: `rotate(${deg}deg) translateY(-${r + p * 14}px)`,
            boxShadow: '0 0 2px #0002',
          }}
        />
      ))}
      {/* Cherry bounce */}
      <div
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #ff4d5a, #b01020)',
          transform: `translate(-50%, -50%) translate(${p * 8}px, ${-6 - p * 10}px)`,
        }}
      />
      {/* Cone shard */}
      <div
        className="absolute left-1/2 top-1/2 h-3 w-2.5 -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'linear-gradient(180deg,#e8b86a,#9a6420)',
          clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)',
          transform: `rotate(${25 + p * 40}deg) translate(${-4 - p * 6}px, ${2 + p * 8}px)`,
        }}
      />
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
    <div className="relative h-2 w-5" aria-hidden>
      <div
        className="absolute inset-y-[3px] left-0 right-0 rounded-full"
        style={{
          background: 'linear-gradient(90deg,#fffef5,#ffe08a 35%,#ff9800)',
          boxShadow: '0 0 8px #ffd54fee, 0 0 14px #ff980088',
        }}
      />
      <div
        className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle,#fff,#ffe08a 60%,transparent)', opacity: 0.9 }}
      />
    </div>
  )
}

/** Melee impact flash at the strike point. */
export function MeleeHitFx({
  ageMs,
  kind = 'melee',
}: {
  ageMs: number
  kind?: 'melee' | 'whip' | 'bite' | 'kick' | 'hug'
}) {
  const p = Math.min(1, ageMs / 420)
  const scale = 0.55 + p * 1.6
  const opacity = 1 - p * 0.95
  const color =
    kind === 'whip'
      ? '#f5d76e'
      : kind === 'bite'
        ? '#ff6b9a'
        : kind === 'kick'
          ? '#ffffff'
          : kind === 'hug'
            ? '#ff4d6d'
            : '#ffe08a'
  return (
    <div
      className="relative h-10 w-10"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}ee 0%, ${color}66 40%, transparent 70%)`,
        }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 h-1 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: color,
            transform: `rotate(${deg}deg) translateX(${6 + p * 10}px)`,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      ))}
    </div>
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

/** Shay Love projectile — soft red heart drifting to the target. */
export function LoveDot() {
  return (
    <div className="relative h-6 w-6" aria-hidden>
      <div
        className="absolute inset-[-2px] rounded-full"
        style={{ background: 'radial-gradient(circle,#ff8a9a66 0%,transparent 70%)' }}
      />
      <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full drop-shadow">
        <path
          d="M16 28 C16 28 4 20 4 12 C4 7.5 7.5 5 11 5 C13.5 5 15.2 6.4 16 8 C16.8 6.4 18.5 5 21 5 C24.5 5 28 7.5 28 12 C28 20 16 28 16 28 Z"
          fill="#e53935"
          stroke="#ffb3c1"
          strokeWidth="1.1"
        />
        <path
          d="M11 9 C12.5 8.2 14 9.2 14.5 11"
          fill="none"
          stroke="#ffe0e6"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

/** Love heart impact — soft burst of pink hearts. */
export function LoveSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 720)
  const scale = 0.55 + p * 1.35
  const opacity = 1 - p * 0.95
  return (
    <div
      className="relative h-9 w-9"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle,#ff8a9a88 0%,#e5393533 50%,transparent 72%)',
        }}
      />
      {[0, 72, 144, 216, 288].map((deg) => (
        <svg
          key={deg}
          viewBox="0 0 32 32"
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `rotate(${deg}deg) translateY(-${4 + p * 8}px)` }}
        >
          <path
            d="M16 28 C16 28 4 20 4 12 C4 7.5 7.5 5 11 5 C13.5 5 15.2 6.4 16 8 C16.8 6.4 18.5 5 21 5 C24.5 5 28 7.5 28 12 C28 20 16 28 16 28 Z"
            fill="#ff6b81"
          />
        </svg>
      ))}
    </div>
  )
}

/** Dan death heart — pulses until claimed or 3s expire. */
export function RageHeartPickup({ ageMs }: { ageMs: number }) {
  const life = Math.min(1, ageMs / 3000)
  const pulse = 0.92 + Math.sin(ageMs / 120) * 0.1
  const opacity = life > 0.75 ? 1 - (life - 0.75) / 0.25 : 1
  return (
    <div
      className="relative h-7 w-7"
      style={{ transform: `scale(${pulse})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle,#ff60ff55 0%,transparent 70%)' }}
      />
      <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full drop-shadow">
        <path
          d="M16 28 C16 28 4 20 4 12 C4 7.5 7.5 5 11 5 C13.5 5 15.2 6.4 16 8 C16.8 6.4 18.5 5 21 5 C24.5 5 28 7.5 28 12 C28 20 16 28 16 28 Z"
          fill="#e53935"
          stroke="#ff80ab"
          strokeWidth="1.2"
        />
        <path
          d="M11 9 C12.5 8.2 14 9.2 14.5 11"
          fill="none"
          stroke="#ffcdd2"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
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

/** Cash Gun impact — green money burst. */
export function CashSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 720)
  const scale = 0.45 + p * 2.2
  const opacity = 1 - p * 0.9
  return (
    <div
      className="relative h-14 w-14"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, #b8ffc8 0%, #3ecf6aaa 40%, #1a7a3a55 55%, transparent 70%)',
        }}
      />
      {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 h-2 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[1px]"
          style={{
            background: 'linear-gradient(180deg,#9dffb0,#2a9a4a)',
            transform: `rotate(${deg}deg) translateY(-${5 + p * 9}px)`,
          }}
        />
      ))}
    </div>
  )
}

/** Football spell impact — dusty turf burst. */
export function FootballSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 900)
  const scale = 0.5 + p * 3.2
  const opacity = 1 - p * 0.92
  return (
    <div
      className="relative h-16 w-16"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, #e8c090 0%, #8a5a28aa 40%, #3a201055 55%, transparent 70%)',
        }}
      />
    </div>
  )
}

/** Sundae spell impact — creamy splash across the blast radius. */
export function IceCreamSplat({ ageMs }: { ageMs: number }) {
  const p = Math.min(1, ageMs / 900)
  const scale = 0.4 + p * 2.8
  const opacity = 1 - p * 0.92
  return (
    <div
      className="relative h-16 w-16"
      style={{ transform: `scale(${scale})`, opacity }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, #fff8f0 0%, #ffd1e0 35%, #f5a8c8aa 55%, transparent 70%)',
        }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: deg % 90 === 0 ? '#fff6e8' : '#ff9eb8',
            transform: `rotate(${deg}deg) translateY(-${6 + p * 10}px)`,
          }}
        />
      ))}
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
