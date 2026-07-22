/**
 * Brayden Rating color scale: 0.0 = red (bad) → 10.0 = green (good).
 * Values in between interpolate through yellow on the HSL hue wheel.
 */

const HUE_BAD = 0 // red
const HUE_GOOD = 120 // green
const SAT = 78
const LIGHT = 58

export function ratingColor(rating: number): string {
  const t = Math.min(10, Math.max(0, rating)) / 10
  const hue = HUE_BAD + (HUE_GOOD - HUE_BAD) * t
  return `hsl(${hue} ${SAT}% ${LIGHT}%)`
}

/** Inline style for a colored rating number. */
export function ratingColorStyle(rating: number | null | undefined): { color: string } | undefined {
  if (rating == null || !Number.isFinite(rating)) return undefined
  return { color: ratingColor(rating) }
}
