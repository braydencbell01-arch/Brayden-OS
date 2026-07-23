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
}

type ListingsPayload = {
  syncedAt: string
  seller: string
  sellerUrl: string
  shopUrl: string
  count: number
  listings: Listing[]
}

const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const ease = [0.22, 1, 0.36, 1] as const

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

function fadeUp(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay: reduce ? 0 : delay, ease },
  }
}

export default function App() {
  const reduce = useReducedMotion()
  const [catalog, setCatalog] = useState<ListingsPayload | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

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
  const youthUrl = catalog
    ? `${catalog.shopUrl}&_nkw=youth`
    : 'https://www.ebay.com/sch/i.html?_ssn=jerseydealsofficial&_nkw=youth&_sop=10'
  const featured = (catalog?.listings ?? []).slice(0, 6)
  const heroImages = useMemo(() => {
    const imgs = (catalog?.listings ?? [])
      .map((l) => l.image)
      .filter(Boolean)
    return imgs.slice(0, 5)
  }, [catalog])
  const heroPrimary = heroImages[0] ?? ''

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      <a
        href="#featured"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
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
            className="bg-crimson px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-hot"
          >
            Shop on eBay
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero: one composition — brand, headline, line, CTA, full-bleed kits */}
        <section className="relative min-h-[100svh] overflow-hidden bg-navy-deep text-white">
          <div className="absolute inset-0" aria-hidden>
            {heroPrimary ? (
              <motion.img
                key={heroPrimary}
                src={heroPrimary}
                alt=""
                initial={reduce ? false : { scale: 1.08, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: reduce ? 0 : 1.4, ease }}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 55% at 70% 40%, rgba(215,40,47,0.35), transparent 55%), linear-gradient(160deg, #0b223f 0%, #06101c 55%, #132a4a 100%)',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/88 to-navy-deep/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-navy-deep/50" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-24 md:justify-center md:px-8 md:pb-24 md:pt-20">
            <div className="max-w-xl">
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease }}
                className="font-brand text-4xl font-bold uppercase leading-[1.05] tracking-[0.06em] text-white sm:text-5xl md:text-6xl"
              >
                Jersey Deals
              </motion.p>

              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: reduce ? 0 : 0.12, ease }}
                className="mt-4 font-display text-3xl font-bold uppercase leading-none tracking-wide text-white sm:text-4xl md:text-[2.75rem]"
              >
                Club kits. Live stock.
              </motion.h1>

              <motion.p
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: reduce ? 0 : 0.22, ease }}
                className="mt-4 max-w-md text-base leading-relaxed text-white/75 md:text-lg"
              >
                Browse our active eBay inventory — real photos, sizes, and prices from
                @jerseydealsofficial.
              </motion.p>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: reduce ? 0 : 0.32, ease }}
                className="mt-7 flex flex-wrap items-center gap-3"
              >
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex bg-crimson px-6 py-3.5 text-base font-semibold text-white transition hover:bg-crimson-hot"
                >
                  Shop on eBay
                </a>
                <a
                  href="#featured"
                  className="inline-flex border border-white/35 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/5"
                >
                  See featured gear
                </a>
              </motion.div>
            </div>
          </div>

          <motion.a
            href="#shop"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.9, duration: 0.6 }}
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
          </motion.a>
        </section>

        {/* Shop paths — one job */}
        <section id="shop" className="bg-chalk py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-5xl">
                Start shopping
              </h2>
              <p className="mt-3 text-lg text-muted">
                Jump straight into youth sizes or the full live catalog on eBay.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {[
                {
                  label: 'Youth apparel',
                  href: youthUrl,
                  image: featured.find((l) => /youth/i.test(l.title))?.image ?? heroImages[1],
                  copy: 'Kids and youth kits sized and ready to ship.',
                },
                {
                  label: 'Full catalog',
                  href: shopUrl,
                  image: heroImages[2] ?? heroImages[0],
                  copy:
                    loadState === 'ready' && catalog
                      ? `${catalog.count} active listings from @${catalog.seller}.`
                      : 'Every active listing from Jersey Deals.',
                },
              ].map((tile, i) => (
                <motion.a
                  key={tile.label}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...fadeUp(reduce, 0.08 + i * 0.08)}
                  className="group relative block min-h-[220px] overflow-hidden bg-navy outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-4 focus-visible:ring-offset-chalk md:min-h-[280px]"
                >
                  {tile.image ? (
                    <img
                      src={tile.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/55 to-navy/20" />
                  <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                    <p className="font-display text-3xl font-bold uppercase tracking-wide text-white md:text-4xl">
                      {tile.label}
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-white/75 md:text-base">{tile.copy}</p>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Featured gear */}
        <section id="featured" className="bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide md:text-6xl">
                Featured gear
              </h2>
              <p className="mt-3 text-lg text-white/70">
                Pulled from our live eBay listings — tap any kit to buy.
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
              <ul className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((item, i) => (
                  <motion.li key={item.id} {...fadeUp(reduce, i * 0.05)}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-navy-deep">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            loading={i < 3 ? 'eager' : 'lazy'}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy-deep to-navy p-6">
                            <span className="font-display text-2xl uppercase text-white/70">
                              {item.tag}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crimson-hot">
                          {item.tag}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold leading-snug text-white">
                          {shortTitle(item.title)}
                        </h3>
                        <p className="mt-2 flex items-baseline gap-2">
                          <span className="font-display text-3xl font-bold tracking-wide">
                            {formatPrice(item.price, item.currency)}
                          </span>
                          <span className="text-sm text-white/45">{item.note}</span>
                        </p>
                      </div>
                    </a>
                  </motion.li>
                ))}
              </ul>
            )}

            {catalog && catalog.count > featured.length && (
              <motion.div {...fadeUp(reduce, 0.15)} className="mt-12">
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
                >
                  See all {catalog.count} listings on eBay
                </a>
              </motion.div>
            )}
          </div>
        </section>

        {/* Trust / seller */}
        <section id="ebay" className="relative overflow-hidden bg-mist py-20 md:py-28">
          <div
            className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-crimson/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[1.1fr_0.9fr] md:items-end md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Same shop. Live inventory.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-muted">
                Jersey Deals sells on eBay as{' '}
                <a
                  href={catalog?.sellerUrl ?? shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                >
                  @{catalog?.seller ?? 'jerseydealsofficial'}
                </a>
                . Browse here, checkout there — buyer protection included.
              </p>
            </motion.div>

            <motion.ul {...fadeUp(reduce, 0.1)} className="space-y-6 border-l border-navy/15 pl-6">
              {[
                {
                  dt: 'Live stock',
                  dd: 'Titles, photos, sizes, and prices sync from active listings.',
                },
                {
                  dt: 'Trusted checkout',
                  dd: 'Buy on eBay with buyer protection on the same seller account.',
                },
                {
                  dt: 'Youth + mens',
                  dd: 'Training tops, pre-match kits, and youth apparel in one shop.',
                },
              ].map((item) => (
                <li key={item.dt}>
                  <p className="font-display text-xl font-bold uppercase tracking-wide text-navy">
                    {item.dt}
                  </p>
                  <p className="mt-1 text-muted">{item.dd}</p>
                </li>
              ))}
            </motion.ul>
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
                Open the full catalog on eBay for every size and listing.
              </p>
            </div>
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 bg-navy px-7 py-3.5 text-base font-semibold text-white transition hover:bg-navy-deep"
            >
              Shop on eBay
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
            <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
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
