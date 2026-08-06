import type { PlateDesign } from './plateDesigns'

type Props = {
  design: PlateDesign
  stateCode: string
  stateName?: string
  className?: string
  compact?: boolean
}

/** Real license-plate photograph (from World License Plates). */
export function PlateVisual({ design, stateCode, stateName, className = '', compact }: Props) {
  const label = `${stateName ?? stateCode} — ${design.name}`

  if (design.image) {
    const src = design.image.startsWith('/') || design.image.startsWith('http')
      ? design.image
      : `./${design.image}`
    return (
      <img
        src={src}
        alt={design.alt || label}
        title={label}
        loading="lazy"
        decoding="async"
        className={`shrink-0 bg-lane object-contain ring-1 ring-black/15 ${
          compact ? 'h-14 w-28 rounded-[3px]' : 'h-auto w-full max-w-md rounded-sm'
        } ${className}`}
      />
    )
  }

  // Fallback if an image is missing
  const bg = design.colors?.bg ?? '#f4f0e6'
  const fg = design.colors?.fg ?? '#1a1a1a'
  const h = compact ? 56 : 88
  const w = compact ? 112 : 176
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={`shrink-0 overflow-hidden rounded-[4px] shadow-sm ring-1 ring-black/15 ${className}`}
      role="img"
      aria-label={label}
    >
      <rect width={w} height={h} rx={4} fill={bg} />
      <text
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fg}
        fontSize={compact ? 8 : 11}
        fontFamily="IBM Plex Sans, sans-serif"
      >
        {stateCode}
      </text>
    </svg>
  )
}
