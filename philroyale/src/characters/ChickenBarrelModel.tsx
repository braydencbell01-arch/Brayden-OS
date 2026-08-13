import { useId } from 'react'
import { CARD_PORTRAIT_BG } from './cardArt'
import type { CharacterAnim } from './PhilModel'

const CHICKEN = `${import.meta.env.BASE_URL}characters/chicken-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Clash Goblin Barrel pose — tilted open keg with the in-game chicken peeking out. */
export function ChickenBarrelModel({ portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  return (
    <div
      className={`relative h-full w-full ${portrait ? 'overflow-hidden' : 'overflow-visible'}`}
      style={{ background: portrait ? CARD_PORTRAIT_BG : 'transparent' }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-[56%] h-[108%] w-[108%] -translate-x-1/2 -translate-y-1/2"
        style={{ transform: 'translate(-50%, -50%) rotate(-38deg)' }}
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
          {/* Far rim + hollow interior (behind the chicken). */}
          <ellipse cx="50" cy="42" rx="33" ry="15" fill="#6a4220" />
          <ellipse cx="50" cy="44" rx="27" ry="12" fill={`url(#${uid}-hole)`} />
        </svg>

        {/* Same chicken-troop sprite — head / comb / beak out of the open top. */}
        <img
          src={CHICKEN}
          alt=""
          draggable={false}
          className="pointer-events-none absolute z-[1] object-cover"
          style={{
            left: '16%',
            top: '-6%',
            width: '68%',
            height: '58%',
            objectPosition: '50% 0%',
            clipPath: 'inset(0 18% 38% 8%)',
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
              <path d="M18 56 C12 78 13 98 22 118 A28 11 0 0 0 78 118 C87 98 88 78 82 56 A32 14 0 0 1 18 56 Z" />
            </clipPath>
          </defs>
          {/* Front wall — covers the chicken body, leaves the open top clear. */}
          <path
            d="M18 56 C12 78 13 98 22 118 A28 11 0 0 0 78 118 C87 98 88 78 82 56 A32 14 0 0 1 18 56 Z"
            fill={`url(#${uid}-wood)`}
            stroke="#3a1a08"
            strokeWidth="1.1"
          />
          <g clipPath={`url(#${uid}-body)`}>
            {[22, 30, 38, 46, 54, 62, 70, 78].map((x) => (
              <path
                key={x}
                d={`M${x} 54 L${x} 120`}
                fill="none"
                stroke="#5a301088"
                strokeWidth="1.15"
              />
            ))}
            <path
              d="M12 72 C50 82 88 72 88 72 L86 80 C50 90 14 80 14 80 Z"
              fill={`url(#${uid}-hoop)`}
            />
            <path
              d="M16 100 C50 110 84 100 84 100 L82 108 C50 118 18 108 18 108 Z"
              fill={`url(#${uid}-hoop)`}
            />
          </g>
          {/* Near rim in front of the chicken’s chest. */}
          <path
            d="M18 56 A32 14 0 0 0 82 56"
            fill="none"
            stroke="#c48a3a"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <ellipse cx="50" cy="118" rx="28" ry="10" fill="#6a3e18" stroke="#3a1a08" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
