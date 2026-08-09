/** Clash-style camera: look “into” the board from the near (ally) edge. */
export const ARENA_PERSPECTIVE_PX = 920
export const ARENA_TILT_DEG = 52

/**
 * Screen Y → plane Y compensation for rotateX foreshortening.
 * Far (top) tiles are compressed on screen; expand them back for hit-tests.
 */
export function screenYToPlaneY(ny: number): number {
  const t = Math.max(0, Math.min(1, ny))
  // Empiric inverse matching rotateX(~52°) + perspective(~920) on a portrait board.
  return Math.pow(t, 0.78)
}

export function planeYToScreenY(py: number): number {
  const t = Math.max(0, Math.min(1, py))
  return Math.pow(t, 1 / 0.78)
}
