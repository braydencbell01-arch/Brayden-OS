import type { PlateDesign } from './plateDesigns'

type Props = {
  design: PlateDesign
  stateCode: string
  stateName?: string
  className?: string
  compact?: boolean
}

/** Stylized license-plate illustration for a design. */
export function PlateVisual({ design, stateCode, stateName, className = '', compact }: Props) {
  const { bg, fg, bar, accent } = design.colors
  const top = design.slogan ?? stateName ?? stateCode
  const h = compact ? 56 : 88
  const w = compact ? 112 : 176

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={`shrink-0 overflow-hidden rounded-[4px] shadow-sm ring-1 ring-black/15 ${className}`}
      role="img"
      aria-label={`${stateName ?? stateCode} ${design.name} plate`}
    >
      <rect width={w} height={h} rx={4} fill={bg} />
      <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={3} fill="none" stroke={fg} strokeOpacity={0.35} strokeWidth={1.5} />
      {bar && <rect x={0} y={0} width={w} height={compact ? 8 : 12} fill={bar} />}
      {accent && !bar && (
        <circle cx={compact ? 14 : 22} cy={compact ? 16 : 24} r={compact ? 4 : 6} fill={accent} opacity={0.85} />
      )}
      <text
        x={w / 2}
        y={compact ? (bar ? 16 : 14) : bar ? 22 : 18}
        textAnchor="middle"
        fill={fg}
        fontSize={compact ? 6 : 8}
        fontWeight={700}
        fontFamily="IBM Plex Sans, sans-serif"
        letterSpacing="0.12em"
      >
        {(top.length > 28 ? top.slice(0, 26) + '…' : top).toUpperCase()}
      </text>
      <text
        x={w / 2}
        y={compact ? 36 : 54}
        textAnchor="middle"
        fill={fg}
        fontSize={compact ? 14 : 22}
        fontWeight={800}
        fontFamily="Archivo Black, Impact, sans-serif"
        letterSpacing="0.08em"
      >
        {design.sample}
      </text>
      <text
        x={w / 2}
        y={h - (compact ? 8 : 12)}
        textAnchor="middle"
        fill={fg}
        fillOpacity={0.75}
        fontSize={compact ? 7 : 9}
        fontWeight={600}
        fontFamily="IBM Plex Sans, sans-serif"
        letterSpacing="0.18em"
      >
        {stateCode}
      </text>
    </svg>
  )
}
