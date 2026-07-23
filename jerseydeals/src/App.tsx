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
  EBAY_YOUTH_URL,
  FAMILY_NOTE,
  SALE_HEADLINE,
  SALE_URGENCY,
  SQUARE_STORE_URL,
} from './config'
import {
  conditionLabel,
  formatPrice,
  isYouthListing,
  lowestSalePrice,
  pickFeatured,
  pickNewDrops,
  shortTitle,
  type Listing,
  type ListingsPayload,
} from './listings'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const ease = [0.22, 1, 0.36, 1] as const

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
  return catalog?.shopUrl ?? EBAY_SHOP_URL
}

function shopLabel() {
  return SQUARE_STORE_URL ? 'Enter the storefront' : 'Shop on eBay'
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
  return (
    <motion.li {...fadeUp(reduce, delay)}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('product_click', { id: item.id, tag: item.tag })}
        className={`group block outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 ${
          tone === 'dark' ? 'focus-visible:ring-offset-navy' : 'focus-visible:ring-offset-chalk'
        }`}
      >
        <div className="aspect-[4/5] overflow-hidden bg-navy-deep">
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy-deep to-navy p-6">
              <span className="font-display text-2xl uppercase text-white/70">{item.tag}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                tone === 'dark' ? 'text-crimson-hot' : 'text-crimson'
              }`}
            >
              {item.tag}
            </p>
            <span
              className={`text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                tone === 'dark' ? 'text-white/45' : 'text-muted'
              }`}
            >
              {condition}
            </span>
          </div>
          <h3
            className={`mt-1 text-lg font-semibold leading-snug ${
              tone === 'dark' ? 'text-white' : 'text-navy'
            }`}
          >
            {shortTitle(item.title)}
          </h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-display text-3xl font-bold tracking-wide ${
                tone === 'dark' ? 'text-white' : 'text-navy'
              }`}
            >
              {formatPrice(item.price, item.currency)}
            </span>
            <span className={`text-sm ${tone === 'dark' ? 'text-white/45' : 'text-muted'}`}>
              {item.note}
            </span>
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
  const [showSticky, setShowSticky] = useState(false)

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
    const onScroll = () => setShowSticky(window.scrollY > window.innerHeight * 0.7)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shopUrl = primaryShopUrl(catalog)
  const ebayShop = catalog?.shopUrl ?? EBAY_SHOP_URL
  const ebaySeller = catalog?.sellerUrl ?? EBAY_SELLER_URL
  const listings = catalog?.listings ?? []
  const featured = pickFeatured(listings, 6)
  const newDrops = pickNewDrops(listings, 3)
  const saleFloor = lowestSalePrice(listings)
  const youthCount = listings.filter(isYouthListing).length

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

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      <a
        href="#featured"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to featured gear
      </a>

      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
          <a
            href="#top"
            className="font-brand text-lg font-bold uppercase tracking-[0.1em] text-white md:text-xl"
          >
            Jersey Deals
          </a>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('cta_click', { place: 'header' })}
            className="bg-crimson px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-hot"
          >
            {shopLabel()}
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero — brand, one headline, one line, CTAs, full-bleed kits */}
        <section className="relative min-h-[100svh] overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            <motion.img
              key={heroImage}
              src={heroImage}
              alt=""
              initial={reduce ? false : { scale: 1.08, opacity: 0.65 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0 : 1.35, ease }}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/88 to-navy-deep/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-navy-deep/55" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-24 md:justify-center md:px-8 md:pb-24 md:pt-20">
            <motion.div
              className="max-w-xl"
              initial={reduce ? false : { opacity: 0.001, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
            >
              <p className="font-brand text-4xl font-bold uppercase leading-[1.05] tracking-[0.06em] text-white sm:text-5xl md:text-6xl">
                Jersey Deals
              </p>
              <h1 className="mt-4 font-display text-3xl font-bold uppercase leading-none tracking-wide text-white sm:text-4xl md:text-[2.75rem]">
                Youth kits &amp; sale jerseys, sold direct.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/75 md:text-lg">
                Live stock with real photos and sizes — shop our catalog without the marketplace
                runaround.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <motion.a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'hero_primary' })}
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="inline-flex bg-crimson px-6 py-3.5 text-base font-semibold text-white transition hover:bg-crimson-hot"
                >
                  {shopLabel()}
                </motion.a>
                <a
                  href="#shop"
                  onClick={() => track('cta_click', { place: 'hero_secondary' })}
                  className="inline-flex border border-white/35 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/5"
                >
                  Browse categories
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

        {/* Categories */}
        <section id="shop" className="bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                Start shopping
              </h2>
              <p className="mt-3 text-lg text-muted">
                Youth sizes, sale racks, or the full live catalog — pick a path.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'Youth apparel',
                  href: EBAY_YOUTH_URL,
                  image: asset('category-youth.jpg'),
                  copy:
                    youthCount > 0
                      ? `${youthCount} youth listings ready to ship.`
                      : 'Kids and youth kits sized and ready to ship.',
                  event: 'category_youth',
                },
                {
                  label: SALE_HEADLINE,
                  href: EBAY_SALE_URL,
                  image: asset('category-sale.jpg'),
                  copy:
                    saleFloor != null
                      ? `${SALE_URGENCY} · from ${formatPrice(saleFloor, 'USD')}`
                      : SALE_URGENCY,
                  event: 'category_sale',
                },
                {
                  label: 'Full catalog',
                  href: ebayShop,
                  image: listings[2]?.image || asset('product-home.jpg'),
                  copy:
                    loadState === 'ready' && catalog
                      ? `${catalog.count} active listings from @${catalog.seller}.`
                      : 'Every active listing from Jersey Deals.',
                  event: 'category_all',
                },
              ].map((tile, i) => (
                <motion.a
                  key={tile.label}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('category_click', { category: tile.event })}
                  {...fadeUp(reduce, 0.06 + i * 0.08)}
                  className="group relative block min-h-[240px] overflow-hidden bg-navy outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk"
                >
                  <img
                    src={tile.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/55 to-navy/15" />
                  <div className="relative flex h-full flex-col justify-end p-6 md:p-7">
                    <p className="font-display text-3xl font-bold uppercase tracking-wide text-white">
                      {tile.label}
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-white/75">{tile.copy}</p>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* New drops */}
        <section id="new-drops" className="border-y border-navy/10 bg-white py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                  New drops
                </h2>
                <p className="mt-2 max-w-xl text-muted">
                  Fresh from the rack — newest active listings first.
                </p>
              </div>
              <a
                href={EBAY_NEWEST_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { place: 'new_drops_all' })}
                className="text-sm font-semibold uppercase tracking-[0.14em] text-crimson hover:text-crimson-hot"
              >
                See newest on eBay
              </a>
            </motion.div>

            {newDrops.length > 0 ? (
              <ul className="mt-10 grid gap-8 sm:grid-cols-3">
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

        {/* Featured */}
        <section id="featured" className="bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide md:text-6xl">
                Featured gear
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
              <motion.div {...fadeUp(reduce, 0.15)} className="mt-12">
                <a
                  href={ebayShop}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { place: 'featured_all' })}
                  className="inline-flex border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
                >
                  See all {catalog.count} listings on eBay
                </a>
              </motion.div>
            )}
          </div>
        </section>

        {/* Trust / buy direct */}
        <section id="buy-direct" className="relative overflow-hidden bg-mist py-20 md:py-28">
          <div
            className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-crimson/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-6xl">
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
                {SQUARE_STORE_URL
                  ? ' Pay by card on Square, or shop the same stock on eBay.'
                  : ' Checkout on eBay today — Square direct payments are next.'}
              </p>
            </motion.div>

            <dl className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  dt: SQUARE_STORE_URL ? 'Square checkout' : 'Trusted checkout',
                  dd: SQUARE_STORE_URL
                    ? 'Pay with card on our Square storefront — money goes to us directly.'
                    : 'Buy on eBay with buyer protection on the same seller account.',
                },
                {
                  dt: 'Real product detail',
                  dd: 'Photos, price, size, team, and stock on every listing — no mystery SKUs.',
                },
                {
                  dt: 'Still on eBay',
                  dd: 'Shop here for curated paths, or open the full eBay catalog anytime.',
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

            {/* Social proof strip */}
            <motion.div
              {...fadeUp(reduce, 0.12)}
              className="mt-14 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-navy/10 pt-8 text-sm text-muted"
            >
              <p>
                <span className="font-display text-3xl font-bold text-navy">
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
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
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

        {/* Email / restock */}
        <section id="alerts" className="bg-navy py-20 text-white md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div
              {...fadeUp(reduce)}
              className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end"
            >
              <div>
                <h2 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
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
                  className="min-w-0 flex-1 border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-crimson"
                />
                <button
                  type="submit"
                  className="bg-crimson px-5 py-3 text-sm font-semibold text-white transition hover:bg-crimson-hot"
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
        <section className="relative overflow-hidden bg-crimson py-20 text-white md:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(ellipse 50% 80% at 100% 50%, rgba(11,34,63,0.55), transparent 60%)',
            }}
            aria-hidden
          />
          <motion.div
            {...fadeUp(reduce)}
            className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 md:flex-row md:items-center md:justify-between md:px-8"
          >
            <div>
              <p className="font-brand text-3xl font-bold uppercase tracking-[0.06em] md:text-4xl">
                Jersey Deals
              </p>
              <p className="mt-3 max-w-md text-lg text-white/90">
                Ready to shop? Youth apparel, sale kits, and the full catalog are live.
              </p>
            </div>
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_click', { place: 'final' })}
              className="inline-flex shrink-0 bg-navy px-7 py-3.5 text-base font-semibold text-white transition hover:bg-navy-deep"
            >
              {shopLabel()}
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-navy-deep py-10 text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <img src={asset('favicon.svg')} alt="" className="h-9 w-9" width={36} height={36} />
            <p className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-white">
              Jersey Deals
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href={ebayShop} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              eBay shop
            </a>
            {SQUARE_STORE_URL ? (
              <a
                href={SQUARE_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Square store
              </a>
            ) : null}
            <a href={asset('privacy.html')} className="hover:text-white">
              Privacy
            </a>
            <p>© {new Date().getFullYear()} JerseyDeals</p>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-deep/95 p-3 backdrop-blur md:hidden transition ${
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
          {shopLabel()}
        </a>
      </div>
    </div>
  )
}
