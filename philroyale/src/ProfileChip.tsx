import type { CSSProperties, ReactNode } from 'react'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { FRAME_CLIP, getFrame, getTitle, titleColor } from './cosmeticsCatalog'

const SIZES = {
  xs: { box: 'h-7 w-7' },
  sm: { box: 'h-9 w-9' },
  md: { box: 'h-12 w-12' },
  lg: { box: 'h-16 w-16' },
} as const

type Size = keyof typeof SIZES

type ChipProps = {
  name?: string
  avatarId?: string | null
  titleId?: string | null
  frameId?: string | null
  size?: Size
  showName?: boolean
  showTitle?: boolean
  className?: string
}

function clipStyle(clip: string): CSSProperties {
  return { clipPath: clip, WebkitClipPath: clip }
}

/** Shaped gem frame: outer rim + fill + portrait, all the same clip. */
export function FrameShell({
  frameId,
  className = 'h-12 w-12',
  children,
}: {
  frameId?: string | null
  className?: string
  children?: ReactNode
}) {
  const frame = getFrame(frameId)
  const clip = FRAME_CLIP[frame.shape]
  return (
    <div
      className={`relative ${className} shrink-0`}
      style={{ filter: `drop-shadow(0 0 5px ${frame.edge}99) drop-shadow(0 2px 0 #00000066)` }}
    >
      <div className="absolute inset-0" style={{ background: frame.edge, ...clipStyle(clip) }} />
      <div
        className="absolute inset-[11%]"
        style={{ background: frame.bg, ...clipStyle(clip) }}
      />
      <div
        className="absolute inset-[20%] overflow-hidden"
        style={{ background: children ? CARD_PORTRAIT_BG : 'transparent', ...clipStyle(clip) }}
      >
        {children}
      </div>
    </div>
  )
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
}: ChipProps) {
  const title = getTitle(titleId)
  const dim = SIZES[size]
  const charId = avatarId || 'phil'

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <FrameShell frameId={frameId} className={dim.box}>
        <div className="h-full w-full">
          <CharacterModel charId={charId} anim="idle" facing={-Math.PI / 2} portrait />
        </div>
      </FrameShell>
      {showName || (showTitle && title.text) ? (
        <NameWithTitle
          name={showName ? name : undefined}
          titleId={showTitle ? titleId : undefined}
        />
      ) : null}
    </div>
  )
}

/** Name on top, rarity-colored title directly underneath. */
export function NameWithTitle({
  name,
  titleId,
  you,
  nameClass = 'truncate text-sm font-extrabold text-white',
  titleClass = 'truncate text-[0.58rem] font-extrabold tracking-wide',
}: {
  name?: string
  titleId?: string | null
  you?: boolean
  nameClass?: string
  titleClass?: string
}) {
  const title = getTitle(titleId)
  return (
    <div className="min-w-0 leading-tight">
      {name ? (
        <p className={nameClass}>
          {name}
          {you ? (
            <span className="ml-1 text-[0.65rem] font-black uppercase text-[#f5d76e]">you</span>
          ) : null}
        </p>
      ) : null}
      {title.text ? (
        <p className={titleClass} style={{ color: titleColor(title) }}>
          {title.text}
        </p>
      ) : null}
    </div>
  )
}

/** Empty frame preview for shop tiles. */
export function FramePreview({ frameId, className = 'h-12 w-12' }: { frameId: string; className?: string }) {
  return <FrameShell frameId={frameId} className={className} />
}
