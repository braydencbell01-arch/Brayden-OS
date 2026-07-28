import { track } from './analytics'
import { toggleFavoriteClub } from './favorites'
import { clubLogoUrl, type ClubCatalogEntry } from './clubCatalog'

export function HeartIcon({ filled, className = 'h-4 w-4' }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 21s-6.7-4.35-9.33-7.4C.8 11.45.9 8.2 3.1 6.35 5.05 4.7 7.85 5 12 9.15 16.15 5 18.95 4.7 20.9 6.35c2.2 1.85 2.3 5.1.43 7.25C18.7 16.65 12 21 12 21Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ClubFavoriteButton({
  clubId,
  clubName,
  favorited,
  place,
  className = '',
}: {
  clubId: string
  clubName: string
  favorited: boolean
  place: string
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={favorited ? `Remove ${clubName} from favorites` : `Favorite ${clubName}`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavoriteClub(clubId)
        track('favorite_toggle', { club: clubId, on: !favorited, place })
      }}
      className={`grid place-items-center outline-none transition focus-visible:ring-2 focus-visible:ring-crimson ${className}`}
    >
      <HeartIcon filled={favorited} />
    </button>
  )
}

export function ClubLogoMark({
  club,
  size = 'md',
  className = '',
}: {
  club: Pick<ClubCatalogEntry, 'id' | 'name' | 'espnId' | 'logoKind'>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const src = clubLogoUrl(club)
  const dims = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  const initials = club.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

  if (!src) {
    return (
      <div
        className={`grid ${dims} shrink-0 place-items-center rounded-full border border-navy/15 bg-mist font-display text-[0.65rem] font-bold text-navy ${className}`}
        aria-hidden
      >
        {initials || '?'}
      </div>
    )
  }

  return (
    <div
      className={`relative ${dims} shrink-0 overflow-hidden rounded-full border border-navy/10 bg-white ${className}`}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain p-1.5"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          const parent = e.currentTarget.parentElement
          if (parent && !parent.querySelector('[data-fallback]')) {
            const span = document.createElement('span')
            span.dataset.fallback = '1'
            span.className =
              'absolute inset-0 grid place-items-center font-display text-[0.65rem] font-bold text-navy'
            span.textContent = initials || '?'
            parent.appendChild(span)
          }
        }}
      />
    </div>
  )
}
