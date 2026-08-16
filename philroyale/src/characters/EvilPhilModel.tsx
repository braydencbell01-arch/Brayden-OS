import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/evil-phil-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/evil-phil-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/evil-phil-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Evil Phil — purple-mist coach crouch; sundae + whip overlays. */
export function EvilPhilModel({ anim, facing, attackId, portrait }: Props) {
  const attack =
    anim === 'attack' && attackId === 'chickenWhip'
      ? 'whip'
      : anim === 'attack' && attackId === 'sundaeHuck'
        ? 'sundae'
        : 'none'

  return (
    <div className="relative h-full w-full">
      <PhotoTroop
        cardSrc={CARD}
        troopSrc={TROOP}
        troopBackSrc={BACK}
        alt="Evil Phil"
        anim={anim}
        facing={facing}
        portrait={portrait}
      portraitScale={1.2}
        objectPos="50% 22%"
        gait="jog"
        attack={attack}
        spriteLegs
      />
      {/* Soft animated purple mist on top of baked-in aura */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 55%, #b040ff55 0%, #6a10c033 40%, transparent 72%)',
          mixBlendMode: 'screen',
          animation: 'evilPhilMist 1.8s ease-in-out infinite',
        }}
        aria-hidden
      />
      <style>{`
        @keyframes evilPhilMist {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
