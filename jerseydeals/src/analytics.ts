import { GA_MEASUREMENT_ID } from './config'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let gaReady = false

/** Load GA4 once when a measurement ID is configured. */
export function initAnalytics() {
  if (gaReady || !GA_MEASUREMENT_ID || typeof document === 'undefined') return
  gaReady = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID)
}

/** Lightweight event tracker for CTA / category clicks. */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  try {
    if (import.meta.env.DEV) {
      console.info('[analytics]', event, props ?? {})
    }
    if (GA_MEASUREMENT_ID && typeof window.gtag === 'function') {
      window.gtag('event', event, props)
    }
  } catch {
    // never block UX on analytics
  }
}
