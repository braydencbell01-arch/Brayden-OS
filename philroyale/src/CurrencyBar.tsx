import { useEffect, useState } from 'react'
import { loadProfile } from './storage'

/** Gold coin + gem crystal icons for the persistent currency chip. */
export function GoldIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#c9a227" />
      <circle cx="12" cy="12" r="7.5" fill="#f5d76e" />
      <circle cx="9" cy="9" r="2.2" fill="#fff6c8" opacity="0.85" />
      <path
        d="M12 7.2c-2.2 0-3.6 1.2-3.6 2.8 0 1.3 1 2.1 2.4 2.5l.6.2c.9.25 1.3.55 1.3 1.05 0 .6-.55 1-1.5 1-.85 0-1.45-.3-1.85-.85l-1.35.9c.55.9 1.6 1.45 3.2 1.55V18h1.7v-1.5c2-.25 3.35-1.4 3.35-3.15 0-1.45-1-2.35-2.55-2.75l-.7-.2c-.85-.25-1.2-.55-1.2-1 0-.5.5-.85 1.3-.85.7 0 1.25.25 1.65.7l1.25-.95C14.7 7.7 13.6 7.2 12 7.2z"
        fill="#8a6a12"
      />
    </svg>
  )
}

export function GemIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5 3.8 9.2 12 21.5l8.2-12.3L12 2.5z"
        fill="#3ec6ff"
      />
      <path d="M12 2.5 7.2 9.2h9.6L12 2.5z" fill="#9ae6ff" />
      <path d="M7.2 9.2 12 21.5 3.8 9.2h3.4z" fill="#1a8fd0" />
      <path d="M16.8 9.2H7.2L12 21.5l4.8-12.3z" fill="#2ab0f0" />
      <path d="M12 2.5 16.8 9.2h3.4L12 2.5z" fill="#6dd6ff" />
    </svg>
  )
}

/** Persistent top-right gold + gems. Place once in App shell. */
export function CurrencyBar() {
  const [gold, setGold] = useState(() => loadProfile().gold)
  const [gems, setGems] = useState(() => loadProfile().gems)

  useEffect(() => {
    const sync = () => {
      const p = loadProfile()
      setGold(p.gold)
      setGems(p.gems)
    }
    sync()
    const id = window.setInterval(sync, 800)
    window.addEventListener('storage', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return (
    <div
      className="pointer-events-none absolute right-2 top-[max(0.45rem,env(safe-area-inset-top))] z-40 flex items-center gap-1.5"
      aria-label={`Gold ${gold}, gems ${gems}`}
    >
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1"
        style={{
          background: 'linear-gradient(180deg,#3a2418,#1a100c)',
          boxShadow: '0 2px 0 #00000066, inset 0 1px 0 #c9a22744',
        }}
      >
        <GoldIcon className="h-4 w-4 shrink-0" />
        <span className="min-w-[1.5rem] text-xs font-extrabold tabular-nums text-[#f5d76e]">
          {gold}
        </span>
      </div>
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1"
        style={{
          background: 'linear-gradient(180deg,#3a2418,#1a100c)',
          boxShadow: '0 2px 0 #00000066, inset 0 1px 0 #c9a22744',
        }}
      >
        <GemIcon className="h-4 w-4 shrink-0" />
        <span className="min-w-[1.25rem] text-xs font-extrabold tabular-nums text-[#7dffef]">
          {gems}
        </span>
      </div>
    </div>
  )
}
