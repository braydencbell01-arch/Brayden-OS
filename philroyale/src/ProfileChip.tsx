import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { getFrame, getTitle } from './cosmeticsCatalog'

const SIZES = {
  xs: { box: 'h-7 w-7', radius: 'rounded-md' },
  sm: { box: 'h-9 w-9', radius: 'rounded-lg' },
  md: { box: 'h-12 w-12', radius: 'rounded-xl' },
  lg: { box: 'h-16 w-16', radius: 'rounded-xl' },
} as const

type Size = keyof typeof SIZES

type Props = {
  name?: string
  avatarId?: string | null
  titleId?: string | null
  frameId?: string | null
  size?: Size
  showName?: boolean
  showTitle?: boolean
  className?: string
}

/** Avatar + gem frame + optional title — used on profile, friends, board, battle. */
export function ProfileChip({
  name,
  avatarId,
  titleId,
  frameId,
  size = 'sm',
  showName = false,
  showTitle = false,
  className = '',
}: Props) {
  const frame = getFrame(frameId)
  const title = getTitle(titleId)
  const dim = SIZES[size]
  const charId = avatarId || 'phil'

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <div
        className={`relative ${dim.box} shrink-0 overflow-hidden ${dim.radius}`}
        style={{ background: frame.bg || CARD_PORTRAIT_BG, boxShadow: frame.ring }}
      >
        <div className="h-full w-full" style={{ background: CARD_PORTRAIT_BG }}>
          <CharacterModel charId={charId} anim="idle" facing={-Math.PI / 2} portrait />
        </div>
      </div>
      {showName || (showTitle && title.text) ? (
        <div className="min-w-0 leading-tight">
          {showName && name ? (
            <p className="truncate text-sm font-extrabold text-white">{name}</p>
          ) : null}
          {showTitle && title.text ? (
            <p
              className="truncate text-[0.58rem] font-extrabold uppercase tracking-wide"
              style={{ color: title.color }}
            >
              {title.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
