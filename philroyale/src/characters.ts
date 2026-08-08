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
  sundaeDamage: number
  sundaeRangeTiles: number
  whipDamage: number
  whipRangeTiles: number
  attackDelaySec: number
  portrait: string | null
  whipAudio: string
  firstAttack: AttackKind
  role: 'troop' | 'spell' | 'building'
  hue: number
  blurb: string
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

function makeChar(
  partial: Omit<
    CharacterDef,
    | 'hp'
    | 'sundaeDamage'
    | 'whipDamage'
    | 'sundaeRangeTiles'
    | 'whipRangeTiles'
    | 'attackDelaySec'
    | 'whipAudio'
    | 'firstAttack'
    | 'portrait'
  > &
    Partial<
      Pick<
        CharacterDef,
        | 'sundaeRangeTiles'
        | 'whipRangeTiles'
        | 'attackDelaySec'
        | 'firstAttack'
        | 'portrait'
        | 'whipAudio'
      >
    >,
): CharacterDef {
  return {
    ...partial,
    sundaeRangeTiles: partial.sundaeRangeTiles ?? 5.5,
    whipRangeTiles: partial.whipRangeTiles ?? 2,
    attackDelaySec: partial.attackDelaySec ?? 1.1,
    firstAttack: partial.firstAttack ?? 'sundae',
    portrait: partial.portrait ?? null,
    whipAudio: partial.whipAudio ?? asset('audio/phil-whip.mp3'),
    hp: hpFromElixir(partial.elixir),
    sundaeDamage: damageFromElixir(partial.elixir, 'ranged'),
    whipDamage: damageFromElixir(partial.elixir, 'melee'),
  }
}

/** First character — likeness from the reference photo. */
export const PHIL: CharacterDef = makeChar({
  id: 'phil',
  name: 'Phil',
  elixir: 7,
  sundaeRangeTiles: 6.5,
  whipRangeTiles: 2.25,
  attackDelaySec: 1,
  portrait: asset('characters/phil.png'),
  whipAudio: asset('audio/phil-whip.mp3'),
  firstAttack: 'sundae',
  role: 'troop',
  hue: 220,
  blurb: 'Sundae throw and whip crack.',
})

export const CHARACTERS: CharacterDef[] = [
  PHIL,
  makeChar({ id: 'phil-guard', name: 'Phil Guard', elixir: 3, role: 'troop', hue: 210, blurb: 'Sturdy melee frontliner.', sundaeRangeTiles: 3, whipRangeTiles: 2.4, firstAttack: 'whip' }),
  makeChar({ id: 'spearbearer', name: 'Spearbearer', elixir: 3, role: 'troop', hue: 35, blurb: 'Pokes from a short range.' }),
  makeChar({ id: 'hog-runner', name: 'Hog Runner', elixir: 4, role: 'troop', hue: 20, blurb: 'Charges the nearest tower.', whipRangeTiles: 2.1 }),
  makeChar({ id: 'archer-duo', name: 'Archer Duo', elixir: 3, role: 'troop', hue: 140, blurb: 'Two ranged shots.', sundaeRangeTiles: 7 }),
  makeChar({ id: 'giant-phil', name: 'Giant Phil', elixir: 5, role: 'troop', hue: 25, blurb: 'Slow tank that soaks hits.', firstAttack: 'whip' }),
  makeChar({ id: 'wizard-phil', name: 'Wizard Phil', elixir: 5, role: 'troop', hue: 280, blurb: 'Splash magic damage.', sundaeRangeTiles: 6 }),
  makeChar({ id: 'mini-tank', name: 'Mini Tank', elixir: 2, role: 'troop', hue: 200, blurb: 'Cheap distraction.', firstAttack: 'whip' }),
  makeChar({ id: 'hordelets', name: 'Hordelets', elixir: 3, role: 'troop', hue: 50, blurb: 'Swarm of little fighters.' }),
  makeChar({ id: 'bomblet', name: 'Bomblet', elixir: 3, role: 'troop', hue: 0, blurb: 'Tosses area bombs.' }),
  makeChar({ id: 'builder', name: 'Builder', elixir: 4, role: 'building', hue: 30, blurb: 'Drops a defense hut.' }),
  makeChar({ id: 'peak-scout', name: 'Peak Scout', elixir: 3, role: 'troop', hue: 320, blurb: 'Long-range sniper.', sundaeRangeTiles: 8 }),
  makeChar({ id: 'bone-crew', name: 'Bone Crew', elixir: 1, role: 'troop', hue: 60, blurb: 'Fodder for a cycle.', firstAttack: 'whip' }),
  makeChar({ id: 'zapling', name: 'Zapling', elixir: 2, role: 'spell', hue: 55, blurb: 'Quick stun burst.' }),
  makeChar({ id: 'fire-orb', name: 'Fire Orb', elixir: 4, role: 'spell', hue: 15, blurb: 'Big area hit.' }),
  makeChar({ id: 'ice-cube', name: 'Ice Cube', elixir: 2, role: 'spell', hue: 190, blurb: 'Slows a patch of ground.' }),
]

export const DECK_SIZE = 8

export const DEFAULT_DECK = CHARACTERS.slice(0, DECK_SIZE).map((c) => c.id)

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
