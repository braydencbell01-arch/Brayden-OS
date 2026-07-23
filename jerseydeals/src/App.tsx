import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { initAnalytics, track } from './analytics'
import {
  CONTACT_EMAIL,
  EBAY_NEWEST_URL,
  EBAY_SALE_URL,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  EBAY_SHOP_URL,
  FAMILY_NOTE,
  SALE_HEADLINE,
  SALE_URGENCY,
  SQUARE_STORE_URL,
} from './config'
import {
  conditionLabel,
  formatPrice,
  isSquareCatalog,
  isYouthListing,
  listingSize,
  lowestSalePrice,
  pickFeatured,
  pickNewDrops,
  pickSaleItems,
  shortTitle,
  sortSizes,
  TAG_ORDER,
  type Listing,
  type ListingsPayload,
} from './listings'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const ease = [0.22, 1, 0.36, 1] as const

const CLUB_NAMES = [
  'Inter Miami',
  'Manchester City',
  'Paris Saint-Germain',
  'Manchester United',
  'AC Milan',
  'Borussia Dortmund',
  'Tottenham Hotspur',
  'Liverpool',
  'Chelsea',
  'Real Madrid',
  'Barcelona',
  'Germany',
  'Syracuse',
] as const

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
  if (SQUARE_STORE_URL || isSquareCatalog(catalog)) return 'Shop on Square'
  return 'Shop on eBay'
}

function clubsInStock(listings: Listing[]) {
  const blob = listings.map((item) => item.title).join(' ').toLowerCase()
  return CLUB_NAMES.filter((club) => blob.includes(club.toLowerCase()))
}

function FilterChip({
  active,
  label,
  onClick,
  tone = 'light',
}: {
  active: boolean
  label: string
  onClick: () => void
  tone?: 'light' | 'dark'
}) {
  const base =
    tone === 'dark'
      ? active
        ? 'border-crimson-hot bg-crimson text-white'
        : 'border-white/25 text-white/75 hover:border-white/50 hover:text-white'
      : active
        ? 'border-crimson bg-crimson text-white'
        : 'border-navy/15 bg-white text-navy/80 hover:border-navy/40 hover:text-navy'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-3.5 py-2 text-sm font-semibold transition ${base}`}
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
  const light = tone === 'light'
  return (
    <motion.li {...fadeUp(reduce, delay)}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('product_click', { id: item.id, tag: item.tag })}
        className={`group block outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 ${
          light ? 'focus-visible:ring-offset-chalk' : 'focus-visible:ring-offset-navy'
        }`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-navy-deep">
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy-deep to-navy p-6">
              <span className="font-display text-2xl uppercase text-white/70">{item.tag}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-navy-deep/90 to-transparent p-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
              View listing
            </span>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${
                light ? 'text-crimson' : 'text-crimson-hot'
              }`}
            >
              {item.tag}
            </p>
            <span className={`text-[0.65rem] uppercase tracking-[0.12em] ${light ? 'text-muted' : 'text-white/45'}`}>
              {condition}
            </span>
            {item.brand ? (
              <span className={`text-[0.65rem] uppercase tracking-[0.12em] ${light ? 'text-muted' : 'text-white/45'}`}>
                {item.brand}
              </span>
            ) : null}
          </div>
          <h3
            className={`mt-1.5 text-[1.05rem] font-semibold leading-snug ${
              light ? 'text-navy' : 'text-white'
            }`}
          >
            {shortTitle(item.title)}
          </h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-display text-2xl font-bold tracking-wide md:text-3xl ${
                light ? 'text-navy' : 'text-white'
              }`}
            >
              {formatPrice(item.price, item.currency)}
            </span>
            <span className={`text-sm ${light ? 'text-muted' : 'text-white/45'}`}>{item.note}</span>
          </p>
        </div>
      </a>
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
  const [scrolled, setScrolled] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [tagFilter, setTagFilter] = useState('All')
  const [sizeFilter, setSizeFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const [query, setQuery] = useState('')

  useEffect(() => {
    initAnalytics()
    track('page_view', { page: 'landing' })
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
      const y = window.scrollY
      setScrolled(y > 40)
      setShowSticky(y > window.innerHeight * 0.75)
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
  const channelLabel = onSquare ? 'Square' : 'eBay'
  const marqueeClubs = useMemo(() => {
    const found = clubsInStock(listings)
    return found.length > 0 ? found : [...CLUB_NAMES]
  }, [listings])

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
    const q = query.trim().toLowerCase()
    return listings.filter((item) => {
      if (tagFilter !== 'All' && item.tag !== tagFilter) return false
      if (sizeFilter !== 'All' && listingSize(item) !== sizeFilter) return false
      if (brandFilter !== 'All' && item.brand !== brandFilter) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        (item.brand || '').toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q)
      )
    })
  }, [listings, tagFilter, sizeFilter, brandFilter, query])

  function goInventory(next?: { tag?: string; reset?: boolean }) {
    if (next?.reset) {
      setSizeFilter('All')
      setBrandFilter('All')
      setQuery('')
    }
    if (next?.tag !== undefined) setTagFilter(next.tag)
    requestAnimationFrame(() => {
      document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const heroImage = useMemo(() => {
    return listings[0]?.image || asset('hero-jersey.jpg')
  }, [listings])

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

  const navLink =
    'text-[0.7rem] font-semibold uppercase tracking-[0.16em] transition hover:text-crimson-hot'

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      <a
        href="#featured"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to featured gear
      </a>

      <div className="relative z-40 bg-navy-deep text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/80">
        <p className="px-4 py-2.5">
          {loadState === 'ready' && catalog
            ? `${catalog.count} live kits · Ships from US inventory`
            : 'Live kits · Ships from US inventory'}
        </p>
      </div>

      <header
        className={`sticky top-0 z-30 transition duration-300 ${
          scrolled
            ? 'border-b border-navy/10 bg-chalk/95 text-navy shadow-[0_1px_0_rgba(11,34,63,0.06)] backdrop-blur'
            : 'bg-transparent text-white'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <a
            href="#top"
            className={`font-brand text-lg font-bold uppercase tracking-[0.1em] md:text-xl ${
              scrolled ? 'text-navy' : 'text-white'
            }`}
          >
            Jersey Deals
          </a>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            <a href="#shop" className={`${navLink} ${scrolled ? 'text-navy/70' : 'text-white/75'}`}>
              Shop
            </a>
            <a href="#new-drops" className={`${navLink} ${scrolled ? 'text-navy/70' : 'text-white/75'}`}>
              New
            </a>
            <button
              type="button"
              onClick={() => goInventory({ tag: 'Youth', reset: true })}
              className={`${navLink} ${scrolled ? 'text-navy/70' : 'text-white/75'}`}
            >
              Youth
            </button>
            <a href="#sale" className={`${navLink} ${scrolled ? 'text-navy/70' : 'text-white/75'}`}>
              Sale
            </a>
            <a href="#faq" className={`${navLink} ${scrolled ? 'text-navy/70' : 'text-white/75'}`}>
              Help
            </a>
          </nav>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('cta_click', { place: 'header' })}
            className="bg-crimson px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-hot"
          >
            {shopLabel(catalog)}
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative -mt-[4.25rem] min-h-[100svh] overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            <motion.img
              key={heroImage}
              src={heroImage}
              alt=""
              initial={reduce ? false : { scale: 1.08, opacity: 0.65 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0 : 1.35, ease }}
              className="h-full w-full object-cover object-[center_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/85 to-navy-deep/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-navy-deep/60" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-36 md:justify-center md:px-8 md:pb-28 md:pt-28">
            <motion.div
              className="max-w-xl"
              initial={reduce ? false : { opacity: 0.001, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
            >
              <p className="font-brand text-4xl font-bold uppercase leading-[1.05] tracking-[0.06em] text-white sm:text-5xl md:text-6xl">
                Jersey Deals
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold uppercase leading-[0.95] tracking-wide text-white sm:text-5xl md:text-6xl">
                Matchday kits.
                <br />
                Live stock.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 md:text-lg">
                Club jerseys, training tops, and youth apparel — photographed, sized, and ready to
                ship from our US inventory.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <motion.a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'hero_primary' })}
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="inline-flex bg-crimson px-7 py-3.5 text-base font-semibold text-white transition hover:bg-crimson-hot"
                >
                  {shopLabel(catalog)}
                </motion.a>
                <a
                  href="#shop"
                  onClick={() => track('cta_click', { place: 'hero_secondary' })}
                  className="inline-flex border border-white/35 px-7 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/5"
                >
                  Explore the collection
                </a>
              </div>
            </motion.div>
          </div>

          <a
            href="#shop"
            className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55 transition hover:text-white"
            aria-label="Scroll to shop"
          >
            <span className="flex flex-col items-center gap-2">
              Scroll
              <motion.span
                aria-hidden
                animate={reduce ? undefined : { y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className="block h-6 w-px bg-white/50"
              />
            </span>
          </a>
        </section>

        {/* Club marquee */}
        <section aria-label="Clubs in stock" className="overflow-hidden border-y border-navy/10 bg-white py-4">
          <div className="jd-marquee-track gap-10 px-6">
            {[...marqueeClubs, ...marqueeClubs].map((club, i) => (
              <span
                key={`${club}-${i}`}
                className="font-display text-xl font-bold uppercase tracking-[0.14em] text-navy/55 whitespace-nowrap"
              >
                {club}
              </span>
            ))}
          </div>
        </section>

        {/* Collections */}
        <section id="shop" className="bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson">Collections</p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                Shop the floor
              </h2>
              <p className="mt-3 text-lg text-muted">
                Youth sizes, sale racks, or the full live catalog — pick a path.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-3 md:grid-cols-3">
              {[
                {
                  label: 'Youth apparel',
                  onClick: () => {
                    track('category_click', { category: 'category_youth' })
                    goInventory({ tag: 'Youth', reset: true })
                  },
                  image: asset('category-youth.jpg'),
                  copy:
                    youthCount > 0
                      ? `${youthCount} youth listings ready to ship.`
                      : 'Kids and youth kits sized and ready to ship.',
                },
                {
                  label: SALE_HEADLINE,
                  href: onSquare ? `${shopUrl}` : EBAY_SALE_URL,
                  image: asset('category-sale.jpg'),
                  copy:
                    saleFloor != null
                      ? `${SALE_URGENCY} · from ${formatPrice(saleFloor, 'USD')}`
                      : SALE_URGENCY,
                  onClick: () => {
                    track('category_click', { category: 'category_sale' })
                    if (onSquare) {
                      setTagFilter('All')
                      setSizeFilter('All')
                      setBrandFilter('All')
                      setQuery('')
                      requestAnimationFrame(() => {
                        document
                          .getElementById('inventory')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      })
                    }
                  },
                  external: !onSquare,
                },
                {
                  label: 'Full catalog',
                  onClick: () => {
                    track('category_click', { category: 'category_all' })
                    goInventory({ tag: 'All', reset: true })
                  },
                  image: listings[2]?.image || asset('product-home.jpg'),
                  copy:
                    loadState === 'ready' && catalog
                      ? `${catalog.count} active listings${catalog.source ? ` via ${catalog.source}` : ''}.`
                      : 'Every active listing from Jersey Deals.',
                },
              ].map((tile, i) => {
                const className =
                  'group relative block min-h-[280px] overflow-hidden bg-navy outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:min-h-[340px]'
                const inner = (
                  <>
                    <img
                      src={tile.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                      <p className="font-display text-3xl font-bold uppercase tracking-wide text-white md:text-4xl">
                        {tile.label}
                      </p>
                      <p className="mt-2 max-w-sm text-sm text-white/75 md:text-base">{tile.copy}</p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                        Shop now →
                      </p>
                    </div>
                  </>
                )

                if (tile.external && tile.href) {
                  return (
                    <motion.a
                      key={tile.label}
                      href={tile.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={tile.onClick}
                      {...fadeUp(reduce, 0.06 + i * 0.08)}
                      className={className}
                    >
                      {inner}
                    </motion.a>
                  )
                }

                return (
                  <motion.button
                    key={tile.label}
                    type="button"
                    onClick={tile.onClick}
                    {...fadeUp(reduce, 0.06 + i * 0.08)}
                    className={`${className} w-full text-left`}
                  >
                    {inner}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Editorial campaign — Youth */}
        <section className="bg-navy text-white">
          <div className="mx-auto grid max-w-6xl md:grid-cols-2">
            <motion.div
              {...fadeUp(reduce)}
              className="relative min-h-[360px] overflow-hidden md:min-h-[520px]"
            >
              <img
                src={asset('category-youth.jpg')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-navy-deep/25" />
            </motion.div>
            <motion.div
              {...fadeUp(reduce, 0.08)}
              className="flex flex-col justify-center px-5 py-16 md:px-12 md:py-20"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-hot">
                Youth collection
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                Built for the next matchday
              </h2>
              <p className="mt-4 max-w-md text-white/70">
                Youth home kits, training tops, and strike layers — clear sizing in every listing so
                parents can buy with confidence.
              </p>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'campaign_youth' })
                  goInventory({ tag: 'Youth', reset: true })
                }}
                className="mt-8 inline-flex w-fit bg-crimson px-6 py-3 text-sm font-semibold text-white transition hover:bg-crimson-hot"
              >
                Shop youth
              </button>
            </motion.div>
          </div>
        </section>

        {/* New drops */}
        <section id="new-drops" className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson">Just in</p>
                <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  New drops
                </h2>
                <p className="mt-2 max-w-xl text-muted">
                  Fresh from the rack — newest active listings first.
                </p>
              </div>
              <a
                href={onSquare ? shopUrl : EBAY_NEWEST_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { place: 'new_drops_all' })}
                className="text-sm font-semibold uppercase tracking-[0.14em] text-crimson hover:text-crimson-hot"
              >
                See newest on {channelLabel} →
              </a>
            </motion.div>

            {newDrops.length > 0 ? (
              <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Training editorial */}
        {trainingPicks.length > 0 && (
          <section id="training" className="bg-mist py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-8">
              <motion.div
                {...fadeUp(reduce)}
                className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson">
                    Training
                  </p>
                  <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                    Pre-match &amp; training tops
                  </h2>
                  <p className="mt-2 max-w-xl text-muted">
                    Warm-ups and strike layers from the clubs you follow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goInventory({ tag: 'Training', reset: true })}
                  className="text-sm font-semibold uppercase tracking-[0.14em] text-crimson hover:text-crimson-hot"
                >
                  View all training →
                </button>
              </motion.div>
              <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {trainingPicks.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} tone="light" />
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Featured */}
        <section id="featured" className="bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-hot">
                Featured
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide md:text-6xl">
                Staff picks
              </h2>
              <p className="mt-3 text-lg text-white/70">
                Real SKUs from live inventory — tap any kit to buy. Condition noted on each item.
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
              <ul className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} />
                ))}
              </ul>
            )}

            {catalog && catalog.count > featured.length && (
              <motion.div {...fadeUp(reduce, 0.15)} className="mt-12 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { place: 'featured_inventory' })
                    goInventory({ tag: 'All', reset: true })
                  }}
                  className="inline-flex border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
                >
                  Browse all {catalog.count} listings
                </button>
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'featured_all' })}
                  className="inline-flex bg-crimson px-5 py-3 text-sm font-semibold text-white transition hover:bg-crimson-hot"
                >
                  Open {channelLabel} storefront
                </a>
              </motion.div>
            )}
          </div>
        </section>

        {/* Sale spotlight */}
        <section id="sale" className="relative overflow-hidden bg-crimson py-20 text-white md:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 55% 80% at 0% 50%, rgba(6,16,28,0.55), transparent 60%)',
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Limited stock
                </p>
                <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide md:text-6xl">
                  {SALE_HEADLINE}
                </h2>
                <p className="mt-3 max-w-lg text-lg text-white/85">
                  {saleFloor != null
                    ? `${SALE_URGENCY}. Starting at ${formatPrice(saleFloor, 'USD')}.`
                    : SALE_URGENCY}
                </p>
              </div>
              <a
                href={onSquare ? shopUrl : EBAY_SALE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { place: 'sale_banner' })}
                className="inline-flex shrink-0 bg-navy px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                Shop sale on {channelLabel}
              </a>
            </motion.div>

            {salePicks.length > 0 ? (
              <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {salePicks.map((item, i) => (
                  <ProductLink key={item.id} item={item} reduce={reduce} delay={i * 0.05} />
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* Full inventory */}
        <section id="inventory" className="bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson">Inventory</p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                Full catalog
              </h2>
              <p className="mt-3 text-lg text-muted">
                Filter live stock by type, size, and brand — then checkout on {channelLabel}.
              </p>
            </motion.div>

            {loadState === 'ready' && listings.length > 0 && (
              <motion.div {...fadeUp(reduce, 0.08)} className="mt-10 space-y-5">
                <label className="block max-w-xl">
                  <span className="sr-only">Search inventory</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search club, kit, size…"
                    className="w-full border border-navy/15 bg-white px-4 py-3.5 text-base text-navy outline-none transition placeholder:text-muted/70 focus:border-crimson/50 focus:ring-2 focus:ring-crimson/20"
                  />
                </label>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Type</p>
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

                {availableSizes.length > 1 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Size</p>
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Brand</p>
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
                  {catalog?.source ? ` · source ${catalog.source}` : ''}
                  {catalog?.syncedAt
                    ? ` · synced ${new Date(catalog.syncedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`
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
                    setQuery('')
                  }}
                >
                  Clear filters
                </button>
              </p>
            )}

            {filtered.length > 0 && (
              <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
        <section id="buy-direct" className="relative overflow-hidden bg-white py-20 md:py-28">
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson">Why us</p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Buy direct. Real inventory.
              </h2>
              <p className="mt-4 text-lg text-muted">
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
                  : ' Checkout on eBay today with buyer protection on every order.'}
              </p>
            </motion.div>

            <dl className="mt-14 grid gap-10 border-t border-navy/10 pt-12 md:grid-cols-3">
              {[
                {
                  dt: onSquare ? 'Square checkout' : 'Trusted checkout',
                  dd: onSquare
                    ? 'Pay with card on our Square storefront — money goes to us directly.'
                    : 'Buy on eBay with buyer protection on the same seller account.',
                },
                {
                  dt: 'Real product detail',
                  dd: 'Photos, price, size, team, and stock on every listing — no mystery SKUs.',
                },
                {
                  dt: 'US shipping',
                  dd: 'Orders leave our US inventory. Rates and timing show at checkout on each item.',
                },
              ].map((item, i) => (
                <motion.div key={item.dt} {...fadeUp(reduce, i * 0.08)}>
                  <dt className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                    {item.dt}
                  </dt>
                  <dd className="mt-2 leading-relaxed text-muted">{item.dd}</dd>
                </motion.div>
              ))}
            </dl>

            <motion.div
              {...fadeUp(reduce, 0.12)}
              className="mt-14 flex flex-wrap items-baseline gap-x-10 gap-y-3 text-sm text-muted"
            >
              <p>
                <span className="font-display text-4xl font-bold text-navy">
                  {catalog?.count ?? '—'}
                </span>{' '}
                active listings
              </p>
              <p>
                Seller{' '}
                <a
                  href={ebaySeller}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-navy hover:text-crimson"
                >
                  @{catalog?.seller ?? EBAY_SELLER}
                </a>
              </p>
              <p>Ships from US inventory</p>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-3xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson">Help</p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                Sizing, authenticity &amp; shipping
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

        {/* Email */}
        <section id="alerts" className="bg-navy py-20 text-white md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-hot">
                  Stay ahead
                </p>
                <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                  Restock &amp; sale alerts
                </h2>
                <p className="mt-3 max-w-xl text-white/70">
                  Drop your email and we will add you to restock notes when sale kits and youth sizes
                  land.
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
                  className="min-w-0 flex-1 border border-white/20 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/40 outline-none focus:border-crimson"
                />
                <button
                  type="submit"
                  className="bg-crimson px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-crimson-hot"
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
        <section className="relative overflow-hidden bg-chalk py-20 md:py-24">
          <motion.div
            {...fadeUp(reduce)}
            className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 md:flex-row md:items-center md:justify-between md:px-8"
          >
            <div>
              <p className="font-brand text-3xl font-bold uppercase tracking-[0.06em] text-navy md:text-4xl">
                Jersey Deals
              </p>
              <p className="mt-3 max-w-md text-lg text-muted">
                Ready for matchday? Youth apparel, sale kits, and the full catalog are live.
              </p>
            </div>
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_click', { place: 'final' })}
              className="inline-flex shrink-0 bg-crimson px-7 py-3.5 text-base font-semibold text-white transition hover:bg-crimson-hot"
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
              <img src={asset('favicon.svg')} alt="" className="h-9 w-9" width={36} height={36} />
              <p className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-white">
                Jersey Deals
              </p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Family-run soccer apparel — live kits with real photos, sizes, and US shipping.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Shop</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#new-drops" className="hover:text-white">
                  New drops
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goInventory({ tag: 'Youth', reset: true })}
                  className="hover:text-white"
                >
                  Youth
                </button>
              </li>
              <li>
                <a href="#sale" className="hover:text-white">
                  Sale
                </a>
              </li>
              <li>
                <a href="#inventory" className="hover:text-white">
                  Full catalog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Help</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#faq" className="hover:text-white">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#alerts" className="hover:text-white">
                  Restock alerts
                </a>
              </li>
              <li>
                <a href={asset('privacy.html')} className="hover:text-white">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Connect</p>
            <ul className="mt-3 space-y-2 text-sm">
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
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
                  Email us
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-5 pt-6 text-sm md:px-8">
          <p>© {new Date().getFullYear()} JerseyDeals. All rights reserved.</p>
        </div>
      </footer>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-deep/95 p-3 backdrop-blur transition md:hidden ${
          showSticky ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('cta_click', { place: 'sticky_mobile' })}
          className="flex w-full items-center justify-center bg-crimson px-4 py-3 text-sm font-semibold text-white"
        >
          {shopLabel(catalog)}
        </a>
      </div>
    </div>
  )
}
