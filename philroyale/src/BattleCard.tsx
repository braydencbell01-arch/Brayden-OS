import type { CharacterDef } from './characters'

type Props = {
  character: CharacterDef | null
  size?: 'hand' | 'next' | 'collection'
  dimmed?: boolean
  selected?: boolean
}

export function BattleCard({ character, size = 'hand', dimmed, selected }: Props) {
  const next = size === 'next'
  if (!character) {
    return (
      <div
        className={`card-frame relative overflow-hidden rounded-md ${next ? 'h-14 w-11' : 'aspect-[3/4] w-full'}`}
      >
        <div className="absolute inset-[3px] rounded-sm bg-[#2a2018]" />
      </div>
    )
  }

  const art = `hsl(${character.hue} 55% 38%)`
  const artLit = `hsl(${character.hue} 65% 52%)`

  return (
    <div
      className={`card-frame relative overflow-hidden rounded-md ${next ? 'h-14 w-11' : 'aspect-[3/4] w-full'} ${dimmed ? 'opacity-55' : ''} ${selected ? 'ring-2 ring-white scale-[1.03]' : ''}`}
    >
      <div
        className="absolute inset-[3px] flex flex-col overflow-hidden rounded-sm"
        style={{
          background: `linear-gradient(165deg, ${artLit} 0%, ${art} 60%, #1a1410 140%)`,
        }}
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div
            className={`${next ? 'h-7 w-7 text-sm' : size === 'collection' ? 'h-14 w-14 text-2xl' : 'h-10 w-10 text-lg'} flex items-center justify-center rounded-md font-[family-name:var(--font-display)] text-white shadow-md`}
            style={{
              background: `linear-gradient(160deg, ${artLit}, ${art})`,
              boxShadow: 'inset 0 1px 0 #ffffff44, 0 2px 4px #00000066',
            }}
          >
            {character.initial}
          </div>
          {!next ? (
            <span className="absolute bottom-0.5 left-0 right-0 truncate bg-black/45 px-0.5 text-center text-[0.55rem] font-extrabold leading-tight text-white">
              {character.name}
            </span>
          ) : null}
        </div>
        <div
          className={`absolute ${next ? 'left-0.5 top-0.5 h-3.5 w-3.5 text-[0.55rem]' : 'left-1 top-1 h-5 w-5 text-xs'} flex items-center justify-center rounded-full font-extrabold text-white`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
            boxShadow: '0 1px 2px #00000088, inset 0 1px 0 #ffffff66',
          }}
        >
          {character.elixir}
        </div>
      </div>
    </div>
  )
}
