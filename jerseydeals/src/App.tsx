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
  EBAY_RATINGS,
  EBAY_SALE_URL,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  EBAY_SHOP_URL,
  FAMILY_NOTE,
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
import { FirstBuyerOfferModal } from './FirstBuyerOffer'
import { FreeShippingBar } from './FreeShippingBar'
import { RewardsClub } from './RewardsClub'
import {
  applyFirstBuyerDiscount,
  capturePurchaseReturnFromUrl,
  hasPurchased,
  readBuyerEmail,
  readOffer,
} from './offer'
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
  isYouthListing,
  kitType,
  leaguesInStock,
  listingBuyUrl,
  listingImages,
  listingPrimaryImage,
  listingProductPageUrl,
  listingSize,
  lowestSalePrice,
  matchesLeagueFilter,
  matchesListingQuery,
  matchesPriceFilter,
  matchesTypeFilter,
  pickFeatured,
  pickNewDrops,
  pickSaleItems,
  pickTrending,
  premierLeagueClubsInStock,
  PRICE_FILTERS,
  pushRecentlyViewed,
  readRecentlyViewed,
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

type GenderFilter = 'All' | 'Men' | 'Youth'

function BrandMark({
  size = 'md',
  withWordmark = false,
  wordmarkTone = 'navy',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'hero'
  withWordmark?: boolean
  wordmarkTone?: 'navy' | 'white' | 'cream'
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
          : 'text-base'

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
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
        <span className={`font-brand font-bold uppercase leading-none tracking-[0.08em] ${word} ${wordSize}`}>
          Jersey Deals
        </span>
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
}: {
  item: Listing
  tone?: 'dark' | 'light'
}) {
  const src = listingPrimaryImage(item) || FALLBACK_IMAGE
  const bg = tone === 'dark' ? 'bg-navy-deep' : 'bg-mist'
  return (
    <div className={`absolute inset-0 ${bg}`}>
      <SafeImage
        src={src}
        alt={shortTitle(item.title)}
        className="h-full w-full object-contain object-center select-none"
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
const EPL_KIT_IMAGE: Record<string, string> = {
  chelsea: 'epl-kits/chelsea.jpg',
  arsenal: 'epl-kits/arsenal.jpg',
  liverpool: 'epl-kits/liverpool.jpg',
  'manchester-city': 'epl-kits/manchester-city.jpg',
  'manchester-united': 'epl-kits/manchester-united.jpg',
  tottenham: 'epl-kits/tottenham.jpg',
  newcastle: 'epl-kits/newcastle.jpg',
}
const EPL_TEAM_COLOR: Record<string, string> = {
  chelsea: '#034694',
  arsenal: '#EF0107',
  liverpool: '#C8102E',
  'manchester-city': '#6CABDD',
  'manchester-united': '#DA291C',
  tottenham: '#132257',
  newcastle: '#241F20',
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

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <p className="shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted sm:w-[4.5rem]">
        {label}
      </p>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
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
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
  tone = 'dark',
  onAddToCart,
  onQuickView,
  onBuyNow,
}: {
  item: Listing
  /** Kept for call-site compatibility; cards skip per-item motion for faster paint. */
  reduce?: boolean | null
  delay?: number
  tone?: 'dark' | 'light'
  onAddToCart: (item: Listing) => void
  onQuickView: (item: Listing) => void
  onBuyNow: (item: Listing) => void
}) {
  const condition = conditionLabel(item)
  const buyUrl = listingBuyUrl(item)
  const kit = kitType(item)
  const onSale = isSaleListing(item)
  const size = listingSize(item)
  const photoCount = item.images?.length ? item.images.length : item.image ? 1 : 0
  const muted = tone === 'dark' ? 'text-white/75' : 'text-muted'
  const titleTone = tone === 'dark' ? 'text-white/95' : 'text-navy'
  const priceTone = tone === 'dark' ? 'text-white' : 'text-navy'
  const accent = tone === 'dark' ? 'text-crimson-hot' : 'text-crimson'
  const used = /used|pre-?owned|worn/i.test(condition)

  return (
    <li>
      <div className="group outline-none">
        {/* Cover only on cards — full swipe gallery lives in quick view. */}
        <div
          className={`relative aspect-square w-full overflow-hidden ${
            tone === 'dark' ? 'bg-navy-deep' : 'bg-mist'
          }`}
        >
          <button
            type="button"
            onClick={() => onQuickView(item)}
            className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson"
            aria-label={`Quick view ${shortTitle(item.title)}`}
          >
            <ProductCardCover item={item} tone={tone} />
          </button>
          {onSale && (
            <span className="pointer-events-none absolute left-2 top-2 z-20 bg-crimson px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white">
              Sale
            </span>
          )}
          {item.quantity === 1 && (
            <span className="pointer-events-none absolute right-2 top-2 z-20 bg-navy-deep/90 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
              Only 1 left
            </span>
          )}
          {photoCount > 1 ? (
            <span
              className={`pointer-events-none absolute z-20 bg-navy-deep/90 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white ${
                item.quantity === 1 ? 'right-2 top-10' : 'right-2 top-2'
              }`}
            >
              {photoCount} photos
            </span>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden bg-gradient-to-t from-navy-deep/95 via-navy-deep/50 to-transparent p-4 pt-6 opacity-0 transition duration-300 md:block md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <span className="flex w-full items-center justify-center bg-crimson px-3 py-2.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream">
              Quick view
            </span>
          </div>
        </div>
        <div className="mt-4 block">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${accent}`}>{item.tag}</p>
            {size && size !== 'Other' ? (
              <span className={`text-[0.65rem] uppercase tracking-[0.14em] ${muted}`}>{size}</span>
            ) : null}
            {kit !== 'Other' ? (
              <span className={`text-[0.65rem] uppercase tracking-[0.14em] ${muted}`}>{kit}</span>
            ) : null}
            {used ? (
              <span className={`text-[0.65rem] uppercase tracking-[0.14em] ${muted}`}>{condition}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onQuickView(item)}
            className={`mt-1.5 block text-left text-[0.95rem] font-medium leading-snug outline-none focus-visible:ring-2 focus-visible:ring-crimson md:text-base ${titleTone}`}
          >
            {shortTitle(item.title)}
          </button>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={`font-display text-2xl font-bold tracking-wide md:text-[1.65rem] ${priceTone}`}>
              {formatPrice(item.price, item.currency)}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className={`text-[0.65rem] font-bold uppercase tracking-[0.14em] ${accent}`}
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => onQuickView(item)}
              className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${muted}`}
            >
              Details
            </button>
            {buyUrl ? (
              <button
                type="button"
                onClick={() => {
                  track('product_click', { id: item.id, tag: item.tag, place: 'buy_now' })
                  onBuyNow(item)
                }}
                className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] underline-offset-2 hover:underline ${muted}`}
              >
                Buy now
              </button>
            ) : null}
          </div>
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
    <div className="fixed inset-0 z-[58] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label="Product quick view">
      <button type="button" className="absolute inset-0 bg-navy-deep/60" aria-label="Close quick view" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden bg-cream shadow-2xl sm:max-h-[88dvh] sm:flex-row">
        <div className="relative aspect-square w-full shrink-0 bg-mist sm:aspect-auto sm:h-auto sm:w-[48%]">
          <ProductGallery item={item} tone="light" eager controls />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-crimson">{item.tag}</p>
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
          <p className="mt-4 font-display text-3xl font-bold text-navy">{formatPrice(item.price, item.currency)}</p>
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
  const [navSolid, setNavSolid] = useState(false)
  const [tagFilter, setTagFilter] = useState<TypeFilterId | string>('All')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All')
  const [sizeFilter, setSizeFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>('All')
  /** Text currently typed in the sticky search bar (filters live as you type). */
  const [query, setQuery] = useState('')
  /** Query applied to inventory — kept in sync while typing; Enter still scrolls to results. */
  const [appliedQuery, setAppliedQuery] = useState('')
  const deferredQuery = useDeferredValue(appliedQuery)

  useEffect(() => {
    setAppliedQuery(query)
  }, [query])
  const [menuOpen, setMenuOpen] = useState(false)
  const [cart, setCart] = useState<CartState>(() => readCart())
  const [cartOpen, setCartOpen] = useState(false)
  const [cartToast, setCartToast] = useState<string | null>(null)
  const [trendingFilter, setTrendingFilter] = useState<'All' | 'Youth' | 'Training' | 'Jerseys' | 'Sale'>('All')
  const [clubFilter, setClubFilter] = useState<string>('All')
  const [leagueFilter, setLeagueFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortId>('featured')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quickView, setQuickView] = useState<Listing | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecentlyViewed())
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerMode, setOfferMode] = useState<'offer' | 'email-gate'>('offer')
  const [offerActive, setOfferActive] = useState(
    () => readOffer().activated && !hasPurchased(),
  )
  const [pendingBuy, setPendingBuy] = useState<Listing | null>(null)
  const [soldIds, setSoldIds] = useState<Set<string>>(() => new Set(readLocalSoldOutIds()))
  const [inventoryPage, setInventoryPage] = useState(1)
  const urlHydrated = useRef(false)

  useEffect(() => {
    initAnalytics()
    track('page_view', { page: 'landing' })
    const purchased = capturePurchaseReturnFromUrl()
    if (purchased) setOfferActive(false)
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
    const syncOffer = () => setOfferActive(readOffer().activated && !hasPurchased())
    window.addEventListener('jerseydeals:offer', syncOffer)
    window.addEventListener('jerseydeals:purchased', syncOffer)
    return () => {
      window.removeEventListener('jerseydeals:offer', syncOffer)
      window.removeEventListener('jerseydeals:purchased', syncOffer)
    }
  }, [])

  useEffect(() => {
    if (loadState !== 'ready') return
    if (hasPurchased()) return
    if (readOffer().activated) return
    try {
      if (sessionStorage.getItem('jerseydeals.offer.dismissed') === '1') return
    } catch {
      /* ignore */
    }
    // Wait until inventory is painted so the modal + body lock don't fight first paint on iOS.
    const timer = window.setTimeout(() => {
      setOfferMode('offer')
      setOfferOpen(true)
      track('offer_popup_shown', {})
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [loadState])

  function hasCheckoutEmail() {
    return Boolean(readBuyerEmail() || readOffer().email)
  }

  function requestCheckoutAccess() {
    if (hasCheckoutEmail()) return true
    setPendingBuy(null)
    setOfferMode('email-gate')
    setOfferOpen(true)
    return false
  }

  function handleBuyNow(item: Listing) {
    if (!hasCheckoutEmail()) {
      setPendingBuy(item)
      setOfferMode('email-gate')
      setOfferOpen(true)
      return
    }
    const discounted = readOffer().activated
    const url = listingBuyUrl(item, { discounted })
    if (!url) return
    track('buy_now', { id: item.id, discounted })
    // Keep bag lines until Square return (?purchase= / ?sold=) confirms the sale.
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function dismissOfferModal() {
    if (offerMode === 'offer') {
      try {
        sessionStorage.setItem('jerseydeals.offer.dismissed', '1')
      } catch {
        /* ignore */
      }
    }
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

  useEffect(() => {
    const onScroll = () => {
      setNavSolid(window.scrollY > 48)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const itemCount = cartCount(cart)

  function handleAddToCart(item: Listing) {
    const productUrl = listingProductPageUrl(item, SQUARE_STORE_URL)
    const next = addListingToCart(item, productUrl || undefined)
    setCart(next)
    setCartOpen(true)
    setCartToast(`Added · ${shortTitle(item.title)}`)
    setRecentIds(pushRecentlyViewed(item.id))
    track('add_to_cart', { id: item.id, tag: item.tag })
    window.setTimeout(() => setCartToast(null), 2200)
  }

  function handleQuickView(item: Listing) {
    setQuickView(item)
    setRecentIds(pushRecentlyViewed(item.id))
    track('quick_view', { id: item.id, tag: item.tag })
  }

  const onSquare = Boolean(SQUARE_STORE_URL || isSquareCatalog(catalog))
  const ebayShop = catalog?.source === 'square' ? EBAY_SHOP_URL : catalog?.shopUrl ?? EBAY_SHOP_URL
  const ebaySeller = catalog?.source === 'square' ? EBAY_SELLER_URL : catalog?.sellerUrl ?? EBAY_SELLER_URL
  const listings = useMemo(() => {
    const rows = (catalog?.listings ?? []).filter((item) => !isListingSoldOut(item, soldIds))
    return dedupeListingsByTitle(rows)
  }, [catalog, soldIds])
  const featured = useMemo(() => pickFeatured(listings, 6), [listings])
  const newDrops = useMemo(() => pickNewDrops(listings, 4), [listings])
  const salePicks = useMemo(() => pickSaleItems(listings, 4), [listings])
  const trainingPicks = useMemo(
    () => listings.filter((item) => item.tag === 'Training').slice(0, 4),
    [listings],
  )
  const saleFloor = lowestSalePrice(listings)
  const clubsData = useMemo<ClubInfo[]>(() => clubsInStock(listings), [listings])
  const leaguesData = useMemo<LeagueInfo[]>(() => leaguesInStock(listings), [listings])
  const eplClubs = useMemo<ClubInfo[]>(() => premierLeagueClubsInStock(listings), [listings])
  const trendingPicks = useMemo(() => pickTrending(listings, 8), [listings])
  const channelLabel = onSquare ? 'Square' : 'eBay'
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
      if (genderFilter === 'Youth' && !isYouthListing(item)) return false
      if (sizeFilter !== 'All' && listingSize(item) !== sizeFilter) return false
      if (brandFilter !== 'All' && item.brand !== brandFilter) return false
      if (clubFilter !== 'All' && inferClub(item.title)?.id !== clubFilter) return false
      if (!matchesLeagueFilter(item, leagueFilter)) return false
      if (!matchesPriceFilter(item, priceFilter)) return false
      return matchesListingQuery(item, deferredQuery)
    })
    return sortListings(rows, sortBy)
  }, [
    listings,
    tagFilter,
    genderFilter,
    sizeFilter,
    brandFilter,
    clubFilter,
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
        label: genderFilter === 'Men' ? "Men's" : 'Youth',
        clear: () => setGenderFilter('All'),
      })
    }
    if (tagFilter !== 'All') chips.push({ key: 'tag', label: tagFilter, clear: () => setTagFilter('All') })
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
        label: leaguesData.find((l) => l.id === leagueFilter)?.name ?? leagueFilter,
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
    // Search chip is rendered separately under all filter rows.
    return chips
  }, [
    genderFilter,
    tagFilter,
    priceFilter,
    sizeFilter,
    brandFilter,
    clubFilter,
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
    setGenderFilter('All')
    setClubFilter('All')
    setLeagueFilter('All')
    setQuery('')
    setAppliedQuery('')
    setSortBy('featured')
  }

  const deferredHint = useMemo(() => {
    const q = deferredQuery.trim()
    if (!q && genderFilter === 'All') return `${listings.length} items`
    if (!q) {
      const genderLabel = genderFilter === 'Men' ? "men's" : genderFilter.toLowerCase()
      return `${filtered.length} ${genderLabel} item${filtered.length === 1 ? '' : 's'}`
    }
    return `${filtered.length} result${filtered.length === 1 ? '' : 's'} for “${q}”`
  }, [deferredQuery, filtered.length, listings.length, genderFilter])

  function scrollToInventoryBrowse(opts?: { focusSearch?: boolean }) {
    setFiltersOpen(true)
    const run = () => {
      // Always land on the product grid (below filters), for search and every inventory CTA.
      const target =
        document.getElementById('inventory-results') || document.getElementById('inventory-browse')
      if (!target) return
      const header = document.querySelector('header')
      const headerH = header instanceof HTMLElement ? header.getBoundingClientRect().height : 120
      const top = window.scrollY + target.getBoundingClientRect().top - headerH - 8
      // iOS Safari can crash when smooth programmatic scrolls stack with sticky chrome.
      const preferSmooth =
        typeof window !== 'undefined' &&
        !/iP(hone|ad|od)|Macintosh.*Mobile/.test(navigator.userAgent)
      window.scrollTo({ top: Math.max(0, top), behavior: preferSmooth ? 'smooth' : 'auto' })
      if (opts?.focusSearch) document.getElementById('sticky-search')?.focus({ preventScroll: true })
    }
    // Wait for filter panel / chips to layout before scrolling to products.
    requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(run, 50)))
  }

  /** Apply sticky search + jump to product results — only from Enter / blue button. */
  function activateSearch(opts?: { focusSearch?: boolean }) {
    setAppliedQuery(query.trim())
    scrollToInventoryBrowse({ focusSearch: opts?.focusSearch })
  }

  function goInventory(next?: {
    tag?: string
    brand?: string
    price?: PriceFilterId
    query?: string
    audience?: GenderFilter | 'Adult'
    gender?: GenderFilter
    clubId?: string
    leagueId?: string
    reset?: boolean
    focusSearch?: boolean
  }) {
    if (next?.reset) {
      setSizeFilter('All')
      setBrandFilter('All')
      setPriceFilter('All')
      setQuery('')
      setAppliedQuery('')
      setTagFilter('All')
      setGenderFilter('All')
      setClubFilter('All')
      setLeagueFilter('All')
      setSortBy('featured')
    }
    if (next?.tag !== undefined) setTagFilter(next.tag)
    if (next?.brand !== undefined) setBrandFilter(next.brand)
    if (next?.price !== undefined) setPriceFilter(next.price)
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
    if (gender === 'Men' || gender === 'Youth' || gender === 'All') setGenderFilter(gender)
    else if (gender === 'Adult') setGenderFilter('Men')
    if (tag) setTagFilter(tag)
    if (size) setSizeFilter(size)
    if (brand) setBrandFilter(brand)
    if (price && PRICE_FILTERS.some((row) => row.id === price)) setPriceFilter(price as PriceFilterId)
    if (club) setClubFilter(club)
    if (league) setLeagueFilter(league)
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
    if (clubFilter !== 'All') params.set('club', clubFilter)
    if (leagueFilter !== 'All') params.set('league', leagueFilter)
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
    clubFilter,
    leagueFilter,
    sortBy,
  ])

  const heroImage = asset('hero-jersey.jpg')
  const bagSubtotal = useMemo(() => {
    if (!offerActive) return cartSubtotal(cart)
    return cart.lines.reduce((sum, line) => {
      const unit = applyFirstBuyerDiscount(line.price)
      if (unit == null) return sum
      return sum + unit * Math.max(1, line.quantity || 1)
    }, 0)
  }, [cart, offerActive])

  const navLinks = [
    { href: '#collections', label: 'Collections' },
    { href: '#epl', label: 'EPL' },
    { href: '#shop', label: 'Shop' },
    { href: '#inventory', label: 'Inventory' },
    { href: '#rewards', label: 'Rewards' },
    { href: '#size-guide', label: 'Sizing' },
  ]

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      {/* Promo bar — always on top */}
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-x-2 overflow-x-auto bg-crimson px-3 py-2 text-center font-brand text-[0.65rem] font-bold uppercase tracking-[0.14em] text-cream sm:gap-x-3 sm:px-4 sm:text-xs sm:tracking-[0.18em]">
        <span>{PROMO_BAR}</span>
        <span className="text-cream/70" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1">
            Buy from
            <svg
              viewBox="0 0 12 12"
              className="h-2.5 w-2.5 shrink-0 text-cream/90"
              fill="currentColor"
              aria-hidden
            >
              <path d="M6 9.5 1.5 4h9L6 9.5Z" />
            </svg>
          </span>
          <span className="inline-flex items-center gap-2 normal-case tracking-normal">
            <a
              href={SQUARE_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('outbound_click', { place: 'promo_bar', channel: 'square' })}
              className="underline decoration-cream/70 underline-offset-4 transition hover:decoration-cream"
            >
              Square
            </a>
            <span className="text-cream/70" aria-hidden>
              ·
            </span>
            <a
              href={ebayShop}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('outbound_click', { place: 'promo_bar', channel: 'ebay' })}
              className="underline decoration-cream/70 underline-offset-4 transition hover:decoration-cream"
            >
              eBay
            </a>
          </span>
        </span>
      </div>

      <a
        href="#inventory"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to inventory
      </a>

      <header
        className={`fixed inset-x-0 top-9 z-40 transition duration-300 ${
          navSolid
            ? 'border-b border-navy/10 bg-cream/95 text-navy shadow-[0_1px_0_rgba(11,34,63,0.06)] backdrop-blur-md'
            : 'bg-transparent text-white'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <a
            href="#top"
            className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-crimson"
          >
            <BrandMark
              size="sm"
              withWordmark
              wordmarkTone={navSolid ? 'navy' : 'white'}
            />
          </a>
          <nav className="hidden items-center gap-6 xl:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  navSolid ? 'text-navy/70 hover:text-navy' : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div
              className={`hidden items-center gap-2 text-xs font-semibold tracking-wide sm:inline-flex ${
                navSolid ? 'text-navy/70' : 'text-white/75'
              }`}
            >
              <a
                href={SQUARE_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('outbound_click', { place: 'header', channel: 'square' })}
                className={`underline underline-offset-4 transition ${
                  navSolid
                    ? 'decoration-navy/35 hover:text-navy hover:decoration-crimson'
                    : 'decoration-white/45 hover:text-white hover:decoration-white'
                }`}
              >
                Square
              </a>
              <span aria-hidden>·</span>
              <a
                href={ebayShop}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('outbound_click', { place: 'header', channel: 'ebay' })}
                className={`underline underline-offset-4 transition ${
                  navSolid
                    ? 'decoration-navy/35 hover:text-navy hover:decoration-crimson'
                    : 'decoration-white/45 hover:text-white hover:decoration-white'
                }`}
              >
                eBay
              </a>
            </div>
            <button
              type="button"
              aria-label={`Open cart, ${itemCount} items`}
              onClick={() => {
                setCartOpen(true)
                track('cart_open', { place: 'header', items: itemCount })
              }}
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition ${
                navSolid ? 'text-navy hover:text-crimson' : 'text-white hover:text-cream'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
                aria-hidden
              >
                <path d="M6 6h15l-1.5 9h-12z" />
                <path d="M6 6 5 3H2" />
                <circle cx="9" cy="20" r="1.25" fill="currentColor" stroke="none" />
                <circle cx="18" cy="20" r="1.25" fill="currentColor" stroke="none" />
              </svg>
              Cart
              {itemCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[0.65rem] font-bold text-cream">
                  {itemCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'header' })
                goInventory({ reset: true })
              }}
              className={`hidden px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition md:inline-flex ${
                navSolid
                  ? 'bg-crimson text-white hover:bg-crimson-hot'
                  : 'border border-white/40 text-white hover:border-white hover:bg-white/10'
              }`}
            >
              Browse kits
            </button>
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="grid h-9 w-9 place-items-center xl:hidden"
            >
              <span className="flex flex-col gap-[5px]">
                <span className={`block h-0.5 w-5 transition ${navSolid ? 'bg-navy' : 'bg-white'}`} />
                <span className={`block h-0.5 w-5 transition ${navSolid ? 'bg-navy' : 'bg-white'}`} />
                <span className={`block h-0.5 w-5 transition ${navSolid ? 'bg-navy' : 'bg-white'}`} />
              </span>
            </button>
          </div>
        </div>

        <div
          className={`border-t transition ${
            navSolid ? 'border-navy/10 bg-cream/95' : 'border-white/10 bg-navy-deep/55 backdrop-blur-md'
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2.5 md:px-8">
            <form
              className="relative min-w-0 flex-1"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault()
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
                  placeholder="Search club, player, league, nickname…"
                  enterKeyHint="search"
                  className={`w-full border py-2.5 pl-4 pr-[5.75rem] text-base outline-none transition placeholder:opacity-60 focus:ring-2 focus:ring-crimson/30 ${
                    navSolid
                      ? 'border-navy/15 bg-white text-navy placeholder:text-muted'
                      : 'border-white/35 bg-white/15 text-white placeholder:text-white/75'
                  }`}
                />
              </label>
              <button
                type="submit"
                aria-label="Search"
                title="Enter"
                className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-[#2563eb] px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition hover:bg-[#1d4ed8] active:bg-[#1e40af]"
              >
                Enter
                <span aria-hidden className="text-sm font-semibold leading-none">
                  ↵
                </span>
              </button>
            </form>
            <p
              className={`hidden shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] sm:block ${
                navSolid ? 'text-muted' : 'text-white/80'
              }`}
            >
              {deferredHint}
            </p>
            {query || appliedQuery ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setAppliedQuery('')
                }}
                className={`shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                  navSolid ? 'text-crimson' : 'text-crimson-hot'
                }`}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top" className="pb-40 md:pb-24">
        {/* Hero */}
        <section className="relative min-h-[100svh] overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            <motion.img
              key={heroImage}
              src={heroImage}
              alt=""
              initial={reduce ? false : { scale: 1.06, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0 : 1.1, ease }}
              className="h-full w-full object-cover object-center"
              decoding="async"
              fetchPriority="high"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/80 to-navy-deep/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-navy-deep/45" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-24 pt-44 md:justify-center md:px-8 md:pb-28 md:pt-48">
            <motion.div
              className="max-w-2xl"
              initial={reduce ? false : { opacity: 0.001, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease }}
            >
              <BrandMark size="hero" className="drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]" />
              <h1 className="mt-6 max-w-xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-wide text-cream sm:text-6xl md:text-7xl">
                Jersey Deals
              </h1>
              <div className="brand-rule mt-4" aria-hidden />
              <p className="mt-4 max-w-md font-brand text-base leading-relaxed text-cream/80 md:text-lg">
                Club, country, and training jerseys — photographed from our inventory and sold direct.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'hero_primary' })
                    goInventory({ reset: true })
                  }}
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="inline-flex bg-crimson px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot"
                >
                  Browse kits
                </motion.button>
                <a
                  href="#collections"
                  onClick={() => track('cta_click', { place: 'hero_secondary' })}
                  className="inline-flex border border-cream/40 px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-cream transition hover:border-cream hover:bg-cream/10"
                >
                  Explore
                </a>
              </div>
            </motion.div>
          </div>

          <a
            href="#collections"
            className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/80 transition hover:text-white md:bottom-6"
            aria-label="Scroll to collections"
          >
            <span className="flex flex-col items-center gap-2">
              Scroll
              <motion.span
                aria-hidden
                animate={reduce ? undefined : { y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className="block h-7 w-px bg-white/45"
              />
            </span>
          </a>
        </section>

        <CollectionsRail
          onSelect={(action, id, label) => {
            track('category_click', { category: 'collection_rail', collection: id, label })
            goInventory({
              reset: action.reset ?? true,
              brand: action.brand,
              tag: action.tag,
              price: action.price === 'All' ? undefined : action.price,
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
          <img
            src={asset('epl-kits-bg.jpg')}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-luminosity"
            loading="lazy"
            decoding="async"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(110deg, rgba(55,0,60,.92) 0%, rgba(55,0,60,.78) 48%, rgba(26,5,32,.55) 100%)',
            }}
          />
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
                Latest home-kit looks for the clubs we stock — tap a crest lane to shop that side.
              </p>
              <a
                href="#epl-clubs"
                onClick={(e) => {
                  e.preventDefault()
                  track('cta_click', { place: 'shop_epl' })
                  document.getElementById('epl-clubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="mt-6 inline-flex px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                style={{ background: PL_PURPLE_SOFT, boxShadow: '0 0 0 1px rgba(255,255,255,.22)' }}
              >
                Shop EPL
              </a>
            </motion.div>

            <div id="epl-clubs" className="mt-14 scroll-mt-48">
              <p className="eyebrow text-white/85">Clubs in stock</p>
              {eplClubs.length > 0 ? (
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
                  {eplClubs.map((club, i) => {
                    const kitSrc = asset(EPL_KIT_IMAGE[club.id] || 'product-home.jpg')
                    const nameColor = EPL_TEAM_COLOR[club.id] || '#0b223f'
                    return (
                      <motion.li key={club.id} {...fadeUp(reduce, 0.04 * i)}>
                        <button
                          type="button"
                          onClick={() => {
                            track('category_click', { category: 'epl_club', club: club.id })
                            goInventory({
                              reset: true,
                              clubId: club.id,
                              leagueId: 'premier-league',
                              query: club.name,
                            })
                          }}
                          className="group flex w-full flex-col overflow-hidden border-2 bg-white text-left outline-none transition focus-visible:ring-2 focus-visible:ring-offset-1"
                          style={{ borderColor: nameColor }}
                        >
                          <div className="aspect-square overflow-hidden bg-[#120018]">
                            <img
                              src={kitSrc}
                              alt=""
                              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="bg-cream px-3 py-3">
                            <p
                              className="font-display text-sm font-bold uppercase tracking-wide"
                              style={{ color: nameColor }}
                            >
                              {club.name}
                            </p>
                            <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-muted">
                              {club.count} kit{club.count === 1 ? '' : 's'} · shop
                            </p>
                          </div>
                        </button>
                      </motion.li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-4 font-brand text-white/90">Premier League kits will appear here when in stock.</p>
              )}
            </div>
          </div>
        </section>

        {/* Editorial shop paths */}
        <section id="shop" className="scroll-mt-44 bg-cream py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <div className="brand-rule" aria-hidden />
              <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Shop the floor
              </h2>
              <p className="mt-3 font-brand text-lg text-muted">
                Country kits, sale racks, or the full live catalog — pick a path.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2 md:gap-5">
              {/* Large youth tile */}
              <motion.button
                type="button"
                onClick={() => {
                  track('category_click', { category: 'category_youth' })
                  goInventory({ audience: 'Youth', reset: true })
                }}
                {...fadeUp(reduce, 0.05)}
                className="group relative min-h-[320px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:col-span-7 md:row-span-2 md:min-h-[560px]"
              >
                <img
                  src={asset('category-youth.jpg')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-7 md:p-10">
                  <p className="eyebrow text-white/70">Youth</p>
                  <p className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-white md:text-6xl">
                    Youth apparel
                  </p>
                  <span className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Shop youth →
                  </span>
                </div>
              </motion.button>

              {/* Sale */}
              {onSquare ? (
                <motion.button
                  type="button"
                  onClick={() => {
                    track('category_click', { category: 'category_sale' })
                    goInventory({ price: 'under-25', reset: true })
                  }}
                  {...fadeUp(reduce, 0.1)}
                  className="group relative min-h-[240px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:col-span-5"
                >
                  <img
                    src={asset('category-sale.jpg')}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                    <p className="eyebrow text-crimson-hot">{SALE_URGENCY}</p>
                    <p className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-white md:text-4xl">
                      {SALE_HEADLINE}
                    </p>
                    <span className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Shop sale kits →
                    </span>
                  </div>
                </motion.button>
              ) : (
                <motion.a
                  href={EBAY_SALE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('category_click', { category: 'category_sale' })}
                  {...fadeUp(reduce, 0.1)}
                  className="group relative min-h-[240px] overflow-hidden bg-navy outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:col-span-5"
                >
                  <img
                    src={asset('category-sale.jpg')}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                    <p className="eyebrow text-crimson-hot">{SALE_URGENCY}</p>
                    <p className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-white md:text-4xl">
                      {SALE_HEADLINE}
                    </p>
                  </div>
                </motion.a>
              )}

              {/* Full catalog */}
              <motion.button
                type="button"
                onClick={() => {
                  track('category_click', { category: 'category_all' })
                  goInventory({ tag: 'All', reset: true })
                }}
                {...fadeUp(reduce, 0.14)}
                className="group relative min-h-[240px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:col-span-5"
              >
                <img
                  src={asset('category-catalog.jpg')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                  <p className="eyebrow text-white/70">Inventory</p>
                  <p className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-white md:text-4xl">
                    Full catalog
                  </p>
                </div>
              </motion.button>
            </div>
          </div>
        </section>

        {/* New drops */}
        <section id="new-drops" className="cv-auto scroll-mt-44 bg-white py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="flex flex-col gap-4 border-b border-navy/10 pb-8 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <p className="eyebrow text-crimson">Just in</p>
                <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                  New drops
                </h2>
                <p className="mt-3 max-w-xl text-muted">
                  Fresh arrivals from the rack — newest active listings first.
                </p>
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
              <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {newDrops.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.06} tone="light" onAddToCart={handleAddToCart} onQuickView={handleQuickView} onBuyNow={handleBuyNow} />
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
          <section id="trending" className="cv-auto scroll-mt-44 bg-mist py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div
                {...fadeUp(reduce)}
                className="flex flex-col gap-4 border-b border-navy/10 pb-8 md:flex-row md:items-end md:justify-between"
              >
                <div>
                  <p className="eyebrow text-crimson">Trending</p>
                  <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                    Trending now
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['All', 'Youth', 'Training', 'Jerseys', 'Sale'] as const).map((f) => (
                    <FilterChip
                      key={f}
                      label={f}
                      active={trendingFilter === f}
                      onClick={() => setTrendingFilter(f)}
                    />
                  ))}
                </div>
              </motion.div>
              {(() => {
                const filtered = trendingPicks.filter((item) => {
                  if (trendingFilter === 'All') return true
                  if (trendingFilter === 'Sale') return isSaleListing(item)
                  return item.tag === trendingFilter
                })
                return filtered.length > 0 ? (
                  <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                    {filtered.slice(0, 8).map((item, i) => (
                      <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} tone="light" onAddToCart={handleAddToCart} onQuickView={handleQuickView} onBuyNow={handleBuyNow} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-12 text-muted">No trending items match that filter.</p>
                )
              })()}
            </div>
          </section>
        )}

        {/* Lookbook campaign */}
        <section className="cv-auto relative min-h-[70svh] overflow-hidden bg-navy-deep text-white md:min-h-[80svh]">
          <img
            src={asset('lookbook-matchday.jpg')}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/90 via-navy-deep/55 to-transparent" />
          <div className="relative z-10 mx-auto flex min-h-[70svh] max-w-6xl items-end px-5 py-16 md:min-h-[80svh] md:px-8 md:py-24">
            <motion.div {...fadeUp(reduce)} className="max-w-lg">
              <p className="eyebrow text-crimson-hot">Lookbook</p>
              <h2 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide md:text-7xl">
                Built for matchday.
              </h2>
              <p className="mt-4 text-base text-white/75 md:text-lg">
                Training tops, pre-match layers, and home kits — selected from live stock, not stock
                photos.
              </p>
              <a
                href="#featured"
                onClick={() => track('cta_click', { place: 'lookbook' })}
                className="mt-8 inline-flex border border-white/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white hover:bg-white/10"
              >
                View featured kits
              </a>
            </motion.div>
          </div>
        </section>

        {/* Training edit */}
        {trainingPicks.length > 0 ? (
          <section id="training" className="cv-auto scroll-mt-44 bg-mist py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div
                {...fadeUp(reduce)}
                className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
              >
                <div>
                  <p className="eyebrow text-crimson">Training</p>
                  <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                    Pre-match &amp; training tops
                  </h2>
                  <p className="mt-3 max-w-xl text-muted">
                    Warm-ups and strike layers from the clubs you follow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goInventory({ tag: 'Training', reset: true })}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-navy underline decoration-crimson/50 underline-offset-4 hover:decoration-crimson"
                >
                  View all training →
                </button>
              </motion.div>
              <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {trainingPicks.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} tone="light" onAddToCart={handleAddToCart} onQuickView={handleQuickView} onBuyNow={handleBuyNow} />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Featured */}
        <section id="featured" className="cv-auto scroll-mt-44 bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="eyebrow text-crimson-hot">Selected</p>
              <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide md:text-7xl">
                Featured gear
              </h2>
              <p className="mt-4 text-lg text-white/65">
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
              <ul className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} onAddToCart={handleAddToCart} onQuickView={handleQuickView} onBuyNow={handleBuyNow} />
                ))}
              </ul>
            )}

            {listings.length > featured.length && (
              <motion.div {...fadeUp(reduce, 0.15)} className="mt-14 flex flex-wrap gap-3">
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

        {/* Shop by brand */}
        {availableBrands.length > 0 && (
          <section id="brands" className="scroll-mt-44 border-y border-navy/10 bg-white py-16 md:py-20">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div {...fadeUp(reduce)}>
                <p className="eyebrow text-crimson">Brands</p>
                <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  Shop by maker
                </h2>
              </motion.div>
              <ul className="mt-10 grid gap-3 sm:grid-cols-3">
                {availableBrands.map((brand, i) => (
                  <motion.li key={brand} {...fadeUp(reduce, i * 0.05)}>
                    <button
                      type="button"
                      onClick={() => {
                        track('brand_click', { brand })
                        goInventory({ brand, tag: 'All', reset: true })
                        setBrandFilter(brand)
                      }}
                      className="group flex w-full items-center justify-between border border-navy/10 bg-chalk px-5 py-5 text-left transition hover:border-navy/30 hover:bg-white"
                    >
                      <span className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                        {brand}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted transition group-hover:text-crimson">
                        Shop →
                      </span>
                    </button>
                  </motion.li>
                ))}
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
                  Click a club to filter our full inventory.
                </p>
              </motion.div>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {clubsData.map((club, i) => (
                  <motion.li key={club.id} {...fadeUp(reduce, i * 0.04)}>
                    <button
                      type="button"
                      onClick={() => {
                        track('club_click', { club: club.id })
                        goInventory({ clubId: club.id, reset: true })
                      }}
                      className="group relative w-full overflow-hidden bg-navy outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-navy-deep">
                        <img
                          src={club.image}
                          alt={club.name}
                          className="h-full w-full object-contain object-center transition duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/25 to-transparent" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                        <p className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-white">
                          {club.name}
                        </p>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/60">
                          {club.count} {club.count === 1 ? 'listing' : 'listings'}
                        </p>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
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
              <p className="mt-4 text-lg text-white/80">
                {saleFloor != null
                  ? `${SALE_URGENCY}. Starting at ${formatPrice(saleFloor, 'USD')}.`
                  : SALE_URGENCY}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'sale_banner' })
                    goInventory({ price: 'under-25', reset: true })
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
                <p className="mt-2 text-white/65">Under $25 from live inventory.</p>
              </motion.div>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {salePicks.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} onAddToCart={handleAddToCart} onQuickView={handleQuickView} onBuyNow={handleBuyNow} />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Category lookbook strip */}
        <section aria-label="Kit categories" className="grid grid-cols-1 md:grid-cols-3">
          {[
            {
              src: asset('product-training.jpg'),
              label: 'Training',
              onClick: () => {
                track('category_click', { category: 'lookbook_training' })
                goInventory({ tag: 'Training', reset: true })
              },
            },
            {
              src: asset('product-hoodie.jpg'),
              label: 'Apparel',
              onClick: () => {
                track('category_click', { category: 'lookbook_apparel' })
                goInventory({ tag: 'Apparel', reset: true })
              },
            },
            {
              src: asset('product-home.jpg'),
              label: 'Matchday',
              onClick: () => {
                track('category_click', { category: 'lookbook_matchday' })
                goInventory({ tag: 'Jerseys', reset: true })
              },
            },
          ].map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              className="group relative min-h-[280px] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson md:min-h-[380px]"
            >
              <img
                src={tile.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-navy-deep/40 transition group-hover:bg-navy-deep/55" />
              <span className="relative flex h-full items-end p-6 font-display text-3xl font-bold uppercase tracking-wide text-white md:p-8 md:text-4xl">
                {tile.label}
              </span>
            </button>
          ))}
        </section>

        {/* Full inventory — filters first, results directly below (search scrolls here). */}
        <section id="inventory" className="cv-auto scroll-mt-48 bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div id="inventory-browse" className="scroll-mt-48">
              <motion.div {...fadeUp(reduce)} className="max-w-2xl">
                <p className="eyebrow text-crimson">Catalog</p>
                <div className="brand-rule mt-3" aria-hidden />
                <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  Full inventory
                </h2>
                <p className="mt-3 font-brand text-lg text-muted">
                  Filter live stock, add to cart, then checkout securely on {channelLabel}.
                </p>
              </motion.div>

              {loadState === 'ready' && listings.length > 0 && (
                <motion.div {...fadeUp(reduce, 0.08)} className="mt-6 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted">
                      Showing {filtered.length} of {listings.length}
                      {deferredHint.includes('result') ? ` · ${deferredHint}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
                        Sort
                        <select
                          value={sortBy}
                          onChange={(e) => {
                            setSortBy(e.target.value as SortId)
                            track('sort_change', { sort: e.target.value })
                          }}
                          className="border border-navy/15 bg-white px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-navy outline-none focus:ring-2 focus:ring-crimson/30"
                        >
                          {SORT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="border border-navy/15 px-2.5 py-1 font-brand text-[0.65rem] font-bold uppercase tracking-[0.12em] text-navy md:hidden"
                        aria-expanded={filtersOpen}
                        onClick={() => setFiltersOpen((open) => !open)}
                      >
                        {filtersOpen ? 'Hide filters' : 'Filters'}
                        {filterChipCount > 0 ? ` · ${filterChipCount}` : ''}
                      </button>
                    </div>
                  </div>

                  {activeFilterChips.length > 0 ? (
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
                      {!searchFilterChip ? (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-crimson"
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className={`space-y-2 ${
                      filtersOpen || deferredQuery.trim() ? 'block' : 'hidden md:block'
                    }`}
                  >
                    <FilterRow label="Gender">
                      {(
                        [
                          { id: 'All', label: 'All' },
                          { id: 'Men', label: "Men's" },
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
                    </FilterRow>

                    <FilterRow label="Type">
                      {TYPE_FILTERS.map((option) => (
                        <FilterChip
                          key={option.id}
                          label={option.label}
                          active={tagFilter === option.id}
                          onClick={() => setTagFilter(option.id)}
                        />
                      ))}
                    </FilterRow>

                    {leaguesData.length > 0 ? (
                      <FilterRow label="League">
                        <FilterChip
                          label="All"
                          active={leagueFilter === 'All'}
                          onClick={() => setLeagueFilter('All')}
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
                      </FilterRow>
                    ) : null}

                    <FilterRow label="Price">
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
                    </FilterRow>

                    {availableSizes.length > 1 ? (
                      <FilterRow label="Size">
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
                      </FilterRow>
                    ) : null}

                    {availableBrands.length > 0 ? (
                      <FilterRow label="Brand">
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
                      </FilterRow>
                    ) : null}

                    {searchFilterChip ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          key={searchFilterChip.key}
                          type="button"
                          onClick={searchFilterChip.clear}
                          className="border border-navy bg-navy px-2 py-0.5 font-brand text-[0.6rem] font-bold uppercase tracking-[0.1em] text-cream transition hover:bg-navy/80"
                        >
                          {searchFilterChip.label} ✕
                        </button>
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-crimson"
                        >
                          Clear all
                        </button>
                      </div>
                    ) : null}
                  </div>
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
                  <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleInventory.map((item) => (
                      <ProductLink
                        key={item.id}
                        item={item}
                        tone="light"
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
                <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                  {recentlyViewed.map((item, i) => (
                    <ProductLink
                      key={`recent-${item.id}`}
                      item={item}
                      reduce={reduce}
                      delay={i * 0.04}
                      tone="light"
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

        {/* Trust */}
        <section id="buy-direct" className="cv-auto bg-white">
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
              <p className="eyebrow text-crimson-hot">Why us</p>
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
        <section aria-label="How shopping works" className="border-y border-navy/10 bg-chalk py-16 md:py-20">
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
                Sizing &amp; shipping
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
        <section className="relative overflow-hidden bg-crimson py-24 text-white md:py-28">
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
            className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 md:flex-row md:items-center md:justify-between md:px-8"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <BrandMark size="lg" />
              <div>
                <p className="font-brand text-3xl font-bold uppercase tracking-[0.06em] text-cream md:text-4xl">
                  Jersey Deals
                </p>
                <p className="mt-3 max-w-md text-lg text-cream/90">
                  The kit shop is open — youth apparel, sale racks, and the full catalog.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'final' })
                goInventory({ reset: true })
              }}
              className="inline-flex shrink-0 bg-navy px-8 py-4 font-brand text-xs font-bold uppercase tracking-[0.18em] text-cream transition hover:bg-navy-deep"
            >
              Browse kits
            </button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-navy-deep py-14 pb-36 text-white/80 md:pb-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:px-8">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <p className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-cream">
                Jersey Deals
              </p>
            </div>
            <p className="mt-4 max-w-sm font-brand text-sm leading-relaxed text-cream/90">
              Premium kit shopping from live inventory — sold direct.
            </p>
            <p className="mt-4 text-sm">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-cream underline decoration-white/35 underline-offset-4 hover:decoration-white"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
          <div>
            <p className="eyebrow text-white/75">Shop</p>
            <ul className="mt-4 space-y-2 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow text-white/75">Discover</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="#clubs" className="hover:text-white">
                  Shop by club
                </a>
              </li>
              <li>
                <a href="#brands" className="hover:text-white">
                  Shop by brand
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'footer_youth' })
                    goInventory({ audience: 'Youth', reset: true })
                  }}
                  className="hover:text-white"
                >
                  Youth sizes
                </button>
              </li>
              <li>
                <a href="#size-guide" className="hover:text-white">
                  Size guide
                </a>
              </li>
              {trendingPicks.length > 0 ? (
                <li>
                  <a href="#trending" className="hover:text-white">
                    Trending
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="eyebrow text-white/75">Contact</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline decoration-white/35 underline-offset-4 hover:text-white hover:decoration-white"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={SQUARE_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('outbound_click', { place: 'footer', channel: 'square' })}
                  className="underline decoration-white/35 underline-offset-4 hover:text-white hover:decoration-white"
                >
                  Square
                </a>
              </li>
              <li>
                <a
                  href={ebayShop}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('outbound_click', { place: 'footer', channel: 'ebay' })}
                  className="underline decoration-white/35 underline-offset-4 hover:text-white hover:decoration-white"
                >
                  eBay
                </a>
              </li>
              <li>
                <a href={asset('privacy.html')} className="hover:text-white">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-6xl px-5 text-xs text-white/70 md:px-8">
          © {new Date().getFullYear()} JerseyDeals
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 md:bottom-0">
        <FreeShippingBar
          subtotal={bagSubtotal}
          currency={cart.lines[0]?.currency || 'USD'}
          className="border-t border-navy/15"
        />
        <div className="border-t border-cream/15 bg-navy-deep/95 p-3 backdrop-blur md:hidden">
        <div className="mb-2 flex items-center justify-center gap-3 text-xs font-semibold text-cream/85">
          <a
            href={SQUARE_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('outbound_click', { place: 'sticky_mobile', channel: 'square' })}
            className="underline decoration-cream/50 underline-offset-4"
          >
            Square
          </a>
          <span className="text-cream/70" aria-hidden>
            ·
          </span>
          <a
            href={ebayShop}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('outbound_click', { place: 'sticky_mobile', channel: 'ebay' })}
            className="underline decoration-cream/50 underline-offset-4"
          >
            eBay
          </a>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCartOpen(true)
              track('cart_open', { place: 'sticky_mobile', items: itemCount })
            }}
            className="flex flex-1 items-center justify-center gap-2 bg-crimson px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream"
          >
            Cart{itemCount > 0 ? ` · ${itemCount}` : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              track('cta_click', { place: 'sticky_mobile' })
              goInventory({ reset: true })
            }}
            className="flex flex-1 items-center justify-center bg-navy px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream"
          >
            Browse kits
          </button>
        </div>
        </div>
      </div>

      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onChangeQty={(id, quantity) => setCart(setCartLineQuantity(id, quantity))}
        onRemove={(id) => setCart(removeCartLine(id))}
        onClear={() => setCart(clearCart())}
        onRequestCheckout={requestCheckoutAccess}
        discountActive={offerActive}
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
          setOfferActive(true)
          setCartToast('10% first-time offer activated')
          window.setTimeout(() => setCartToast(null), 2200)
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
        <div className="fixed bottom-24 left-1/2 z-[56] w-[min(92vw,24rem)] -translate-x-1/2 border border-navy/10 bg-navy px-4 py-3 text-center font-brand text-xs font-bold uppercase tracking-[0.14em] text-cream shadow-lg md:bottom-6">
          {cartToast}
        </div>
      ) : null}

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[45] flex flex-col bg-cream xl:hidden"
          role="dialog"
          aria-modal
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between border-b border-navy/10 bg-cream px-5 py-4 pt-[calc(1rem+36px)]">
            <BrandMark size="sm" withWordmark wordmarkTone="navy" />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="grid h-9 w-9 place-items-center text-navy transition hover:text-crimson"
            >
              <span className="text-xl leading-none">✕</span>
            </button>
          </div>
          <nav className="flex flex-col divide-y divide-navy/10 overflow-y-auto px-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
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
