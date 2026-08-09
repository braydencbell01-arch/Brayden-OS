/** Mild CR look-in — keep the board filling the screen. */
export const ARENA_PERSPECTIVE_PX = 1800
export const ARENA_TILT_DEG = 18

/**
 * Screen Y → plane Y compensation for rotateX foreshortening.
 * Far (top) tiles are compressed on screen; expand them back for hit-tests.
 */
export function screenYToPlaneY(ny: number): number {
  const t = Math.max(0, Math.min(1, ny))
  return Math.pow(t, 0.94)
}

export function planeYToScreenY(py: number): number {
  const t = Math.max(0, Math.min(1, py))
  return Math.pow(t, 1 / 0.94)
}
