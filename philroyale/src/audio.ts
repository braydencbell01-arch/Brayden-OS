const cache = new Map<string, HTMLAudioElement>()

const BASE = `${import.meta.env.BASE_URL}audio/`

/** Play a one-shot SFX. Missing files fail silently. */
export function playSfx(src: string, volume = 0.85): void {
  if (!src) return
  try {
    let audio = cache.get(src)
    if (!audio) {
      audio = new Audio(src)
      audio.preload = 'auto'
      cache.set(src, audio)
    }
    const clip = audio.cloneNode(true) as HTMLAudioElement
    clip.volume = volume
    void clip.play().catch(() => {
      /* autoplay / missing file */
    })
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click: () => playSfx(`${BASE}click.wav`, 0.35),
  deploy: () => playSfx(`${BASE}deploy.wav`, 0.7),
  elixir: () => playSfx(`${BASE}elixir.wav`, 0.28),
  hit: () => playSfx(`${BASE}hit.wav`, 0.55),
  towerHit: () => playSfx(`${BASE}tower-hit.wav`, 0.6),
  victory: () => playSfx(`${BASE}victory.wav`, 0.75),
  defeat: () => playSfx(`${BASE}defeat.wav`, 0.7),
  touchdown: () => playSfx(`${BASE}touchdown.wav`, 0.8),
}
