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

export function CameraTab({ onIdentified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
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
        // Prefer sharp rear camera at high resolution; fall back if device rejects.
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
          // Ask for continuous autofocus / max sharpness when the driver allows it.
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
            // Digital camera zoom (crops the sensor view — not page zoom).
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
        /* fall back to digital preview zoom */
      })
  }, [zoom, nativeZoom, zoomCaps])

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

    // When native zoom isn't available, crop the center to match the digital zoom.
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

  const previewZoom = !nativeZoom && !preview ? zoom : 1

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 pt-3">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Camera</p>
        <h1 className="font-display mt-1 text-3xl text-ink">Scan a plate</h1>
        <p className="mt-1 max-w-md text-sm text-fog">
          Use the live camera (pinch/slider to zoom) or pick a photo you already took from your gallery.
        </p>
      </header>

      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-sm bg-lane ring-1 ring-line">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover ${preview ? 'opacity-0' : 'opacity-100'}`}
          style={{
            transform: previewZoom > 1 ? `scale(${previewZoom})` : undefined,
            transformOrigin: 'center center',
          }}
        />
        {preview && (
          <img src={preview} alt="Plate photo" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[28%] w-[72%] max-w-md rounded-sm border-2 border-plate/90 shadow-[0_0_0_9999px_rgba(255,255,255,0.35)]" />
        </div>
        {resolutionLabel && !preview && (
          <p className="absolute left-2 top-2 rounded-sm bg-paper/90 px-2 py-0.5 text-[10px] font-medium text-ink ring-1 ring-plate/40">
            {resolutionLabel}
            {nativeZoom ? ' · optical zoom' : zoom > 1 ? ` · ${zoom.toFixed(1)}×` : ''}
          </p>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/80 backdrop-blur-[2px]">
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
        <label className="flex items-center gap-3 text-sm text-ink">
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
        <p className="text-sm text-signal" role="status">
          {streamError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
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
        {/* No capture= attribute — opens photo library / previous pictures, not a new camera shot. */}
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
            key={result.text + result.confidence}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="plate-face rounded-sm px-4 py-4"
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
                State not detected from the image — characters only for now. Tip: include the state name on the plate in frame.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
