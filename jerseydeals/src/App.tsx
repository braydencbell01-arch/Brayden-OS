import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { initAnalytics, track } from './analytics'
import {
  CONTACT_EMAIL,
  EBAY_FEEDBACK_COUNT,
  EBAY_OVERALL_RATING,
  EBAY_RATINGS,
  EBAY_SALE_URL,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  EBAY_SHOP_URL,
  FAMILY_NOTE,
  FREE_SHIPPING_THRESHOLD,
  PROMO_BAR,
  SALE_HEADLINE,
  SALE_URGENCY,
  SQUARE_STORE_URL,
} from './config'
import {
  addListingToCart,
  cartCount,
  cartSubtotal,
  clearCart,
  readCart,
  removeCartLine,
  setCartLineQuantity,
  type CartState,
} from './cart'
import { CartDrawer } from './Cart'
import { CollectionsRail } from './CollectionsRail'
import { ClubFavoriteButton, ClubLogoMark, HeartIcon } from './FavoriteControls'
import {
  EPL_TEAM_COLOR,
  UCL_TEAM_COLOR,
} from './clubColors'
import { getClubById } from './clubCatalog'
import {
  favoriteClubIdSet,
  goToFavoritesScreen,
  useFavoriteClubIds,
  useFavoritesScreenOpen,
} from './favorites'
import { FavoritesScreen } from './FavoritesScreen'
import { FirstBuyerOfferModal } from './FirstBuyerOffer'
import { FitOneLine } from './FitOneLine'
import { FreeShippingBar } from './FreeShippingBar'
import {
  goToInventoryPage,
  inventoryHref,
  useInventoryPageOpen,
} from './inventoryRoute'
import { listingViewCountsLastWeek, recordListingView } from './listingViews'
import { RewardsDock } from './RewardsJoinForm'
import { RewardsClub } from './RewardsClub'
import { RewardsOffersScreen } from './RewardsOffersScreen'
import {
  useRewardsOffersOpen,
  goToRewardsOffers,
  isRewardsMember,
} from './rewardsMember'
import { ProfileScreen } from './ProfileScreen'
import { goToProfileScreen, useProfileScreenOpen } from './profile'
import { ItemProfileScreen } from './ItemProfileScreen'
import {
  goToItemPage,
  leaveItemPage,
  useItemPageId,
} from './itemRoute'
import { leaveToHome } from './navStack'
import { SiteFooter } from './SiteFooter'
import {
  capturePurchaseReturnFromUrl,
  hasPurchased,
  readBuyerEmail,
  readOffer,
  syncPurchasedFromKnownEmail,
} from './offer'
import {
  checkoutUsesSquareDiscountLink,
  ensureRewardsOffers,
  getActiveCheckoutOffer,
  hasClaimedFirstBuyerOffer,
} from './offers'
import { captureSoldReturnFromUrl,
  fetchSoldOutIds,
  isListingSoldOut,
  readLocalSoldOutIds,
  rememberSoldOutIds,
} from './soldOut'
import {
  clubsInStock,
  conditionLabel,
  dedupeListingsByTitle,
  formatPrice,
  inferClub,
  isAdultListing,
  isSaleListing,
  isSquareCatalog,
  isWomenListing,
  isYouthListing,
  kitType,
  leaguesInStock,
  listingBuyUrl,
  listingImages,
  listingPrimaryImage,
  listingProductPageUrl,
  listingSize,
  matchesLeagueFilter,
  matchesListingQuery,
  matchesPriceFilter,
  matchesTypeFilter,
  pickFeatured,
  pickNewDrops,
  pickSaleItems,
  championsLeagueClubsInStock,
  pickTrending,
  premierLeagueClubsInStock,
  PRICE_FILTERS,
  pushRecentlyViewed,
  readRecentlyViewed,
  saleCompareAtPrice,
  shortTitle,
  SORT_OPTIONS,
  sortListings,
  sortSizes,
  TYPE_FILTERS,
  type ClubInfo,
  type LeagueInfo,
  type Listing,
  type ListingsPayload,
  type PriceFilterId,
  type SortId,
  type TypeFilterId,
} from './listings'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const FALLBACK_IMAGE = asset('product-home.jpg')
const LOGO_SRC = {
  sm: asset('logo-64.png'),
  md: asset('logo-192.png'),
  lg: asset('logo.png'),
} as const

type GenderFilter = 'All' | 'Men' | 'Women' | 'Youth'

function BrandMark({
  size = 'md',
  withWordmark = false,
  wordmarkTone = 'navy',
  stackedWordmark = false,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'hero'
  withWordmark?: boolean
  wordmarkTone?: 'navy' | 'white' | 'cream'
  stackedWordmark?: boolean
  className?: string
}) {
  const frame =
    size === 'sm'
      ? 'h-9 w-9'
      : size === 'md'
        ? 'h-11 w-11'
        : size === 'lg'
          ? 'h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]'
          : 'h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44'
  // Hero uses the 192px asset (~48KB) instead of full logo.png (~281KB).
  const src =
    size === 'sm' ? LOGO_SRC.sm : size === 'hero' || size === 'md' ? LOGO_SRC.md : LOGO_SRC.lg
  const word =
    wordmarkTone === 'white'
      ? 'text-white'
      : wordmarkTone === 'cream'
        ? 'text-cream'
        : 'text-navy'
  const wordSize =
    size === 'hero'
      ? 'text-3xl sm:text-4xl md:text-5xl'
      : size === 'lg'
        ? 'text-2xl md:text-3xl'
        : size === 'md'
          ? 'text-lg md:text-xl'
          : stackedWordmark
            ? 'text-[0.7rem] sm:text-xs'
            : 'text-base'

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={src}
        alt={withWordmark ? '' : 'Jersey Deals'}
        width={size === 'hero' ? 176 : size === 'lg' ? 72 : size === 'md' ? 44 : 36}
        height={size === 'hero' ? 176 : size === 'lg' ? 72 : size === 'md' ? 44 : 36}
        className={`${frame} shrink-0 rounded-full shadow-[0_0_0_2px_rgba(11,34,63,0.12)]`}
        decoding="async"
        loading={size === 'hero' ? 'eager' : 'lazy'}
        fetchPriority={size === 'hero' ? 'high' : 'auto'}
        draggable={false}
      />
      {withWordmark ? (
        stackedWordmark ? (
          <span
            className={`font-brand font-bold uppercase leading-[1.05] tracking-[0.12em] ${word} ${wordSize}`}
            aria-label="Jersey Deals"
          >
            <span className="block" aria-hidden>
              Jersey
            </span>
            <span className="block" aria-hidden>
              Deals
            </span>
          </span>
        ) : (
          <span className={`font-brand font-bold uppercase leading-none tracking-[0.08em] ${word} ${wordSize}`}>
            Jersey Deals
          </span>
        )
      ) : null}
    </span>
  )
}

function SafeImage({
  src,
  alt,
  className,
  loading = 'lazy',
  decoding = 'async',
  draggable,
  fetchPriority,
}: {
  src: string
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'auto' | 'sync'
  draggable?: boolean
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-navy-deep to-navy ${className ?? ''}`}
        aria-hidden={alt ? undefined : true}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <span className="px-4 text-center font-display text-lg uppercase tracking-wide text-white/85">
          Photo unavailable
        </span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
      fetchPriority={fetchPriority}
      onError={() => setFailed(true)}
    />
  )
}

/** Browse-grid cover: one photo only — full galleries stay in quick view. */
function ProductCardCover({
  item,
  tone = 'light',
  fit = 'contain',
}: {
  item: Listing
  tone?: 'dark' | 'light'
  fit?: 'contain' | 'cover'
}) {
  const src = listingPrimaryImage(item) || FALLBACK_IMAGE
  const bg = tone === 'dark' ? 'bg-navy-deep' : 'bg-white'
  return (
    <div className={`absolute inset-0 ${bg}`}>
      <SafeImage
        src={src}
        alt={shortTitle(item.title)}
        className={`h-full w-full object-center select-none ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        }`}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        draggable={false}
      />
    </div>
  )
}

const ease = [0.22, 1, 0.36, 1] as const

/** Premier League purple (logo) + club name colors for EPL tiles. */
const PL_PURPLE = '#37003c'
const PL_PURPLE_SOFT = '#4a0e52'

/**
 * Newest home-kit art for Shop EPL / Shop UCL tiles (not inventory listing photos).
 * Paths under public/home-kits/.
 */
const HOME_KIT_IMAGE: Record<string, string> = {
  chelsea: 'home-kits/chelsea.jpg',
  arsenal: 'home-kits/arsenal.jpg',
  liverpool: 'home-kits/liverpool.jpg',
  'manchester-city': 'home-kits/manchester-city.jpg',
  'manchester-united': 'home-kits/manchester-united.jpg',
  tottenham: 'home-kits/tottenham.jpg',
  newcastle: 'home-kits/newcastle.jpg',
  'real-madrid': 'home-kits/real-madrid.jpg',
  barcelona: 'home-kits/barcelona.jpg',
  'paris-saint-germain': 'home-kits/paris-saint-germain.jpg',
  'inter-milan': 'home-kits/inter-milan.jpg',
  'ac-milan': 'home-kits/ac-milan.jpg',
  'borussia-dortmund': 'home-kits/borussia-dortmund.jpg',
}

/** Champions League blue for UCL tiles. */
const UCL_BLUE = '#001E62'
const UCL_BLUE_SOFT = '#0A2F7A'
const UCL_GOLD = '#C4A35A'

function clubHomeKitSrc(clubId: string) {
  const path = HOME_KIT_IMAGE[clubId]
  return path ? asset(path) : null
}

/** Short club flavor for EPL / UCL stock rows. */
const CLUB_STOCK_BLURB: Record<string, string> = {
  chelsea: 'West London · Stamford Bridge',
  arsenal: 'North London · Emirates Stadium',
  liverpool: 'Merseyside · Anfield',
  'manchester-city': 'Manchester · Etihad Stadium',
  'manchester-united': 'Manchester · Old Trafford',
  tottenham: 'North London · Tottenham Hotspur Stadium',
  newcastle: 'Tyneside · St James’ Park',
  'aston-villa': 'Birmingham · Villa Park',
  brighton: 'South Coast · American Express Stadium',
  'crystal-palace': 'South London · Selhurst Park',
  'nottingham-forest': 'East Midlands · City Ground',
  bournemouth: 'South Coast · Vitality Stadium',
  brentford: 'West London · Gtech Community Stadium',
  fulham: 'West London · Craven Cottage',
  'west-ham': 'East London · London Stadium',
  everton: 'Merseyside · Goodison Park',
  wolves: 'Midlands · Molineux',
  'real-madrid': 'Madrid · Santiago Bernabéu',
  barcelona: 'Catalonia · Spotify Camp Nou',
  bayern: 'Munich · Allianz Arena',
  'paris-saint-germain': 'Paris · Parc des Princes',
  'inter-milan': 'Milan · San Siro',
  'ac-milan': 'Milan · San Siro',
  juventus: 'Turin · Allianz Stadium',
  'borussia-dortmund': 'Dortmund · Signal Iduna Park',
  'atletico-madrid': 'Madrid · Metropolitano',
  napoli: 'Naples · Diego Armando Maradona',
  'bayer-leverkusen': 'Leverkusen · BayArena',
  ajax: 'Amsterdam · Johan Cruijff Arena',
  monaco: 'Principality · Stade Louis II',
  atalanta: 'Bergamo · Gewiss Stadium',
  lille: 'Northern France · Decathlon Arena',
}

function ClubInStockRow({
  club,
  leagueId,
  place,
  nameColor,
  imageFallbackClass,
  reduce,
  delay,
  favorited,
  onShop,
}: {
  club: ClubInfo
  leagueId: string
  place: string
  nameColor: string
  imageFallbackClass: string
  reduce: boolean | null
  delay: number
  favorited: boolean
  onShop: () => void
}) {
  const kitSrc = clubHomeKitSrc(club.id)
  const catalogClub = getClubById(club.id)
  const leagueName = catalogClub?.leagueName || 'Club'
  const blurb = CLUB_STOCK_BLURB[club.id] || `${leagueName} side`
  const kitsLabel = `${club.count} kit${club.count === 1 ? '' : 's'} in stock`

  return (
    <motion.li {...fadeUp(reduce, delay)} className="relative">
      <article
        className="flex w-full overflow-hidden bg-white text-left"
      >
        <button
          type="button"
          onClick={onShop}
          className={`relative w-[40%] shrink-0 overflow-hidden sm:w-48 md:w-56 ${imageFallbackClass} outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson`}
          aria-label={`Shop ${club.name}`}
        >
          <div className="aspect-[4/5] w-full sm:aspect-square">
            {kitSrc ? (
              <img
                src={kitSrc}
                alt=""
                className="h-full w-full object-cover object-center transition duration-500 hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {catalogClub ? (
                  <ClubLogoMark club={catalogClub} size="lg" className="!h-16 !w-16" />
                ) : (
                  <span className="font-display text-2xl font-bold uppercase text-white/80">
                    {club.name.slice(0, 3)}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 bg-cream px-4 py-4 sm:px-5 sm:py-5">
          <div className="pr-10">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              {leagueName}
              {leagueId === 'champions-league' && catalogClub?.leagueId !== 'champions-league'
                ? ' · Champions League'
                : ''}
            </p>
            <h3
              className="mt-1 font-display text-xl font-bold uppercase leading-tight tracking-wide sm:text-2xl"
              style={{ color: nameColor }}
            >
              {club.name}
            </h3>
            <p className="mt-2 font-brand text-sm leading-relaxed text-navy/75">{blurb}</p>
            <p className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
              {kitsLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onShop}
              className="inline-flex bg-navy px-4 py-2.5 font-brand text-xs font-bold uppercase tracking-[0.14em] text-cream transition hover:bg-navy-deep"
            >
              Shop {club.name}
            </button>
          </div>
        </div>
      </article>
      <ClubFavoriteButton
        clubId={club.id}
        clubName={club.name}
        favorited={favorited}
        place={place}
        className={`absolute right-3 top-3 z-10 h-9 w-9 border border-crimson/30 sm:right-4 sm:top-4 ${
          favorited
            ? 'bg-crimson text-cream'
            : 'bg-white text-crimson hover:bg-crimson hover:text-cream'
        }`}
      />
    </motion.li>
  )
}

/** Company logos used in Shop by company (reuse collection art). */
const COMPANY_LOGO: Record<string, string> = {
  nike: 'collections/nike.jpg',
  adidas: 'collections/adidas.jpg',
  puma: 'collections/puma.jpg',
  'under armour': 'collections/under-armour.jpg?v=brand1',
  columbia: 'collections/columbia.jpg?v=brand1',
}

function fadeUp(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay: reduce ? 0 : delay, ease },
  }
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-2.5 py-1 font-brand text-[0.65rem] font-bold uppercase tracking-[0.12em] transition ${
        active
          ? 'border-navy bg-navy text-cream'
          : 'border-navy/15 text-navy/70 hover:border-navy/40 hover:text-navy'
      }`}
    >
      {label}
    </button>
  )
}

/** Accordion section for the inventory Shop & Filter drawer. */
function FilterAccordion({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: string
  label: string
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
}) {
  return (
    <div className="border-b border-navy/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="font-brand text-xs font-bold uppercase tracking-[0.16em] text-navy">
          {label}
        </span>
        <span
          aria-hidden
          className={`text-muted transition ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      {open ? <div className="flex flex-wrap gap-1.5 pb-4">{children}</div> : null}
    </div>
  )
}

const FAQ = [
  {
    q: 'How does sizing work?',
    a: 'Every listing shows adult or youth size in the title and details. If you are between sizes, size up for training tops and pre-match jerseys.',
  },
  {
    q: 'Are these authentic kits?',
    a: 'We sell branded club and national kits from our inventory with clear photos. Condition is listed on each item — new or pre-owned when noted.',
  },
  {
    q: 'How do I pay?',
    a: SQUARE_STORE_URL
      ? 'Add kits to your cart here, then checkout on Square’s secure Payment Links with card. Select stock is also on eBay with buyer protection.'
      : 'Checkout on eBay with card, PayPal, or other eBay payment options — buyer protection included. A Square direct storefront is coming next.',
  },
  {
    q: 'Where do you ship from?',
    a: 'Orders ship from our US inventory. Shipping is 10% of your item total under $100 — orders $100+ get free shipping. Shipping is calculated in your bag and confirmed at Square checkout.',
  },
  {
    q: 'What is your return policy?',
    a: `Returns follow the policy on the listing checkout (Square or eBay). Email ${CONTACT_EMAIL} before opening a case if something arrives not as described.`,
  },
  {
    q: 'How do I contact Jersey Deals?',
    a: `Email us at ${CONTACT_EMAIL} — sizing questions, order help, or stock requests. We reply from the shop inbox.`,
  },
]

/** eBay photo strip: every image side-by-side, flush, no crop/zoom. */
function ProductGallery({
  item,
  tone = 'light',
  eager = false,
  controls = true,
}: {
  item: Listing
  tone?: 'dark' | 'light'
  eager?: boolean
  /** Arrows / dots for quick view; browse cards stay a plain swipe strip. */
  controls?: boolean
}) {
  const photos = listingImages(item)
  const [active, setActive] = useState(0)
  /** Only mount nearby slides so quick-view does not request every photo up front. */
  const [mountedThrough, setMountedThrough] = useState(1)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const bg = tone === 'dark' ? 'bg-navy-deep' : 'bg-mist'

  useEffect(() => {
    setActive(0)
    activeRef.current = 0
    setMountedThrough(1)
    trackRef.current?.scrollTo({ left: 0 })
  }, [item.id])

  useEffect(() => {
    activeRef.current = active
    setMountedThrough((prev) => Math.max(prev, Math.min(photos.length - 1, active + 1)))
  }, [active, photos.length])

  const go = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el || photos.length <= 1) return
    const next = Math.min(photos.length - 1, Math.max(0, activeRef.current + dir))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setActive(next)
    activeRef.current = next
  }

  useEffect(() => {
    if (!controls || photos.length <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const el = trackRef.current
      if (!el) return
      const dir = e.key === 'ArrowLeft' ? -1 : 1
      const next = Math.min(photos.length - 1, Math.max(0, activeRef.current + dir))
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
      setActive(next)
      activeRef.current = next
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [photos.length, item.id, controls])

  if (photos.length === 0) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${bg}`}>
        <SafeImage
          src={FALLBACK_IMAGE}
          alt={shortTitle(item.title)}
          className="h-full w-full object-contain object-center select-none"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div className={`absolute inset-0 ${bg}`}>
      <div
        ref={trackRef}
        className="jd-photo-carousel flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={(event) => {
          const el = event.currentTarget
          const index = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
          const next = Math.min(Math.max(index, 0), photos.length - 1)
          if (next === activeRef.current) return
          activeRef.current = next
          setActive(next)
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${shortTitle(item.title)} photos`}
      >
        {photos.map((src, index) => (
          <div
            key={`${item.id}-${index}-${src}`}
            className="relative h-full w-full min-w-full shrink-0 grow-0 basis-full snap-start snap-always"
          >
            {index <= mountedThrough ? (
              <SafeImage
                src={src}
                alt={
                  index === 0 ? shortTitle(item.title) : `${shortTitle(item.title)} photo ${index + 1}`
                }
                className="h-full w-full object-contain object-center select-none"
                loading={index === 0 && eager ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index === 0 && eager ? 'high' : 'low'}
                draggable={false}
              />
            ) : null}
          </div>
        ))}
      </div>
      {controls && photos.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            disabled={active === 0}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(-1)
            }}
            className="absolute left-2 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-lg leading-none text-navy shadow disabled:opacity-35"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            disabled={active === photos.length - 1}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(1)
            }}
            className="absolute right-2 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-lg leading-none text-navy shadow disabled:opacity-35"
          >
            ›
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
            {photos.map((_, index) => (
              <span
                key={`dot-${index}`}
                className={`h-1.5 w-1.5 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.25)] transition ${
                  index === active ? 'bg-white' : 'bg-white/45'
                }`}
                aria-hidden
              />
            ))}
          </div>
          <p className="pointer-events-none absolute bottom-3 right-3 z-20 bg-navy-deep/75 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
            {active + 1}/{photos.length}
          </p>
        </>
      ) : null}
    </div>
  )
}

function ProductLink({
  item,
  tone = 'light',
  onAddToCart,
  onQuickView,
  onBuyNow,
}: {
  item: Listing
  /** Kept for call-site compatibility; cards skip per-item motion for faster paint. */
  reduce?: boolean | null
  delay?: number
  tone?: 'dark' | 'light'
  /** Kept for call-site compatibility — all listing tiles match inventory. */
  size?: 'default' | 'compact' | 'catalog'
  favoriteSet?: Set<string>
  onAddToCart: (item: Listing) => void
  onQuickView: (item: Listing) => void
  onBuyNow: (item: Listing) => void
}) {
  const condition = conditionLabel(item)
  const buyUrl = listingBuyUrl(item)
  const kit = kitType(item)
  const onSale = isSaleListing(item)
  const size = listingSize(item)
  const muted = tone === 'dark' ? 'text-white/75' : 'text-muted'
  const titleTone = tone === 'dark' ? 'text-white/95' : 'text-navy'
  const accent = tone === 'dark' ? 'text-crimson-hot' : 'text-crimson'
  const used = /used|pre-?owned|worn/i.test(condition)
  const infoBits = [
    kit !== 'Other' ? kit : null,
    size && size !== 'Other' ? size : null,
    item.brand || null,
    used ? condition : null,
  ].filter(Boolean) as string[]
  const infoLine = infoBits.slice(0, 2).join(' · ') || item.tag
  const compareAt = saleCompareAtPrice(item)

  return (
    <li className="min-w-0">
      <div className="group outline-none">
        <button
          type="button"
          onClick={() => onQuickView(item)}
          className="relative aspect-[4/5] w-full overflow-hidden bg-white outline-none focus-visible:ring-2 focus-visible:ring-crimson"
          aria-label={`Quick view ${shortTitle(item.title)}`}
        >
          <ProductCardCover item={item} tone={tone} fit="contain" />
          {onSale ? (
            <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 bg-crimson px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-white">
              Sale
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onQuickView(item)}
          className={`mt-2.5 block w-full text-left font-brand text-[0.7rem] font-bold uppercase leading-snug tracking-[0.04em] outline-none focus-visible:ring-2 focus-visible:ring-crimson sm:text-[0.78rem] ${titleTone} line-clamp-2`}
        >
          {shortTitle(item.title)}
        </button>
        <p
          className={`mt-1 truncate text-[0.62rem] uppercase leading-snug tracking-[0.06em] sm:text-[0.68rem] ${muted}`}
        >
          {infoLine}
        </p>
        <div className="mt-1 flex items-end justify-between gap-1.5">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className={`text-[0.6rem] font-bold uppercase tracking-[0.08em] ${accent} sm:text-[0.65rem]`}
            >
              Add to cart
            </button>
            {buyUrl ? (
              <button
                type="button"
                onClick={() => {
                  track('product_click', { id: item.id, tag: item.tag, place: 'buy_now' })
                  onBuyNow(item)
                }}
                className={`text-[0.6rem] font-semibold uppercase tracking-[0.08em] underline-offset-2 hover:underline ${muted} sm:text-[0.65rem]`}
              >
                Buy now
              </button>
            ) : null}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5 leading-none">
            {compareAt != null ? (
              <span className="font-brand text-[0.58rem] font-semibold tracking-wide text-[#e85d04] line-through sm:text-[0.65rem]">
                {formatPrice(compareAt, item.currency)}
              </span>
            ) : null}
            <span
              className={`font-brand text-[0.78rem] font-bold tracking-wide sm:text-sm ${
                tone === 'dark'
                  ? compareAt != null
                    ? 'text-white'
                    : 'text-[#e85d04]'
                  : compareAt != null
                    ? 'text-navy'
                    : 'text-[#e85d04]'
              }`}
            >
              {formatPrice(item.price, item.currency)}
            </span>
          </span>
        </div>
      </div>
    </li>
  )
}

function QuickViewModal({
  item,
  onClose,
  onAddToCart,
  onBuyNow,
}: {
  item: Listing
  onClose: () => void
  onAddToCart: (item: Listing) => void
  onBuyNow: (item: Listing) => void
}) {
  const buyUrl = listingBuyUrl(item)
  const condition = conditionLabel(item)
  const kit = kitType(item)
  const size = listingSize(item)
  const club = inferClub(item.title)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function shareListing() {
    const url = buyUrl || window.location.href
    const title = shortTitle(item.title)
    try {
      if (navigator.share) {
        await navigator.share({ title, url, text: `${title} — Jersey Deals` })
        track('share_listing', { id: item.id, mode: 'native' })
        return
      }
    } catch {
      /* user cancelled */
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareStatus('copied')
      track('share_listing', { id: item.id, mode: 'clipboard' })
      window.setTimeout(() => setShareStatus('idle'), 1800)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="fixed inset-x-0 z-[95] flex items-end justify-center sm:items-center sm:p-6"
      style={{ top: 'var(--jd-top-chrome)', bottom: 'var(--jd-bottom-dock)' }}
      role="dialog"
      aria-modal
      aria-label="Product quick view"
    >
      <button type="button" className="absolute inset-0 bg-navy-deep/60" aria-label="Close quick view" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden bg-cream shadow-2xl sm:max-h-[88dvh] sm:flex-row">
        <div className="relative aspect-square w-full shrink-0 bg-mist sm:aspect-auto sm:h-auto sm:w-[48%]">
          <ProductGallery item={item} tone="light" eager controls />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-crimson">
                {kit !== 'Other' ? kit : item.tag}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-navy">
                {shortTitle(item.title)}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center text-navy transition hover:text-crimson"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-display text-3xl font-bold text-navy">
            {saleCompareAtPrice(item) != null ? (
              <span className="text-xl font-semibold text-[#e85d04] line-through">
                {formatPrice(saleCompareAtPrice(item), item.currency)}
              </span>
            ) : null}
            <span>{formatPrice(item.price, item.currency)}</span>
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {size && size !== 'Other' ? (
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Size</dt>
                <dd className="mt-0.5 font-semibold text-navy">{size}</dd>
              </div>
            ) : null}
            {item.brand ? (
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Brand</dt>
                <dd className="mt-0.5 font-semibold text-navy">{item.brand}</dd>
              </div>
            ) : null}
            {club ? (
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Club</dt>
                <dd className="mt-0.5 font-semibold text-navy">{club.name}</dd>
              </div>
            ) : null}
            {kit !== 'Other' ? (
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Kit</dt>
                <dd className="mt-0.5 font-semibold text-navy">{kit}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Condition</dt>
              <dd className="mt-0.5 font-semibold text-navy">{condition}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Stock</dt>
              <dd className="mt-0.5 font-semibold text-navy">
                {item.quantity <= 1 ? 'Only 1 left' : `${item.quantity} available`}
              </dd>
            </div>
          </dl>
          {item.description ? (
            <div className="mt-5">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Description</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-navy/90">
                {item.description}
              </p>
            </div>
          ) : null}
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <button
              type="button"
              onClick={() => {
                onAddToCart(item)
                onClose()
              }}
              className="w-full bg-crimson px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream transition hover:bg-crimson-hot"
            >
              Add to cart
            </button>
            {buyUrl ? (
              <button
                type="button"
                onClick={() => {
                  track('product_click', { id: item.id, tag: item.tag, place: 'quick_view_buy' })
                  onBuyNow(item)
                }}
                className="flex w-full items-center justify-center border border-navy/20 px-4 py-3 font-brand text-xs font-bold uppercase tracking-[0.16em] text-navy transition hover:border-navy"
              >
                Buy now{item.source === 'ebay' ? ' on eBay' : ' on Square'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void shareListing()}
              className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted hover:text-crimson"
            >
              {shareStatus === 'copied' ? 'Link copied' : 'Share listing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const [catalog, setCatalog] = useState<ListingsPayload | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [tagFilter, setTagFilter] = useState<TypeFilterId | string>('All')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All')
  const [sizeFilter, setSizeFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>('All')
  /** Curated sale rack (hand-picked titles), independent of price bands. */
  const [saleOnly, setSaleOnly] = useState(false)
  /** How many clubs to show in Shop by club (grows via Show more). */
  const [clubsShown, setClubsShown] = useState(8)
  /** How many sale picks to show (grows via Show more). */
  const [salePicksShown, setSalePicksShown] = useState(4)
  /** Text currently typed in the sticky search bar (filters live as you type). */
  const [query, setQuery] = useState('')
  /** Query applied to inventory — kept in sync while typing; Enter still scrolls to results. */
  const [appliedQuery, setAppliedQuery] = useState('')
  const deferredQuery = useDeferredValue(appliedQuery)

  useEffect(() => {
    setAppliedQuery(query)
  }, [query])
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false)
  const [cart, setCart] = useState<CartState>(() => readCart())
  const [cartOpen, setCartOpen] = useState(false)
  const [cartToast, setCartToast] = useState<string | null>(null)
  const [viewCounts, setViewCounts] = useState<Record<string, number>>(() =>
    typeof window === 'undefined' ? {} : listingViewCountsLastWeek(),
  )
  const [clubFilter, setClubFilter] = useState<string>('All')
  const [leagueFilter, setLeagueFilter] = useState<string>('All')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortId>('featured')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterSection, setFilterSection] = useState<string | null>(null)
  const [quickView, setQuickView] = useState<Listing | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecentlyViewed())
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerMode, setOfferMode] = useState<'offer' | 'email-gate'>('offer')
  const offersOpen = useRewardsOffersOpen()
  const favoritesOpen = useFavoritesScreenOpen()
  const profileOpen = useProfileScreenOpen()
  const inventoryOpen = useInventoryPageOpen()
  const itemPageId = useItemPageId()
  const [pendingBuy, setPendingBuy] = useState<Listing | null>(null)
  const [soldIds, setSoldIds] = useState<Set<string>>(() => new Set(readLocalSoldOutIds()))
  const [inventoryPage, setInventoryPage] = useState(1)
  const urlHydrated = useRef(false)
  const topChromeRef = useRef<HTMLDivElement>(null)
  const bottomDockRef = useRef<HTMLDivElement>(null)
  const favoriteClubIds = useFavoriteClubIds()
  const favoriteSet = useMemo(() => favoriteClubIdSet(favoriteClubIds), [favoriteClubIds])
  const favoriteCount = favoriteClubIds.length

  useEffect(() => {
    initAnalytics()
    track('page_view', { page: 'landing' })
    ensureRewardsOffers()
    capturePurchaseReturnFromUrl()
    const fromReturn = captureSoldReturnFromUrl()
    if (fromReturn.length) {
      rememberSoldOutIds(fromReturn)
      setSoldIds(new Set(readLocalSoldOutIds()))
      // Only remove bag lines after a confirmed purchase return — never when checkout opens.
      for (const id of fromReturn) setCart(removeCartLine(id))
    }
    void fetchSoldOutIds(asset('')).then((ids) => {
      setSoldIds(new Set(ids))
    })
    const syncOffer = () => {
      ensureRewardsOffers()
    }
    window.addEventListener('jerseydeals:offer', syncOffer)
    window.addEventListener('jerseydeals:offers', syncOffer)
    window.addEventListener('jerseydeals:purchased', syncOffer)
    return () => {
      window.removeEventListener('jerseydeals:offer', syncOffer)
      window.removeEventListener('jerseydeals:offers', syncOffer)
      window.removeEventListener('jerseydeals:purchased', syncOffer)
    }
  }, [])

  useEffect(() => {
    track('page_view', { page: inventoryOpen ? 'inventory' : 'landing' })
  }, [inventoryOpen])

  useEffect(() => {
    if (!inventoryOpen) setFiltersOpen(false)
    else setHeaderSearchOpen(true)
  }, [inventoryOpen])

  useEffect(() => {
    const topEl = topChromeRef.current
    const bottomEl = bottomDockRef.current
    if (!topEl || !bottomEl) return
    const apply = () => {
      document.documentElement.style.setProperty('--jd-top-chrome', `${topEl.offsetHeight}px`)
      document.documentElement.style.setProperty('--jd-bottom-dock', `${bottomEl.offsetHeight}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(topEl)
    ro.observe(bottomEl)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [headerSearchOpen, menuOpen, inventoryOpen, itemPageId])

  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  useEffect(() => {
    if (loadState !== 'ready') return
    // Repair false “purchased” marks from failed/OPEN checkouts vs completed buyers list.
    void syncPurchasedFromKnownEmail()
  }, [loadState])

  useEffect(() => {
    if (loadState !== 'ready') return
    let cancelled = false
    // Wait until inventory is painted so the modal + body lock don't fight first paint on iOS.
    const timer = window.setTimeout(() => {
      void (async () => {
        await syncPurchasedFromKnownEmail()
        if (cancelled) return
        // Claimed welcome offer → already in My offers; never show the popup again.
        if (hasClaimedFirstBuyerOffer()) return
        if (hasPurchased()) return
        setOfferMode('offer')
        setOfferOpen(true)
        track('offer_popup_shown', {})
      })()
    }, 1200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [loadState])

  function hasCheckoutEmail() {
    return Boolean(readBuyerEmail() || readOffer().email)
  }

  /** Skip email gate when already a Rewards member or they claimed the 10% popup. */
  function needsCheckoutEmail() {
    return !isRewardsMember() && !hasClaimedFirstBuyerOffer()
  }

  function requestCheckoutAccess() {
    if (!needsCheckoutEmail() || hasCheckoutEmail()) return true
    setPendingBuy(null)
    setOfferMode('email-gate')
    setOfferOpen(true)
    return false
  }

  function handleBuyNow(item: Listing) {
    if (needsCheckoutEmail() && !hasCheckoutEmail()) {
      setPendingBuy(item)
      setOfferMode('email-gate')
      setOfferOpen(true)
      return
    }
    const active = getActiveCheckoutOffer()
    const discounted = checkoutUsesSquareDiscountLink(active?.id ?? null)
    const url = listingBuyUrl(item, { discounted })
    if (!url) return
    recordListingView(item)
    setViewCounts(listingViewCountsLastWeek())
    track('buy_now', { id: item.id, discounted, offer: active?.id || '' })
    // Keep bag lines until Square return (?purchase= / ?sold=) confirms the sale.
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function dismissOfferModal() {
    setPendingBuy(null)
    setOfferOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Lock document scroll while a subpage overlay owns the middle viewport.
  useEffect(() => {
    const overlayOpen =
      inventoryOpen || favoritesOpen || profileOpen || offersOpen || Boolean(itemPageId)
    if (!overlayOpen) return
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.documentElement.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overscrollBehavior = previousOverscroll
    }
  }, [inventoryOpen, favoritesOpen, profileOpen, offersOpen, itemPageId])

  useEffect(() => {
    const sync = () => setCart(readCart())
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'jerseydeals.cart.v1') sync()
    }
    window.addEventListener('jerseydeals:cart', sync as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('jerseydeals:cart', sync as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(asset('listings.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`listings ${res.status}`)
        return res.json() as Promise<ListingsPayload>
      })
      .then((data) => {
        if (cancelled) return
        setCatalog(data)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const itemCount = cartCount(cart)
  const bagSubtotal = cartSubtotal(cart)

  function handleAddToCart(item: Listing) {
    const productUrl = listingProductPageUrl(item, SQUARE_STORE_URL)
    const next = addListingToCart(item, productUrl || undefined)
    setCart(next)
    setCartOpen(true)
    setCartToast(`Added · ${shortTitle(item.title)}`)
    setRecentIds(pushRecentlyViewed(item.id))
    recordListingView(item)
    setViewCounts(listingViewCountsLastWeek())
    track('add_to_cart', { id: item.id, tag: item.tag })
    window.setTimeout(() => setCartToast(null), 2200)
  }

  function handleQuickView(item: Listing) {
    setRecentIds(pushRecentlyViewed(item.id))
    recordListingView(item)
    setViewCounts(listingViewCountsLastWeek())
    track('item_profile_open', { id: item.id, tag: item.tag })
    goToItemPage(item.id)
  }

  const onSquare = Boolean(SQUARE_STORE_URL || isSquareCatalog(catalog))
  const ebayShop = catalog?.source === 'square' ? EBAY_SHOP_URL : catalog?.shopUrl ?? EBAY_SHOP_URL
  const ebaySeller = catalog?.source === 'square' ? EBAY_SELLER_URL : catalog?.sellerUrl ?? EBAY_SELLER_URL
  const listings = useMemo(() => {
    const rows = (catalog?.listings ?? []).filter((item) => !isListingSoldOut(item, soldIds))
    return dedupeListingsByTitle(rows)
  }, [catalog, soldIds])
  const itemProfile = useMemo(() => {
    if (!itemPageId) return null
    return (
      listings.find((row) => row.id === itemPageId) ||
      (catalog?.listings ?? []).find((row) => row.id === itemPageId) ||
      null
    )
  }, [itemPageId, listings, catalog])

  useEffect(() => {
    if (!itemPageId || !catalog) return
    if (itemProfile) return
    leaveItemPage()
  }, [itemPageId, itemProfile, catalog])
  const featured = useMemo(() => pickFeatured(listings, 6), [listings])
  const newDrops = useMemo(() => pickNewDrops(listings, 6), [listings])
  const salePicks = useMemo(() => pickSaleItems(listings), [listings])
  const visibleSalePicks = useMemo(
    () => salePicks.slice(0, salePicksShown),
    [salePicks, salePicksShown],
  )
  const trainingPicks = useMemo(
    () => listings.filter((item) => item.tag === 'Training').slice(0, 2),
    [listings],
  )
  // Stable order — do not re-sort on favorite toggle (avoids the grid jumping).
  const clubsData = useMemo<ClubInfo[]>(() => clubsInStock(listings), [listings])
  const leaguesData = useMemo<LeagueInfo[]>(() => leaguesInStock(listings), [listings])
  const eplClubs = useMemo<ClubInfo[]>(() => premierLeagueClubsInStock(listings), [listings])
  const uclClubs = useMemo<ClubInfo[]>(() => championsLeagueClubsInStock(listings), [listings])
  const trendingPicks = useMemo(() => pickTrending(listings, 4, viewCounts), [listings, viewCounts])
  const favoriteClubs = useMemo(
    () => clubsData.filter((club) => favoriteSet.has(club.id)),
    [clubsData, favoriteSet],
  )
  const recentlyViewed = useMemo(() => {
    const map = new Map(listings.map((item) => [item.id, item]))
    return recentIds.map((id) => map.get(id)).filter((item): item is Listing => Boolean(item)).slice(0, 4)
  }, [listings, recentIds])

  const availableSizes = useMemo(() => {
    const present = new Set(listings.map(listingSize).filter((size) => size && size !== 'Other'))
    return sortSizes([...present])
  }, [listings])

  const availableBrands = useMemo(() => {
    return [
      ...new Set(listings.map((item) => item.brand).filter((brand): brand is string => Boolean(brand))),
    ].sort((a, b) => a.localeCompare(b))
  }, [listings])

  const filtered = useMemo(() => {
    const rows = listings.filter((item) => {
      if (!matchesTypeFilter(item, tagFilter)) return false
      if (genderFilter === 'Men' && !isAdultListing(item)) return false
      if (genderFilter === 'Women' && !isWomenListing(item)) return false
      if (genderFilter === 'Youth' && !isYouthListing(item)) return false
      if (sizeFilter !== 'All' && listingSize(item) !== sizeFilter) return false
      if (brandFilter !== 'All' && item.brand !== brandFilter) return false
      if (clubFilter !== 'All' && inferClub(item.title)?.id !== clubFilter) return false
      if (favoritesOnly) {
        const club = inferClub(item.title)
        if (!club || !favoriteSet.has(club.id)) return false
      }
      if (saleOnly && !isSaleListing(item)) return false
      if (!matchesLeagueFilter(item, leagueFilter)) return false
      if (!matchesPriceFilter(item, priceFilter)) return false
      return matchesListingQuery(item, deferredQuery)
    })
    const sorted = sortListings(rows, sortBy)
    // In search results, kits from favorited clubs always float to the top.
    if (!deferredQuery.trim() || !favoriteSet.size) return sorted
    return [...sorted].sort((a, b) => {
      const aFav = favoriteSet.has(inferClub(a.title)?.id ?? '') ? 0 : 1
      const bFav = favoriteSet.has(inferClub(b.title)?.id ?? '') ? 0 : 1
      return aFav - bFav
    })
  }, [
    listings,
    tagFilter,
    genderFilter,
    sizeFilter,
    brandFilter,
    clubFilter,
    favoritesOnly,
    favoriteSet,
    saleOnly,
    leagueFilter,
    priceFilter,
    deferredQuery,
    sortBy,
  ])

  useEffect(() => {
    setInventoryPage(1)
  }, [
    tagFilter,
    genderFilter,
    sizeFilter,
    brandFilter,
    clubFilter,
    favoritesOnly,
    saleOnly,
    leagueFilter,
    priceFilter,
    deferredQuery,
    sortBy,
  ])

  const INVENTORY_PAGE_SIZE = 12
  const inventoryPageCount = Math.max(1, Math.ceil(filtered.length / INVENTORY_PAGE_SIZE))
  const safeInventoryPage = Math.min(inventoryPage, inventoryPageCount)

  const visibleInventory = useMemo(() => {
    const start = (safeInventoryPage - 1) * INVENTORY_PAGE_SIZE
    return filtered.slice(start, start + INVENTORY_PAGE_SIZE)
  }, [filtered, safeInventoryPage])

  useEffect(() => {
    if (inventoryPage !== safeInventoryPage) setInventoryPage(safeInventoryPage)
  }, [inventoryPage, safeInventoryPage])

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []
    if (genderFilter !== 'All') {
      chips.push({
        key: 'gender',
        label:
          genderFilter === 'Men' ? "Men's" : genderFilter === 'Women' ? "Women's" : 'Youth',
        clear: () => setGenderFilter('All'),
      })
    }
    if (tagFilter !== 'All') chips.push({ key: 'tag', label: tagFilter, clear: () => setTagFilter('All') })
    if (saleOnly) {
      chips.push({
        key: 'sale',
        label: 'Sale rack',
        clear: () => setSaleOnly(false),
      })
    }
    if (priceFilter !== 'All') {
      chips.push({
        key: 'price',
        label: PRICE_FILTERS.find((row) => row.id === priceFilter)?.label ?? priceFilter,
        clear: () => setPriceFilter('All'),
      })
    }
    if (sizeFilter !== 'All') chips.push({ key: 'size', label: sizeFilter, clear: () => setSizeFilter('All') })
    if (brandFilter !== 'All') chips.push({ key: 'brand', label: brandFilter, clear: () => setBrandFilter('All') })
    if (leagueFilter !== 'All') {
      chips.push({
        key: 'league',
        label:
          leagueFilter === 'champions-league'
            ? 'Champions League'
            : leaguesData.find((l) => l.id === leagueFilter)?.name ?? leagueFilter,
        clear: () => setLeagueFilter('All'),
      })
    }
    if (clubFilter !== 'All') {
      chips.push({
        key: 'club',
        label: clubsData.find((c) => c.id === clubFilter)?.name ?? clubFilter,
        clear: () => setClubFilter('All'),
      })
    }
    if (favoritesOnly) {
      chips.push({
        key: 'favorites',
        label: 'My favorites',
        clear: () => setFavoritesOnly(false),
      })
    }
    // Search chip is rendered separately under all filter rows.
    return chips
  }, [
    genderFilter,
    tagFilter,
    priceFilter,
    saleOnly,
    sizeFilter,
    brandFilter,
    clubFilter,
    favoritesOnly,
    leagueFilter,
    leaguesData,
    clubsData,
  ])

  const searchFilterChip = useMemo(() => {
    const q = deferredQuery.trim()
    if (!q) return null
    return {
      key: 'q',
      label: `“${q}”`,
      clear: () => {
        setQuery('')
        setAppliedQuery('')
      },
    }
  }, [deferredQuery])

  const filterChipCount = activeFilterChips.length + (searchFilterChip ? 1 : 0)

  function clearAllFilters() {
    setTagFilter('All')
    setSizeFilter('All')
    setBrandFilter('All')
    setPriceFilter('All')
    setSaleOnly(false)
    setGenderFilter('All')
    setClubFilter('All')
    setLeagueFilter('All')
    setFavoritesOnly(false)
    setQuery('')
    setAppliedQuery('')
    setSortBy('featured')
  }

  function scrollToInventoryBrowse(opts?: { focusSearch?: boolean }) {
    goToInventoryPage()
    const run = () => {
      const target =
        document.getElementById('inventory-results') || document.getElementById('inventory-browse')
      if (!target) {
        if (opts?.focusSearch) document.getElementById('sticky-search')?.focus({ preventScroll: true })
        return
      }
      const header = document.querySelector('header')
      const headerH = header instanceof HTMLElement ? header.getBoundingClientRect().height : 120
      const top = window.scrollY + target.getBoundingClientRect().top - headerH - 8
      const preferSmooth =
        typeof window !== 'undefined' &&
        !/iP(hone|ad|od)|Macintosh.*Mobile/.test(navigator.userAgent)
      window.scrollTo({ top: Math.max(0, top), behavior: preferSmooth ? 'smooth' : 'auto' })
      if (opts?.focusSearch) document.getElementById('sticky-search')?.focus({ preventScroll: true })
    }
    requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(run, 80)))
  }

  /** Apply sticky search + open the inventory page results. */
  function activateSearch(opts?: { focusSearch?: boolean }) {
    setAppliedQuery(query.trim())
    scrollToInventoryBrowse({ focusSearch: opts?.focusSearch })
  }

  function goInventory(next?: {
    tag?: string
    brand?: string
    price?: PriceFilterId
    saleOnly?: boolean
    query?: string
    audience?: GenderFilter | 'Adult'
    gender?: GenderFilter
    clubId?: string
    leagueId?: string
    favoritesOnly?: boolean
    reset?: boolean
    focusSearch?: boolean
  }) {
    if (next?.reset) {
      setSizeFilter('All')
      setBrandFilter('All')
      setPriceFilter('All')
      setSaleOnly(false)
      setQuery('')
      setAppliedQuery('')
      setTagFilter('All')
      setGenderFilter('All')
      setClubFilter('All')
      setLeagueFilter('All')
      setFavoritesOnly(false)
      setSortBy('featured')
    }
    if (next?.tag !== undefined) setTagFilter(next.tag)
    if (next?.brand !== undefined) setBrandFilter(next.brand)
    if (next?.price !== undefined) setPriceFilter(next.price)
    if (next?.saleOnly !== undefined) setSaleOnly(next.saleOnly)
    if (next?.query !== undefined) {
      setQuery(next.query)
      setAppliedQuery(next.query.trim())
    }
    const genderNext = next?.gender ?? next?.audience
    if (genderNext !== undefined) {
      setGenderFilter(genderNext === 'Adult' ? 'Men' : genderNext)
    }
    if (next?.clubId !== undefined) setClubFilter(next.clubId)
    if (next?.leagueId !== undefined) setLeagueFilter(next.leagueId)
    if (next?.favoritesOnly !== undefined) setFavoritesOnly(next.favoritesOnly)
    scrollToInventoryBrowse({ focusSearch: next?.focusSearch })
  }

  useEffect(() => {
    if (urlHydrated.current) return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const gender = params.get('gender') || params.get('audience')
    const tag = params.get('tag')
    const size = params.get('size')
    const brand = params.get('brand')
    const price = params.get('price')
    const club = params.get('club')
    const league = params.get('league')
    const sort = params.get('sort')
    if (q) {
      setQuery(q)
      setAppliedQuery(q)
    }
    if (gender === 'Men' || gender === 'Women' || gender === 'Youth' || gender === 'All')
      setGenderFilter(gender)
    else if (gender === 'Adult') setGenderFilter('Men')
    else if (gender === 'Womens' || gender === "Women's") setGenderFilter('Women')
    if (tag) setTagFilter(tag)
    if (size) setSizeFilter(size)
    if (brand) setBrandFilter(brand)
    if (price && PRICE_FILTERS.some((row) => row.id === price)) setPriceFilter(price as PriceFilterId)
    if (params.get('sale') === '1' || params.get('saleOnly') === '1') setSaleOnly(true)
    if (club) setClubFilter(club)
    if (league) setLeagueFilter(league)
    if (params.get('favorites') === '1' || params.get('fav') === '1') setFavoritesOnly(true)
    if (sort && SORT_OPTIONS.some((row) => row.id === sort)) setSortBy(sort as SortId)
    urlHydrated.current = true
  }, [])

  // Stable marketing deep-link: /jerseydeals/?buy=<variationId|itemId|sku|slug>
  // Always resolves to the current Square Payment Link so FB posts don't 404 after rebuilds.
  useEffect(() => {
    if (loadState !== 'ready' || !listings.length) return
    const params = new URLSearchParams(window.location.search)
    const buy = (params.get('buy') || params.get('checkout') || '').trim()
    if (!buy) return
    const needle = buy.toLowerCase()
    const ebayNeedle = needle.startsWith('ebay:') ? needle : `ebay:${needle}`
    const item =
      listings.find((row) => row.id.toLowerCase() === needle) ||
      listings.find((row) => (row.itemId || '').toLowerCase() === needle) ||
      listings.find((row) => (row.sku || '').toLowerCase() === needle || (row.sku || '').toLowerCase() === ebayNeedle) ||
      listings.find((row) => {
        const product = listingProductPageUrl(row, SQUARE_STORE_URL)
        return Boolean(product && product.toLowerCase().includes(`/${needle}`))
      }) ||
      listings.find((row) => shortTitle(row.title).toLowerCase() === needle)
    const url = item ? listingBuyUrl(item) : ''
    if (!url) return
    track('buy_deeplink', { id: item!.id, buy })
    window.location.replace(url)
  }, [loadState, listings])

  useEffect(() => {
    if (!urlHydrated.current) return
    // Don't clobber an in-flight buy deep-link while we resolve checkout.
    const current = new URLSearchParams(window.location.search)
    if (current.get('buy') || current.get('checkout')) return
    const params = new URLSearchParams()
    if (appliedQuery.trim()) params.set('q', appliedQuery.trim())
    if (genderFilter !== 'All') params.set('gender', genderFilter)
    if (tagFilter !== 'All') params.set('tag', tagFilter)
    if (sizeFilter !== 'All') params.set('size', sizeFilter)
    if (brandFilter !== 'All') params.set('brand', brandFilter)
    if (priceFilter !== 'All') params.set('price', priceFilter)
    if (saleOnly) params.set('sale', '1')
    if (clubFilter !== 'All') params.set('club', clubFilter)
    if (leagueFilter !== 'All') params.set('league', leagueFilter)
    if (favoritesOnly) params.set('favorites', '1')
    if (sortBy !== 'featured') params.set('sort', sortBy)
    const next = params.toString()
    const url = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    // Avoid replaceState spam — iOS Safari can choke on repeated history updates.
    if (url === currentUrl) return
    window.history.replaceState(null, '', url)
  }, [
    appliedQuery,
    genderFilter,
    tagFilter,
    sizeFilter,
    brandFilter,
    priceFilter,
    saleOnly,
    clubFilter,
    leagueFilter,
    favoritesOnly,
    sortBy,
  ])

  const heroImage = asset('hero-jersey.jpg')

  const navLinks = [
    { href: '#collections', label: 'Collections' },
    { href: '#favorites', label: 'Favorites' },
    { href: '#profile', label: 'Profile' },
    { href: '#epl', label: 'EPL' },
    { href: '#ucl', label: 'UCL' },
    { href: '#shop', label: 'Shop' },
    { href: inventoryHref(), label: 'Inventory', inventory: true as const },
    { href: '#rewards', label: 'Rewards' },
    { href: '#size-guide', label: 'Sizing' },
  ]

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      {offersOpen ? (
        <RewardsOffersScreen
          onGoToCart={() => {
            setCartOpen(true)
            track('cart_open', { place: 'my_offers' })
          }}
          onShopInventory={() => goInventory({ reset: true })}
          onShopYouth={() => goInventory({ audience: 'Youth', reset: true })}
        />
      ) : null}
      {favoritesOpen ? (
        <FavoritesScreen
          listings={listings}
          onShopClub={(clubId, clubName) => {
            goInventory({ reset: true, clubId, query: clubName })
          }}
          onQuickView={handleQuickView}
          onShopInventory={() => goInventory({ reset: true })}
          onShopYouth={() => goInventory({ audience: 'Youth', reset: true })}
        />
      ) : null}
      {profileOpen ? (
        <ProfileScreen
          cartCount={itemCount}
          onGoToCart={() => {
            setCartOpen(true)
            track('cart_open', { place: 'profile' })
          }}
          onShopInventory={() => goInventory({ reset: true })}
          onShopYouth={() => goInventory({ audience: 'Youth', reset: true })}
        />
      ) : null}
      {itemProfile ? (
        <ItemProfileScreen
          item={itemProfile}
          listings={listings}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onShopInventory={() => goInventory({ reset: true })}
          onShopYouth={() => goInventory({ audience: 'Youth', reset: true })}
        />
      ) : null}

      <div ref={topChromeRef} className="pointer-events-auto fixed inset-x-0 top-0 z-[100]">
      {/* Promo bar — Premier League shop CTA */}
      <button
        type="button"
        onClick={() => {
          track('promo_bar_click', { destination: 'epl_section' })
          const goEpl = () => {
            document.getElementById('epl')?.scrollIntoView({ behavior: 'smooth' })
          }
          if (inventoryOpen || favoritesOpen || profileOpen || offersOpen || itemPageId) {
            leaveToHome()
            window.setTimeout(goEpl, 40)
            return
          }
          goEpl()
        }}
        className="flex w-full min-h-10 items-center justify-center bg-gradient-to-r from-crimson via-[#c45a1a] to-[#8a3a12] px-3 py-2 text-center font-brand text-[0.62rem] font-bold uppercase leading-tight tracking-[0.1em] text-cream transition hover:brightness-110 sm:min-h-9 sm:px-4 sm:text-xs sm:tracking-[0.16em]"
      >
        <span className="line-clamp-2 sm:line-clamp-1">{PROMO_BAR}</span>
      </button>

      <a
        href={inventoryHref()}
        onClick={(e) => {
          e.preventDefault()
          goInventory({ reset: true })
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to inventory
      </a>

      <header className="border-b border-navy/10 bg-cream text-navy shadow-[0_1px_0_rgba(11,34,63,0.06)]">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3.5 sm:px-5 md:px-8">
          {/* Left: cart + favorites */}
          <div className="flex items-center justify-start gap-0.5">
            <button
              type="button"
              aria-label={`Open cart, ${itemCount} items`}
              onClick={() => {
                setCartOpen(true)
                track('cart_open', { place: 'header', items: itemCount })
              }}
              className="relative grid h-10 w-10 place-items-center text-navy transition hover:text-crimson"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0"
                aria-hidden
              >
                <path d="M6 6h15l-1.5 9h-12z" />
                <path d="M6 6 5 3H2" />
                <circle cx="9" cy="20" r="1.25" fill="currentColor" stroke="none" />
                <circle cx="18" cy="20" r="1.25" fill="currentColor" stroke="none" />
              </svg>
              <span className="sr-only">Cart</span>
              <span className="absolute right-0 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[0.65rem] font-bold text-cream">
                {itemCount}
              </span>
            </button>
            <button
              type="button"
              aria-label={
                favoriteCount > 0
                  ? `Open favorites, ${favoriteCount} teams`
                  : 'Open favorites'
              }
              onClick={() => {
                track('nav_favorites', { place: 'header', count: favoriteCount })
                goToFavoritesScreen()
              }}
              className="relative grid h-10 w-10 place-items-center text-navy transition hover:text-crimson"
            >
              <HeartIcon
                filled={favoriteCount > 0}
                className={`h-5 w-5 shrink-0 ${favoriteCount > 0 ? 'text-crimson' : ''}`}
              />
              <span className="sr-only">Favorites</span>
              {favoriteCount > 0 ? (
                <span className="absolute right-0 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[0.65rem] font-bold text-cream">
                  {favoriteCount}
                </span>
              ) : null}
            </button>
          </div>

          {/* Center: logo + stacked wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              if (!inventoryOpen && !favoritesOpen && !profileOpen && !offersOpen && !itemPageId) return
              e.preventDefault()
              leaveToHome()
            }}
            className="inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-crimson"
          >
            <BrandMark size="sm" withWordmark stackedWordmark wordmarkTone="navy" />
          </a>

          {/* Right: search + profile + menu (far right) */}
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              aria-label={headerSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={headerSearchOpen}
              onClick={() => {
                setHeaderSearchOpen((open) => {
                  const next = !open
                  if (next) {
                    window.setTimeout(() => {
                      document.getElementById('sticky-search')?.focus({ preventScroll: true })
                    }, 40)
                  }
                  return next
                })
                track('nav_search_toggle', { open: !headerSearchOpen })
              }}
              className="grid h-10 w-10 place-items-center text-navy transition hover:text-crimson"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16.5 16.5 4 4" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Open profile"
              onClick={() => {
                track('nav_profile', { place: 'header' })
                goToProfileScreen()
              }}
              className="grid h-10 w-10 place-items-center text-navy transition hover:text-crimson"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <circle cx="12" cy="8" r="3.25" />
                <path d="M5.5 19.5c1.4-3.2 3.7-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center text-navy transition hover:text-crimson"
            >
              <span className="flex flex-col gap-[5px]" aria-hidden>
                <span className="block h-0.5 w-5 bg-navy" />
                <span className="block h-0.5 w-5 bg-navy" />
                <span className="block h-0.5 w-5 bg-navy" />
              </span>
            </button>
          </div>
        </div>

        {/* eBay reviews strip */}
        <a
          href={ebaySeller}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('outbound_click', { place: 'header_reviews', channel: 'ebay' })}
          className="flex items-center justify-center gap-2 border-t border-navy/10 bg-cream px-3 py-2 text-crimson transition hover:bg-mist sm:gap-2.5"
          aria-label={`eBay rating ${EBAY_OVERALL_RATING} from ${EBAY_FEEDBACK_COUNT.toLocaleString()} reviews`}
        >
          <span className="font-display text-base font-bold tabular-nums leading-none">
            {EBAY_OVERALL_RATING.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((star) => {
              const fill = Math.min(1, Math.max(0, EBAY_OVERALL_RATING - (star - 1)))
              return (
                <span key={star} className="relative inline-block h-3.5 w-3.5">
                  <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-crimson/25" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 2.5 14.9 9l7.1.6-5.4 4.6 1.7 6.8L12 17.8 5.7 21l1.7-6.8L2 9.6 9.1 9 12 2.5Z"
                    />
                  </svg>
                  <span
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${fill * 100}%` }}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-crimson" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M12 2.5 14.9 9l7.1.6-5.4 4.6 1.7 6.8L12 17.8 5.7 21l1.7-6.8L2 9.6 9.1 9 12 2.5Z"
                      />
                    </svg>
                  </span>
                </span>
              )
            })}
          </span>
          <span className="font-brand text-[0.7rem] font-semibold tabular-nums tracking-wide">
            ({EBAY_FEEDBACK_COUNT.toLocaleString()} reviews)
          </span>
        </a>

        {headerSearchOpen ? (
          <div className="border-t border-navy/10 bg-cream">
            <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-5 md:gap-3 md:px-8">
              <form
                className="relative min-w-0 flex-1 md:max-w-xl lg:max-w-2xl"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!query.trim()) return
                  activateSearch()
                }}
              >
                <label className="block">
                  <span className="sr-only">Search kits</span>
                  <input
                    id="sticky-search"
                    name="q"
                    type="search"
                    value={query}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    onChange={(e) => {
                      setQuery(e.target.value)
                    }}
                    placeholder="Search club, player, league…"
                    enterKeyHint="search"
                    className="w-full border border-navy/15 bg-white py-2.5 pl-3 pr-[5.5rem] text-base text-navy outline-none placeholder:text-muted focus:ring-2 focus:ring-crimson/30 sm:pl-4"
                  />
                </label>
                <button
                  type="submit"
                  aria-label="Search"
                  title="Enter"
                  disabled={!query.trim()}
                  className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-[#2563eb] px-2.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#2563eb]/60 disabled:hover:bg-[#2563eb]/60 sm:px-3"
                >
                  Enter
                  <span aria-hidden className="text-sm font-semibold leading-none">
                    ↵
                  </span>
                </button>
              </form>
              {query || appliedQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setAppliedQuery('')
                  }}
                  className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-crimson"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                aria-label={
                  inventoryOpen || favoritesOpen || profileOpen || offersOpen || itemPageId
                    ? 'Back to home'
                    : 'Go to top of page'
                }
                onClick={() => {
                  track('nav_home', { place: 'sticky_search' })
                  if (inventoryOpen || favoritesOpen || profileOpen || offersOpen || itemPageId) {
                    leaveToHome()
                    return
                  }
                  const preferSmooth =
                    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
                    !/iP(hone|ad|od)|Macintosh.*Mobile/.test(navigator.userAgent)
                  window.scrollTo({ top: 0, behavior: preferSmooth ? 'smooth' : 'auto' })
                }}
                className="shrink-0 border border-navy/15 bg-navy px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-cream transition hover:bg-navy-deep"
              >
                Home
              </button>
            </div>
          </div>
        ) : null}
      </header>
      </div>

      <main
        id="top"
        className="pb-[calc(var(--jd-bottom-dock)+1rem)]"
        style={{ scrollPaddingTop: 'var(--jd-top-chrome)', scrollPaddingBottom: 'var(--jd-bottom-dock)' }}
      >
        {!inventoryOpen ? (
          <>
        {/* Hero — one screen between sticky top chrome and bottom dock */}
        <section
          className="relative overflow-hidden bg-[#8f1218] text-white"
          style={{
            height: 'calc(100svh - var(--jd-top-chrome) - var(--jd-bottom-dock))',
            maxHeight: 'calc(100svh - var(--jd-top-chrome) - var(--jd-bottom-dock))',
            marginTop: 'var(--jd-top-chrome)',
          }}
        >
          <div className="absolute inset-0" aria-hidden>
            <motion.img
              key={heroImage}
              src={heroImage}
              alt=""
              initial={reduce ? false : { scale: 1.06, opacity: 0.28 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: reduce ? 0 : 1.1, ease }}
              className="h-full w-full object-cover object-center opacity-40"
              decoding="async"
              fetchPriority="high"
              loading="eager"
            />
            <div
              className="absolute inset-0"
              style={{
                background: [
                  'radial-gradient(ellipse 90% 70% at 20% 30%, rgba(232,58,64,0.42), transparent 58%)',
                  'radial-gradient(ellipse 70% 60% at 85% 75%, rgba(110,12,18,0.5), transparent 55%)',
                  'linear-gradient(160deg, rgba(215,40,47,0.72) 0%, rgba(143,18,24,0.68) 45%, rgba(110,14,20,0.78) 100%)',
                ].join(', '),
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#6e0c12]/35 via-transparent to-[#d7282f]/16" />
          </div>

          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col px-5 py-5 md:px-8 md:py-10">
            <div className="flex min-h-0 flex-1 flex-col justify-start overflow-hidden pt-1 md:justify-center md:pt-0">
              <motion.div
                className="w-full max-w-2xl md:max-w-3xl"
                initial={reduce ? false : { opacity: 0.001, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease }}
              >
                <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <p className="inline-flex items-center gap-2.5 font-brand text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cream/90 sm:text-[0.7rem]">
                    <span className="h-px w-5 shrink-0 bg-[#f0d45a]" aria-hidden />
                    Premier League kicks off 8/21
                  </p>
                  <p className="inline-flex items-center gap-2.5 font-brand text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cream/90 sm:text-[0.7rem]">
                    <span className="h-px w-5 shrink-0 bg-[#f0d45a]" aria-hidden />
                    Shop our Premier League sale
                  </p>
                </div>
                <h1 className="max-w-xl font-brand text-5xl font-bold uppercase leading-[0.9] tracking-[0.08em] text-cream sm:text-6xl md:text-7xl">
                  Jersey Deals
                </h1>
                <p className="mt-3 max-w-md font-brand text-sm font-semibold leading-snug text-cream/90 sm:mt-4 sm:max-w-lg md:text-[0.95rem]">
                  Hi, welcome to JerseyDeals. We sell top quality jerseys from top quality brands, for the lowest
                  prices you’ll find! EVERYTHING we sell is NEW and AUTHENTIC!
                </p>
                <div className="mt-6 flex w-full max-w-md flex-col items-center gap-3 sm:mt-8 sm:max-w-lg">
                  <motion.button
                    type="button"
                    onClick={() => {
                      track('cta_click', { place: 'hero_primary', filter: 'jerseys' })
                      goInventory({ reset: true, tag: 'Jerseys' })
                    }}
                    whileHover={reduce ? undefined : { scale: 1.02 }}
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                    className="inline-flex w-full items-center justify-center bg-navy px-8 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-cream shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:bg-navy-deep"
                  >
                    Shop Jersey Deals
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => {
                      track('cta_click', { place: 'hero_shop_all' })
                      goInventory({ reset: true })
                    }}
                    className="font-brand text-sm font-semibold uppercase tracking-[0.14em] text-cream underline decoration-cream/70 underline-offset-4 transition hover:decoration-cream"
                  >
                    Shop all gear
                  </button>
                </div>
              </motion.div>
            </div>

            <ul
              aria-label="Why shop with us"
              className="mt-4 flex shrink-0 flex-col items-start gap-1.5 pb-1 font-brand text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-cream sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:pb-2 sm:text-[0.72rem] md:gap-x-12"
            >
              {[
                `Free shipping over $${FREE_SHIPPING_THRESHOLD}`,
                'Trusted Square checkout',
                '100% rating on eBay',
              ].map((label) => (
                <li key={label} className="flex items-center gap-2.5">
                  <span
                    className="text-[0.85rem] font-bold leading-none text-[#7dce88]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="text-cream/95">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CollectionsRail
          onSelect={(action, id, label) => {
            track('category_click', { category: 'collection_rail', collection: id, label })
            goInventory({
              reset: action.reset ?? true,
              brand: action.brand,
              tag: action.tag,
              price: action.price === 'All' ? undefined : action.price,
              saleOnly: action.saleOnly,
              query: action.query,
              leagueId: action.leagueId,
            })
          }}
        />

        {/* Shop Premier League */}
        <section
          id="epl"
          className="scroll-mt-44 relative overflow-hidden border-y-[3px] md:border-y-4"
          style={{ borderColor: PL_PURPLE, background: `linear-gradient(160deg, ${PL_PURPLE} 0%, ${PL_PURPLE_SOFT} 42%, #1a0520 100%)` }}
        >
          <div
            className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: PL_PURPLE_SOFT }}
            aria-hidden
          />
          <img
            src={asset('premier-league-badge.png')}
            alt="Premier League"
            className="absolute right-4 top-4 z-10 h-14 w-14 object-contain drop-shadow-lg md:right-8 md:top-8 md:h-20 md:w-20"
            loading="lazy"
            decoding="async"
          />
          <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
            <motion.div {...fadeUp(reduce)} className="max-w-xl">
              <p className="eyebrow" style={{ color: '#c9b3d6' }}>
                English Premier League
              </p>
              <div
                className="mt-3 h-[3px] w-16"
                style={{ background: 'linear-gradient(90deg, #a288b5, #fff)' }}
                aria-hidden
              />
              <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-white md:text-6xl">
                Shop Premier League
              </h2>
              <p className="mt-3 max-w-md font-brand text-base text-white/80">
                {PROMO_BAR}
              </p>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'shop_epl' })
                  goInventory({ reset: true, leagueId: 'premier-league' })
                }}
                className="mt-6 inline-flex px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                style={{ background: PL_PURPLE_SOFT, boxShadow: '0 0 0 1px rgba(255,255,255,.22)' }}
              >
                Shop EPL
              </button>
            </motion.div>

            <div id="epl-clubs" className="mt-14 scroll-mt-48">
              <p className="eyebrow text-white/85">Clubs in stock</p>
              {eplClubs.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-4">
                  {eplClubs.map((club, i) => (
                    <ClubInStockRow
                      key={club.id}
                      club={club}
                      leagueId="premier-league"
                      place="epl_club"
                      nameColor={EPL_TEAM_COLOR[club.id] || '#0b223f'}
                      imageFallbackClass="bg-[#120018] bg-gradient-to-b from-[#2a0830] to-[#120018]"
                      reduce={reduce}
                      delay={0.04 * i}
                      favorited={favoriteSet.has(club.id)}
                      onShop={() => {
                        track('category_click', { category: 'epl_club', club: club.id })
                        goInventory({
                          reset: true,
                          clubId: club.id,
                          leagueId: 'premier-league',
                          query: club.name,
                        })
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 font-brand text-white/90">Premier League kits will appear here when in stock.</p>
              )}
            </div>
          </div>
        </section>

        {/* Editorial shop paths */}
        <section id="shop" className="scroll-mt-44 bg-cream py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <div className="brand-rule" aria-hidden />
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-navy md:text-4xl">
                Shop the floor
              </h2>
              <p className="mt-2 font-brand text-base text-muted">
                Youth, sale, catalog, or apparel — start where you want.
              </p>
            </motion.div>

            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
              {(
                [
                  {
                    key: 'youth',
                    label: 'Youth',
                    image: 'category-youth.jpg',
                    onClick: () => {
                      track('category_click', { category: 'category_youth' })
                      goInventory({ audience: 'Youth', reset: true })
                    },
                  },
                  {
                    key: 'sale',
                    label: 'Sale',
                    image: 'category-sale.jpg',
                    onClick: () => {
                      track('category_click', { category: 'category_sale' })
                      if (onSquare) {
                        goInventory({ saleOnly: true, reset: true })
                      } else {
                        window.open(EBAY_SALE_URL, '_blank', 'noopener,noreferrer')
                      }
                    },
                  },
                  {
                    key: 'catalog',
                    label: 'Catalog',
                    image: 'category-catalog.jpg',
                    onClick: () => {
                      track('category_click', { category: 'category_all' })
                      goInventory({ tag: 'All', reset: true })
                    },
                  },
                  {
                    key: 'apparel',
                    label: 'Apparel',
                    image: 'product-hoodie.jpg',
                    onClick: () => {
                      track('category_click', { category: 'category_apparel' })
                      goInventory({ tag: 'Apparel', reset: true })
                    },
                  },
                ] as const
              ).map((tile, i) => (
                <motion.button
                  key={tile.key}
                  type="button"
                  onClick={tile.onClick}
                  {...fadeUp(reduce, 0.04 * i)}
                  className="group relative aspect-square w-full overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson"
                >
                  <img
                    src={asset(tile.image)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/25 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-3 sm:p-4">
                    <p className="font-display text-lg font-bold uppercase tracking-wide text-white sm:text-xl md:text-2xl">
                      {tile.label}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* New drops */}
        <section id="new-drops" className="cv-auto scroll-mt-44 bg-white py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="flex flex-col gap-4 border-b border-navy/10 pb-6 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <p className="eyebrow text-crimson">Just in</p>
                <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  New drops
                </h2>
                <p className="mt-2 max-w-xl text-muted">Fresh arrivals</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'new_drops_all' })
                  goInventory({ reset: true })
                }}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-navy underline decoration-crimson/50 underline-offset-4 hover:decoration-crimson"
              >
                See all in inventory →
              </button>
            </motion.div>

            {newDrops.length > 0 ? (
              <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
                {newDrops.map((item, i) => (
                  <ProductLink
                    key={item.id}
                    item={item}
                    favoriteSet={favoriteSet}
                    reduce={reduce}
                    delay={i * 0.04}
                    tone="light"
                    size="compact"
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onBuyNow={handleBuyNow}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-8 text-muted">
                {loadState === 'loading' ? 'Loading new drops…' : 'New drops appear when listings sync.'}
              </p>
            )}
          </div>
        </section>

        {/* Trending now */}
        {trendingPicks.length > 0 && (
          <section id="trending" className="cv-auto scroll-mt-44 bg-mist py-12 md:py-16">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div {...fadeUp(reduce)} className="border-b border-navy/10 pb-5">
                <p className="eyebrow text-crimson">Trending</p>
                <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-navy md:text-4xl">
                  Trending now
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  The four most viewed kits in the last week.
                </p>
              </motion.div>
              <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
                {trendingPicks.map((item, i) => (
                  <ProductLink
                    key={item.id}
                    item={item}
                    favoriteSet={favoriteSet}
                    reduce={reduce}
                    delay={i * 0.03}
                    tone="light"
                    size="compact"
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onBuyNow={handleBuyNow}
                  />
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Shop Champions League */}
        <section
          id="ucl"
          className="scroll-mt-44 relative overflow-hidden border-y-[3px] md:border-y-4"
          style={{
            borderColor: UCL_GOLD,
            background: `linear-gradient(160deg, ${UCL_BLUE} 0%, ${UCL_BLUE_SOFT} 42%, #020b24 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: UCL_GOLD }}
            aria-hidden
          />
          <p
            className="absolute right-4 top-4 z-10 font-display text-2xl font-bold uppercase tracking-[0.18em] text-white drop-shadow-lg md:right-8 md:top-8 md:text-4xl"
            style={{ color: UCL_GOLD }}
            aria-label="UEFA Champions League"
          >
            UCL
          </p>
          <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
            <motion.div {...fadeUp(reduce)} className="max-w-xl">
              <p className="eyebrow" style={{ color: UCL_GOLD }}>
                UEFA Champions League
              </p>
              <div
                className="mt-3 h-[3px] w-16"
                style={{ background: `linear-gradient(90deg, ${UCL_GOLD}, #fff)` }}
                aria-hidden
              />
              <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-white md:text-6xl">
                Shop Champions League
              </h2>
              <p className="mt-3 max-w-md font-brand text-base text-white/80">
                Real kits from Europe’s biggest clubs — shop UCL sides we stock.
              </p>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'shop_ucl' })
                  goInventory({ reset: true, leagueId: 'champions-league' })
                }}
                className="mt-6 inline-flex px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                style={{ background: UCL_BLUE_SOFT, boxShadow: `0 0 0 1px ${UCL_GOLD}` }}
              >
                Shop UCL
              </button>
            </motion.div>

            <div id="ucl-clubs" className="mt-14 scroll-mt-48">
              <p className="eyebrow text-white/85">Clubs in stock</p>
              {uclClubs.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-4">
                  {uclClubs.map((club, i) => (
                    <ClubInStockRow
                      key={club.id}
                      club={club}
                      leagueId="champions-league"
                      place="ucl_club"
                      nameColor={UCL_TEAM_COLOR[club.id] || '#0b223f'}
                      imageFallbackClass="bg-[#020b24] bg-gradient-to-b from-[#0a2f7a] to-[#020b24]"
                      reduce={reduce}
                      delay={0.04 * i}
                      favorited={favoriteSet.has(club.id)}
                      onShop={() => {
                        track('category_click', { category: 'ucl_club', club: club.id })
                        goInventory({
                          reset: true,
                          clubId: club.id,
                          leagueId: 'champions-league',
                          query: club.name,
                        })
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 font-brand text-white/90">
                  Champions League kits will appear here when in stock.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Training edit */}
        {trainingPicks.length > 0 ? (
          <section id="training" className="cv-auto scroll-mt-44 bg-mist py-8 md:py-10">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div
                {...fadeUp(reduce)}
                className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
              >
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-crimson">
                    Training
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-navy md:text-2xl">
                    Pre-match &amp; training tops
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => goInventory({ tag: 'Training', reset: true })}
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-navy underline decoration-crimson/50 underline-offset-4 hover:decoration-crimson"
                >
                  View all →
                </button>
              </motion.div>
              <ul className="mt-4 grid max-w-md grid-cols-2 gap-x-3 gap-y-4">
                {trainingPicks.map((item, i) => (
                  <ProductLink
                    key={item.id}
                    item={item}
                    favoriteSet={favoriteSet}
                    reduce={reduce}
                    delay={i * 0.03}
                    tone="light"
                    size="compact"
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onBuyNow={handleBuyNow}
                  />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Featured */}
        <section id="featured" className="cv-auto scroll-mt-44 bg-navy py-14 text-white md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="eyebrow text-crimson-hot">Selected</p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                Featured gear
              </h2>
              <p className="mt-3 text-base text-white/65">
                Editor picks from live inventory — quick view details, then add to cart.
              </p>
            </motion.div>

            {loadState === 'loading' && <p className="mt-12 text-white/60">Loading listings…</p>}

            {loadState === 'error' && (
              <p className="mt-12 text-white/70">
                Listings are temporarily unavailable.{' '}
                <a
                  href={ebayShop}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-crimson-hot underline-offset-4 hover:text-white"
                >
                  Open the eBay shop
                </a>
                .
              </p>
            )}

            {featured.length > 0 && (
              <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                {featured.map((item, i) => (
                  <ProductLink
                    key={item.id}
                    item={item}
                    favoriteSet={favoriteSet}
                    reduce={reduce}
                    delay={i * 0.03}
                    size="compact"
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onBuyNow={handleBuyNow}
                  />
                ))}
              </ul>
            )}

            {listings.length > featured.length && (
              <motion.div {...fadeUp(reduce, 0.15)} className="mt-10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'featured_inventory' })
                    goInventory({ tag: 'All', reset: true })
                  }}
                  className="inline-flex border border-white/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white/5"
                >
                  Browse all {listings.length} listings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'featured_all' })
                    goInventory({ reset: true })
                  }}
                  className="inline-flex bg-crimson px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
                >
                  Browse inventory
                </button>
              </motion.div>
            )}
          </div>
        </section>

        {/* Shop by company */}
        {availableBrands.length > 0 && (
          <section id="brands" className="scroll-mt-44 border-y border-navy/10 bg-white py-16 md:py-20">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div {...fadeUp(reduce)}>
                <p className="eyebrow text-crimson">Companies</p>
                <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  Shop by company
                </h2>
              </motion.div>
              <ul className="mt-10 grid gap-3 sm:grid-cols-3">
                {availableBrands.map((brand, i) => {
                  const logoSrc = COMPANY_LOGO[brand.toLowerCase()]
                  return (
                    <motion.li key={brand} {...fadeUp(reduce, i * 0.05)}>
                      <button
                        type="button"
                        onClick={() => {
                          track('brand_click', { brand })
                          goInventory({ brand, tag: 'All', reset: true })
                          setBrandFilter(brand)
                        }}
                        className="group flex w-full items-center gap-4 border border-navy/10 bg-chalk px-5 py-4 text-left transition hover:border-navy/30 hover:bg-white"
                      >
                        {logoSrc ? (
                          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-navy/10 bg-white">
                            <img
                              src={asset(logoSrc)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </span>
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center border border-navy/10 bg-white font-display text-sm font-bold uppercase text-navy">
                            {brand.slice(0, 2)}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 font-display text-2xl font-bold uppercase tracking-wide text-navy">
                          {brand}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted transition group-hover:text-crimson">
                          Shop →
                        </span>
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Shop by club */}
        {clubsData.length > 0 && (
          <section id="clubs" className="scroll-mt-44 bg-chalk py-16 md:py-20">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div {...fadeUp(reduce)}>
                <p className="eyebrow text-crimson">Clubs</p>
                <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  Shop by club
                </h2>
                <p className="mt-3 text-lg text-muted">
                  Tap a club to filter inventory — or open Favorites to save teams.
                </p>
              </motion.div>
              <ul className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3 lg:grid-cols-8">
                {clubsData.slice(0, clubsShown).map((club, i) => {
                  const favorited = favoriteSet.has(club.id)
                  const catalogClub = getClubById(club.id)
                  return (
                    <motion.li key={club.id} {...fadeUp(reduce, i * 0.02)} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          track('club_click', { club: club.id })
                          goInventory({ clubId: club.id, reset: true })
                        }}
                        className="group flex w-full flex-col items-center gap-1.5 bg-white px-1.5 pb-2 pt-3 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2"
                      >
                        {catalogClub ? (
                          <ClubLogoMark club={catalogClub} size="md" className="!h-10 !w-10" />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-full border border-navy/15 bg-mist font-display text-[0.65rem] font-bold text-navy">
                            {club.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <FitOneLine
                          className="w-full px-0.5 font-display font-bold uppercase leading-tight tracking-wide text-navy"
                          maxFontPx={11}
                          minFontPx={7}
                        >
                          {club.name}
                        </FitOneLine>
                        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-muted">
                          {club.count}
                        </p>
                      </button>
                      <ClubFavoriteButton
                        clubId={club.id}
                        clubName={club.name}
                        favorited={favorited}
                        place="shop_by_club"
                        className={`absolute -right-1 -top-1 z-10 h-6 w-6 border border-crimson/40 ${
                          favorited
                            ? 'bg-crimson text-cream'
                            : 'bg-cream/95 text-crimson hover:bg-crimson hover:text-cream'
                        }`}
                      />
                    </motion.li>
                  )
                })}
              </ul>
              {clubsShown < clubsData.length ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setClubsShown((n) => Math.min(n + 8, clubsData.length))}
                    className="border border-navy/20 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-navy transition hover:border-crimson hover:text-crimson"
                  >
                    Show more clubs
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Sale campaign */}
        <section id="sale" className="cv-auto relative min-h-[68svh] scroll-mt-44 overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            <img
              src={asset('category-sale.jpg')}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/80 to-navy-deep/25" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[68svh] max-w-6xl items-end px-5 py-16 md:items-center md:px-8 md:py-24">
            <motion.div {...fadeUp(reduce)} className="max-w-lg">
              <p className="eyebrow text-crimson-hot">Limited stock</p>
              <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide md:text-7xl">
                {SALE_HEADLINE}
              </h2>
              <p className="mt-4 text-lg text-white/80">{SALE_URGENCY}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'sale_banner' })
                    goInventory({ saleOnly: true, reset: true })
                  }}
                  className="inline-flex bg-crimson px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
                >
                  Shop sale kits
                </button>
                {salePicks.length > 0 ? (
                  <a
                    href="#sale-picks"
                    className="inline-flex border border-white/40 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white/10"
                  >
                    See sale picks
                  </a>
                ) : null}
              </div>
            </motion.div>
          </div>
        </section>

        {salePicks.length > 0 ? (
          <section id="sale-picks" className="bg-navy py-16 text-white md:py-20">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div {...fadeUp(reduce)} className="mb-10">
                <h2 className="font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">
                  Sale picks
                </h2>
                <p className="mt-2 text-white/65">Hand-picked kits from the sale rack.</p>
              </motion.div>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {visibleSalePicks.map((item, i) => (
                  <ProductLink key={item.id} item={item} favoriteSet={favoriteSet} reduce={reduce} delay={i * 0.05} onAddToCart={handleAddToCart} onQuickView={handleQuickView} onBuyNow={handleBuyNow} />
                ))}
              </ul>
              {salePicksShown < salePicks.length ? (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      track('cta_click', { place: 'sale_picks_show_more' })
                      setSalePicksShown(salePicks.length)
                    }}
                    className="border border-white/35 bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white/10"
                  >
                    Show more
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

          </>
        ) : null}

        {inventoryOpen ? (
          <div
            className="jd-overlay-shell fixed inset-x-0 z-[70] bg-white text-navy"
            style={{ top: 'var(--jd-top-chrome)', bottom: 'var(--jd-bottom-dock)' }}
            aria-label="Inventory"
          >
            <div className="jd-overlay-scroll">
        {/* Inventory — filters first, results directly below (search scrolls here). */}
        <section id="inventory" className="cv-auto scroll-mt-4 bg-white pb-10 pt-4 md:pb-14 md:pt-6">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div id="inventory-browse" className="scroll-mt-4">
              {loadState === 'ready' && listings.length > 0 && (
                <motion.div {...fadeUp(reduce, 0.08)} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 border-2 border-navy bg-white px-3.5 py-2.5 font-brand text-[0.7rem] font-bold uppercase tracking-[0.14em] text-navy transition hover:bg-mist"
                      aria-expanded={filtersOpen}
                      aria-controls="inventory-filter-drawer"
                      onClick={() => setFiltersOpen(true)}
                    >
                      <span aria-hidden className="flex flex-col gap-[3px]">
                        <span className="block h-px w-3.5 bg-navy" />
                        <span className="block h-px w-2.5 bg-navy" />
                        <span className="block h-px w-3.5 bg-navy" />
                      </span>
                      Filter
                      {filterChipCount > 0 ? ` · ${filterChipCount}` : ''}
                    </button>
                    <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted sm:flex-none">
                      <span className="hidden sm:inline">Sort by</span>
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value as SortId)
                          track('sort_change', { sort: e.target.value })
                        }}
                        className="min-w-0 flex-1 border border-navy/20 bg-white px-2.5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-navy outline-none focus:ring-2 focus:ring-crimson/30 sm:flex-none"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="ml-auto text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted">
                      Showing {filtered.length}
                      {listings.length !== filtered.length ? ` of ${listings.length}` : ''}
                    </p>
                  </div>

                  {activeFilterChips.length > 0 || searchFilterChip ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={chip.clear}
                          className="border border-navy bg-navy px-2 py-0.5 font-brand text-[0.6rem] font-bold uppercase tracking-[0.1em] text-cream transition hover:bg-navy/80"
                        >
                          {chip.label} ✕
                        </button>
                      ))}
                      {searchFilterChip ? (
                        <button
                          key={searchFilterChip.key}
                          type="button"
                          onClick={searchFilterChip.clear}
                          className="border border-navy bg-navy px-2 py-0.5 font-brand text-[0.6rem] font-bold uppercase tracking-[0.1em] text-cream transition hover:bg-navy/80"
                        >
                          {searchFilterChip.label} ✕
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-crimson"
                      >
                        Clear all
                      </button>
                    </div>
                  ) : null}

                  {filtersOpen ? (
                    <div
                      className="fixed inset-x-0 z-[95]"
                      style={{ top: 'var(--jd-top-chrome)', bottom: 'var(--jd-bottom-dock)' }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Shop and filter"
                    >
                      <button
                        type="button"
                        className="absolute inset-0 bg-navy-deep/45"
                        aria-label="Close filters"
                        onClick={() => setFiltersOpen(false)}
                      />
                      <div
                        id="inventory-filter-drawer"
                        className="absolute right-0 top-0 flex max-h-full w-[min(100%,22rem)] flex-col bg-white shadow-2xl"
                      >
                        <div className="flex shrink-0 items-center justify-between border-b border-navy/10 px-5 py-4">
                          <p className="font-brand text-base font-bold tracking-wide text-navy">
                            Shop &amp; Filter
                          </p>
                          <button
                            type="button"
                            onClick={() => setFiltersOpen(false)}
                            className="px-2 py-1 text-lg leading-none text-navy/70 transition hover:text-navy"
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>
                        <div className="min-h-0 overflow-y-auto px-5">
                          <FilterAccordion
                            id="gender"
                            label="Gender"
                            open={filterSection === 'gender'}
                            onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                          >
                            {(
                              [
                                { id: 'All', label: 'All' },
                                { id: 'Men', label: "Men's" },
                                { id: 'Women', label: "Women's" },
                                { id: 'Youth', label: 'Youth' },
                              ] as const
                            ).map((option) => (
                              <FilterChip
                                key={option.id}
                                label={option.label}
                                active={genderFilter === option.id}
                                onClick={() => setGenderFilter(option.id)}
                              />
                            ))}
                          </FilterAccordion>

                          <FilterAccordion
                            id="size"
                            label="Available size"
                            open={filterSection === 'size'}
                            onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                          >
                            <FilterChip
                              label="All"
                              active={sizeFilter === 'All'}
                              onClick={() => setSizeFilter('All')}
                            />
                            {availableSizes.map((size) => (
                              <FilterChip
                                key={size}
                                label={size}
                                active={sizeFilter === size}
                                onClick={() => setSizeFilter(size)}
                              />
                            ))}
                          </FilterAccordion>

                          <FilterAccordion
                            id="brand"
                            label="Brand"
                            open={filterSection === 'brand'}
                            onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                          >
                            <FilterChip
                              label="All"
                              active={brandFilter === 'All'}
                              onClick={() => setBrandFilter('All')}
                            />
                            {availableBrands.map((brand) => (
                              <FilterChip
                                key={brand}
                                label={brand}
                                active={brandFilter === brand}
                                onClick={() => setBrandFilter(brand)}
                              />
                            ))}
                          </FilterAccordion>

                          <FilterAccordion
                            id="price"
                            label="Price"
                            open={filterSection === 'price'}
                            onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                          >
                            {PRICE_FILTERS.map((range) => (
                              <FilterChip
                                key={range.id}
                                label={range.label}
                                active={priceFilter === range.id}
                                onClick={() => {
                                  setPriceFilter(range.id)
                                  track('price_filter', { range: range.id })
                                }}
                              />
                            ))}
                          </FilterAccordion>

                          <FilterAccordion
                            id="type"
                            label="Type"
                            open={filterSection === 'type'}
                            onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                          >
                            {TYPE_FILTERS.map((option) => (
                              <FilterChip
                                key={option.id}
                                label={option.label}
                                active={tagFilter === option.id}
                                onClick={() => setTagFilter(option.id)}
                              />
                            ))}
                          </FilterAccordion>

                          {leaguesData.length > 0 ? (
                            <FilterAccordion
                              id="league"
                              label="League"
                              open={filterSection === 'league'}
                              onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                            >
                              <FilterChip
                                label="All"
                                active={leagueFilter === 'All'}
                                onClick={() => setLeagueFilter('All')}
                              />
                              <FilterChip
                                label="Champions League"
                                active={leagueFilter === 'champions-league'}
                                onClick={() => {
                                  setLeagueFilter('champions-league')
                                  track('league_filter', { league: 'champions-league' })
                                }}
                              />
                              {leaguesData.map((league) => (
                                <FilterChip
                                  key={league.id}
                                  label={league.name}
                                  active={leagueFilter === league.id}
                                  onClick={() => {
                                    setLeagueFilter(league.id)
                                    track('league_filter', { league: league.id })
                                  }}
                                />
                              ))}
                            </FilterAccordion>
                          ) : null}

                          <FilterAccordion
                            id="favorites"
                            label="Favorites"
                            open={filterSection === 'favorites'}
                            onToggle={(id) => setFilterSection((cur) => (cur === id ? null : id))}
                          >
                            <FilterChip
                              label="All stock"
                              active={!favoritesOnly}
                              onClick={() => setFavoritesOnly(false)}
                            />
                            <FilterChip
                              label={
                                favoriteCount > 0
                                  ? `My clubs (${favoriteCount})`
                                  : 'My clubs'
                              }
                              active={favoritesOnly}
                              onClick={() => {
                                if (!favoriteCount) {
                                  setFiltersOpen(false)
                                  goToFavoritesScreen()
                                  return
                                }
                                setFavoritesOnly(true)
                                setClubFilter('All')
                                track('favorites_filter', { on: true, count: favoriteCount })
                              }}
                            />
                            {favoriteClubs.slice(0, 8).map((club) => (
                              <FilterChip
                                key={club.id}
                                label={club.name}
                                active={clubFilter === club.id}
                                onClick={() => {
                                  setFavoritesOnly(false)
                                  setClubFilter(club.id)
                                  track('club_filter', { club: club.id, place: 'favorites_row' })
                                }}
                              />
                            ))}
                          </FilterAccordion>
                        </div>
                        <div className="flex shrink-0 gap-2 border-t border-navy/10 px-5 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              clearAllFilters()
                            }}
                            className="flex-1 border border-navy/20 py-3 font-brand text-[0.65rem] font-bold uppercase tracking-[0.14em] text-navy"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltersOpen(false)}
                            className="flex-[1.4] bg-navy py-3 font-brand text-[0.65rem] font-bold uppercase tracking-[0.14em] text-cream"
                          >
                            Show {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {loadState === 'loading' && <p className="mt-12 text-muted">Loading inventory…</p>}

              {loadState === 'error' && (
                <p className="mt-12 text-muted">
                  Inventory is temporarily unavailable.{' '}
                  <a
                    href={ebayShop}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                  >
                    Browse on eBay
                  </a>
                  .
                </p>
              )}

              <div id="inventory-results" className="scroll-mt-48" aria-hidden />

              {loadState === 'ready' && filtered.length === 0 && (
                <div className="mt-10 border border-navy/10 bg-white px-6 py-10 text-center">
                  <p className="font-display text-2xl font-bold uppercase text-navy">No kits match</p>
                  <p className="mt-2 text-muted">
                    Try clearing filters or searching a different club or size.
                  </p>
                  <button
                    type="button"
                    className="mt-6 bg-crimson px-5 py-3 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream"
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {filtered.length > 0 && (
                <>
                  <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3">
                    {visibleInventory.map((item) => (
                      <ProductLink
                        key={item.id}
                        item={item}
                        favoriteSet={favoriteSet}
                        tone="light"
                        size="catalog"
                        onAddToCart={handleAddToCart}
                        onQuickView={handleQuickView}
                        onBuyNow={handleBuyNow}
                      />
                    ))}
                  </ul>
                  {filtered.length > INVENTORY_PAGE_SIZE ? (
                    <div className="mt-10 flex flex-col items-center gap-3">
                      <p className="text-sm text-muted">
                        Page {safeInventoryPage} of {inventoryPageCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={safeInventoryPage <= 1}
                          onClick={() => {
                            setInventoryPage((p) => Math.max(1, p - 1))
                            document
                              .getElementById('inventory-results')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className="border border-navy bg-white px-5 py-3 font-brand text-xs font-bold uppercase tracking-[0.16em] text-navy transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={safeInventoryPage >= inventoryPageCount}
                          onClick={() => {
                            setInventoryPage((p) => Math.min(inventoryPageCount, p + 1))
                            document
                              .getElementById('inventory-results')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className="bg-navy px-5 py-3 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : filtered.length > 0 ? (
                    <p className="mt-10 text-center text-sm text-muted">
                      Page 1 of 1
                    </p>
                  ) : null}
                </>
              )}
            </div>

            {recentlyViewed.length > 0 && !deferredQuery.trim() ? (
              <motion.div {...fadeUp(reduce, 0.05)} className="mt-16 border-t border-navy/10 pt-12">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow text-crimson">Continue</p>
                    <h3 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-navy">
                      Recently viewed
                    </h3>
                  </div>
                </div>
                <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
                  {recentlyViewed.map((item, i) => (
                    <ProductLink
                      key={`recent-${item.id}`}
                      item={item}
                      favoriteSet={favoriteSet}
                      reduce={reduce}
                      delay={i * 0.04}
                      tone="light"
                      size="catalog"
                      onAddToCart={handleAddToCart}
                      onQuickView={handleQuickView}
                      onBuyNow={handleBuyNow}
                    />
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </div>
        </section>
              <SiteFooter
                ebayShop={ebayShop}
                ebaySeller={ebaySeller}
                showTrending={trendingPicks.length > 0}
                onInventory={() => goInventory({ reset: true })}
                onYouth={() => goInventory({ audience: 'Youth', reset: true })}
                bottomPadClass="pb-8"
              />
            </div>
          </div>
        ) : null}

        {!inventoryOpen ? (
          <>
        {/* Trust */}
        <section id="buy-direct" className="cv-auto scroll-mt-44 bg-white">
          <div className="mx-auto grid max-w-6xl md:grid-cols-2">
            <div className="relative min-h-[360px] overflow-hidden md:min-h-[560px]">
              <img
                src={asset('hero-jersey.jpg')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex flex-col justify-center px-8 py-16 md:px-12 md:py-20">
              <motion.div {...fadeUp(reduce)}>
                <p className="eyebrow text-crimson">Why Jersey Deals</p>
                <div className="brand-rule mt-3" aria-hidden />
                <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                  Direct. Detailed. Live.
                </h2>
                <p className="mt-5 max-w-xl font-brand text-lg text-muted">
                  {FAMILY_NOTE} Shop on{' '}
                  <a
                    href={SQUARE_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('outbound_click', { place: 'trust', channel: 'square' })}
                    className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                  >
                    Square
                  </a>{' '}
                  or{' '}
                  <a
                    href={ebayShop}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('outbound_click', { place: 'trust', channel: 'ebay' })}
                    className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                  >
                    eBay
                  </a>
                  {catalog ? ` — ${catalog.count} live listings` : ''}.
                  {onSquare
                    ? ' Pay by card on Square Payment Links — eBay remains available as a second channel.'
                    : ' Checkout on eBay today — Square direct payments are next.'}
                </p>
                <div className="mt-8 max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    eBay seller ratings
                  </p>
                  <ul className="mt-4 space-y-3" aria-label="eBay detailed seller ratings">
                    {EBAY_RATINGS.map((row) => (
                      <li key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
                        <span className="text-sm text-navy/80">{row.label}</span>
                        <span className="font-display text-lg font-bold tabular-nums text-navy">
                          {row.score.toFixed(1)}
                        </span>
                        <div
                          className="col-span-2 h-1.5 overflow-hidden bg-navy/10"
                          role="presentation"
                          aria-hidden
                        >
                          <div
                            className="h-full bg-crimson"
                            style={{ width: `${(row.score / 5) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={ebaySeller}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('outbound_click', { place: 'trust_ratings', channel: 'ebay' })}
                    className="mt-4 inline-block text-sm font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                  >
                    View @{EBAY_SELLER} on eBay
                  </a>
                </div>
                <ul className="mt-10 space-y-6 border-l border-navy/10 pl-6">
                  {[
                    {
                      dt: onSquare ? 'Square checkout' : 'Trusted checkout',
                      dd: onSquare
                        ? 'Add to cart here, then pay with card on Square’s secure Payment Links.'
                        : 'Buy on eBay with buyer protection on the same seller account.',
                    },
                    {
                      dt: 'Product truth',
                      dd: 'Photos, price, size, team, and stock on every listing.',
                    },
                    {
                      dt: 'Two channels',
                      dd: onSquare
                        ? 'Shop curated paths here, or open eBay for marketplace reach.'
                        : 'This site is ready for Square Catalog when you flip the switch.',
                    },
                  ].map((item) => (
                    <li key={item.dt}>
                      <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                        {item.dt}
                      </p>
                      <p className="mt-1.5 text-muted">{item.dd}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-12 grid gap-6 border-t border-navy/10 pt-8 sm:grid-cols-3">
                  <p>
                    <span className="font-display text-4xl font-bold text-navy">
                      {catalog?.count ?? '—'}
                    </span>
                    <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Active listings
                    </span>
                  </p>
                  <p>
                    <span className="font-display text-4xl font-bold text-navy">
                      {availableBrands.length || '—'}
                    </span>
                    <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Brands in stock
                    </span>
                  </p>
                  <p>
                    <span className="font-display text-4xl font-bold text-navy">US</span>
                    <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Ships from inventory
                    </span>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Guarantees strip */}
        <section aria-label="Our guarantees" className="bg-navy py-16 text-white md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="mb-10">
              <p className="eyebrow text-crimson-hot">Why Jersey Deals</p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                What you can count on
              </h2>
            </motion.div>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  title: 'Ships from US',
                  copy: 'All orders dispatch from our US inventory — no overseas delays.',
                },
                {
                  title: 'Real photos',
                  copy: 'Every listing photo is the actual item, not a stock image.',
                },
                {
                  title: onSquare ? 'Square checkout' : 'Secure card checkout',
                  copy: onSquare
                    ? 'Pay by card on Square Payment Links — encrypted and direct.'
                    : 'Pay securely by card — encrypted and direct.',
                },
                {
                  title: 'Adult & youth',
                  copy: 'Full size range from adult S through youth sizes — clearly labeled.',
                },
                {
                  title: 'Family-run',
                  copy: `Small shop, real people — reach us at ${CONTACT_EMAIL}.`,
                },
              ].map((point, i) => (
                <motion.li key={point.title} {...fadeUp(reduce, i * 0.07)}>
                  <p className="font-display text-xl font-bold uppercase tracking-wide text-white">
                    {point.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{point.copy}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-label="How shopping works" className="scroll-mt-44 border-y border-navy/10 bg-chalk py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-xl">
              <p className="eyebrow text-crimson">Process</p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                How it works
              </h2>
            </motion.div>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Browse live stock',
                  copy: 'Filter by youth, training, jerseys, size, club, or brand on this page.',
                },
                {
                  step: '02',
                  title: 'Add to cart',
                  copy: 'Quick-view any kit, then add it to your bag or buy now on Square.',
                },
                {
                  step: '03',
                  title: 'Checkout & ship',
                  copy: 'Pay securely on Square Payment Links — we ship from US inventory.',
                },
              ].map((item, i) => (
                <motion.li key={item.step} {...fadeUp(reduce, i * 0.08)}>
                  <p className="font-display text-4xl font-bold text-crimson/80">{item.step}</p>
                  <p className="mt-3 font-display text-2xl font-bold uppercase tracking-wide text-navy">
                    {item.title}
                  </p>
                  <p className="mt-2 text-muted">{item.copy}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Size guide */}
        <section id="size-guide" className="scroll-mt-44 bg-white py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <p className="eyebrow text-crimson">Sizing</p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                Size guide
              </h2>
              <p className="mt-3 text-lg text-muted">
                All sizes are listed on each item. When between sizes, go up — especially for training and
                pre-match tops.
              </p>
            </motion.div>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <motion.div {...fadeUp(reduce, 0.06)}>
                <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">Adult</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <li key={size}>
                      <span className="block border border-navy/15 px-5 py-2.5 text-sm font-semibold text-navy">
                        {size}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted">
                  Most club kits run true to size. Pre-match and training tops can run slim — size up
                  when layering.
                </p>
              </motion.div>
              <motion.div {...fadeUp(reduce, 0.1)}>
                <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">Youth</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {['Youth S', 'Youth M', 'Youth L', 'Youth XL', '9-12 YRS'].map((size) => (
                    <li key={size}>
                      <span className="block border border-navy/15 px-5 py-2.5 text-sm font-semibold text-navy">
                        {size}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted">
                  Youth sizes are designed for kids aged roughly 6–14. The size label on the garment
                  is shown on every listing.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-44 bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-3xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <p className="eyebrow text-crimson">Support</p>
              <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Q+A
              </h2>
              <p className="mt-3 text-lg text-muted">Straight answers before you checkout.</p>
            </motion.div>

            <ul className="mt-10 divide-y divide-navy/10 border-y border-navy/10">
              {FAQ.map((item, index) => {
                const open = openFaq === index
                const panelId = `faq-panel-${index}`
                const buttonId = `faq-button-${index}`
                return (
                  <li key={item.q}>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => {
                        setOpenFaq(open ? null : index)
                        track('faq_toggle', { question: item.q, open: !open })
                      }}
                      className="flex w-full items-baseline justify-between gap-4 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson"
                    >
                      <span className="font-display text-xl font-bold uppercase tracking-wide text-navy md:text-2xl">
                        {item.q}
                      </span>
                      <span className="font-display text-2xl text-crimson" aria-hidden>
                        {open ? '−' : '+'}
                      </span>
                    </button>
                    {open ? (
                      <p id={panelId} role="region" aria-labelledby={buttonId} className="pb-5 leading-relaxed text-muted">
                        {item.a}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <RewardsClub />

        {/* Final CTA */}
        <section className="relative overflow-hidden bg-crimson py-8 text-white md:py-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              background:
                'radial-gradient(ellipse 55% 80% at 100% 50%, rgba(11,34,63,0.55), transparent 60%)',
            }}
            aria-hidden
          />
          <motion.div
            {...fadeUp(reduce)}
            className="relative mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 sm:flex-row sm:items-center sm:justify-between md:px-8"
          >
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <div>
                <p className="font-brand text-xl font-bold uppercase tracking-[0.06em] text-cream md:text-2xl">
                  Jersey Deals
                </p>
                <p className="mt-0.5 max-w-md text-sm leading-snug text-cream/90">
                  Youth apparel, sale racks, and the full catalog.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'final' })
                goInventory({ reset: true })
              }}
              className="inline-flex shrink-0 bg-navy px-5 py-2.5 font-brand text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cream transition hover:bg-navy-deep"
            >
              Browse kits
            </button>
          </motion.div>
        </section>
          </>
        ) : null}
      </main>

      <SiteFooter
        ebayShop={ebayShop}
        ebaySeller={ebaySeller}
        showTrending={trendingPicks.length > 0}
        onInventory={() => goInventory({ reset: true })}
        onYouth={() => goInventory({ audience: 'Youth', reset: true })}
      />

      <div ref={bottomDockRef} className="pointer-events-auto fixed inset-x-0 bottom-0 z-[100]">
        <FreeShippingBar
          subtotal={bagSubtotal}
          currency={cart.lines[0]?.currency || 'USD'}
        />
        <RewardsDock />
      </div>

      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onChangeQty={(id, quantity) => setCart(setCartLineQuantity(id, quantity))}
        onRemove={(id) => setCart(removeCartLine(id))}
        onClear={() => setCart(clearCart())}
        onRequestCheckout={requestCheckoutAccess}
      />

      {quickView ? (
        <QuickViewModal
          item={quickView}
          onClose={() => setQuickView(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      ) : null}

      <FirstBuyerOfferModal
        open={offerOpen}
        mode={offerMode}
        onClose={dismissOfferModal}
        onActivated={() => {
          setCartToast('10% offer saved to My offers — activate at checkout')
          window.setTimeout(() => setCartToast(null), 2600)
          goToRewardsOffers()
        }}
        onEmailSaved={() => {
          if (pendingBuy) {
            const item = pendingBuy
            setPendingBuy(null)
            window.setTimeout(() => handleBuyNow(item), 50)
          }
        }}
      />

      {cartToast ? (
        <div className="fixed bottom-[calc(var(--jd-bottom-dock)+0.75rem)] left-1/2 z-[95] w-[min(92vw,24rem)] -translate-x-1/2 border border-navy/10 bg-navy px-4 py-3 text-center font-brand text-xs font-bold uppercase tracking-[0.14em] text-cream shadow-lg">
          {cartToast}
        </div>
      ) : null}

      {/* Nav drawer — sits under sticky chrome so top/bottom bars stay tappable */}
      {menuOpen && (
        <div
          className="jd-overlay-shell fixed inset-x-0 z-[95] bg-cream"
          style={{ top: 'var(--jd-top-chrome)', bottom: 'var(--jd-bottom-dock)' }}
          role="dialog"
          aria-modal
          aria-label="Navigation menu"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-navy/10 bg-cream px-5 py-4">
            <BrandMark size="sm" withWordmark stackedWordmark wordmarkTone="navy" />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="grid h-9 w-9 place-items-center text-navy transition hover:text-crimson"
            >
              <span className="text-xl leading-none">✕</span>
            </button>
          </div>
          <nav className="jd-overlay-scroll flex flex-col divide-y divide-navy/10 px-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  setMenuOpen(false)
                  if (link.href === '#profile') {
                    e.preventDefault()
                    goToProfileScreen()
                    return
                  }
                  if (link.href === '#favorites') {
                    e.preventDefault()
                    goToFavoritesScreen()
                    return
                  }
                  if ('inventory' in link && link.inventory) {
                    e.preventDefault()
                    goInventory()
                    return
                  }
                  if (
                    (inventoryOpen ||
                      favoritesOpen ||
                      profileOpen ||
                      offersOpen ||
                      itemPageId) &&
                    link.href.startsWith('#')
                  ) {
                    e.preventDefault()
                    leaveToHome()
                    window.setTimeout(() => {
                      document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' })
                    }, 40)
                  }
                }}
                className="py-4 text-sm font-semibold uppercase tracking-[0.18em] text-navy transition hover:text-crimson"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto border-t border-navy/10 p-5">
            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'mobile_menu' })
                goInventory({ reset: true })
                setMenuOpen(false)
              }}
              className="flex w-full items-center justify-center bg-crimson py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
            >
              Browse kits
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
