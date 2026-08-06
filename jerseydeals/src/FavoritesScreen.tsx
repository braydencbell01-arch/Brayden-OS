import { useMemo, useState } from 'react'
import { track } from './analytics'
import {
  clearFavoriteClubs,
  favoriteClubIdSet,
  leaveFavoritesScreen,
  useFavoriteClubIds,
} from './favorites'
import { ClubFavoriteButton, ClubLogoMark, HeartIcon } from './FavoriteControls'
import { FAVORITE_OUTER_RING_CLASS, clubOutlineColor } from './clubColors'
import {
  getClubById,
  popularClubSuggestions,
  searchClubs,
  type ClubCatalogEntry,
} from './clubCatalog'
import {
  formatPrice,
  inferClub,
  listingPrimaryImage,
  shortTitle,
  sortListings,
  type Listing,
} from './listings'

function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${path.replace(/^\//, '')}`
}

const FALLBACK_IMAGE = asset('product-home.jpg')

export function FavoritesScreen({
  listings,
  onShopClub,
  onQuickView,
}: {
  listings: Listing[]
  onShopClub: (clubId: string, clubName: string) => void
  onQuickView: (item: Listing) => void
}) {
  const favoriteIds = useFavoriteClubIds()
  const favoriteSet = useMemo(() => favoriteClubIdSet(favoriteIds), [favoriteIds])
  const [clubQuery, setClubQuery] = useState('')

  const favoritedClubs = useMemo(() => {
    return favoriteIds
      .map((id) => getClubById(id))
      .filter((club): club is ClubCatalogEntry => Boolean(club))
  }, [favoriteIds])

  const suggestionClubs = useMemo(() => {
    const q = clubQuery.trim()
    if (q) return searchClubs(q).slice(0, 40)
    return popularClubSuggestions(28, favoriteSet)
  }, [clubQuery, favoriteSet])

  const suggestedJerseys = useMemo(() => {
    if (!favoriteSet.size) return [] as Listing[]
    const rows = listings.filter((item) => {
      const club = inferClub(item.title)
      return club ? favoriteSet.has(club.id) : false
    })
    return sortListings(rows, 'featured')
  }, [listings, favoriteSet])

  return (
    <div className="fixed inset-0 z-[70] flex min-h-dvh flex-col bg-chalk text-navy">
      <header className="flex items-center justify-between border-b border-navy/10 bg-cream px-5 py-4">
        <p className="inline-flex items-center gap-2 font-brand text-sm font-bold uppercase leading-none tracking-[0.14em] text-navy">
          <HeartIcon filled className="h-4 w-4 shrink-0 text-crimson" />
          <span className="leading-none">Favorites</span>
          {favoriteIds.length > 0 ? (
            <span className="leading-none text-crimson">{favoriteIds.length}</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => leaveFavoritesScreen()}
          className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy transition hover:text-crimson"
        >
          Back
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6" aria-label="Favorite teams">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
          <section>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Find a club
            </p>
            <label className="mt-2 block">
              <span className="sr-only">Search teams</span>
              <input
                type="search"
                value={clubQuery}
                onChange={(e) => setClubQuery(e.target.value)}
                placeholder="Search Premier League, La Liga, Serie A…"
                autoComplete="off"
                className="w-full border border-navy/15 bg-white px-3 py-3 text-base text-navy outline-none placeholder:text-muted focus:ring-2 focus:ring-crimson/30"
              />
            </label>
            <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              {clubQuery.trim() ? 'Search results' : 'Suggested clubs'}
            </p>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {suggestionClubs.map((club) => {
                const favorited = favoriteSet.has(club.id)
                return (
                  <li key={club.id} className="shrink-0">
                    <div
                      className={`flex items-center gap-2 border-2 bg-white py-1.5 pl-2 pr-1 ${
                        favorited ? FAVORITE_OUTER_RING_CLASS : ''
                      }`}
                      style={{
                        borderColor: favorited
                          ? clubOutlineColor(club.id)
                          : 'rgba(11, 34, 63, 0.15)',
                      }}
                    >
                      <ClubLogoMark club={club} size="sm" />
                      <span className="max-w-[7.5rem] truncate font-brand text-xs font-bold uppercase tracking-[0.08em] text-navy">
                        {club.name}
                      </span>
                      <ClubFavoriteButton
                        clubId={club.id}
                        clubName={club.name}
                        favorited={favorited}
                        place="favorites_page_suggest"
                        className={`h-9 w-9 ${favorited ? 'text-crimson' : 'text-navy/45 hover:text-crimson'}`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            {suggestionClubs.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No clubs match that search.</p>
            ) : null}
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Your teams
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-navy">
                  Favorited teams
                </h2>
              </div>
              {favoritedClubs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    clearFavoriteClubs()
                    track('favorites_clear', { place: 'favorites_page' })
                  }}
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-crimson"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {favoritedClubs.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3">
                {favoritedClubs.map((club) => (
                  <li key={club.id}>
                    <div
                      className={`relative flex w-[5.75rem] flex-col items-center gap-1.5 border-2 bg-cream px-2 py-3 ${FAVORITE_OUTER_RING_CLASS}`}
                      style={{ borderColor: clubOutlineColor(club.id) }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          track('club_click', { club: club.id, place: 'favorites_page_tile' })
                          leaveFavoritesScreen()
                          onShopClub(club.id, club.name)
                        }}
                        className="flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-crimson"
                      >
                        <ClubLogoMark club={club} size="md" />
                        <span className="line-clamp-2 text-center font-brand text-[0.65rem] font-bold uppercase leading-tight tracking-[0.08em] text-navy">
                          {club.name}
                        </span>
                      </button>
                      <ClubFavoriteButton
                        clubId={club.id}
                        clubName={club.name}
                        favorited
                        place="favorites_page_tile"
                        className="absolute -right-1.5 -top-1.5 h-7 w-7 border border-crimson/40 bg-crimson text-cream"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 border border-dashed border-navy/20 bg-cream/70 px-4 py-6 text-center">
                <HeartIcon className="mx-auto h-6 w-6 text-crimson" />
                <p className="mt-2 font-display text-xl font-bold uppercase tracking-wide text-navy">
                  No favorites yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Heart suggested clubs above.
                </p>
              </div>
            )}
          </section>

          <section>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Based on your clubs
            </p>
            <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-navy">
              Suggested jerseys
            </h2>

            {!favoriteSet.size || suggestedJerseys.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No listings available</p>
            ) : (
              <ul className="mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestedJerseys.map((item) => {
                  const img = listingPrimaryImage(item) || FALLBACK_IMAGE
                  return (
                    <li key={item.id} className="w-[7.5rem] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          track('product_click', {
                            id: item.id,
                            tag: item.tag,
                            place: 'favorites_suggested',
                          })
                          onQuickView(item)
                        }}
                        className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson"
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-white">
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-contain object-center"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_IMAGE
                            }}
                          />
                        </div>
                        <p className="mt-1.5 line-clamp-2 font-brand text-[0.7rem] font-bold uppercase leading-snug tracking-[0.04em] text-navy">
                          {shortTitle(item.title)}
                        </p>
                        <p className="mt-0.5 font-brand text-[0.75rem] font-bold text-[#e85d04]">
                          {formatPrice(item.price, item.currency)}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
