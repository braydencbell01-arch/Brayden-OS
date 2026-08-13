import { useId } from 'react'
import { CARD_PORTRAIT_BG } from './cardArt'
import type { CharacterAnim } from './PhilModel'

const CHICKEN = `${import.meta.env.BASE_URL}characters/chicken-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/**
 * Clash Goblin Barrel pose — tilted open keg with the in-game chicken peeking out.
 * Kept small enough that the full barrel + chicken head stay inside the card frame.
 */
export function ChickenBarrelModel({ portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  // Portrait cards are short — shrink + nudge so nothing clips the frame.
  const boxW = portrait ? '54%' : '84%'
  const boxH = portrait ? '64%' : '92%'
  const top = portrait ? '58%' : '52%'
  const rot = portrait ? -24 : -30
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: portrait ? CARD_PORTRAIT_BG : 'transparent' }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          top,
          width: boxW,
          height: boxH,
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        }}
      >
        <svg
          className="absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 100 130"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id={`${uid}-hole`} cx="48%" cy="42%" r="70%">
              <stop offset="0%" stopColor="#1a0c06" />
              <stop offset="100%" stopColor="#3a2210" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="48" rx="30" ry="13" fill="#6a4220" />
          <ellipse cx="50" cy="50" rx="24" ry="10" fill={`url(#${uid}-hole)`} />
        </svg>

        {/* In-game chicken-troop — head / comb / beak out of the open top. */}
        <img
          src={CHICKEN}
          alt=""
          draggable={false}
          className="pointer-events-none absolute z-[1] object-cover"
          style={{
            left: '18%',
            top: '2%',
            width: '64%',
            height: '52%',
            objectPosition: '50% 0%',
            clipPath: 'inset(0 16% 42% 10%)',
            filter: 'brightness(1.06) saturate(1.08)',
          }}
        />

        <svg
          className="absolute inset-0 z-[2] h-full w-full"
          viewBox="0 0 100 130"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5a3010" />
              <stop offset="16%" stopColor="#a56a32" />
              <stop offset="38%" stopColor="#e0b06a" />
              <stop offset="52%" stopColor="#f0d08a" />
              <stop offset="70%" stopColor="#c4843a" />
              <stop offset="100%" stopColor="#4a240c" />
            </linearGradient>
            <linearGradient id={`${uid}-hoop`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a2414" />
              <stop offset="45%" stopColor="#6a4428" />
              <stop offset="100%" stopColor="#2a1608" />
            </linearGradient>
            <clipPath id={`${uid}-body`}>
              <path d="M20 60 C14 78 15 96 24 114 A26 10 0 0 0 76 114 C85 96 86 78 80 60 A30 13 0 0 1 20 60 Z" />
            </clipPath>
          </defs>
          <path
            d="M20 60 C14 78 15 96 24 114 A26 10 0 0 0 76 114 C85 96 86 78 80 60 A30 13 0 0 1 20 60 Z"
            fill={`url(#${uid}-wood)`}
            stroke="#3a1a08"
            strokeWidth="1.1"
          />
          <g clipPath={`url(#${uid}-body)`}>
            {[24, 32, 40, 48, 56, 64, 72, 76].map((x) => (
              <path
                key={x}
                d={`M${x} 58 L${x} 116`}
                fill="none"
                stroke="#5a301088"
                strokeWidth="1.15"
              />
            ))}
            <path
              d="M14 76 C50 86 86 76 86 76 L84 84 C50 94 16 84 16 84 Z"
              fill={`url(#${uid}-hoop)`}
            />
            <path
              d="M18 100 C50 110 82 100 82 100 L80 108 C50 118 20 108 20 108 Z"
              fill={`url(#${uid}-hoop)`}
            />
          </g>
          <path
            d="M20 60 A30 13 0 0 0 80 60"
            fill="none"
            stroke="#c48a3a"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <ellipse cx="50" cy="114" rx="26" ry="9" fill="#6a3e18" stroke="#3a1a08" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
