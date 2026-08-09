import type { AttackId } from '../characters'
import { PhilModel, type CharacterAnim } from './PhilModel'

type Props = {
  charId: string
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  /** Fallback hue for non-Phil placeholders. */
  hue?: number
  initial?: string
  enraged?: boolean
}

/** Routes to per-character 2.5D models; others use a clean placeholder until photos arrive. */
export function CharacterModel({
  charId,
  anim,
  facing,
  attackId,
  portrait,
  hue = 200,
  initial = '?',
  enraged,
}: Props) {
  if (charId === 'phil') {
    return <PhilModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  }

  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const art = enraged ? 'hsl(285 70% 42%)' : `hsl(${hue} 60% 42%)`
  const walking = anim === 'walk'

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      {!portrait ? (
        <div
          className="absolute bottom-0 left-1/2 h-[12%] w-[65%] -translate-x-1/2 rounded-[50%]"
          style={{ background: 'radial-gradient(ellipse, #00000066 0%, transparent 70%)' }}
        />
      ) : null}
      <div
        className="absolute bottom-[8%] left-1/2 flex w-[78%] -translate-x-1/2 flex-col items-center"
        style={{
          aspectRatio: '3 / 5',
          animation: walking ? 'phil-bob 0.35s ease-in-out infinite' : 'phil-idle 1.1s ease-in-out infinite',
        }}
      >
        <div
          className="mb-[6%] aspect-square w-[72%] rounded-full border border-black/20"
          style={{ background: art, boxShadow: 'inset 0 2px 0 #ffffff33' }}
        />
        <div
          className="flex flex-1 w-full items-center justify-center rounded-t-[40%] rounded-b-[18%] border border-black/25 font-[family-name:var(--font-display)] text-[0.9rem] text-white"
          style={{ background: art, boxShadow: 'inset 0 2px 0 #ffffff22, 1px 2px 0 #00000044' }}
        >
          {initial}
        </div>
      </div>
    </div>
  )
}

export type { CharacterAnim }
