/** Rich arena backdrops for home island + trophy road (not flat color alone). */

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
  "Pete's Pit": `
    radial-gradient(ellipse 40% 20% at 30% 55%, #e8d0a0aa 0%, transparent 60%),
    radial-gradient(ellipse 35% 18% at 70% 60%, #d0b08099 0%, transparent 55%),
    radial-gradient(circle at 25% 40%, #1a1008 0 0.2rem, transparent 0.25rem),
    radial-gradient(circle at 60% 48%, #1a1008 0 0.15rem, transparent 0.2rem),
    radial-gradient(circle at 45% 70%, #2a1810 0 0.35rem, transparent 0.4rem),
    repeating-linear-gradient(0deg, transparent 0 14px, #3a201844 14px 16px),
    radial-gradient(ellipse 100% 55% at 50% 100%, #1a0c08 0%, transparent 60%),
    linear-gradient(180deg, #6a4a30 0%, #3a2418 40%, #140a08 100%)
  `,
  'Jeremy Land': `
    repeating-linear-gradient(90deg, #0a0e14 0 8px, #121820 8px 16px),
    repeating-linear-gradient(0deg, transparent 0 22px, #1a304855 22px 24px),
    radial-gradient(ellipse 60% 30% at 50% 20%, #3a6a9a66 0%, transparent 55%),
    linear-gradient(180deg, #0c121c 0%, #1a2838 35%, #050810 100%)
  `,
  'Phil Peak': `
    radial-gradient(ellipse 80% 35% at 50% 18%, #ffffffdd 0%, #ffe08acc 35%, transparent 60%),
    radial-gradient(ellipse 50% 25% at 30% 45%, #ffffffaa 0%, transparent 50%),
    radial-gradient(ellipse 45% 22% at 70% 50%, #fff6c8aa 0%, transparent 50%),
    linear-gradient(180deg, #6ec8ff 0%, #c9a227 38%, #5a3a10 70%, #1a1008 100%)
  `,
  // Legacy
  'Phil Plaza': `
    repeating-linear-gradient(90deg, #0a0e14 0 8px, #121820 8px 16px),
    repeating-linear-gradient(0deg, transparent 0 22px, #1a304855 22px 24px),
    radial-gradient(ellipse 60% 30% at 50% 20%, #3a6a9a66 0%, transparent 55%),
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

export function arenaThemeBackground(arena: string): string {
  return (
    ARENA_THEME_CSS[arena] ??
    ARENA_THEME_CSS['Training Camp']!
  )
}
