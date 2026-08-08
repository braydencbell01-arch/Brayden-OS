export type Character = {
  id: string
  name: string
  elixir: number
  role: 'troop' | 'spell' | 'building'
  /** Accent for card art placeholder */
  hue: number
  blurb: string
}

/** Starter roster — all unlocked; customize later. */
export const CHARACTERS: Character[] = [
  { id: 'phil-guard', name: 'Phil Guard', elixir: 3, role: 'troop', hue: 210, blurb: 'Sturdy melee frontliner.' },
  { id: 'spearbearer', name: 'Spearbearer', elixir: 3, role: 'troop', hue: 35, blurb: 'Pokes from a short range.' },
  { id: 'hog-runner', name: 'Hog Runner', elixir: 4, role: 'troop', hue: 20, blurb: 'Charges the nearest tower.' },
  { id: 'archer-duo', name: 'Archer Duo', elixir: 3, role: 'troop', hue: 140, blurb: 'Two ranged shots.' },
  { id: 'giant-phil', name: 'Giant Phil', elixir: 5, role: 'troop', hue: 25, blurb: 'Slow tank that soaks hits.' },
  { id: 'wizard-phil', name: 'Wizard Phil', elixir: 5, role: 'troop', hue: 280, blurb: 'Splash magic damage.' },
  { id: 'mini-tank', name: 'Mini Tank', elixir: 2, role: 'troop', hue: 200, blurb: 'Cheap distraction.' },
  { id: 'hordelets', name: 'Hordelets', elixir: 3, role: 'troop', hue: 50, blurb: 'Swarm of little fighters.' },
  { id: 'bomblet', name: 'Bomblet', elixir: 3, role: 'troop', hue: 0, blurb: 'Tosses area bombs.' },
  { id: 'builder', name: 'Builder', elixir: 4, role: 'building', hue: 30, blurb: 'Drops a defense hut.' },
  { id: 'princess-peak', name: 'Peak Scout', elixir: 3, role: 'troop', hue: 320, blurb: 'Long-range sniper.' },
  { id: 'skeleton-crew', name: 'Bone Crew', elixir: 1, role: 'troop', hue: 60, blurb: 'Fodder for a cycle.' },
  { id: 'zapling', name: 'Zapling', elixir: 2, role: 'spell', hue: 55, blurb: 'Quick stun burst.' },
  { id: 'fireballer', name: 'Fire Orb', elixir: 4, role: 'spell', hue: 15, blurb: 'Big area hit.' },
  { id: 'ice-cube', name: 'Ice Cube', elixir: 2, role: 'spell', hue: 190, blurb: 'Slows a patch of ground.' },
  { id: 'rocket-pig', name: 'Rocket Pig', elixir: 6, role: 'spell', hue: 10, blurb: 'Massive tower punch.' },
]

export const DECK_SIZE = 8

export const DEFAULT_DECK = CHARACTERS.slice(0, DECK_SIZE).map((c) => c.id)

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
