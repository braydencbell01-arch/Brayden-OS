import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { initAnalytics, track } from './analytics'
import {
  CONTACT_EMAIL,
  EBAY_SALE_URL,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  EBAY_SHOP_URL,
  FAMILY_NOTE,
  NEWSLETTER_INCENTIVE,
  PROMO_BAR,
  SALE_HEADLINE,
  SALE_URGENCY,
  SQUARE_STORE_URL,
} from './config'
import {
  clubsInStock,
  conditionLabel,
  formatPrice,
  isAdultListing,
  isSaleListing,
  isSquareCatalog,
  isYouthListing,
  kitType,
  listingBuyUrl,
  listingImages,
  listingSize,
  lowestSalePrice,
  matchesListingQuery,
  matchesPriceFilter,
  pickFeatured,
  pickNewDrops,
  pickSaleItems,
  pickTrending,
  PRICE_FILTERS,
  shortTitle,
  sortSizes,
  TAG_ORDER,
  type ClubInfo,
  type Listing,
  type ListingsPayload,
  type PriceFilterId,
} from './listings'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const FALLBACK_IMAGE = asset('product-home.jpg')
const LOGO_SRC = {
  sm: asset('logo-64.png'),
  md: asset('logo-192.png'),
  lg: asset('logo.png'),
} as const

type AudienceFilter = 'All' | 'Adult' | 'Youth'

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
  const src = size === 'sm' ? LOGO_SRC.sm : size === 'hero' || size === 'lg' ? LOGO_SRC.lg : LOGO_SRC.md
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
  loading,
  decoding,
  draggable,
}: {
  src: string
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'auto' | 'sync'
  draggable?: boolean
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
        <span className="px-4 text-center font-display text-lg uppercase tracking-wide text-white/55">
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
      onError={() => setFailed(true)}
    />
  )
}

const ease = [0.22, 1, 0.36, 1] as const

const BRAND_MARQUEE = [
  'Jersey Deals',
  'Nike',
  'Adidas',
  'Puma',
  'Club kits',
  'National teams',
  'Youth sizes',
  'Training',
  'Pre-match',
  'Sale rack',
]

const SERVICE_POINTS = [
  'Ships from US inventory',
  'Secure card checkout',
  'Real product photos',
  'Adult & youth sizing',
  'Authentic branded kits',
]

function fadeUp(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay: reduce ? 0 : delay, ease },
  }
}

function primaryShopUrl(catalog: ListingsPayload | null) {
  if (SQUARE_STORE_URL) return SQUARE_STORE_URL
  if (isSquareCatalog(catalog) && catalog?.shopUrl) return catalog.shopUrl
  return catalog?.shopUrl ?? EBAY_SHOP_URL
}

function shopLabel(catalog: ListingsPayload | null = null) {
  if (SQUARE_STORE_URL || isSquareCatalog(catalog)) return 'Shop now'
  return 'Shop on eBay'
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
      className={`border px-3.5 py-2 font-brand text-xs font-bold uppercase tracking-[0.14em] transition ${
        active
          ? 'border-navy bg-navy text-cream'
          : 'border-navy/15 text-navy/70 hover:border-navy/40 hover:text-navy'
      }`}
    >
      {label}
    </button>
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
      ? 'Checkout on our Square storefront with card. You can still buy select stock on eBay with eBay buyer protection.'
      : 'Checkout on eBay with card, PayPal, or other eBay payment options — buyer protection included. A Square direct storefront is coming next.',
  },
  {
    q: 'Where do you ship from?',
    a: 'Orders ship from our US inventory. Shipping speed and cost are shown at checkout on each listing.',
  },
  {
    q: 'What is your return policy?',
    a: 'Returns follow the policy on the listing checkout (Square or eBay). Message us before opening a case if something arrives not as described.',
  },
]

function ProductGallery({
  item,
}: {
  item: Listing
  tone?: 'dark' | 'light'
}) {
  const photos = listingImages(item)
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const go = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    const next = Math.min(photos.length - 1, Math.max(0, active + dir))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setActive(next)
  }

  if (photos.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy-deep to-navy p-6">
        <span className="font-display text-2xl uppercase text-white/70">{item.tag}</span>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div
        ref={trackRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={(event) => {
          const el = event.currentTarget
          const index = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
          setActive(Math.min(Math.max(index, 0), photos.length - 1))
        }}
        role="region"
        aria-label={`${shortTitle(item.title)} photos`}
      >
        {photos.map((src, index) => (
          <div key={`${item.id}-${index}`} className="relative h-full min-w-full shrink-0 snap-center">
            <SafeImage
              src={src}
              alt={index === 0 ? shortTitle(item.title) : `${shortTitle(item.title)} photo ${index + 1}`}
              className="h-full w-full object-cover object-top select-none"
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 ? (
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
            className="absolute left-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg leading-none text-navy shadow disabled:opacity-35"
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
            className="absolute right-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg leading-none text-navy shadow disabled:opacity-35"
          >
            ›
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
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
          <p className="pointer-events-none absolute bottom-3 right-3 z-20 bg-navy-deep/70 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
            {active + 1}/{photos.length}
          </p>
        </>
      ) : null}
    </div>
  )
}

function ProductLink({
  item,
  reduce,
  delay,
  tone = 'dark',
}: {
  item: Listing
  reduce: boolean | null
  delay: number
  tone?: 'dark' | 'light'
}) {
  const condition = conditionLabel(item.title)
  const buyUrl = listingBuyUrl(item)
  const kit = kitType(item)
  const onSale = isSaleListing(item)
  return (
    <motion.li {...fadeUp(reduce, delay)}>
      <div
        className={`group outline-none ${
          tone === 'dark' ? '' : ''
        }`}
      >
        <div className="relative aspect-square overflow-hidden bg-navy-deep">
          <ProductGallery item={item} tone={tone} />
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
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('product_click', { id: item.id, tag: item.tag })}
            className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-navy-deep/95 via-navy-deep/50 to-transparent p-4 pt-12 opacity-100 transition duration-300 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Shop →
            </span>
          </a>
        </div>
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('product_click', { id: item.id, tag: item.tag, place: 'title' })}
          className="mt-4 block outline-none focus-visible:ring-2 focus-visible:ring-crimson"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={`text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
                tone === 'dark' ? 'text-crimson-hot' : 'text-crimson'
              }`}
            >
              {item.tag}
            </p>
            <span className={`text-[0.65rem] uppercase tracking-[0.14em] ${tone === 'dark' ? 'text-white/40' : 'text-muted'}`}>
              {condition}
            </span>
            {kit !== 'Other' && (
              <span className={`text-[0.65rem] uppercase tracking-[0.14em] ${tone === 'dark' ? 'text-white/40' : 'text-muted'}`}>
                {kit}
              </span>
            )}
            {item.brand ? (
              <span className={`text-[0.65rem] uppercase tracking-[0.14em] ${tone === 'dark' ? 'text-white/40' : 'text-muted'}`}>
                {item.brand}
              </span>
            ) : null}
          </div>
          <h3
            className={`mt-1.5 text-[0.95rem] font-medium leading-snug md:text-base ${
              tone === 'dark' ? 'text-white/95' : 'text-navy'
            }`}
          >
            {shortTitle(item.title)}
          </h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-display text-2xl font-bold tracking-wide md:text-3xl ${
                tone === 'dark' ? 'text-white' : 'text-navy'
              }`}
            >
              {formatPrice(item.price, item.currency)}
            </span>
            <span className={`text-sm ${tone === 'dark' ? 'text-white/40' : 'text-muted'}`}>
              {item.note}
            </span>
          </p>
        </a>
      </div>
    </motion.li>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const [catalog, setCatalog] = useState<ListingsPayload | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent'>('idle')
  const [showSticky, setShowSticky] = useState(false)
  const [navSolid, setNavSolid] = useState(false)
  const [tagFilter, setTagFilter] = useState('All')
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('All')
  const [sizeFilter, setSizeFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>('All')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [menuOpen, setMenuOpen] = useState(false)
  const [trendingFilter, setTrendingFilter] = useState<'All' | 'Youth' | 'Training' | 'Jerseys' | 'Sale'>('All')

  useEffect(() => {
    initAnalytics()
    track('page_view', { page: 'landing' })
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

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
      const y = window.scrollY
      setShowSticky(y > window.innerHeight * 0.7)
      setNavSolid(y > 48)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shopUrl = primaryShopUrl(catalog)
  const onSquare = Boolean(SQUARE_STORE_URL || isSquareCatalog(catalog))
  const ebayShop = catalog?.source === 'square' ? EBAY_SHOP_URL : catalog?.shopUrl ?? EBAY_SHOP_URL
  const ebaySeller = catalog?.source === 'square' ? EBAY_SELLER_URL : catalog?.sellerUrl ?? EBAY_SELLER_URL
  const listings = useMemo(() => catalog?.listings ?? [], [catalog])
  const featured = useMemo(() => pickFeatured(listings, 6), [listings])
  const newDrops = useMemo(() => pickNewDrops(listings, 4), [listings])
  const salePicks = useMemo(() => pickSaleItems(listings, 4), [listings])
  const trainingPicks = useMemo(
    () => listings.filter((item) => item.tag === 'Training').slice(0, 4),
    [listings],
  )
  const saleFloor = lowestSalePrice(listings)
  const youthCount = listings.filter(isYouthListing).length
  const adultCount = useMemo(() => listings.filter(isAdultListing).length, [listings])
  const clubsData = useMemo<ClubInfo[]>(() => clubsInStock(listings), [listings])
  const trendingPicks = useMemo(() => pickTrending(listings, 8), [listings])
  const channelLabel = onSquare ? 'Square' : 'eBay'

  const availableTags = useMemo(() => {
    const present = new Set(listings.map((item) => item.tag))
    return TAG_ORDER.filter((tag) => present.has(tag))
  }, [listings])

  const availableSizes = useMemo(() => {
    const present = new Set(listings.map(listingSize))
    return sortSizes([...present])
  }, [listings])

  const availableBrands = useMemo(() => {
    return [
      ...new Set(listings.map((item) => item.brand).filter((brand): brand is string => Boolean(brand))),
    ].sort((a, b) => a.localeCompare(b))
  }, [listings])

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      if (tagFilter !== 'All' && item.tag !== tagFilter) return false
      if (audienceFilter === 'Adult' && !isAdultListing(item)) return false
      if (audienceFilter === 'Youth' && !isYouthListing(item)) return false
      if (sizeFilter !== 'All' && listingSize(item) !== sizeFilter) return false
      if (brandFilter !== 'All' && item.brand !== brandFilter) return false
      if (!matchesPriceFilter(item, priceFilter)) return false
      return matchesListingQuery(item, deferredQuery)
    })
  }, [listings, tagFilter, audienceFilter, sizeFilter, brandFilter, priceFilter, deferredQuery])

  const deferredHint = useMemo(() => {
    const q = deferredQuery.trim()
    if (!q && audienceFilter === 'All') return `${listings.length} items`
    if (!q) return `${filtered.length} ${audienceFilter.toLowerCase()} item${filtered.length === 1 ? '' : 's'}`
    return `${filtered.length} result${filtered.length === 1 ? '' : 's'} for “${q}”`
  }, [deferredQuery, filtered.length, listings.length, audienceFilter])

  function goInventory(next?: {
    tag?: string
    brand?: string
    price?: PriceFilterId
    query?: string
    audience?: AudienceFilter
    reset?: boolean
    focusSearch?: boolean
  }) {
    if (next?.reset) {
      setSizeFilter('All')
      setBrandFilter('All')
      setPriceFilter('All')
      setQuery('')
      setTagFilter('All')
      setAudienceFilter('All')
    }
    if (next?.tag !== undefined) setTagFilter(next.tag)
    if (next?.brand !== undefined) setBrandFilter(next.brand)
    if (next?.price !== undefined) setPriceFilter(next.price)
    if (next?.query !== undefined) setQuery(next.query)
    if (next?.audience !== undefined) setAudienceFilter(next.audience)
    requestAnimationFrame(() => {
      document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (next?.focusSearch) {
        document.getElementById('sticky-search')?.focus()
      }
    })
  }

  const heroImage = asset('hero-jersey.jpg')

  function onEmailSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    track('email_signup_attempt', { has_square: Boolean(SQUARE_STORE_URL) })
    const subject = encodeURIComponent('Jersey Deals restock alerts')
    const body = encodeURIComponent(
      `Please add me to restock / sale alerts.\n\nEmail: ${trimmed}\n`,
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setEmailStatus('sent')
  }

  const navLinks = [
    { href: '#shop', label: 'Shop' },
    { href: '#new-drops', label: 'New' },
    { href: '#audience', label: 'Youth' },
    { href: '#clubs', label: 'Clubs' },
    { href: '#sale', label: 'Sale' },
    { href: '#brands', label: 'Brands' },
    { href: '#inventory', label: 'Inventory' },
  ]

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      {/* Promo bar — always on top */}
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-crimson px-4 py-2 text-center font-brand text-xs font-bold uppercase tracking-[0.18em] text-cream">
        <span>{PROMO_BAR}</span>
        {saleFloor != null && (
          <span className="hidden text-white/75 sm:inline">· From {formatPrice(saleFloor, 'USD')}</span>
        )}
      </div>

      <a
        href="#featured"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to featured gear
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
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_click', { place: 'header' })}
              className={`hidden px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition md:inline-flex ${
                navSolid
                  ? 'bg-crimson text-white hover:bg-crimson-hot'
                  : 'border border-white/40 text-white hover:border-white hover:bg-white/10'
              }`}
            >
              {shopLabel(catalog)}
            </a>
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
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search kits</span>
              <input
                id="sticky-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    goInventory({ focusSearch: true })
                  }
                }}
                placeholder="Search club, kit, size, brand…"
                className={`w-full border px-4 py-2.5 text-sm outline-none transition placeholder:opacity-60 focus:ring-2 focus:ring-crimson/30 ${
                  navSolid
                    ? 'border-navy/15 bg-white text-navy placeholder:text-muted'
                    : 'border-white/20 bg-white/10 text-white placeholder:text-white/55'
                }`}
              />
            </label>
            <p
              className={`hidden shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] sm:block ${
                navSolid ? 'text-muted' : 'text-white/55'
              }`}
            >
              {deferredHint}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
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

      <main id="top" className={showSticky ? 'pb-20 md:pb-0' : undefined}>
        {/* Hero */}
        <section className="relative min-h-[100svh] overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            <motion.img
              key={heroImage}
              src={heroImage}
              alt=""
              initial={reduce ? false : { scale: 1.1, opacity: 0.55 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0 : 1.6, ease }}
              className="h-full w-full object-cover object-center"
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
              <p className="mt-6 font-brand text-sm font-bold uppercase tracking-[0.22em] text-cream">
                Jersey Deals
              </p>
              <div className="brand-rule mt-3" aria-hidden />
              <h1 className="mt-5 max-w-xl font-display text-4xl font-bold uppercase leading-[0.92] tracking-wide text-cream sm:text-5xl md:text-6xl">
                The modern kit shop.
              </h1>
              <p className="mt-5 max-w-md font-brand text-base leading-relaxed text-cream/80 md:text-lg">
                Club kits, youth sizes, and sale jerseys — photographed from our inventory and sold
                direct.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <motion.a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'hero_primary' })}
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="inline-flex bg-crimson px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot"
                >
                  {shopLabel(catalog)}
                </motion.a>
                <a
                  href="#shop"
                  onClick={() => track('cta_click', { place: 'hero_secondary' })}
                  className="inline-flex border border-cream/40 px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-cream transition hover:border-cream hover:bg-cream/10"
                >
                  Explore
                </a>
              </div>
            </motion.div>
          </div>

          <a
            href="#shop"
            className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/50 transition hover:text-white"
            aria-label="Scroll to shop"
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

        {/* Brand / category marquee */}
        <section className="overflow-hidden border-y border-navy/10 bg-cream py-5" aria-label="Highlights">
          <div className="marquee-track gap-10 px-4">
            {[...BRAND_MARQUEE, ...BRAND_MARQUEE].map((item, i) => (
              <span
                key={`${item}-${i}`}
                className={`whitespace-nowrap uppercase tracking-[0.2em] ${
                  item === 'Jersey Deals'
                    ? 'font-brand text-lg font-bold text-crimson'
                    : 'font-display text-lg font-bold text-navy/55'
                }`}
              >
                {item}
                <span className="ml-10 text-crimson/70">◆</span>
              </span>
            ))}
          </div>
        </section>

        {/* Service strip */}
        <section className="bg-navy text-cream">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-3.5 font-brand text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cream/75 md:px-8 md:justify-between">
            {SERVICE_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        {/* Editorial shop paths */}
        <section id="shop" className="scroll-mt-40 bg-cream py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="eyebrow text-crimson">Collections</p>
              <div className="brand-rule mt-3" aria-hidden />
              <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Shop the floor
              </h2>
              <p className="mt-3 font-brand text-lg text-muted">
                Youth sizes, sale racks, or the full live catalog — pick a path.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2 md:gap-5">
              {/* Large youth tile */}
              <motion.button
                type="button"
                onClick={() => {
                  track('category_click', { category: 'category_youth' })
                  goInventory({ tag: 'Youth', reset: true })
                }}
                {...fadeUp(reduce, 0.05)}
                className="group relative min-h-[320px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:col-span-7 md:row-span-2 md:min-h-[560px]"
              >
                <img
                  src={asset('category-youth.jpg')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-7 md:p-10">
                  <p className="eyebrow text-white/70">Youth</p>
                  <p className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-white md:text-6xl">
                    Youth apparel
                  </p>
                  <p className="mt-3 max-w-sm text-sm text-white/75 md:text-base">
                    {youthCount > 0
                      ? `${youthCount} youth listings ready to ship.`
                      : 'Kids and youth kits sized and ready to ship.'}
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
                    document.getElementById('sale')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  {...fadeUp(reduce, 0.1)}
                  className="group relative min-h-[240px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:col-span-5"
                >
                  <img
                    src={asset('category-sale.jpg')}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                    <p className="eyebrow text-crimson-hot">{SALE_URGENCY}</p>
                    <p className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-white md:text-4xl">
                      {SALE_HEADLINE}
                    </p>
                    <p className="mt-2 text-sm text-white/75">
                      {saleFloor != null
                        ? `From ${formatPrice(saleFloor, 'USD')} while stock lasts.`
                        : 'Limited sale kits from the rack.'}
                    </p>
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
                  src={asset('product-home.jpg')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
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
                  <p className="mt-2 text-sm text-white/75">
                    {loadState === 'ready' && catalog
                      ? `${catalog.count} active listings ready to filter.`
                      : 'Every active listing from Jersey Deals.'}
                  </p>
                </div>
              </motion.button>
            </div>
          </div>
        </section>

        {/* Audience paths */}
        <section id="audience" className="scroll-mt-36 bg-white py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="eyebrow text-crimson">Browse by audience</p>
              <div className="brand-rule mt-3" aria-hidden />
              <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Who's shopping?
              </h2>
              <p className="mt-3 font-brand text-lg text-muted">
                Men's and adult kits or youth and kids sizes — filter your path.
              </p>
            </motion.div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <motion.button
                type="button"
                onClick={() => {
                  track('audience_click', { audience: 'mens' })
                  goInventory({ audience: 'Adult', reset: true })
                }}
                {...fadeUp(reduce, 0.05)}
                className="group relative min-h-[300px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-white"
              >
                <img
                  src={asset('product-home.jpg')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-7 md:p-10">
                  <p className="eyebrow text-white/70">Adult</p>
                  <p className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-white md:text-5xl">
                    Men's kits
                  </p>
                  <p className="mt-3 text-sm text-white/75">
                    {adultCount > 0
                      ? `${adultCount} adult listings in stock.`
                      : 'Club jerseys, training tops, and more.'}
                  </p>
                  <span className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Shop men's →
                  </span>
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => {
                  track('audience_click', { audience: 'youth' })
                  goInventory({ audience: 'Youth', reset: true })
                }}
                {...fadeUp(reduce, 0.1)}
                className="group relative min-h-[300px] overflow-hidden bg-navy text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-white"
              >
                <img
                  src={asset('category-youth.jpg')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-7 md:p-10">
                  <p className="eyebrow text-white/70">Kids</p>
                  <p className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-white md:text-5xl">
                    Youth sizes
                  </p>
                  <p className="mt-3 text-sm text-white/75">
                    {youthCount > 0
                      ? `${youthCount} youth listings ready to ship.`
                      : 'Kids and youth kits sized and ready to ship.'}
                  </p>
                  <span className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Shop youth →
                  </span>
                </div>
              </motion.button>
            </div>
          </div>
        </section>

        {/* New drops */}
        <section id="new-drops" className="scroll-mt-40 bg-white py-20 md:py-28">
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
              <a
                href={onSquare ? shopUrl : EBAY_SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { place: 'new_drops_all' })}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-navy underline decoration-crimson/50 underline-offset-4 hover:decoration-crimson"
              >
                See newest on {channelLabel} →
              </a>
            </motion.div>

            {newDrops.length > 0 ? (
              <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {newDrops.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.06} tone="light" />
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
          <section id="trending" className="scroll-mt-36 bg-mist py-20 md:py-28">
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
                <div className="flex flex-wrap gap-2">
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
                      <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} tone="light" />
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
        <section className="relative min-h-[70svh] overflow-hidden bg-navy-deep text-white md:min-h-[80svh]">
          <img
            src={asset('lookbook-tunnel.jpg')}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
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
          <section id="training" className="scroll-mt-40 bg-mist py-20 md:py-28">
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
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} tone="light" />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Featured */}
        <section id="featured" className="scroll-mt-40 bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="eyebrow text-crimson-hot">Selected</p>
              <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide md:text-7xl">
                Featured gear
              </h2>
              <p className="mt-4 text-lg text-white/65">
                Editor picks from live inventory — tap any kit to checkout.
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
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} />
                ))}
              </ul>
            )}

            {catalog && catalog.count > featured.length && (
              <motion.div {...fadeUp(reduce, 0.15)} className="mt-14 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'featured_inventory' })
                    goInventory({ tag: 'All', reset: true })
                  }}
                  className="inline-flex border border-white/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white/5"
                >
                  Browse all {catalog.count} listings
                </button>
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'featured_all' })}
                  className="inline-flex bg-crimson px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
                >
                  Open {channelLabel}
                </a>
              </motion.div>
            )}
          </div>
        </section>

        {/* Shop by brand */}
        {availableBrands.length > 0 && (
          <section id="brands" className="scroll-mt-36 border-y border-navy/10 bg-white py-16 md:py-20">
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
          <section id="clubs" className="scroll-mt-36 bg-chalk py-16 md:py-20">
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
                        goInventory({ query: club.name, reset: true })
                      }}
                      className="group relative w-full overflow-hidden bg-navy outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={club.image}
                          alt={club.name}
                          className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.05]"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 to-navy-deep/10" />
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
        <section id="sale" className="relative min-h-[68svh] scroll-mt-40 overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            <img
              src={asset('category-sale.jpg')}
              alt=""
              className="h-full w-full object-cover object-center"
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
                <a
                  href={onSquare ? shopUrl : EBAY_SALE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'sale_banner' })}
                  className="inline-flex bg-crimson px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
                >
                  Shop sale on {channelLabel}
                </a>
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
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} />
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
              />
              <div className="absolute inset-0 bg-navy-deep/40 transition group-hover:bg-navy-deep/55" />
              <span className="relative flex h-full items-end p-6 font-display text-3xl font-bold uppercase tracking-wide text-white md:p-8 md:text-4xl">
                {tile.label}
              </span>
            </button>
          ))}
        </section>

        {/* Full inventory */}
        <section id="inventory" className="scroll-mt-36 bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="eyebrow text-crimson">Catalog</p>
              <div className="brand-rule mt-3" aria-hidden />
              <h2 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Full inventory
              </h2>
              <p className="mt-3 font-brand text-lg text-muted">
                Filter live stock by type, size, brand, and price — then checkout on {channelLabel}.
              </p>
            </motion.div>

            {loadState === 'ready' && listings.length > 0 && (
              <motion.div {...fadeUp(reduce, 0.08)} className="mt-10 space-y-6">
                <p className="text-sm text-muted">
                  Use the search bar at the top · {deferredHint}
                </p>

                <div className="space-y-3">
                  <p className="eyebrow text-muted">Audience</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'All', label: 'All' },
                        { id: 'Adult', label: "Men's / adult" },
                        { id: 'Youth', label: 'Youth' },
                      ] as const
                    ).map((option) => (
                      <FilterChip
                        key={option.id}
                        label={option.label}
                        active={audienceFilter === option.id}
                        onClick={() => setAudienceFilter(option.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="eyebrow text-muted">Type</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip label="All" active={tagFilter === 'All'} onClick={() => setTagFilter('All')} />
                    {availableTags.map((tag) => (
                      <FilterChip
                        key={tag}
                        label={tag}
                        active={tagFilter === tag}
                        onClick={() => setTagFilter(tag)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="eyebrow text-muted">Price</p>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>

                {availableSizes.length > 1 && (
                  <div className="space-y-3">
                    <p className="eyebrow text-muted">Size</p>
                    <div className="flex flex-wrap gap-2">
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
                    </div>
                  </div>
                )}

                {availableBrands.length > 0 && (
                  <div className="space-y-3">
                    <p className="eyebrow text-muted">Brand</p>
                    <div className="flex flex-wrap gap-2">
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
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted">
                  Showing {filtered.length} of {listings.length}
                  {catalog?.source ? ` · ${catalog.source}` : ''}
                  {priceFilter !== 'All'
                    ? ` · ${PRICE_FILTERS.find((row) => row.id === priceFilter)?.label}`
                    : ''}
                </p>
              </motion.div>
            )}

            {loadState === 'loading' && <p className="mt-12 text-muted">Loading inventory…</p>}

            {loadState === 'ready' && filtered.length === 0 && (
              <p className="mt-12 text-muted">
                No listings match those filters.{' '}
                <button
                  type="button"
                  className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                  onClick={() => {
                    setTagFilter('All')
                    setSizeFilter('All')
                    setBrandFilter('All')
                    setPriceFilter('All')
                    setQuery('')
                  }}
                >
                  Clear filters
                </button>
              </p>
            )}

            {filtered.length > 0 && (
              <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item, i) => (
                  <ProductLink
                    key={item.id}
                    item={item}
                    reduce={reduce}
                    delay={Math.min(i, 8) * 0.04}
                    tone="light"
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Trust */}
        <section id="buy-direct" className="bg-white">
          <div className="mx-auto grid max-w-6xl md:grid-cols-2">
            <div className="relative min-h-[360px] overflow-hidden md:min-h-[560px]">
              <img
                src={asset('hero-jersey.jpg')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
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
                  {FAMILY_NOTE} We sell as{' '}
                  <a
                    href={ebaySeller}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                  >
                    @{catalog?.seller ?? EBAY_SELLER}
                  </a>
                  {catalog ? ` with ${catalog.count} live listings` : ''}.
                  {onSquare
                    ? ' Pay by card on Square — eBay remains available as a second channel.'
                    : ' Checkout on eBay today — Square direct payments are next.'}
                </p>
                <ul className="mt-10 space-y-6 border-l border-navy/10 pl-6">
                  {[
                    {
                      dt: onSquare ? 'Square checkout' : 'Trusted checkout',
                      dd: onSquare
                        ? 'Pay with card on our storefront — money goes to us directly.'
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
                  title: 'Square checkout',
                  copy: 'Pay by card on our Square storefront — encrypted and direct.',
                },
                {
                  title: 'Adult & youth',
                  copy: 'Full size range from adult S through youth sizes — clearly labeled.',
                },
                {
                  title: 'Family-run',
                  copy: 'Small shop, real people behind every sale and shipment.',
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
                  copy: 'Filter by youth, training, jerseys, size, or brand on this page.',
                },
                {
                  step: '02',
                  title: 'Open the listing',
                  copy: `Tap any kit for full photos and details on ${channelLabel}.`,
                },
                {
                  step: '03',
                  title: 'Checkout & ship',
                  copy: 'Pay secure, then we ship from US inventory to your door.',
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
        <section id="size-guide" className="scroll-mt-36 bg-white py-16 md:py-20">
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
        <section id="faq" className="scroll-mt-40 bg-chalk py-20 md:py-28">
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
                return (
                  <li key={item.q}>
                    <button
                      type="button"
                      aria-expanded={open}
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
                    {open ? <p className="pb-5 leading-relaxed text-muted">{item.a}</p> : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* Alerts */}
        <section id="alerts" className="bg-navy py-20 text-white md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end"
            >
              <div>
                <p className="eyebrow text-crimson-hot">Stay close</p>
                <h2 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide md:text-6xl">
                  Restock alerts
                </h2>
                <p className="mt-4 max-w-xl text-white/65">
                  {NEWSLETTER_INCENTIVE} — get notified when sale kits and youth sizes land.
                </p>
              </div>
              <form onSubmit={onEmailSubmit} className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="restock-email">
                  Email
                </label>
                <input
                  id="restock-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 border border-white/20 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/35 outline-none focus:border-crimson"
                />
                <button
                  type="submit"
                  className="bg-crimson px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
                >
                  Get alerts
                </button>
              </form>
            </motion.div>
            {emailStatus === 'sent' ? (
              <p className="mt-4 text-sm text-white/65">
                Your email app should open — send it so we can add you.
              </p>
            ) : null}
          </div>
        </section>

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
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_click', { place: 'final' })}
              className="inline-flex shrink-0 bg-navy px-8 py-4 font-brand text-xs font-bold uppercase tracking-[0.18em] text-cream transition hover:bg-navy-deep"
            >
              {shopLabel(catalog)}
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-navy-deep py-14 text-white/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:px-8">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <p className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-cream">
                Jersey Deals
              </p>
            </div>
            <p className="mt-4 max-w-sm font-brand text-sm leading-relaxed text-cream/65">
              Premium kit shopping from live inventory — sold direct.
            </p>
          </div>
          <div>
            <p className="eyebrow text-white/40">Shop</p>
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
            <p className="eyebrow text-white/40">Discover</p>
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
                <a href="#audience" className="hover:text-white">
                  Youth sizes
                </a>
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
            <p className="eyebrow text-white/40">Links</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href={ebayShop} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  eBay shop
                </a>
              </li>
              {SQUARE_STORE_URL ? (
                <li>
                  <a
                    href={SQUARE_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    Square store
                  </a>
                </li>
              ) : null}
              <li>
                <a href={asset('privacy.html')} className="hover:text-white">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-6xl px-5 text-xs text-white/40 md:px-8">
          © {new Date().getFullYear()} JerseyDeals
        </p>
      </footer>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-cream/15 bg-navy-deep/95 p-3 backdrop-blur transition md:hidden ${
          showSticky ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('cta_click', { place: 'sticky_mobile' })}
          className="flex w-full items-center justify-center gap-3 bg-crimson px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream"
        >
          <img src={LOGO_SRC.sm} alt="" className="h-6 w-6 rounded-full" width={24} height={24} />
          {shopLabel(catalog)}
        </a>
      </div>

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
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track('cta_click', { place: 'mobile_menu' })
                setMenuOpen(false)
              }}
              className="flex w-full items-center justify-center bg-crimson py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-crimson-hot"
            >
              {shopLabel(catalog)}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
