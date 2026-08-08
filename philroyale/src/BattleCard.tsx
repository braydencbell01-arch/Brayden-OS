import type { CharacterDef } from './characters'

type Props = {
  character: CharacterDef | null
  size?: 'hand' | 'next'
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

  const art = `hsl(${character.hue} 55% 42%)`
  const artLit = `hsl(${character.hue} 65% 55%)`

  return (
    <div
      className={`card-frame relative overflow-hidden rounded-md ${next ? 'h-14 w-11' : 'aspect-[3/4] w-full'} ${dimmed ? 'opacity-55' : ''} ${selected ? 'ring-2 ring-white scale-[1.03]' : ''}`}
    >
      <div
        className="absolute inset-[3px] flex flex-col overflow-hidden rounded-sm"
        style={{
          background: character.portrait
            ? '#1a1410'
            : `linear-gradient(165deg, ${artLit} 0%, ${art} 55%, #1a1410 140%)`,
        }}
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {character.portrait ? (
            <img
              src={character.portrait}
              alt=""
              className="h-full w-full object-cover object-top"
              draggable={false}
            />
          ) : (
            <div
              className={`${next ? 'h-6 w-6' : 'h-9 w-9'} rounded-full border-2 border-white/30`}
              style={{ background: `hsl(${character.hue} 70% 65%)` }}
            />
          )}
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
