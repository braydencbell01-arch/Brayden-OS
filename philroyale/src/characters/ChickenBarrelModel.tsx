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
 * Portrait scales the whole stack so the full chicken (comb + head) stays inside the card.
 */
export function ChickenBarrelModel({ portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  // Portrait: leave headroom above the comb; battlefield can lean harder.
  const boxW = portrait ? '68%' : '84%'
  const boxH = portrait ? '82%' : '92%'
  const rot = portrait ? -8 : -30
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: portrait ? CARD_PORTRAIT_BG : 'transparent' }}
      aria-hidden
    >
      <div
        className="relative"
        style={{
          width: boxW,
          height: boxH,
          transform: portrait
            ? `translateY(4%) scale(0.92) rotate(${rot}deg)`
            : `rotate(${rot}deg)`,
          transformOrigin: '50% 55%',
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

        {/* Full chicken peeking out — object-contain so comb/beak aren't cropped. */}
        <img
          src={CHICKEN}
          alt=""
          draggable={false}
          className="pointer-events-none absolute z-[1]"
          style={{
            left: portrait ? '20%' : '18%',
            top: portrait ? '0%' : '2%',
            width: portrait ? '60%' : '64%',
            height: portrait ? '58%' : '52%',
            objectFit: 'contain',
            objectPosition: '50% 0%',
            // Hide only the lower body inside the keg — never clip the head.
            clipPath: portrait ? 'inset(0 6% 28% 6%)' : 'inset(0 16% 42% 10%)',
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
