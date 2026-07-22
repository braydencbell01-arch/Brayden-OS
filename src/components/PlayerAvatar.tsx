import { useState } from 'react'

export type PlayerAvatarProps = {
  name: string
  /** Preferred headshot / real photo URL */
  photoUrl?: string | null
  /** Kit / jersey graphic fallback */
  jerseyUrl?: string | null
  /** Shirt number shown when images fail */
  jersey?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
} as const

/**
 * Photo first → jersey graphic → shirt number → "?".
 */
export function PlayerAvatar({
  name,
  photoUrl,
  jerseyUrl,
  jersey,
  size = 'md',
  className = '',
}: PlayerAvatarProps) {
  const [stage, setStage] = useState<'photo' | 'jersey' | 'fallback'>(() => {
    if (photoUrl) return 'photo'
    if (jerseyUrl) return 'jersey'
    return 'fallback'
  })

  const sizeClass = SIZE[size]
  const numberLabel = jersey?.trim() ? jersey.trim().replace(/^#/, '') : null

  if (stage === 'photo' && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        title={name}
        className={`${sizeClass} shrink-0 rounded-full border border-white/15 object-cover bg-pitch ${className}`}
        loading="lazy"
        onError={() => setStage(jerseyUrl ? 'jersey' : 'fallback')}
      />
    )
  }

  if (stage === 'jersey' && jerseyUrl) {
    return (
      <div
        className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-full border border-white/15 bg-pitch ${className}`}
        title={name}
      >
        <img
          src={jerseyUrl}
          alt=""
          className="h-full w-full object-contain p-0.5"
          loading="lazy"
          onError={() => setStage('fallback')}
        />
        {numberLabel ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-pitch-deep/75 py-px text-center text-[0.55rem] font-bold leading-none text-cream tabular-nums">
            {numberLabel}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-white/15 bg-pitch font-display tracking-wide text-lime ${className}`}
      title={name}
      aria-label={numberLabel ? `${name} #${numberLabel}` : `${name} photo unavailable`}
    >
      {numberLabel ? numberLabel : '?'}
    </div>
  )
}
