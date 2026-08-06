import { isWlpPlateSheet, type PlateDesign } from './plateDesigns'

type Props = {
  design: PlateDesign
  stateCode: string
  stateName?: string
  className?: string
  compact?: boolean
  /** Force cropping a multi-plate WLP sheet to one plate (default: on when compact). */
  cropToSingle?: boolean
}

/** Real license-plate photograph (from World License Plates). */
export function PlateVisual({
  design,
  stateCode,
  stateName,
  className = '',
  compact,
  cropToSingle,
}: Props) {
  const label = `${stateName ?? stateCode} — ${design.name}`
  const shouldCrop = (cropToSingle ?? !!compact) && isWlpPlateSheet(design)

  if (design.image) {
    const src = design.image.startsWith('/') || design.image.startsWith('http')
      ? design.image
      : `./${design.image}`

    // WLP US pages mostly ship collage sheets — crop to the top-left plate for list thumbs.
    if (shouldCrop) {
      return (
        <div
          className={`relative shrink-0 overflow-hidden bg-lane ring-1 ring-black/15 ${
            compact ? 'h-14 w-28 rounded-[3px]' : 'aspect-[2/1] w-full max-w-md rounded-sm'
          } ${className}`}
          title={label}
        >
          <img
            src={src}
            alt={design.alt || label}
            loading="lazy"
            decoding="async"
            className="absolute left-0 top-0 h-[195%] w-[195%] max-w-none object-cover object-left-top"
          />
        </div>
      )
    }

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
