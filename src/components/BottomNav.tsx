import type { ReactNode } from 'react'

export type BottomTab = 'stats' | 'leagues' | 'home' | 'fantasy' | 'favorites'

const TABS: Array<{
  id: BottomTab
  label: string
  icon: (active: boolean) => ReactNode
}> = [
  {
    id: 'stats',
    label: 'Stats',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 19V11M12 19V5M19 19v-7"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'leagues',
    label: 'Leagues',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.7}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.7}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8.5 4.5h7l1.5 3.5V19a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V8L8.5 4.5z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.7}
          strokeLinejoin="round"
        />
        <path
          d="M8.5 4.5L7 7.5M15.5 4.5L17 7.5M10 8.5h4"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13.5" r="2" stroke="currentColor" strokeWidth={active ? 2 : 1.7} />
      </svg>
    ),
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1-4.4-4.3 6.1-.9L12 2.8z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.7}
          strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'}
        />
      </svg>
    ),
  },
]

export function BottomNav({
  active,
  onSelect,
  favoritesCount = 0,
}: {
  active: BottomTab
  onSelect: (tab: BottomTab) => void
  /** When greater than 0, Favorites tab shows a small count cue. */
  favoritesCount?: number
}) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-pitch-deep/95 backdrop-blur-md"
      style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 md:max-w-xl">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const showFavBadge = tab.id === 'favorites' && favoritesCount > 0
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={
                showFavBadge ? `Favorites, ${favoritesCount} saved` : undefined
              }
              className={`relative flex flex-col items-center gap-0.5 px-1 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime ${
                isActive ? 'text-lime' : 'text-mist/55 hover:text-mist/90'
              }`}
            >
              <span className="relative">
                {tab.icon(isActive)}
                {showFavBadge ? (
                  <span
                    className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-star px-1 text-[0.5rem] font-bold leading-none text-ink"
                    aria-hidden
                  >
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                ) : null}
              </span>
              <span
                className={`text-[0.58rem] font-semibold uppercase tracking-[0.08em] ${
                  isActive ? 'text-lime' : 'text-mist/55'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
