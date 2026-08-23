/** Arena art for home island + trophy road (photo backdrops + CSS fallback). */

const ARENA_IMAGE_SLUG: Record<string, string> = {
  'Training Camp': 'training-camp',
  'Sundae Strip': 'sundae-strip',
  "Beans' Battleground": 'beans-battleground',
  'Phil Pier': 'phil-pier',
  "Dave's Dungeon": 'daves-dungeon',
  "Katherine's Kitchen": 'kathies-kitchen',
  'Jacobson Junction': 'jacobson-junction',
  "Gretchin's Grill": 'gretchins-grill',
  "Ricky's Diner": 'rickys-diner',
  'Scotts Mansion': 'scotts-mansion',
  "Jeremy's Junkyard": 'jeremys-junkyard',
  Clucktown: 'clucktown',
  "Todd's Tavern": 'todds-tavern',
  'Peter Palace': 'pete-palace',
  'Phil Peak': 'phil-peak',
  // Legacy aliases
  "Kathie's Kitchen": 'kathies-kitchen',
  'Pete Palace': 'pete-palace',
  "Pete's Pit": 'pete-palace',
  'Jeremy Land': 'jeremys-junkyard',
  'Phil Plaza': 'phil-pier',
  'Goblin Boot': 'training-camp',
  'Bone Bridge': 'pete-palace',
  'Royal Yard': 'phil-peak',
}

export const ARENA_THEME_CSS: Record<string, string> = {
  'Training Camp': `
    radial-gradient(circle at 18% 72%, #ffffff33 0 0.35rem, transparent 0.4rem),
    radial-gradient(circle at 42% 78%, #ffffff28 0 0.28rem, transparent 0.32rem),
    radial-gradient(circle at 70% 70%, #ffffff30 0 0.4rem, transparent 0.45rem),
    radial-gradient(circle at 85% 76%, #ffffff22 0 0.25rem, transparent 0.3rem),
    repeating-linear-gradient(90deg, transparent 0 18px, #1a5a2088 18px 20px),
    radial-gradient(ellipse 90% 50% at 50% 100%, #3a7a28cc 0%, transparent 55%),
    radial-gradient(ellipse 70% 40% at 20% 30%, #8fd46a66 0%, transparent 50%),
    linear-gradient(180deg, #5eb8ff 0%, #3a9a4a 45%, #1a4a22 100%)
  `,
  'Sundae Strip': `
    radial-gradient(circle at 20% 25%, #ffffffaa 0 0.55rem, #ffb0d0 0.55rem 0.85rem, transparent 0.9rem),
    radial-gradient(circle at 75% 35%, #fff5c8cc 0 0.45rem, #ff8ab8 0.45rem 0.75rem, transparent 0.8rem),
    radial-gradient(circle at 50% 70%, #ffe8f4 0 0.7rem, #ffd0a0 0.7rem 1.1rem, transparent 1.15rem),
    repeating-linear-gradient(135deg, #ffd0e888 0 12px, #ffb0d088 12px 24px),
    radial-gradient(ellipse 80% 45% at 50% 0%, #ffffff88 0%, transparent 50%),
    linear-gradient(180deg, #ff9ec8 0%, #e868a0 40%, #8a3060 100%)
  `,
  "Beans' Battleground": `
    radial-gradient(circle at 22% 70%, #c8e06055 0 0.5rem, transparent 0.55rem),
    radial-gradient(circle at 78% 62%, #8fd46a44 0 0.4rem, transparent 0.45rem),
    repeating-linear-gradient(90deg, transparent 0 16px, #3a6a1888 16px 18px),
    radial-gradient(ellipse 90% 45% at 50% 100%, #2a5a10cc 0%, transparent 55%),
    linear-gradient(180deg, #8fd46a 0%, #4a8a28 42%, #1a3a10 100%)
  `,
  'Phil Pier': `
    repeating-linear-gradient(90deg, #1a4a6888 0 10px, #0e3048 10px 20px),
    radial-gradient(ellipse 80% 40% at 50% 100%, #0a2838 0%, transparent 55%),
    radial-gradient(ellipse 50% 30% at 70% 20%, #ffe08a44 0%, transparent 50%),
    linear-gradient(180deg, #7ec8e8 0%, #3a7aa8 40%, #1a3a58 100%)
  `,
  "Dave's Dungeon": `
    radial-gradient(circle at 30% 40%, #e0704033 0 0.4rem, transparent 0.5rem),
    radial-gradient(ellipse 70% 40% at 50% 100%, #2a1008 0%, transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 18px, #3a181044 18px 20px),
    linear-gradient(180deg, #8a4a30 0%, #3a2018 40%, #120808 100%)
  `,
  "Katherine's Kitchen": `
    radial-gradient(circle at 25% 30%, #fff0c8aa 0 0.5rem, transparent 0.55rem),
    radial-gradient(circle at 72% 58%, #ff8a4a44 0 0.6rem, transparent 0.65rem),
    repeating-linear-gradient(90deg, #f0c07055 0 12px, #e8a05055 12px 24px),
    linear-gradient(180deg, #ffe0a0 0%, #d08040 42%, #5a2810 100%)
  `,
  "Kathie's Kitchen": `
    radial-gradient(circle at 25% 30%, #fff0c8aa 0 0.5rem, transparent 0.55rem),
    radial-gradient(circle at 72% 58%, #ff8a4a44 0 0.6rem, transparent 0.65rem),
    repeating-linear-gradient(90deg, #f0c07055 0 12px, #e8a05055 12px 24px),
    linear-gradient(180deg, #ffe0a0 0%, #d08040 42%, #5a2810 100%)
  `,
  'Jacobson Junction': `
    repeating-linear-gradient(90deg, #4a5460 0 14px, #3a4048 14px 28px),
    radial-gradient(ellipse 60% 25% at 50% 18%, #f5d76e44 0%, transparent 55%),
    linear-gradient(180deg, #9aa8b8 0%, #5a6878 40%, #2a3038 100%)
  `,
  "Gretchin's Grill": `
    radial-gradient(circle at 28% 35%, #e8a0ff55 0 0.55rem, transparent 0.6rem),
    radial-gradient(circle at 70% 65%, #c060c844 0 0.45rem, transparent 0.5rem),
    linear-gradient(180deg, #d890e0 0%, #803888 40%, #3a1040 100%)
  `,
  "Ricky's Diner": `
    radial-gradient(circle at 20% 28%, #ffd07088 0 0.5rem, transparent 0.55rem),
    repeating-linear-gradient(135deg, #e8a04055 0 10px, #c8783055 10px 20px),
    linear-gradient(180deg, #f0b860 0%, #b06020 42%, #3a2010 100%)
  `,
  'Scotts Mansion': `
    radial-gradient(ellipse 70% 30% at 50% 12%, #ffffffcc 0%, transparent 55%),
    repeating-linear-gradient(90deg, #d0dce8 0 16px, #b8c8d8 16px 32px),
    linear-gradient(180deg, #e8f0f8 0%, #7a90a8 40%, #2a3848 100%)
  `,
  "Jeremy's Junkyard": `
    repeating-linear-gradient(90deg, #0a0e14 0 8px, #121820 8px 16px),
    repeating-linear-gradient(0deg, transparent 0 22px, #1a304855 22px 24px),
    radial-gradient(ellipse 60% 30% at 50% 20%, #3a6a9a66 0%, transparent 55%),
    linear-gradient(180deg, #0c121c 0%, #1a2838 35%, #050810 100%)
  `,
  Clucktown: `
    radial-gradient(circle at 30% 40%, #ff606055 0 0.5rem, transparent 0.55rem),
    radial-gradient(circle at 68% 62%, #f0d06055 0 0.45rem, transparent 0.5rem),
    linear-gradient(180deg, #ffe08a 0%, #d08030 42%, #5a3010 100%)
  `,
  "Todd's Tavern": `
    radial-gradient(ellipse 50% 28% at 40% 30%, #e8b86a44 0%, transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 16px, #4a281844 16px 18px),
    linear-gradient(180deg, #c07040 0%, #6a3818 42%, #201008 100%)
  `,
  'Peter Palace': `
    radial-gradient(ellipse 40% 20% at 30% 55%, #e8d0a0aa 0%, transparent 60%),
    radial-gradient(ellipse 35% 18% at 70% 60%, #d0b08099 0%, transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 14px, #3a201844 14px 16px),
    radial-gradient(ellipse 100% 55% at 50% 100%, #1a0c08 0%, transparent 60%),
    linear-gradient(180deg, #6a4a30 0%, #3a2418 40%, #140a08 100%)
  `,
  'Pete Palace': `
    radial-gradient(ellipse 40% 20% at 30% 55%, #e8d0a0aa 0%, transparent 60%),
    radial-gradient(ellipse 35% 18% at 70% 60%, #d0b08099 0%, transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 14px, #3a201844 14px 16px),
    radial-gradient(ellipse 100% 55% at 50% 100%, #1a0c08 0%, transparent 60%),
    linear-gradient(180deg, #6a4a30 0%, #3a2418 40%, #140a08 100%)
  `,
  'Phil Peak': `
    radial-gradient(ellipse 80% 35% at 50% 18%, #ffffffdd 0%, #ffe08acc 35%, transparent 60%),
    radial-gradient(ellipse 50% 25% at 30% 45%, #ffffffaa 0%, transparent 50%),
    radial-gradient(ellipse 45% 22% at 70% 50%, #fff6c8aa 0%, transparent 50%),
    linear-gradient(180deg, #6ec8ff 0%, #c9a227 38%, #5a3a10 70%, #1a1008 100%)
  `,
  "Pete's Pit": `
    radial-gradient(ellipse 40% 20% at 30% 55%, #e8d0a0aa 0%, transparent 60%),
    linear-gradient(180deg, #6a4a30 0%, #3a2418 40%, #140a08 100%)
  `,
  'Jeremy Land': `
    repeating-linear-gradient(90deg, #0a0e14 0 8px, #121820 8px 16px),
    linear-gradient(180deg, #0c121c 0%, #1a2838 35%, #050810 100%)
  `,
  'Phil Plaza': `
    repeating-linear-gradient(90deg, #0a0e14 0 8px, #121820 8px 16px),
    linear-gradient(180deg, #0c121c 0%, #1a2838 35%, #050810 100%)
  `,
  'Goblin Boot': `
    radial-gradient(circle at 18% 72%, #ffffff33 0 0.35rem, transparent 0.4rem),
    linear-gradient(180deg, #5eb8ff 0%, #3a9a4a 45%, #1a4a22 100%)
  `,
  'Bone Bridge': `
    radial-gradient(ellipse 40% 20% at 30% 55%, #e8d0a0aa 0%, transparent 60%),
    linear-gradient(180deg, #6a4a30 0%, #3a2418 40%, #140a08 100%)
  `,
  'Royal Yard': `
    repeating-linear-gradient(90deg, #0a0e14 0 8px, #121820 8px 16px),
    linear-gradient(180deg, #0c121c 0%, #1a2838 35%, #050810 100%)
  `,
}

export function arenaThemeImageUrl(arena: string): string | undefined {
  const slug = ARENA_IMAGE_SLUG[arena]
  if (!slug) return undefined
  const base = import.meta.env.BASE_URL || './'
  return `${base}arenas/${slug}.jpg`
}

/** CSS `background` value — photo cover when available, otherwise painted theme. */
export function arenaThemeBackground(arena: string): string {
  const fallback =
    ARENA_THEME_CSS[arena] ?? ARENA_THEME_CSS['Training Camp']!
  const img = arenaThemeImageUrl(arena)
  if (!img) return fallback
  return [
    'linear-gradient(180deg, #0a060488 0%, #0a060466 42%, #0a0604aa 100%)',
    `url(${JSON.stringify(img)}) center / cover no-repeat`,
    fallback,
  ].join(', ')
}
