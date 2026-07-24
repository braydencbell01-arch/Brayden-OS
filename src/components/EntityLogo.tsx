import { useEffect, useState } from 'react'

const SIZE = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
} as const

/**
 * Circular logo frame for teams / leagues (mirrors PlayerAvatar sizing).
 */
export function EntityLogo({
  name,
  src,
  size = 'md',
  className = '',
  ringColor,
}: {
  name: string
  src?: string | null
  size?: keyof typeof SIZE
  className?: string
  /** Optional CSS color for a soft ring (team primary). */
  ringColor?: string | null
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const sizeClass = SIZE[size]
  const ringStyle = ringColor
    ? { boxShadow: `0 0 0 2px ${ringColor}, 0 0 18px ${ringColor}55` }
    : undefined

  if (!src || failed) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-white/15 bg-pitch font-display tracking-wide text-lime ${className}`}
        title={name}
        aria-label={`${name} logo unavailable`}
        style={ringStyle}
      >
        <span className="text-[0.7em]">{initials || '?'}</span>
      </div>
    )
  }

  return (
    <div
      className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-full border border-white/15 bg-pitch ${className}`}
      title={name}
      style={ringStyle}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain p-1.5"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
