import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { readLicensePlate, type PlateRead } from './plateOcr'
import { rarityLabel } from './jurisdictions'

type Props = {
  onIdentified?: (read: PlateRead) => void
}

type ZoomCaps = { min: number; max: number; step: number }

function getZoomCaps(track: MediaStreamTrack): ZoomCaps | null {
  const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
    zoom?: { min: number; max: number; step?: number }
  }
  if (!caps?.zoom || caps.zoom.max <= caps.zoom.min) return null
  return {
    min: caps.zoom.min,
    max: caps.zoom.max,
    step: caps.zoom.step ?? 0.1,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function CameraTab({ onIdentified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<PlateRead | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [zoomCaps, setZoomCaps] = useState<ZoomCaps | null>(null)
  const [nativeZoom, setNativeZoom] = useState(false)
  const [resolutionLabel, setResolutionLabel] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStreamError('Camera not available in this browser. Pick a photo from your gallery instead.')
        return
      }
      try {
        const attempts: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 3840 },
              height: { ideal: 2160 },
              // @ts-expect-error advanced focus/zoom hints — supported on many mobile browsers
              advanced: [{ focusMode: 'continuous' }, { zoom: 1 }],
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
        ]

        let lastErr: unknown
        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints)
            break
          } catch (err) {
            lastErr = err
          }
        }
        if (!stream) throw lastErr ?? new Error('getUserMedia failed')

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const track = stream.getVideoTracks()[0] ?? null
        trackRef.current = track
        if (track) {
          try {
            await track.applyConstraints({
              // @ts-expect-error non-standard but widely used on mobile
              advanced: [{ focusMode: 'continuous' }],
            })
          } catch {
            /* ignore unsupported */
          }
          const settings = track.getSettings()
          if (settings.width && settings.height) {
            setResolutionLabel(`${settings.width}×${settings.height}`)
          }
          const caps = getZoomCaps(track)
          if (caps) {
            setZoomCaps(caps)
            setNativeZoom(true)
            setZoom(caps.min)
          } else {
            setZoomCaps({ min: 1, max: 4, step: 0.1 })
            setNativeZoom(false)
            setZoom(1)
          }
        }

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.setAttribute('playsinline', 'true')
          await video.play()
          setCameraOn(true)
          setStreamError(null)
        }
      } catch {
        setStreamError('Could not open the camera. Allow permission or pick a photo from your gallery.')
        setCameraOn(false)
      }
    }

    void start()
    return () => {
      cancelled = true
      trackRef.current = null
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track || !nativeZoom || !zoomCaps) return
    void track
      .applyConstraints({
        // @ts-expect-error zoom is in MediaTrackConstraintSet on supporting browsers
        advanced: [{ zoom }],
      })
      .catch(() => {
        /* digital preview zoom still applies */
      })
  }, [zoom, nativeZoom, zoomCaps])

  useEffect(() => {
    if (!result) return
    // Let the result paint, then scroll it into view under the fixed camera frame.
    const id = window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [result])

  async function analyzeFrame(source: HTMLCanvasElement | HTMLImageElement, previewUrl: string) {
    setBusy(true)
    setPreview(previewUrl)
    setResult(null)
    try {
      const read = await readLicensePlate(source)
      setResult(read)
      onIdentified?.(read)
    } catch {
      setResult({
        text: '—',
        confidence: 0,
        rawText: '',
      })
    } finally {
      setBusy(false)
    }
  }

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !cameraOn) return
    const vw = video.videoWidth || 1920
    const vh = video.videoHeight || 1080

    // Digital zoom crops the center to match what the user sees in the viewfinder.
    const digital = !nativeZoom && zoom > 1 ? zoom : 1
    const cropW = Math.round(vw / digital)
    const cropH = Math.round(vh / digital)
    const sx = Math.round((vw - cropW) / 2)
    const sy = Math.round((vh - cropH) / 2)

    canvas.width = cropW
    canvas.height = cropH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH)
    const url = canvas.toDataURL('image/jpeg', 0.95)
    await analyzeFrame(canvas, url)
  }

  async function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      setStreamError('Please choose a photo from your gallery (JPG, PNG, HEIC, etc.).')
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      void analyzeFrame(img, url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setStreamError('Could not read that image.')
    }
    img.src = url
  }

  function onPinchStart(e: React.TouchEvent) {
    if (e.touches.length !== 2 || !zoomCaps || preview) return
    const [a, b] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    pinchRef.current = { startDist: dist, startZoom: zoom }
  }

  function onPinchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2 || !zoomCaps || !pinchRef.current || preview) return
    e.preventDefault()
    const [a, b] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const ratio = dist / Math.max(1, pinchRef.current.startDist)
    const next = clamp(
      pinchRef.current.startZoom * ratio,
      zoomCaps.min,
      zoomCaps.max,
    )
    setZoom(Number(next.toFixed(2)))
  }

  function onPinchEnd() {
    pinchRef.current = null
  }

  // Digital zoom scales only the video layer inside the clipped viewfinder.
  // Native optical zoom uses the track; keep CSS scale at 1 so the outline never moves.
  const videoScale = !nativeZoom && !preview ? zoom : 1

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-6 pt-3">
      <header className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Camera</p>
        <h1 className="font-display mt-1 text-3xl text-ink">Scan a plate</h1>
        <p className="mt-1 max-w-md text-sm text-fog">
          Zoom the camera with the slider or pinch on the viewfinder — the plate outline stays put. After
          capture, scroll down for the result.
        </p>
      </header>

      {/* Fixed-size viewfinder so results below stay reachable via scroll */}
      <div
        className="relative h-[min(42vh,320px)] w-full shrink-0 touch-none overflow-hidden rounded-sm bg-lane ring-1 ring-line"
        onTouchStart={onPinchStart}
        onTouchMove={onPinchMove}
        onTouchEnd={onPinchEnd}
        onTouchCancel={onPinchEnd}
      >
        {/* Clipped video layer — only this scales for digital zoom */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${preview ? 'opacity-0' : 'opacity-100'}`}
            style={{
              transform: videoScale > 1 ? `scale(${videoScale})` : undefined,
              transformOrigin: 'center center',
              willChange: videoScale > 1 ? 'transform' : undefined,
            }}
          />
          {preview && (
            <img src={preview} alt="Plate photo" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>

        {/* Outline sits above the video and is never scaled */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-[28%] w-[72%] max-w-md rounded-sm border-2 border-plate/90 shadow-[0_0_0_9999px_rgba(255,255,255,0.35)]" />
        </div>

        {resolutionLabel && !preview && (
          <p className="absolute left-2 top-2 z-20 rounded-sm bg-paper/90 px-2 py-0.5 text-[10px] font-medium text-ink ring-1 ring-plate/40">
            {resolutionLabel}
            {nativeZoom ? ' · optical zoom' : zoom > 1 ? ` · ${zoom.toFixed(1)}×` : ''}
          </p>
        )}
        {busy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-paper/80 backdrop-blur-[2px]">
            <motion.p
              className="font-display text-xl text-plate-hot"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              Reading plate…
            </motion.p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {cameraOn && zoomCaps && !preview && (
        <label className="flex shrink-0 items-center gap-3 text-sm text-ink">
          <span className="shrink-0 font-medium">Zoom</span>
          <input
            type="range"
            min={zoomCaps.min}
            max={zoomCaps.max}
            step={zoomCaps.step}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 w-full accent-[var(--color-plate,#d4af37)]"
            aria-label="Camera zoom"
          />
          <span className="w-10 shrink-0 text-right tabular-nums text-fog">{zoom.toFixed(1)}×</span>
        </label>
      )}

      {streamError && (
        <p className="shrink-0 text-sm text-signal" role="status">
          {streamError}
        </p>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void capture()}
          disabled={!cameraOn || busy}
          className="rounded-sm bg-plate px-5 py-3 font-semibold text-asphalt transition enabled:hover:bg-plate-hot disabled:opacity-40"
        >
          Capture plate
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-sm border border-line px-4 py-3 text-sm font-medium text-ink transition hover:border-plate/60 hover:text-plate-hot disabled:opacity-40"
        >
          Choose from gallery
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              setResult(null)
            }}
            className="text-sm text-fog underline-offset-2 hover:text-ink hover:underline"
          >
            Back to live
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            ref={resultRef}
            key={result.text + result.confidence}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="plate-face mb-2 shrink-0 rounded-sm px-4 py-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]">Identified plate</p>
            <p className="font-display mt-1 text-4xl tracking-widest">{result.text}</p>
            <p className="mt-2 text-sm opacity-80">
              Confidence {Math.round(result.confidence)}%
              {result.rawText && result.rawText !== result.text ? ` · OCR “${result.rawText}”` : ''}
            </p>
            {result.jurisdiction ? (
              <div className="mt-3 border-t border-asphalt/20 pt-3 text-sm">
                <p className="font-semibold">
                  {result.jurisdiction.name} ({result.jurisdiction.code})
                </p>
                {result.jurisdiction.slogan && (
                  <p className="opacity-80">“{result.jurisdiction.slogan}”</p>
                )}
                <p className="mt-1 opacity-80">{rarityLabel(result.jurisdiction.rarity)}</p>
                <p className="mt-1 opacity-90">{result.jurisdiction.notes}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm opacity-80">
                State not detected from the image — characters only for now. Tip: include the state name on
                the plate in frame.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
