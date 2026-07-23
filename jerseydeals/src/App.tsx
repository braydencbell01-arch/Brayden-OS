import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Listing = {
  id: string
  title: string
  price: number | null
  currency: string
  url: string
  image: string
  quantity: number
  tag: string
  note: string
  size?: string
  brand?: string
}

type ListingsPayload = {
  syncedAt: string
  seller: string
  sellerUrl: string
  shopUrl: string
  count: number
  listings: Listing[]
}

const TAG_ORDER = ['Youth', 'Training', 'Jerseys', 'Court / Sideline', 'Apparel'] as const

const SIZE_ORDER = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'Youth XS',
  'Youth S',
  'Youth M',
  'Youth L',
  'Youth XL',
  'Youth XXL',
  '9-12 YRS',
  'Other',
] as const

const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

function formatPrice(price: number | null, currency: string) {
  if (price == null || Number.isNaN(price)) return 'See listing'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `$${price}`
  }
}

function shortTitle(title: string) {
  return title
    .replace(/\b(Men'?s|Women'?s|Youth|Boys|Girls)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function listingSize(item: Listing) {
  return item.size || item.note || 'Other'
}

function fadeUp(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.55, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  }
}

function pickFeatured(listings: Listing[], limit = 6) {
  const picked: Listing[] = []
  const used = new Set<string>()
  for (const tag of TAG_ORDER) {
    const hit = listings.find((item) => item.tag === tag && !used.has(item.id))
    if (hit) {
      picked.push(hit)
      used.add(hit.id)
    }
    if (picked.length >= limit) return picked
  }
  for (const item of listings) {
    if (used.has(item.id)) continue
    picked.push(item)
    used.add(item.id)
    if (picked.length >= limit) break
  }
  return picked
}

function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a as (typeof SIZE_ORDER)[number])
    const bi = SIZE_ORDER.indexOf(b as (typeof SIZE_ORDER)[number])
    const av = ai === -1 ? 999 : ai
    const bv = bi === -1 ? 999 : bi
    if (av !== bv) return av - bv
    return a.localeCompare(b)
  })
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
        : 'border-white/20 text-white/75 hover:border-white/45 hover:text-white'
      : active
        ? 'border-crimson bg-crimson text-white'
        : 'border-navy/20 text-navy/75 hover:border-navy/45 hover:text-navy'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${base}`}
    >
      {label}
    </button>
  )
}

function ListingCard({
  item,
  index,
  reduce,
  tone = 'dark',
}: {
  item: Listing
  index: number
  reduce: boolean | null
  tone?: 'dark' | 'light'
}) {
  const isDark = tone === 'dark'
  return (
    <motion.li {...fadeUp(reduce, Math.min(index, 8) * 0.04)}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block outline-none focus-visible:ring-2 focus-visible:ring-crimson ${
          isDark
            ? 'focus-visible:ring-offset-2 focus-visible:ring-offset-navy'
            : 'focus-visible:ring-offset-2 focus-visible:ring-offset-chalk'
        }`}
      >
        <div
          className={`aspect-[4/5] overflow-hidden ${
            isDark ? 'bg-black/40 ring-1 ring-white/10' : 'bg-mist ring-1 ring-navy/10'
          }`}
        >
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
              loading={index < 3 ? 'eager' : 'lazy'}
            />
          ) : (
            <div
              className={`flex h-full items-center justify-center p-6 ${
                isDark
                  ? 'bg-gradient-to-br from-navy-deep to-navy'
                  : 'bg-gradient-to-br from-mist to-chalk'
              }`}
            >
              <span className={`font-comic text-xl ${isDark ? 'text-white/80' : 'text-navy/70'}`}>
                {item.tag}
              </span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${
              isDark ? 'text-crimson-hot' : 'text-crimson'
            }`}
          >
            {item.tag}
            {item.brand ? ` · ${item.brand}` : ''}
          </p>
          <h3
            className={`mt-1 text-lg font-semibold leading-snug ${
              isDark ? 'text-white' : 'text-navy'
            }`}
          >
            {shortTitle(item.title)}
          </h3>
          <p className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-display text-3xl font-bold tracking-wide ${
                isDark ? 'text-white' : 'text-navy'
              }`}
            >
              {formatPrice(item.price, item.currency)}
            </span>
            <span className={`text-sm ${isDark ? 'text-white/50' : 'text-muted'}`}>{item.note}</span>
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
  const [tagFilter, setTagFilter] = useState<string>('All')
  const [sizeFilter, setSizeFilter] = useState<string>('All')
  const [brandFilter, setBrandFilter] = useState<string>('All')
  const [query, setQuery] = useState('')

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

  const shopUrl = catalog?.shopUrl ?? 'https://www.ebay.com/usr/jerseydealsofficial'
  const listings = useMemo(() => catalog?.listings ?? [], [catalog])
  const featured = useMemo(() => pickFeatured(listings, 6), [listings])

  const availableTags = useMemo(() => {
    const present = new Set(listings.map((item) => item.tag))
    return TAG_ORDER.filter((tag) => present.has(tag))
  }, [listings])

  const availableSizes = useMemo(() => {
    const present = new Set(listings.map(listingSize))
    return sortSizes([...present])
  }, [listings])

  const availableBrands = useMemo(() => {
    const present = [
      ...new Set(listings.map((item) => item.brand).filter((brand): brand is string => Boolean(brand))),
    ]
    return present.sort((a, b) => a.localeCompare(b))
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

  function goShop(next?: { tag?: string; size?: string; reset?: boolean }) {
    if (next?.reset) {
      setSizeFilter('All')
      setBrandFilter('All')
      setQuery('')
    }
    if (next?.tag !== undefined) setTagFilter(next.tag)
    if (next?.size !== undefined) setSizeFilter(next.size)
    requestAnimationFrame(() => {
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      <a
        href="#shop"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to inventory
      </a>

      <header className="relative z-20 border-b border-navy/10 bg-chalk/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a
            href="#top"
            className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-navy md:text-2xl"
          >
            Jersey Deals
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#shop"
              className="hidden rounded-md border border-navy/20 px-3 py-2 text-sm font-semibold text-navy transition hover:border-navy/40 sm:inline-flex"
            >
              Browse inventory
            </a>
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-hot"
            >
              Shop on eBay
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden bg-gradient-to-b from-chalk via-mist to-chalk">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(200,16,46,0.12), transparent 60%), radial-gradient(ellipse 40% 35% at 100% 40%, rgba(10,22,40,0.08), transparent)',
            }}
          />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[320px]"
            >
              <img
                src={asset('logo.png')}
                alt="Jersey Deals logo"
                className="mx-auto h-auto w-full"
                width={1024}
                height={1024}
              />
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: reduce ? 0 : 0.15 }}
              className="mt-6 max-w-md text-center text-base text-muted md:text-lg"
            >
              Live jerseys and sports attire from our eBay shop — real photos, sizes, and prices.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: reduce ? 0 : 0.25 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <a
                href="#shop"
                className="inline-flex rounded-md bg-crimson px-6 py-3 text-base font-semibold text-white transition hover:bg-crimson-hot"
              >
                Browse live inventory
              </a>
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md border border-navy/25 bg-white/60 px-6 py-3 text-base font-semibold text-navy transition hover:border-navy/50"
              >
                Open eBay shop
              </a>
            </motion.div>

            <div
              id="categories"
              className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6"
            >
              {[
                { label: 'youth apparel', tag: 'Youth' },
                { label: 'shop the sale', tag: 'All' },
              ].map((tile, i) => (
                <motion.button
                  key={tile.label}
                  type="button"
                  onClick={() => goShop({ tag: tile.tag, reset: true })}
                  initial={reduce ? false : { opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: reduce ? 0 : 0.35 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative aspect-square w-full bg-black outline-none transition focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk"
                  aria-label={tile.label}
                >
                  <span className="absolute inset-0 flex items-center justify-center p-4 text-center font-comic text-2xl font-bold lowercase text-white sm:text-3xl md:text-4xl">
                    {tile.label}
                  </span>
                  <span className="pointer-events-none absolute inset-0 bg-crimson/0 transition group-hover:bg-crimson/15" />
                </motion.button>
              ))}
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              {loadState === 'ready' && catalog
                ? `${catalog.count} active listings from @${catalog.seller}`
                : loadState === 'loading'
                  ? 'Loading live inventory…'
                  : 'Browse inventory below or open the eBay shop.'}
            </p>
          </div>
        </section>

        <section id="featured" className="bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <p className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-crimson-hot">
                Featured gear
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide md:text-6xl">
                Live from eBay
              </h2>
              <p className="mt-3 max-w-xl text-white/70">
                A quick mix across youth, training, and kits — tap any item to buy on eBay.
              </p>
            </motion.div>

            {loadState === 'loading' && (
              <p className="mt-12 text-white/60">Loading listings…</p>
            )}

            {loadState === 'error' && (
              <p className="mt-12 text-white/70">
                Listings are temporarily unavailable.{' '}
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-crimson-hot underline-offset-4 hover:text-white"
                >
                  Open the eBay shop
                </a>
                .
              </p>
            )}

            {loadState === 'ready' && featured.length === 0 && (
              <p className="mt-12 text-white/70">
                No active listings right now.{' '}
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-crimson-hot underline-offset-4 hover:text-white"
                >
                  Check the eBay shop
                </a>
                .
              </p>
            )}

            {featured.length > 0 && (
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((item, i) => (
                  <ListingCard key={item.id} item={item} index={i} reduce={reduce} tone="dark" />
                ))}
              </ul>
            )}

            {catalog && catalog.count > featured.length && (
              <motion.div {...fadeUp(reduce, 0.2)} className="mt-10">
                <button
                  type="button"
                  onClick={() => goShop({ tag: 'All', reset: true })}
                  className="inline-flex rounded-md border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
                >
                  Browse all {catalog.count} listings
                </button>
              </motion.div>
            )}
          </div>
        </section>

        <section id="shop" className="relative overflow-hidden bg-chalk py-20 md:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 50% 40% at 0% 0%, rgba(215,40,47,0.08), transparent 55%), radial-gradient(ellipse 45% 35% at 100% 20%, rgba(11,34,63,0.06), transparent)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-crimson">
                Full inventory
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Filter. Find. Buy on eBay.
              </h2>
              <p className="mt-3 text-lg text-muted">
                Every active Jersey Deals listing, searchable by type, size, and brand.
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
                    className="w-full rounded-md border border-navy/15 bg-white/80 px-4 py-3 text-base text-navy outline-none transition placeholder:text-muted/70 focus:border-crimson/50 focus:ring-2 focus:ring-crimson/20"
                  />
                </label>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Type</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="All"
                      active={tagFilter === 'All'}
                      onClick={() => setTagFilter('All')}
                    />
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Size
                    </p>
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Brand
                    </p>
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

            {loadState === 'loading' && (
              <p className="mt-12 text-muted">Loading inventory…</p>
            )}

            {loadState === 'error' && (
              <p className="mt-12 text-muted">
                Inventory is temporarily unavailable.{' '}
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                >
                  Open the eBay shop
                </a>
                .
              </p>
            )}

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
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item, i) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    index={i}
                    reduce={reduce}
                    tone="light"
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section id="buy-direct" className="relative overflow-hidden bg-mist py-20 md:py-28">
          <div
            className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-crimson/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-crimson">
                On eBay now
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Same shop. Live inventory.
              </h2>
              <p className="mt-4 text-lg text-muted">
                Jersey Deals sells on eBay as{' '}
                <a
                  href={catalog?.sellerUrl ?? shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                >
                  @{catalog?.seller ?? 'jerseydealsofficial'}
                </a>
                . This page mirrors our active listings so you can browse here and checkout there.
              </p>
            </motion.div>

            <dl className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  dt: 'Live stock',
                  dd: 'Titles, photos, sizes, and prices sync from our active eBay inventory.',
                },
                {
                  dt: 'Trusted checkout',
                  dd: 'Buy on eBay with buyer protection — feedback score stays with the same seller account.',
                },
                {
                  dt: 'Youth + mens',
                  dd: 'Training tops, pre-match kits, and youth apparel — filter above, then tap through to buy.',
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
          </div>
        </section>

        <section className="bg-crimson py-16 text-white md:py-20">
          <motion.div
            {...fadeUp(reduce)}
            className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8"
          >
            <div>
              <p className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                Ready to shop?
              </p>
              <p className="mt-2 max-w-md text-white/85">
                Browse here, then checkout on eBay for every size and listing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#shop"
                className="inline-flex shrink-0 rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Browse inventory
              </a>
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 rounded-md bg-navy px-6 py-3 text-base font-semibold text-white transition hover:bg-navy-deep"
              >
                Shop on eBay
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-navy-deep py-10 text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <img src={asset('favicon.svg')} alt="" className="h-9 w-9" width={36} height={36} />
            <p className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-white">
              Jersey Deals
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href="#shop" className="hover:text-white">
              Inventory
            </a>
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              eBay shop
            </a>
            <a href={asset('privacy.html')} className="hover:text-white">
              Privacy
            </a>
            <p>© {new Date().getFullYear()} JerseyDeals</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
