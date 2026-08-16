import type { CharacterDef, Rarity } from './characters'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { CharacterModel } from './characters/CharacterModel'

type Props = {
  character: CharacterDef | null
  size?: 'hand' | 'next' | 'collection'
  elixir?: number
  selected?: boolean
  /** Show purple evolution diamond (unlocked evo / evolved play). */
  evolved?: boolean
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
  uncommon: {
    border: '#3ecf6a',
    glow: '#2a9a4a',
    top: '#8aefb0',
    bottom: '#1a6b38',
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

export function BattleCard({
  character,
  size = 'hand',
  elixir,
  selected,
  evolved,
}: Props) {
  const next = size === 'next'
  const collection = size === 'collection'

  const box = next
    ? 'h-[2.5rem] w-[1.85rem]'
    : collection
      ? 'aspect-[3/4] w-full'
      : 'h-[4.35rem] w-[3.05rem]'

  if (!character) {
    return (
      <div
        className={`relative overflow-hidden ${box} rounded-[0.4rem]`}
        style={{
          background: 'linear-gradient(180deg,#4a3a2a,#2a2018)',
          boxShadow: 'inset 0 0 0 2px #5a4a3a',
        }}
      />
    )
  }

  const frame = RARITY_FRAME[character.rarity]
  const afford =
    elixir == null ? 1 : Math.max(0, Math.min(1, elixir / Math.max(1, character.elixir)))
  const greyPct = (1 - afford) * 100

  return (
    <div
      className={`relative overflow-hidden ${box} rounded-[0.4rem] ${selected ? 'scale-[1.04]' : ''}`}
      style={{
        background: `linear-gradient(180deg, ${frame.top}, ${frame.border} 40%, ${frame.bottom})`,
        boxShadow: selected
          ? `0 0 0 2px #fff, 0 3px 0 ${frame.glow}, 0 6px 12px #00000066`
          : `0 2px 0 ${frame.glow}, 0 4px 8px #00000055`,
      }}
    >
      <div
        className="absolute inset-[3px] flex flex-col overflow-hidden rounded-[0.4rem]"
        style={{
          background: CARD_PORTRAIT_BG,
        }}
      >
        {/* Full-bleed portrait — art fills the whole inner card; name overlays it. */}
        <div className="absolute inset-0 overflow-hidden">
          <CharacterModel
            charId={character.id}
            anim="idle"
            facing={-Math.PI / 2}
            portrait
            hue={character.hue}
            initial={character.initial}
          />
        </div>
        {!next ? (
          <span
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/35 to-transparent px-0.5 pb-[2px] pt-3 text-center font-extrabold leading-none text-white ${collection ? 'text-[0.62rem]' : 'text-[0.48rem]'}`}
            style={{ textShadow: '0 1px 2px #000' }}
          >
            {character.name}
          </span>
        ) : null}

        <div
          className={`absolute ${next ? 'left-0.5 top-0.5 h-3 w-3 text-[0.45rem]' : collection ? 'left-1 top-1 h-[1.15rem] w-[1.15rem] text-[0.7rem]' : 'left-0.5 top-0.5 h-3.5 w-3.5 text-[0.5rem]'} z-[2] flex items-center justify-center font-extrabold text-white`}
          style={{
            background: 'radial-gradient(circle at 35% 28%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
            clipPath: 'ellipse(46% 52% at 50% 48%)',
            boxShadow: '0 1px 2px #00000088, inset 0 1px 0 #ffffff66',
          }}
        >
          {character.elixir}
        </div>

        {elixir != null && greyPct > 0.5 ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[3] bg-[#1a1410]/62"
            style={{ height: `${greyPct}%` }}
            aria-hidden
          />
        ) : null}

        {evolved ? (
          <div
            className={`pointer-events-none absolute z-[4] ${next ? 'right-0.5 top-0.5' : collection ? 'right-1 top-1' : 'right-0.5 top-0.5'}`}
            aria-label="Evolved"
          >
            <span
              className={`block rotate-45 ${next ? 'h-2 w-2' : collection ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'}`}
              style={{
                background: 'linear-gradient(135deg,#e9b8ff,#9b2dff 45%,#5a00a8)',
                boxShadow: '0 0 6px #c060ffcc, inset 0 1px 0 #ffffff88',
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
