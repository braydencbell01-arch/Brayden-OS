import { motion } from 'framer-motion'
import type { AttackKind } from './characters'
import { PHIL } from './characters'

type Props = {
  side: 'ally' | 'enemy'
  hpPct: number
  vfx: AttackKind | null
  facing: number
}

/** Clash-style “3D” troop: body + Phil portrait head (not a flat card square). */
export function PhilUnit({ side, hpPct, vfx, facing }: Props) {
  const flip = Math.cos(facing) < 0 ? -1 : 1
  const enemy = side === 'enemy'

  return (
    <div className="relative flex w-[3.4rem] flex-col items-center">
      <div className="mb-0.5 h-1.5 w-[85%] overflow-hidden rounded-sm bg-black/55 ring-1 ring-black/40">
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
        className="relative origin-bottom"
        style={{ scaleX: flip }}
        animate={
          vfx === 'whip'
            ? { rotate: [0, -12, 22, -8, 0], y: [0, 0, 0] }
            : vfx === 'sundae'
              ? { rotate: [0, -8, 0], y: [0, -4, 0] }
              : { y: [0, -2, 0] }
        }
        transition={
          vfx
            ? { duration: vfx === 'whip' ? 0.55 : 0.35 }
            : { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* Ground shadow */}
        <div
          className="absolute -bottom-0.5 left-1/2 h-2 w-10 -translate-x-1/2 rounded-[100%] bg-black/35"
          aria-hidden
        />

        {/* Legs */}
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
          <div className="h-4 w-2.5 rounded-b-md bg-[#1a2744] shadow" />
          <div className="h-4 w-2.5 rounded-b-md bg-[#1a2744] shadow" />
        </div>

        {/* Torso — navy CK sweatshirt look */}
        <div
          className="relative z-[1] mx-auto h-9 w-11 rounded-t-2xl rounded-b-lg"
          style={{
            background: 'linear-gradient(160deg,#2a3f6e 0%,#1a2744 55%,#121a30 100%)',
            boxShadow: '2px 3px 0 #0a1020, inset 0 2px 0 #4a6a9a55',
            transform: 'perspective(40px) rotateX(8deg)',
          }}
        >
          <span className="absolute right-1.5 top-2 text-[0.45rem] font-bold tracking-tight text-white/80">
            ck
          </span>
        </div>

        {/* Arms */}
        <div
          className={`absolute top-7 z-[2] h-2.5 w-3 rounded-full bg-[#e8c4a8] shadow ${vfx === 'sundae' ? '-left-1 rotate-[-40deg]' : 'left-0'}`}
        />
        <motion.div
          className="absolute top-6 z-[3] -right-0.5 origin-left"
          animate={
            vfx === 'whip'
              ? { rotate: [-20, 70, -10] }
              : vfx === 'sundae'
                ? { rotate: [0, -50, 0] }
                : { rotate: 10 }
          }
          transition={{ duration: vfx === 'whip' ? 0.55 : 0.3 }}
        >
          <div className="h-2.5 w-3 rounded-full bg-[#e8c4a8] shadow" />
          {vfx === 'whip' ? (
            <svg
              className="absolute left-2 top-0.5 overflow-visible"
              width="52"
              height="18"
              viewBox="0 0 52 18"
              aria-hidden
            >
              <path
                d="M0 8 C12 2, 22 16, 34 6 S48 4, 52 8"
                fill="none"
                stroke="#6b3a1f"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M0 8 C12 2, 22 16, 34 6 S48 4, 52 8"
                fill="none"
                stroke="#c4a06a"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          ) : null}
          {vfx === 'sundae' ? (
            <div className="absolute -left-1 -top-5 scale-90">
              <FullSundae />
            </div>
          ) : null}
        </motion.div>

        {/* Head — Phil photo in 3D capsule */}
        <div
          className="relative z-[4] -mt-1 mx-auto h-10 w-10 overflow-hidden rounded-[45%]"
          style={{
            boxShadow: '0 2px 0 #0a1020, 0 4px 8px #00000066',
            border: '2px solid #f5d76e',
            transform: 'perspective(50px) rotateX(-6deg)',
          }}
        >
          <img
            src={PHIL.portrait}
            alt="Phil"
            className="h-full w-full object-cover object-[50%_18%]"
            draggable={false}
          />
        </div>
      </motion.div>
    </div>
  )
}

export function FullSundae({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-7 w-5 ${className}`} aria-hidden>
      {/* cherry */}
      <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d62828] shadow" />
      <div className="absolute left-[55%] top-0 h-2 w-px bg-[#2d6a2d]" />
      {/* scoops */}
      <div className="absolute left-[2px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#fff6e8] shadow" />
      <div className="absolute right-[1px] top-2 h-2.5 w-2.5 rounded-full bg-[#ffb4c8] shadow" />
      <div className="absolute left-1/2 top-3 h-2.5 w-3 -translate-x-1/2 rounded-full bg-[#f5d76e] shadow" />
      {/* cup */}
      <div
        className="absolute bottom-0 left-1/2 h-3 w-4 -translate-x-1/2"
        style={{
          background: 'linear-gradient(180deg,#fff 0%,#e8eef8 100%)',
          clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)',
          boxShadow: 'inset 0 0 0 1px #b8c4d8',
        }}
      />
      <div className="absolute bottom-0 left-1/2 h-0.5 w-[1.1rem] -translate-x-1/2 rounded-full bg-[#c8d2e0]" />
    </div>
  )
}
