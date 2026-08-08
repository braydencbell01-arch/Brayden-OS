/** Elixir-scaled stats: HP and damage grow with card cost. */
export function hpFromElixir(elixir: number): number {
  return elixir * 400
}

export function damageFromElixir(elixir: number, kind: 'ranged' | 'melee'): number {
  return kind === 'melee' ? elixir * 55 : elixir * 45
}

export type AttackKind = 'sundae' | 'whip'

export type CharacterDef = {
  id: string
  name: string
  elixir: number
  hp: number
  /** Ice cream sundae throw — longer range. */
  sundaeDamage: number
  sundaeRangeTiles: number
  /** Short-radius whip crack. */
  whipDamage: number
  whipRangeTiles: number
  /** Seconds between successive attacks (alternate sundae ↔ whip). */
  attackDelaySec: number
  portrait: string
  /** Plays on whip crack when the file is present. */
  whipAudio: string
  /** First attack in the alternate cycle. */
  firstAttack: AttackKind
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

/** First character — likeness from the reference photo (navy CK sweatshirt). */
export const PHIL: CharacterDef = {
  id: 'phil',
  name: 'Phil',
  elixir: 7,
  hp: hpFromElixir(7),
  sundaeDamage: damageFromElixir(7, 'ranged'),
  sundaeRangeTiles: 6.5,
  whipDamage: damageFromElixir(7, 'melee'),
  whipRangeTiles: 2.25,
  attackDelaySec: 1,
  portrait: asset('characters/phil.png'),
  whipAudio: asset('audio/phil-whip.mp3'),
  firstAttack: 'sundae',
}

export const CHARACTERS: CharacterDef[] = [PHIL]

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
