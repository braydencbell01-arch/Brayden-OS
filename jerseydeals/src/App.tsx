import { useEffect, useState } from 'react'
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
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.55, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
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

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      <a
        href="#categories"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to categories
      </a>

      <header className="relative z-20 border-b border-navy/10 bg-chalk/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a
            href="#top"
            className="font-brand text-xl font-bold uppercase tracking-[0.08em] text-navy md:text-2xl"
          >
            Jersey Deals
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
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md bg-crimson px-6 py-3 text-base font-semibold text-white transition hover:bg-crimson-hot"
              >
                Browse live listings
              </a>
              <a
                href="#featured"
                className="inline-flex rounded-md border border-navy/25 bg-white/60 px-6 py-3 text-base font-semibold text-navy transition hover:border-navy/50"
              >
                Featured gear
              </a>
            </motion.div>

            <div
              id="categories"
              className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6"
            >
              {[
                { label: 'youth apparel', href: youthUrl },
                { label: 'shop the sale', href: shopUrl },
              ].map((tile, i) => (
                <motion.a
                  key={tile.label}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
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
                </motion.a>
              ))}
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              {loadState === 'ready' && catalog
                ? `${catalog.count} active listings from @${catalog.seller}`
                : loadState === 'loading'
                  ? 'Loading live inventory…'
                  : 'Tap a category to browse our eBay shop.'}
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
                Pulled from our active Jersey Deals listings — tap any item to buy on eBay.
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
                  <motion.li key={item.id} {...fadeUp(reduce, i * 0.06)}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-black/40 ring-1 ring-white/10">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                            loading={i < 3 ? 'eager' : 'lazy'}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy-deep to-navy p-6">
                            <span className="font-comic text-xl text-white/80">{item.tag}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crimson-hot">
                          {item.tag}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold leading-snug">
                          {shortTitle(item.title)}
                        </h3>
                        <p className="mt-1 flex items-baseline gap-2">
                          <span className="font-display text-3xl font-bold tracking-wide">
                            {formatPrice(item.price, item.currency)}
                          </span>
                          <span className="text-sm text-white/50">{item.note}</span>
                        </p>
                      </div>
                    </a>
                  </motion.li>
                ))}
              </ul>
            )}

            {catalog && catalog.count > featured.length && (
              <motion.div {...fadeUp(reduce, 0.2)} className="mt-10">
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-md border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
                >
                  See all {catalog.count} listings on eBay
                </a>
              </motion.div>
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
                  dd: 'Training tops, pre-match kits, and youth apparel — tap through for the full catalog.',
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
                Open the full Jersey Deals catalog on eBay for every size and listing.
              </p>
            </div>
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 rounded-md bg-navy px-6 py-3 text-base font-semibold text-white transition hover:bg-navy-deep"
            >
              Shop on eBay
            </a>
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
