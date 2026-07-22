export function FavoriteStar({
  active,
  onToggle,
  label,
  size = 'md',
}: {
  active: boolean
  onToggle: () => void
  label: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 16 : 20

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        onToggle()
      }}
      aria-pressed={active}
      aria-label={active ? `Unfavorite ${label}` : `Favorite ${label}`}
      title={active ? `Unfavorite ${label}` : `Favorite ${label}`}
      className={[
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition outline-none',
        'focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep',
        active ? 'text-star' : 'text-mist/55 hover:text-star/80',
      ].join(' ')}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        aria-hidden
        className={active ? 'drop-shadow-[0_0_8px_rgba(255,216,74,0.95)]' : undefined}
      >
        <path
          d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1-4.4-4.3 6.1-.9L12 2.8z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
