import { useEffect } from 'react'
import { NameWithTitle, ProfileChip } from './ProfileChip'
import { getBanner, BANNER_CATALOG, FRAME_CATALOG, TITLE_CATALOG, type BannerDef } from './cosmeticsCatalog'
import { randomBotName } from './progression'

const THEME: Record<
  BannerDef['theme'],
  { bg: string; art: string }
> = {
  gold: {
    bg: 'linear-gradient(90deg,#ffe08a,#c9a227 55%,#8a6a12)',
    art: '🏆',
  },
  blue: {
    bg: 'linear-gradient(90deg,#7ec8ff,#2f6fbf 55%,#1a3a70)',
    art: '🔷',
  },
  diner: {
    bg: 'linear-gradient(90deg,#ffb4d8,#ff4da8 40%,#7a1038)',
    art: '🍔',
  },
  sundae: {
    bg: 'linear-gradient(90deg,#ffd1e0,#ff80ab 45%,#c2185b)',
    art: '🍨',
  },
  fire: {
    bg: 'linear-gradient(90deg,#ffb347,#ff3b3b 50%,#7a1010)',
    art: '🔥',
  },
  pixel: {
    bg: 'linear-gradient(90deg,#3a3048,#1a1020 50%,#0a0810)',
    art: '💀',
  },
  royal: {
    bg: 'linear-gradient(90deg,#fff3a8,#c9a227 40%,#5a2fbf)',
    art: '👑',
  },
  phil: {
    bg: 'linear-gradient(90deg,#c8f0ff,#4a9eff 45%,#1a3060)',
    art: '🐔',
  },
}

export function BattleBannerArt({
  bannerId,
  className = 'h-16 w-full',
}: {
  bannerId?: string | null
  className?: string
}) {
  const b = getBanner(bannerId)
  const theme = THEME[b.theme]
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: theme.bg,
        clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
        boxShadow: '0 0 0 3px #f5d76e, 0 4px 0 #8a6a12, 0 8px 16px #00000066',
      }}
    >
      <div className="absolute inset-0 opacity-30" style={{ background: 'repeating-linear-gradient(90deg, transparent 0 10px, #ffffff22 10px 12px)' }} />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow">
        {theme.art}
      </span>
    </div>
  )
}

export type VsFighter = {
  name: string
  trophies: number
  avatarId?: string
  titleId?: string
  frameId?: string
  bannerId?: string
}

export function randomBotFighter(trophies: number, seed = Date.now()): VsFighter {
  const titles = TITLE_CATALOG.filter((t) => t.priceGems > 0)
  const frames = FRAME_CATALOG.filter((f) => f.priceGems > 0)
  const banners = BANNER_CATALOG
  const n = Math.abs(Math.floor(seed))
  return {
    name: randomBotName(seed),
    trophies: Math.max(0, trophies + ((n % 81) - 40)),
    titleId: titles[n % titles.length]!.id,
    frameId: frames[(n * 3) % frames.length]!.id,
    bannerId: banners[(n * 5) % banners.length]!.id,
  }
}

export function VsSplash({
  you,
  foe,
  onDone,
}: {
  you: VsFighter
  foe: VsFighter
  onDone: () => void
}) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2800)
    return () => window.clearTimeout(id)
  }, [onDone])
  return (
    <button
      type="button"
      onClick={onDone}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#140e0a] text-left"
      aria-label="Battle start"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% 50%, #1a2a40 0%, #0a0810 70%), repeating-linear-gradient(90deg, #1a141088 0 18px, #0e0a08 18px 36px)',
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-3 pb-8 pt-[max(2.2rem,env(safe-area-inset-top))]">
        <div className="flex flex-col items-stretch gap-2">
          <BattleBannerArt bannerId={foe.bannerId} className="h-[5.5rem] w-full" />
          <div className="flex items-center gap-2 pl-1">
            <ProfileChip avatarId={foe.avatarId} frameId={foe.frameId} size="md" />
            <div className="min-w-0">
              <NameWithTitle
                name={foe.name}
                titleId={foe.titleId}
                nameClass="truncate text-lg font-black uppercase tracking-wide text-white drop-shadow"
              />
              <p className="text-sm font-extrabold text-[#f5d76e]">🏆 {foe.trophies.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center py-3">
          <div
            className="flex h-16 w-[4.6rem] items-center justify-center"
            style={{
              background: 'linear-gradient(180deg,#4a9eff,#1d4a86)',
              clipPath: 'polygon(50% 0%, 92% 22%, 92% 78%, 50% 100%, 8% 78%, 8% 22%)',
              boxShadow: '0 0 0 3px #f5d76e, 0 6px 16px #00000088',
            }}
          >
            <span className="font-[family-name:var(--font-display)] text-2xl tracking-widest text-white">
              VS
            </span>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2">
          <div className="flex items-center justify-end gap-2 pr-1">
            <div className="min-w-0 text-right">
              <NameWithTitle
                name={you.name}
                titleId={you.titleId}
                nameClass="truncate text-lg font-black uppercase tracking-wide text-white drop-shadow"
              />
              <p className="text-sm font-extrabold text-[#f5d76e]">
                {you.trophies.toLocaleString()} 🏆
              </p>
            </div>
            <ProfileChip avatarId={you.avatarId} frameId={you.frameId} size="md" />
          </div>
          <BattleBannerArt bannerId={you.bannerId} className="h-[5.5rem] w-full" />
        </div>
      </div>
    </button>
  )
}
