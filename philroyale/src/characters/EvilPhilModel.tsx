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

/** Evil Phil — clean coach crouch; compact purple mist/flame on battlefield only. */
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
      {/* Compact purple mist/flame — battlefield only, much smaller than old full-body aura */}
      {!portrait ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-[18%] bottom-[-2%] top-[42%] overflow-visible"
            aria-hidden
          >
            {[
              { left: '22%', delay: '0s', h: '72%', w: '28%' },
              { left: '40%', delay: '0.2s', h: '88%', w: '30%' },
              { left: '58%', delay: '0.1s', h: '76%', w: '26%' },
            ].map((f, i) => (
              <div
                key={i}
                className="absolute bottom-[6%]"
                style={{
                  left: f.left,
                  width: f.w,
                  height: f.h,
                  transformOrigin: '50% 100%',
                  animation: `evilPhilMistFlame 0.7s ease-in-out ${f.delay} infinite`,
                  background: `
                    radial-gradient(ellipse 50% 35% at 50% 15%, #f0d0ff 0%, transparent 55%),
                    radial-gradient(ellipse 65% 50% at 50% 45%, #c060ff 0%, #8020e0 50%, transparent 72%),
                    radial-gradient(ellipse 75% 60% at 50% 82%, #5a10b0aa 0%, #3a087888 50%, transparent 78%)
                  `,
                  borderRadius: '45% 55% 40% 60% / 70% 65% 35% 30%',
                  filter: 'blur(0.5px)',
                  mixBlendMode: 'screen',
                  opacity: 0.85,
                }}
              />
            ))}
            <div
              className="absolute bottom-[4%] left-1/2 h-[18%] w-[48%] -translate-x-1/2"
              style={{
                borderRadius: '50%',
                background:
                  'radial-gradient(ellipse, #d080ffbb 0%, #a040ff66 40%, transparent 72%)',
                filter: 'blur(1px)',
                animation: 'evilPhilMistCore 0.85s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`
            @keyframes evilPhilMistFlame {
              0%, 100% {
                opacity: 0.55;
                transform: scaleY(0.9) scaleX(1) translateY(0);
              }
              40% {
                opacity: 0.9;
                transform: scaleY(1.08) scaleX(0.94) translateY(-4%);
              }
              70% {
                opacity: 0.7;
                transform: scaleY(1.02) scaleX(1.04) translateY(-2%);
              }
            }
            @keyframes evilPhilMistCore {
              0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(0.92); }
              50% { opacity: 0.85; transform: translateX(-50%) scale(1.06); }
            }
          `}</style>
        </>
      ) : null}
    </div>
  )
}
