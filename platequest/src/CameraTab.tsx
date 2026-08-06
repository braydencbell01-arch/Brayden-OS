import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { readLicensePlate, type PlateRead } from './plateOcr'
import { rarityLabel } from './jurisdictions'

type Props = {
  onIdentified?: (read: PlateRead) => void
}

export function CameraTab({ onIdentified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<PlateRead | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStreamError('Camera not available in this browser. Upload a photo instead.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
          setCameraOn(true)
          setStreamError(null)
        }
      } catch {
        setStreamError('Could not open the camera. Allow permission or upload a photo.')
        setCameraOn(false)
      }
    }

    void start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

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
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const url = canvas.toDataURL('image/jpeg', 0.92)
    await analyzeFrame(canvas, url)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
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

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 pt-3">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">Camera</p>
        <h1 className="font-display mt-1 text-3xl text-chrome">Scan a plate</h1>
        <p className="mt-1 max-w-md text-sm text-fog">
          Frame the plate clearly, then capture. PlateQuest reads the characters and matches state clues when it can.
        </p>
      </header>

      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-sm bg-lane ring-1 ring-white/10">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${preview ? 'opacity-0' : 'opacity-100'}`}
        />
        {preview && (
          <img src={preview} alt="Captured plate" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[28%] w-[72%] max-w-md rounded-sm border-2 border-plate/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-asphalt/70 backdrop-blur-[2px]">
            <motion.p
              className="font-display text-xl text-plate"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              Reading plate…
            </motion.p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

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
          className="rounded-sm border border-chrome/30 px-4 py-3 text-sm font-medium text-chrome transition hover:border-plate/60 hover:text-plate disabled:opacity-40"
        >
          Upload photo
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              setResult(null)
            }}
            className="text-sm text-fog underline-offset-2 hover:text-chrome hover:underline"
          >
            Back to live
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
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
