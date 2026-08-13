import type { CharacterAnim } from './PhilModel'

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Chicken Barrel — wooden keg with chickens packed inside (spell card). */
export function ChickenBarrelModel({ portrait }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden>
      <svg
        viewBox="0 0 80 100"
        className="h-full w-full"
        preserveAspectRatio={portrait ? 'xMidYMid slice' : 'xMidYMid meet'}
      >
        <defs>
          <linearGradient id="cbSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ec8ff" />
            <stop offset="55%" stopColor="#c8e8a8" />
            <stop offset="100%" stopColor="#5a8a38" />
          </linearGradient>
          <linearGradient id="cbWood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5a3010" />
            <stop offset="22%" stopColor="#c48a3a" />
            <stop offset="50%" stopColor="#e8b86a" />
            <stop offset="78%" stopColor="#c48a3a" />
            <stop offset="100%" stopColor="#5a3010" />
          </linearGradient>
        </defs>
        <rect width="80" height="100" fill="url(#cbSky)" />
        <ellipse cx="40" cy="86" rx="28" ry="6" fill="#3a5a20" opacity="0.45" />
        {/* Barrel */}
        <ellipse cx="40" cy="38" rx="22" ry="8" fill="#8a5a28" />
        <path
          d="M18 40 C18 78 62 78 62 40"
          fill="url(#cbWood)"
          stroke="#3a1a08"
          strokeWidth="1.4"
        />
        <ellipse cx="40" cy="40" rx="22" ry="8" fill="#d4a06a" stroke="#5a3010" strokeWidth="1.2" />
        <ellipse cx="40" cy="40" rx="14" ry="5" fill="#6a3a12" />
        <ellipse cx="40" cy="40" rx="8" ry="3" fill="#2a1408" />
        {[52, 62, 72].map((y) => (
          <path
            key={y}
            d={`M20 ${y} Q40 ${y + 6} 60 ${y}`}
            fill="none"
            stroke="#2a1408"
            strokeWidth="2.2"
          />
        ))}
        {/* Chickens peeking from the lid */}
        <g transform="translate(28 28)">
          <ellipse cx="0" cy="0" rx="6" ry="5.2" fill="#f0c040" />
          <circle cx="-2" cy="-1" r="1.1" fill="#1a1008" />
          <path d="M6 0 L11 1 L6 3 Z" fill="#e07020" />
        </g>
        <g transform="translate(40 24)">
          <ellipse cx="0" cy="0" rx="6.4" ry="5.6" fill="#f5d76e" />
          <circle cx="-2.2" cy="-1" r="1.15" fill="#1a1008" />
          <path d="M6.2 0 L12 1.2 L6.2 3.2 Z" fill="#e07020" />
        </g>
        <g transform="translate(52 29)">
          <ellipse cx="0" cy="0" rx="5.8" ry="5" fill="#e8b84a" />
          <circle cx="-1.8" cy="-0.8" r="1.05" fill="#1a1008" />
          <path d="M5.6 0 L10.5 1 L5.6 2.8 Z" fill="#e07020" />
        </g>
      </svg>
    </div>
  )
}
