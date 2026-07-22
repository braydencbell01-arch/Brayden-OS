import { motion, useReducedMotion } from 'framer-motion'
import { DealJersey, HeroVisual } from './components/JerseyVisual'

const deals = [
  {
    league: 'Premier League',
    title: 'Home Kit — Matchday Edition',
    price: '$64',
    was: '$120',
    primary: '#0C3B2E',
    secondary: '#F4F7F5',
    number: '09',
    accent: '#F4F7F5',
  },
  {
    league: 'NBA',
    title: 'City Edition Swingman',
    price: '$79',
    was: '$140',
    primary: '#FF5A1F',
    secondary: '#0E1A24',
    number: '23',
    accent: '#F4F7F5',
  },
  {
    league: 'NFL',
    title: 'Limited Vapor Throwback',
    price: '$89',
    was: '$160',
    primary: '#F4F7F5',
    secondary: '#0E1A24',
    number: '12',
    accent: '#0C3B2E',
  },
]

const steps = [
  {
    num: '01',
    title: 'Browse verified kits',
    body: 'Filter by league, team, and size. Every listing is checked before it hits the floor.',
  },
  {
    num: '02',
    title: 'Lock the deal',
    body: 'Clear pricing, real stock counts, and no mystery fees at checkout.',
  },
  {
    num: '03',
    title: 'Wear it next weekend',
    body: 'Fast shipping with tracking so your kit lands before kickoff.',
  },
]

function fadeUp(reduce: boolean | null) {
  return {
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }
}

export default function App() {
  const reduce = useReducedMotion()

  return (
    <div className="min-h-dvh overflow-x-hidden bg-chalk text-ink">
      <a
        href="#deals"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-flare focus:px-4 focus:py-2 focus:text-chalk"
      >
        Skip to deals
      </a>

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
          <a href="#top" className="font-display text-2xl tracking-[0.04em] text-chalk md:text-3xl">
            JerseyDeals
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-chalk/85 md:flex">
            <a href="#how" className="transition hover:text-chalk">
              How it works
            </a>
            <a href="#deals" className="transition hover:text-chalk">
              Deals
            </a>
            <a href="#why" className="transition hover:text-chalk">
              Why us
            </a>
          </nav>
          <a
            href="#deals"
            className="rounded-md bg-flare px-4 py-2 text-sm font-semibold text-chalk transition hover:brightness-110"
          >
            Shop deals
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero — one composition: brand, headline, support, CTA, full-bleed visual */}
        <section className="relative min-h-dvh">
          <div className="absolute inset-0">
            <HeroVisual />
          </div>

          <div className="relative z-10 flex min-h-dvh items-end">
            <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pb-24">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl"
              >
                <p className="font-display text-6xl leading-none tracking-[0.04em] text-chalk sm:text-7xl md:text-8xl lg:text-9xl">
                  JerseyDeals
                </p>
                <h1 className="mt-5 max-w-md text-2xl font-semibold leading-tight text-chalk text-balance sm:text-3xl">
                  Game-day kits. Clearance prices.
                </h1>
                <p className="mt-4 max-w-md text-base leading-relaxed text-chalk/80 sm:text-lg">
                  Authentic team jerseys from the leagues you follow — marked down, verified, and
                  ready to ship.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="#deals"
                    className="inline-flex items-center justify-center rounded-md bg-flare px-6 py-3 text-base font-semibold text-chalk transition hover:brightness-110"
                  >
                    Browse today&apos;s deals
                  </a>
                  <a
                    href="#how"
                    className="inline-flex items-center justify-center rounded-md border border-chalk/35 bg-chalk/5 px-6 py-3 text-base font-semibold text-chalk backdrop-blur-sm transition hover:border-chalk/60 hover:bg-chalk/10"
                  >
                    See how it works
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="relative border-t border-pitch/10 bg-mist py-20 md:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 50% 40% at 10% 0%, rgba(31,138,91,0.18), transparent), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(255,90,31,0.1), transparent)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)}>
              <p className="font-display text-xl tracking-[0.12em] text-turf">FROM RACK TO FIELD</p>
              <h2 className="mt-2 max-w-lg font-display text-5xl tracking-[0.02em] text-ink sm:text-6xl">
                Three steps. No runaround.
              </h2>
              <p className="mt-4 max-w-xl text-muted">
                JerseyDeals keeps the path short so you spend more time in the stands than in
                checkout limbo.
              </p>
            </motion.div>

            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((step, i) => (
                <motion.li
                  key={step.num}
                  {...fadeUp(reduce)}
                  transition={{
                    duration: 0.55,
                    delay: reduce ? 0 : i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative"
                >
                  <span className="font-display text-5xl tracking-wide text-pitch/20">{step.num}</span>
                  <h3 className="mt-3 text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-muted leading-relaxed">{step.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Featured deals — interactive product picks */}
        <section id="deals" className="bg-ink py-20 text-chalk md:py-28">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-display text-xl tracking-[0.12em] text-flare">THIS WEEK&apos;S DROP</p>
                <h2 className="mt-2 font-display text-5xl tracking-[0.02em] sm:text-6xl">
                  Kits worth grabbing now
                </h2>
              </div>
              <p className="max-w-sm text-chalk/65">
                Rotating clearance from major leagues. Prices update as stock moves.
              </p>
            </motion.div>

            <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal, i) => (
                <motion.li
                  key={deal.title}
                  {...fadeUp(reduce)}
                  transition={{
                    duration: 0.55,
                    delay: reduce ? 0 : i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <a
                    href="#cta"
                    className="group block outline-none transition focus-visible:ring-2 focus-visible:ring-flare focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-pitch to-pitch-deep px-6 pb-2 pt-8 transition group-hover:brightness-110">
                      <div
                        className="pointer-events-none absolute inset-0 opacity-40"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 20%, rgba(244,247,245,0.12), transparent 55%)',
                        }}
                      />
                      <DealJersey
                        primary={deal.primary}
                        secondary={deal.secondary}
                        number={deal.number}
                        accent={deal.accent}
                      />
                    </div>
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-flare">
                        {deal.league}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-chalk">{deal.title}</h3>
                      <p className="mt-2 flex items-baseline gap-2">
                        <span className="font-display text-3xl tracking-wide text-chalk">
                          {deal.price}
                        </span>
                        <span className="text-sm text-chalk/45 line-through">{deal.was}</span>
                      </p>
                    </div>
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why JerseyDeals */}
        <section id="why" className="relative overflow-hidden bg-chalk py-20 md:py-28">
          <div
            className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-turf/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-flare/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 md:px-8">
            <motion.div {...fadeUp(reduce)} className="max-w-2xl">
              <p className="font-display text-xl tracking-[0.12em] text-turf">BUILT FOR FANS</p>
              <h2 className="mt-2 font-display text-5xl tracking-[0.02em] text-ink sm:text-6xl">
                Why shoppers stick with JerseyDeals
              </h2>
              <p className="mt-4 text-lg text-muted">
                We treat jerseys like game gear — not mystery-box merch.
              </p>
            </motion.div>

            <dl className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-3">
              {[
                {
                  dt: 'Verified authenticity',
                  dd: 'Listings are reviewed for maker marks, tags, and seller history before they go live.',
                },
                {
                  dt: 'Transparent markdowns',
                  dd: 'You see the prior retail and the deal price side by side — no invented “savings.”',
                },
                {
                  dt: 'Size that fits',
                  dd: 'Fit notes and size charts on every kit so what arrives matches what you ordered.',
                },
              ].map((item, i) => (
                <motion.div key={item.dt} {...fadeUp(reduce)} transition={{ delay: reduce ? 0 : i * 0.08 }}>
                  <dt className="text-xl font-semibold text-ink">{item.dt}</dt>
                  <dd className="mt-2 leading-relaxed text-muted">{item.dd}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section
          id="cta"
          className="relative overflow-hidden bg-pitch py-20 text-chalk md:py-28"
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(255,90,31,0.35), transparent 60%), linear-gradient(120deg, #07261e, #0c3b2e 50%, #0e1a24)',
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-18deg, transparent, transparent 12px, rgba(244,247,245,0.06) 12px, rgba(244,247,245,0.06) 13px)',
            }}
          />
          <motion.div
            {...fadeUp(reduce)}
            className="relative mx-auto max-w-3xl px-5 text-center md:px-8"
          >
            <p className="font-display text-6xl tracking-[0.04em] sm:text-7xl md:text-8xl">
              JerseyDeals
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-balance sm:text-3xl">
              Your next kit is already on sale.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-chalk/75">
              Join the drop list for first access to weekly clearance from the teams you actually
              wear.
            </p>
            <form
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@email.com"
                className="min-w-0 flex-1 rounded-md border border-chalk/25 bg-chalk/10 px-4 py-3 text-chalk placeholder:text-chalk/45 outline-none transition focus:border-flare"
              />
              <button
                type="submit"
                className="rounded-md bg-flare px-6 py-3 font-semibold text-chalk transition hover:brightness-110"
              >
                Get deal alerts
              </button>
            </form>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-chalk/10 bg-ink py-10 text-chalk/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="font-display text-2xl tracking-[0.04em] text-chalk">JerseyDeals</p>
          <p className="text-sm">© {new Date().getFullYear()} JerseyDeals. Part of Brayden-OS.</p>
        </div>
      </footer>
    </div>
  )
}
