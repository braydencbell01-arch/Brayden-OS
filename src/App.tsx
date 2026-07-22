import { motion, useReducedMotion } from 'framer-motion'
import { Logo } from './components/Logo'

const STOREFRONT_URL = '#' // Replace with Shopify / Square storefront URL

const featured = [
  { name: 'Home Kit Jersey', tag: 'Jerseys', price: '$64', note: 'Sizes S–XXL' },
  { name: 'Training Top', tag: 'Training', price: '$42', note: 'Breathable fit' },
  { name: 'Sideline Hoodie', tag: 'Court / Sideline', price: '$58', note: 'Limited stock' },
]

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

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-navy">
      <a
        href="#categories"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to categories
      </a>

      {/* Top bar: wordmark left, matches logo type */}
      <header className="relative z-20 border-b border-navy/10 bg-chalk/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a
            href="#top"
            className="font-brand text-xl font-bold uppercase tracking-[0.12em] text-navy md:text-2xl"
          >
            Jersey Deals
          </a>
          <a
            href={STOREFRONT_URL}
            className="rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-hot"
          >
            Enter the storefront
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero composition: centered logo + two category placeholders */}
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
              <Logo className="mx-auto h-auto w-full drop-shadow-sm" />
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: reduce ? 0 : 0.15 }}
              className="mt-6 max-w-md text-center text-base text-muted md:text-lg"
            >
              Jerseys and sports attire, sold direct — not through a marketplace middleman.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: reduce ? 0 : 0.25 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <a
                href={STOREFRONT_URL}
                className="inline-flex rounded-md bg-crimson px-6 py-3 text-base font-semibold text-white transition hover:bg-crimson-hot"
              >
                Enter the storefront
              </a>
              <a
                href="#buy-direct"
                className="inline-flex rounded-md border border-navy/25 bg-white/60 px-6 py-3 text-base font-semibold text-navy transition hover:border-navy/50"
              >
                Why buy direct
              </a>
            </motion.div>

            {/* Two large black square placeholders — photos coming later */}
            <div
              id="categories"
              className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6"
            >
              {[
                { label: 'youth apparel', href: STOREFRONT_URL },
                { label: 'shop the sale', href: STOREFRONT_URL },
              ].map((tile, i) => (
                <motion.a
                  key={tile.label}
                  href={tile.href}
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
              Product photos coming soon — tap a category to browse the storefront.
            </p>
          </div>
        </section>

        {/* Featured gear */}
        <section id="featured" className="bg-navy py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <p className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-crimson-hot">
                Featured gear
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide md:text-6xl">
                Jerseys, training, sideline
              </h2>
              <p className="mt-3 max-w-xl text-white/70">
                Sample picks with prices and fit notes. Inventory and photos live in the storefront.
              </p>
            </motion.div>

            <ul className="mt-12 grid gap-6 sm:grid-cols-3">
              {featured.map((item, i) => (
                <motion.li key={item.name} {...fadeUp(reduce, i * 0.08)}>
                  <a
                    href={STOREFRONT_URL}
                    className="block outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                  >
                    <div className="aspect-[4/5] bg-black/40 ring-1 ring-white/10">
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy-deep to-navy p-6">
                        <span className="font-comic text-xl text-white/80">{item.tag}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crimson-hot">
                        {item.tag}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{item.name}</h3>
                      <p className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-3xl font-bold tracking-wide">
                          {item.price}
                        </span>
                        <span className="text-sm text-white/50">{item.note}</span>
                      </p>
                    </div>
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* Buy direct */}
        <section id="buy-direct" className="relative overflow-hidden bg-mist py-20 md:py-28">
          <div
            className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-crimson/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-crimson">
                Buy direct
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide text-navy md:text-6xl">
                Checkout without the marketplace cut
              </h2>
              <p className="mt-4 text-lg text-muted">
                JerseyDeals started on eBay. The storefront is where you pay us directly — card or
                PayPal — with clear photos, sizes, prices, and inventory on every listing.
              </p>
            </motion.div>

            <dl className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  dt: 'Direct payment',
                  dd: 'Money goes to our bank via Shopify Payments / PayPal — not stuck in a marketplace wallet.',
                },
                {
                  dt: 'Real product detail',
                  dd: 'Title, photos, price, size, team, condition, and stock — the same info you expect in a real shop.',
                },
                {
                  dt: 'Still on eBay too',
                  dd: 'Shop here for the full catalog, or find us on eBay while we grow the brand store.',
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

        {/* Final CTA */}
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
                Enter the storefront for youth apparel, sale kits, and the full JerseyDeals catalog.
              </p>
            </div>
            <a
              href={STOREFRONT_URL}
              className="inline-flex shrink-0 rounded-md bg-navy px-6 py-3 text-base font-semibold text-white transition hover:bg-navy-deep"
            >
              Enter the storefront
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-navy-deep py-10 text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="h-9 w-9" width={36} height={36} />
            <p className="font-brand text-xl font-bold uppercase tracking-[0.12em] text-white">
              Jersey Deals
            </p>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} JerseyDeals. Direct storefront landing page.
          </p>
        </div>
      </footer>
    </div>
  )
}
