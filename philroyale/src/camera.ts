/** Flat CR board — full map + both king towers on screen (no zoom crop). */
export const ARENA_PERSPECTIVE_PX = 3200
export const ARENA_TILT_DEG = 8

/**
 * Screen Y → plane Y compensation for rotateX foreshortening.
 * Far (top) tiles are compressed on screen; expand them back for hit-tests.
 */
export function screenYToPlaneY(ny: number): number {
  const t = Math.max(0, Math.min(1, ny))
  return Math.pow(t, 0.98)
}

export function planeYToScreenY(py: number): number {
  const t = Math.max(0, Math.min(1, py))
  return Math.pow(t, 1 / 0.98)
}
