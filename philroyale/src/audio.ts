const cache = new Map<string, HTMLAudioElement>()

/** Play a one-shot SFX. Missing files fail silently (whip audio arrives later). */
export function playSfx(src: string, volume = 0.85): void {
  if (!src) return
  try {
    let audio = cache.get(src)
    if (!audio) {
      audio = new Audio(src)
      audio.preload = 'auto'
      cache.set(src, audio)
    }
    audio.volume = volume
    audio.currentTime = 0
    void audio.play().catch(() => {
      /* autoplay / missing file — ignore until asset ships */
    })
  } catch {
    /* ignore */
  }
}
