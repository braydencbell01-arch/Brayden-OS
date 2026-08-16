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

/** Berry — straw hat juice lobber; blue Aura flames after a kill. */
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
      portraitScale={1.2}
        objectPos="50% 22%"
        portraitFilter="brightness(1) saturate(1.05)"
        gait="jog"
        spriteLegs={false}
        attack={anim === 'attack' && attackId === 'aura' ? 'berryJuice' : 'none'}
      />
      {auraActive && !portrait ? (
        <>
          {/* Blue flames rising from Berry — not a smoke cloud */}
          <div
            className="pointer-events-none absolute inset-x-[-18%] bottom-[-4%] top-[-8%] overflow-visible"
            aria-hidden
          >
            {[
              { left: '18%', delay: '0s', h: '78%', w: '22%' },
              { left: '38%', delay: '0.18s', h: '92%', w: '26%' },
              { left: '58%', delay: '0.08s', h: '84%', w: '24%' },
              { left: '28%', delay: '0.32s', h: '70%', w: '18%' },
              { left: '52%', delay: '0.42s', h: '66%', w: '16%' },
            ].map((f, i) => (
              <div
                key={i}
                className="absolute bottom-[8%]"
                style={{
                  left: f.left,
                  width: f.w,
                  height: f.h,
                  transformOrigin: '50% 100%',
                  animation: `berryAuraFlame 0.55s ease-in-out ${f.delay} infinite`,
                  background: `
                    radial-gradient(ellipse 55% 40% at 50% 18%, #e8f8ff 0%, transparent 55%),
                    radial-gradient(ellipse 70% 55% at 50% 42%, #80d8ff 0%, #30a0ff 45%, transparent 70%),
                    radial-gradient(ellipse 80% 70% at 50% 78%, #1878e0 0%, #0a4090aa 55%, transparent 78%)
                  `,
                  borderRadius: '45% 55% 40% 60% / 70% 65% 35% 30%',
                  filter: 'blur(0.4px)',
                  mixBlendMode: 'screen',
                  opacity: 0.92,
                }}
              />
            ))}
            {/* Hot core at the feet */}
            <div
              className="absolute bottom-[6%] left-1/2 h-[22%] w-[55%] -translate-x-1/2"
              style={{
                borderRadius: '50%',
                background:
                  'radial-gradient(ellipse, #c0f0ffcc 0%, #40b0ff88 40%, transparent 72%)',
                filter: 'blur(1px)',
                animation: 'berryAuraCore 0.7s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`
            @keyframes berryAuraFlame {
              0%, 100% {
                opacity: 0.75;
                transform: scaleY(0.92) scaleX(1) translateY(0);
              }
              40% {
                opacity: 1;
                transform: scaleY(1.12) scaleX(0.92) translateY(-6%);
              }
              70% {
                opacity: 0.88;
                transform: scaleY(1.04) scaleX(1.06) translateY(-3%);
              }
            }
            @keyframes berryAuraCore {
              0%, 100% { opacity: 0.65; transform: translateX(-50%) scale(0.95); }
              50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
            }
          `}</style>
        </>
      ) : null}
    </div>
  )
}
