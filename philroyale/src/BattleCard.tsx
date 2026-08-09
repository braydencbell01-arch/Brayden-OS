import type { CharacterDef, Rarity } from './characters'
import { RARITY_LABEL } from './characters'
import { CharacterModel } from './characters/CharacterModel'

type Props = {
  character: CharacterDef | null
  size?: 'hand' | 'next' | 'collection'
  elixir?: number
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

export function BattleCard({ character, size = 'hand', elixir, selected }: Props) {
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
          background:
            'radial-gradient(ellipse 85% 70% at 50% 42%, #2a8fd4 0%, #0a5cb0 55%, #003e8a 100%)',
          boxShadow: 'inset 0 1px 0 #ffffff33',
        }}
      >
        <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden">
          <div className="absolute inset-0">
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
              className={`absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-0.5 pb-0.5 pt-2 text-center font-extrabold leading-tight text-white ${collection ? 'text-[0.55rem]' : 'text-[0.42rem]'}`}
            >
              {character.name}
            </span>
          ) : null}
        </div>

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
      </div>

      {!next && collection ? (
        <span
          className="pointer-events-none absolute right-1 top-1 z-[2] rounded px-1 py-px text-[0.5rem] font-extrabold uppercase tracking-wide text-[#1a1410]"
          style={{ background: frame.border }}
        >
          {RARITY_LABEL[character.rarity]}
        </span>
      ) : null}
    </div>
  )
}
