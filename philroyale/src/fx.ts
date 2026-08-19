/** Battlefield camera shake — magnitude 0–1. */

type ShakeFn = (mag: number) => void
const listeners = new Set<ShakeFn>()

export function shakeBattlefield(mag: number): void {
  const n = Math.max(0, Math.min(1.2, mag))
  if (n < 0.04) return
  for (const fn of listeners) fn(n)
}

export function onBattlefieldShake(fn: ShakeFn): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function shakeForHit(kind: string | undefined, damage: number): number {
  if (kind === 'grafBomb') return 0.92
  if (kind === 'uppercut') return Math.min(1.1, 0.72 + damage / 900)
  if (kind === 'rocket' || kind === 'boom') return 0.62
  if (kind === 'barrel' || kind === 'ram') return 0.55
  if (kind === 'jump' || kind === 'kick' || kind === 'suplex') return 0.48
  if (kind === 'whip') return 0.32
  if (kind === 'launch') return 0.4
  if (kind === 'creamSmoke') return 0.36
  if (kind === 'waffle') return 0.18
  if (kind === 'football' || kind === 'baseball') return 0.28
  if (kind === 'shoot') return 0.14
  if (kind === 'cannon' || kind === 'arrow') return 0.12
  return Math.max(0.08, Math.min(0.55, damage / 750))
}

/** Place-card rumble — bigger `battlefieldSize` (1–10) shakes harder. */
export function shakeForPlace(size: number): number {
  const s = Math.max(1, Math.min(10, size))
  return Math.min(1.08, 0.05 + s * 0.072)
}
