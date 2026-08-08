import type { CharacterDef, Rarity } from './characters'
import { RARITY_LABEL } from './characters'

type Props = {
  character: CharacterDef | null
  size?: 'hand' | 'next' | 'collection'
  dimmed?: boolean
  selected?: boolean
}

const RARITY_FRAME: Record<
  Rarity,
  { border: string; glow: string; top: string; bottom: string }
> = {
  common: {
    border: '#b8c0cc',
    glow: '#8a93a0',
    top: '#dfe6ee',
    bottom: '#6d7684',
  },
  rare: {
    border: '#e67e22',
    glow: '#c45f0c',
    top: '#f0a85a',
    bottom: '#9a4a08',
  },
  epic: {
    border: '#b14fd6',
    glow: '#7b2aa8',
    top: '#d48af0',
    bottom: '#5c1a82',
  },
  legendary: {
    border: '#f5d76e',
    glow: '#e8a820',
    top: '#fff3a8',
    bottom: '#b8860b',
  },
}

export function BattleCard({ character, size = 'hand', dimmed, selected }: Props) {
  const next = size === 'next'
  const collection = size === 'collection'

  if (!character) {
    return (
      <div
        className={`relative overflow-hidden ${next ? 'h-[3.6rem] w-[2.75rem]' : 'aspect-[3/4] w-full'} rounded-[0.55rem]`}
        style={{
          background: 'linear-gradient(180deg,#4a3a2a,#2a2018)',
          boxShadow: 'inset 0 0 0 2px #5a4a3a',
        }}
      />
    )
  }

  const frame = RARITY_FRAME[character.rarity]
  const art = `hsl(${character.hue} 55% 38%)`
  const artLit = `hsl(${character.hue} 65% 52%)`
  const legendary = character.rarity === 'legendary'

  return (
    <div
      className={`relative overflow-hidden ${next ? 'h-[3.6rem] w-[2.75rem]' : 'aspect-[3/4] w-full'} ${dimmed ? 'opacity-55' : ''} ${selected ? 'scale-[1.04]' : ''}`}
      style={{
        borderRadius: legendary ? '0.65rem' : '0.55rem',
        background: legendary
          ? `linear-gradient(145deg, ${frame.top}, #ffe08a 35%, ${frame.border} 55%, ${frame.bottom})`
          : `linear-gradient(180deg, ${frame.top}, ${frame.border} 40%, ${frame.bottom})`,
        boxShadow: selected
          ? `0 0 0 2px #fff, 0 3px 0 ${frame.glow}, 0 6px 12px #00000066`
          : `0 2px 0 ${frame.glow}, 0 4px 8px #00000055`,
        clipPath: legendary
          ? 'polygon(8% 0, 92% 0, 100% 10%, 100% 90%, 92% 100%, 8% 100%, 0 90%, 0 10%)'
          : undefined,
      }}
    >
      <div
        className="absolute inset-[3px] flex flex-col overflow-hidden"
        style={{
          borderRadius: legendary ? '0.45rem' : '0.4rem',
          background: `linear-gradient(165deg, ${artLit} 0%, ${art} 55%, #1a1410 130%)`,
          boxShadow: 'inset 0 1px 0 #ffffff33',
        }}
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div
            className={`${next ? 'h-6 w-6 text-xs' : collection ? 'h-14 w-14 text-2xl' : 'h-9 w-9 text-base'} flex items-center justify-center rounded-md font-[family-name:var(--font-display)] text-white`}
            style={{
              background: `linear-gradient(160deg, ${artLit}, ${art})`,
              boxShadow: 'inset 0 1px 0 #ffffff44, 0 2px 4px #00000066',
            }}
          >
            {character.initial}
          </div>
          {!next ? (
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-0.5 pb-0.5 pt-2 text-center text-[0.55rem] font-extrabold leading-tight text-white">
              {character.name}
            </span>
          ) : null}
        </div>

        {/* Elixir droplet — CR style at bottom center */}
        <div
          className={`absolute ${next ? 'bottom-0.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-[0.55rem]' : 'bottom-1 left-1/2 h-[1.15rem] w-[1.15rem] -translate-x-1/2 text-[0.7rem]'} flex items-center justify-center font-extrabold text-white`}
          style={{
            background: 'radial-gradient(circle at 35% 28%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
            clipPath: 'ellipse(46% 52% at 50% 48%)',
            boxShadow: '0 1px 2px #00000088, inset 0 1px 0 #ffffff66',
          }}
        >
          {character.elixir}
        </div>
      </div>

      {!next && collection ? (
        <span
          className="pointer-events-none absolute left-1 top-1 rounded px-1 py-px text-[0.5rem] font-extrabold uppercase tracking-wide text-[#1a1410]"
          style={{ background: frame.border }}
        >
          {RARITY_LABEL[character.rarity]}
        </span>
      ) : null}
    </div>
  )
}
