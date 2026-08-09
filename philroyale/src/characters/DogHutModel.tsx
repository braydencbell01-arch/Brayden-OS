import type { CharacterAnim } from './PhilModel'
import { CARD_PORTRAIT_BG } from './cardArt'

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Clash-style 3D dog kennel for battlefield + solid-blue card portrait. */
export function DogHutModel({ portrait }: Props) {
  if (portrait) {
    return (
      <div
        className="relative flex h-full w-full items-end justify-center overflow-hidden"
        style={{ background: CARD_PORTRAIT_BG }}
      >
        <div className="relative mb-[6%] h-[78%] w-[86%]">
          <HutMesh />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-end justify-center overflow-visible">
      <div
        className="absolute bottom-0 left-1/2 h-[10%] w-[70%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000055 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative mb-[2%] h-[92%] w-[96%]">
        <HutMesh />
      </div>
    </div>
  )
}

function HutMesh() {
  return (
    <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
      {/* Base plank pad */}
      <div
        className="absolute bottom-[2%] left-[8%] right-[8%] h-[12%] rounded-sm"
        style={{
          background: 'linear-gradient(180deg,#8a5a28,#5a3410)',
          boxShadow: '0 2px 0 #2a1408, inset 0 1px 0 #c9a06a66',
        }}
      />
      {/* Side wall (depth) */}
      <div
        className="absolute bottom-[12%] right-[10%] h-[48%] w-[18%]"
        style={{
          background: 'linear-gradient(90deg,#6a4220,#3a2010)',
          transform: 'skewY(-12deg)',
          transformOrigin: 'bottom left',
          boxShadow: 'inset -2px 0 0 #1a1008',
        }}
      />
      {/* Front face */}
      <div
        className="absolute bottom-[12%] left-[14%] h-[50%] w-[58%] rounded-sm"
        style={{
          background: 'linear-gradient(180deg,#c48a3a 0%,#8a5520 55%,#5a3010 100%)',
          boxShadow: 'inset 0 1px 0 #e8c07a88, 2px 0 0 #3a2010',
        }}
      >
        {/* Plank lines */}
        <div
          className="absolute inset-0 opacity-35"
          style={{
            background:
              'repeating-linear-gradient(90deg, transparent 0 22%, #3a2010 22% 24%)',
          }}
        />
        {/* Door hole */}
        <div
          className="absolute bottom-0 left-1/2 h-[62%] w-[42%] -translate-x-1/2 rounded-t-full"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #1a1008 0%, #0a0604 70%)',
            boxShadow: 'inset 0 2px 4px #000a',
          }}
        />
        {/* Bone plaque */}
        <div
          className="absolute left-1/2 top-[8%] h-[18%] w-[50%] -translate-x-1/2 rounded-full"
          style={{
            background: 'linear-gradient(180deg,#fff3d0,#e0c090)',
            boxShadow: '0 1px 0 #8a6a40',
          }}
        />
      </div>
      {/* Roof left slope */}
      <div
        className="absolute left-[10%] top-[8%] h-[38%] w-[42%]"
        style={{
          background: 'linear-gradient(135deg,#8b2e1a 0%,#5a180c 60%,#3a1008 100%)',
          clipPath: 'polygon(0 100%, 100% 100%, 100% 35%, 50% 0)',
          boxShadow: 'inset 0 1px 0 #c45a3a55',
        }}
      />
      {/* Roof right slope */}
      <div
        className="absolute right-[8%] top-[8%] h-[38%] w-[46%]"
        style={{
          background: 'linear-gradient(225deg,#a03820 0%,#6a2010 55%,#401008 100%)',
          clipPath: 'polygon(0 100%, 100% 100%, 55% 0, 0 40%)',
        }}
      />
      {/* Ridge */}
      <div
        className="absolute left-[48%] top-[6%] h-[8%] w-[18%] -translate-x-1/2 rounded-sm"
        style={{ background: 'linear-gradient(180deg,#d06040,#7a2810)' }}
      />
    </div>
  )
}
