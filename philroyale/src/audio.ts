import { shakeBattlefield, shakeForHit } from './fx'

const cache = new Map<string, HTMLAudioElement>()

const BASE = `${import.meta.env.BASE_URL}audio/`

let ctx: AudioContext | null = null
let hubTimer: number | null = null
let hubGain: GainNode | null = null

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

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

function noiseBurst(ac: AudioContext, dur: number, volume: number, freq = 180) {
  const n = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate)
  const data = n.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ac.createBufferSource()
  src.buffer = n
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = freq
  const g = ac.createGain()
  g.gain.setValueAtTime(volume, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(ac.destination)
  src.start()
}

function tone(
  ac: AudioContext,
  freq: number,
  dur: number,
  volume: number,
  type: OscillatorType = 'square',
) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ac.currentTime)
  g.gain.setValueAtTime(volume, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
  o.connect(g)
  g.connect(ac.destination)
  o.start()
  o.stop(ac.currentTime + dur)
}

export const synth = {
  explosion() {
    const ac = audioCtx()
    if (!ac) return
    noiseBurst(ac, 0.55, 0.55, 220)
    tone(ac, 90, 0.4, 0.35, 'sawtooth')
    tone(ac, 48, 0.5, 0.28, 'sine')
  },
  punch() {
    const ac = audioCtx()
    if (!ac) return
    noiseBurst(ac, 0.12, 0.4, 400)
    tone(ac, 110, 0.16, 0.4, 'square')
    tone(ac, 55, 0.2, 0.3, 'sine')
  },
  kick() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 160, 0.1, 0.28, 'square')
    tone(ac, 70, 0.18, 0.32, 'sine')
  },
  shoot() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 880, 0.06, 0.18, 'square')
    tone(ac, 420, 0.08, 0.12, 'triangle')
  },
  splash() {
    const ac = audioCtx()
    if (!ac) return
    noiseBurst(ac, 0.22, 0.22, 900)
    tone(ac, 240, 0.12, 0.12, 'triangle')
  },
  rocket() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 220, 0.28, 0.16, 'sawtooth')
    noiseBurst(ac, 0.3, 0.2, 500)
  },
  whip() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 1400, 0.05, 0.14, 'square')
    noiseBurst(ac, 0.08, 0.18, 1800)
  },
  love() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 523, 0.12, 0.14, 'sine')
    tone(ac, 659, 0.14, 0.12, 'sine')
  },
  magic() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 740, 0.16, 0.12, 'triangle')
    tone(ac, 1174, 0.2, 0.1, 'sine')
  },
  thud() {
    const ac = audioCtx()
    if (!ac) return
    tone(ac, 80, 0.14, 0.28, 'sine')
  },
}

export function combatFx(kind: string | undefined, damage = 120): void {
  shakeBattlefield(shakeForHit(kind, damage))
  if (kind === 'grafBomb' || kind === 'rocket' || kind === 'barrel' || kind === 'boom')
    synth.explosion()
  else if (kind === 'uppercut' || kind === 'ram') synth.punch()
  else if (kind === 'kick' || kind === 'jump' || kind === 'launch' || kind === 'suplex')
    synth.kick()
  else if (kind === 'shoot' || kind === 'arrow' || kind === 'cannon' || kind === 'cash')
    synth.shoot()
  else if (kind === 'whip' || kind === 'bite') synth.whip()
  else if (kind === 'love' || kind === 'hug') synth.love()
  else if (kind === 'witchcraft' || kind === 'berryJuice') synth.magic()
  else if (kind === 'football' || kind === 'baseball') {
    synth.thud()
    synth.kick()
  } else if (
    kind === 'sundae' ||
    kind === 'iceCream' ||
    kind === 'slobber' ||
    kind === 'poop' ||
    kind === 'pancake' ||
    kind === 'cheese'
  )
    synth.splash()
  else synth.thud()
}

const HUB_NOTES = [196, 247, 294, 330, 392, 330, 294, 247]

export function startHubBgm(): void {
  const ac = audioCtx()
  if (!ac || hubTimer != null) return
  hubGain = ac.createGain()
  hubGain.gain.value = 0.07
  hubGain.connect(ac.destination)
  let i = 0
  const tick = () => {
    if (!ctx || !hubGain) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = HUB_NOTES[i % HUB_NOTES.length]!
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42)
    o.connect(g)
    g.connect(hubGain)
    o.start()
    o.stop(ctx.currentTime + 0.45)
    i += 1
  }
  tick()
  hubTimer = window.setInterval(tick, 420)
}

export function stopHubBgm(): void {
  if (hubTimer != null) {
    window.clearInterval(hubTimer)
    hubTimer = null
  }
  if (hubGain && ctx) {
    try {
      hubGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
    } catch {
      /* ignore */
    }
  }
  hubGain = null
}

export const sfx = {
  click: () => playSfx(`${BASE}click.wav`, 0.35),
  deploy: () => {
    playSfx(`${BASE}deploy.wav`, 0.7)
    synth.thud()
  },
  elixir: () => playSfx(`${BASE}elixir.wav`, 0.28),
  hit: () => {
    playSfx(`${BASE}hit.wav`, 0.55)
    synth.thud()
  },
  towerHit: () => playSfx(`${BASE}tower-hit.wav`, 0.6),
  victory: () => playSfx(`${BASE}victory.wav`, 0.75),
  defeat: () => playSfx(`${BASE}defeat.wav`, 0.7),
  touchdown: () => playSfx(`${BASE}touchdown.wav`, 0.8),
  explosion: () => synth.explosion(),
}
