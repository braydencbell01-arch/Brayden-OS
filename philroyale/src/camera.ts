/** Clash-style camera: mild look “into” the board from the near (ally) edge. */
export const ARENA_PERSPECTIVE_PX = 1600
/** Keep a CR-like angle without crushing the board into a black void. */
export const ARENA_TILT_DEG = 26

/**
 * Screen Y → plane Y compensation for rotateX foreshortening.
 * Far (top) tiles are compressed on screen; expand them back for hit-tests.
 */
export function screenYToPlaneY(ny: number): number {
  const t = Math.max(0, Math.min(1, ny))
  // Milder inverse for ~26° tilt + long perspective.
  return Math.pow(t, 0.9)
}

export function planeYToScreenY(py: number): number {
  const t = Math.max(0, Math.min(1, py))
  return Math.pow(t, 1 / 0.9)
}
