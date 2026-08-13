import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/berry-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/berry-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/berry-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  auraActive?: boolean
}

/** Berry — sombrero juice lobber; blue Aura mist after a kill. */
export function BerryModel({ anim, facing, attackId, portrait, auraActive }: Props) {
  return (
    <div className="relative h-full w-full">
      <PhotoTroop
        cardSrc={CARD}
        troopSrc={TROOP}
        troopBackSrc={BACK}
        alt="Berry"
        anim={anim}
        facing={facing}
        portrait={portrait}
        portraitSrc={TROOP}
        objectPos="50% 10%"
        portraitFilter="brightness(1) saturate(1)"
        gait="jog"
        spriteLegs
        attack={anim === 'attack' && attackId === 'aura' ? 'sundae' : 'none'}
        legColor="#3a3a42"
        shoeColor="#1a1a20"
      />
      {auraActive && !portrait ? (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 55%, #40b0ff66 0%, #1060c044 40%, transparent 72%)',
              mixBlendMode: 'screen',
              animation: 'berryAuraMist 1.6s ease-in-out infinite',
            }}
            aria-hidden
          />
          <style>{`
            @keyframes berryAuraMist {
              0%, 100% { opacity: 0.7; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.06); }
            }
          `}</style>
        </>
      ) : null}
    </div>
  )
}
