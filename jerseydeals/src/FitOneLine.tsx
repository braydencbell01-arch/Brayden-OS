import { useEffect, useRef, useState, type CSSProperties } from 'react'

type FitOneLineProps = {
  children: string
  className?: string
  style?: CSSProperties
  /** Starting size in px (shrinks down if needed). */
  maxFontPx?: number
  /** Floor so names stay readable. */
  minFontPx?: number
}

/**
 * Keeps label text on a single line by shrinking font-size until it fits.
 */
export function FitOneLine({
  children,
  className = '',
  style,
  maxFontPx = 14,
  minFontPx = 8,
}: FitOneLineProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [fontSize, setFontSize] = useState(maxFontPx)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      let size = maxFontPx
      el.style.fontSize = `${size}px`
      // Nudge down until one line fits the container width.
      while (size > minFontPx && el.scrollWidth > el.clientWidth + 0.5) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
      setFontSize(size)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [children, maxFontPx, minFontPx])

  return (
    <p
      ref={ref}
      className={`overflow-hidden whitespace-nowrap ${className}`.trim()}
      style={{ ...style, fontSize }}
    >
      {children}
    </p>
  )
}
