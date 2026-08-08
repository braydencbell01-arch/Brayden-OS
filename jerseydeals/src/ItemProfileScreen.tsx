import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { track } from './analytics'
import {
  CONTACT_EMAIL,
  EBAY_FEEDBACK_COUNT,
  EBAY_OVERALL_RATING,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  FAMILY_NOTE,
} from './config'
import { reviewsForListing } from './ebayReviews'
import { listingDisplayColor } from './itemColor'
import { leaveItemPage, goToItemPage } from './itemRoute'
import {
  conditionLabel,
  formatPrice,
  inferClub,
  isYouthListing,
  kitType,
  listingImages,
  listingSize,
  saleCompareAtPrice,
  shortTitle,
  sortListings,
  type Listing,
} from './listings'
import { RewardsSectionJoin } from './RewardsJoinForm'
import { resolveSizeChart } from './sizeCharts'
import { SiteFooter } from './SiteFooter'

const FALLBACK_IMAGE = `${import.meta.env.BASE_URL || './'}product-home.jpg`.replace(
  /([^:]\/)\/+/g,
  '$1',
)

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from)
  let left = days
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) left -= 1
  }
  return d
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function msUntilEndOfLocalDay() {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return Math.max(0, end.getTime() - now.getTime())
}

function formatCountdown(ms: number) {
  const totalMin = Math.floor(ms / 60000)
  const hrs = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min`
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-navy/15">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-display text-base font-bold uppercase tracking-wide text-navy">
          {title}
        </span>
        <span className="font-display text-xl text-navy" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? <div className="pb-4 text-sm leading-relaxed text-navy/75">{children}</div> : null}
    </div>
  )
}

function ProfileGallery({ item }: { item: Listing }) {
  const photos = listingImages(item)
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)

  useEffect(() => {
    setActive(0)
    activeRef.current = 0
    trackRef.current?.scrollTo({ left: 0 })
  }, [item.id])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const go = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el || photos.length <= 1) return
    const next = Math.min(photos.length - 1, Math.max(0, activeRef.current + dir))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setActive(next)
    activeRef.current = next
  }

  const list = photos.length ? photos : [FALLBACK_IMAGE]

  return (
    <div className="relative aspect-square w-full bg-white sm:aspect-[4/5]">
      <div
        ref={trackRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={(event) => {
          const el = event.currentTarget
          const index = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
          const next = Math.min(Math.max(index, 0), list.length - 1)
          if (next === activeRef.current) return
          activeRef.current = next
          setActive(next)
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${shortTitle(item.title)} photos`}
      >
        {list.map((src, index) => (
          <div
            key={`${item.id}-${index}`}
            className="relative h-full w-full min-w-full shrink-0 snap-start snap-always"
          >
            <img
              src={src}
              alt={
                index === 0
                  ? shortTitle(item.title)
                  : `${shortTitle(item.title)} photo ${index + 1}`
              }
              className="h-full w-full object-contain object-center select-none"
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE
              }}
            />
          </div>
        ))}
      </div>

      {list.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            disabled={active === 0}
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-navy/25 bg-white text-xl leading-none text-navy disabled:opacity-35"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            disabled={active === list.length - 1}
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-navy/25 bg-white text-xl leading-none text-navy disabled:opacity-35"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2">
            {list.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                aria-label={`Photo ${index + 1}`}
                aria-current={index === active}
                onClick={() => {
                  const el = trackRef.current
                  if (!el) return
                  el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
                  setActive(index)
                  activeRef.current = index
                }}
                className={`h-2.5 w-2.5 rounded-full border transition ${
                  index === active
                    ? 'border-[#e85d04] bg-[#e85d04]'
                    : 'border-navy/40 bg-transparent'
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function SizeChartModal({
  brand,
  youth,
  onClose,
}: {
  brand?: string
  youth: boolean
  onClose: () => void
}) {
  const chart = resolveSizeChart({ brand, youth })
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

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label="Size chart">
      <button type="button" className="absolute inset-0 bg-navy-deep/55" aria-label="Close size chart" onClick={onClose} />
      <div className="relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto bg-white px-5 py-6 shadow-2xl sm:px-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              {chart.brand} · {chart.audience}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-navy">
              Size chart
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center text-navy hover:text-crimson"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{chart.tip}</p>
        <table className="mt-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy/15 text-[0.65rem] uppercase tracking-[0.12em] text-muted">
              <th className="py-2 pr-2 font-semibold">Size</th>
              <th className="py-2 pr-2 font-semibold">Chest ({chart.unit})</th>
              <th className="py-2 font-semibold">Length</th>
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => (
              <tr key={row.size} className="border-b border-navy/10">
                <td className="py-2.5 pr-2 font-semibold text-navy">{row.size}</td>
                <td className="py-2.5 pr-2 text-navy/80">{row.chest}</td>
                <td className="py-2.5 text-navy/80">{row.length || row.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function relatedListings(item: Listing, all: Listing[], count = 4) {
  const club = inferClub(item.title)
  const brand = (item.brand || '').toLowerCase()
  const scored = all
    .filter((row) => row.id !== item.id)
    .map((row) => {
      let score = 0
      const rowClub = inferClub(row.title)
      if (club && rowClub?.id === club.id) score += 3
      if (brand && (row.brand || '').toLowerCase() === brand) score += 2
      if (kitType(row) === kitType(item)) score += 1
      return { row, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  const picked = scored.map((x) => x.row)
  if (picked.length >= count) return picked.slice(0, count)
  const filler = sortListings(
    all.filter((row) => row.id !== item.id && !picked.some((p) => p.id === row.id)),
    'featured',
  )
  return [...picked, ...filler].slice(0, count)
}

/** Full-page GoalKick-style item profile. */
export function ItemProfileScreen({
  item,
  listings,
  onAddToCart,
  onShopInventory,
  onShopYouth,
}: {
  item: Listing
  listings: Listing[]
  onAddToCart: (item: Listing) => void
  onShopInventory: () => void
  onShopYouth?: () => void
}) {
  const [sizeChartOpen, setSizeChartOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [countdownMs, setCountdownMs] = useState(msUntilEndOfLocalDay)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [reviewIndex, setReviewIndex] = useState(0)

  const compareAt = saleCompareAtPrice(item)
  const color = listingDisplayColor(item)
  const size = listingSize(item)
  const club = inferClub(item.title)
  const kit = kitType(item)
  const youth = isYouthListing(item)
  const reviews = useMemo(() => reviewsForListing(item.id, 5), [item.id])
  const related = useMemo(() => relatedListings(item, listings, 4), [item, listings])

  const shipDate = useMemo(() => addBusinessDays(new Date(), 1), [])
  const deliverStart = useMemo(() => addBusinessDays(new Date(), 3), [])
  const deliverEnd = useMemo(() => addBusinessDays(new Date(), 5), [])
  const deliverLabel = `${formatShortDate(deliverStart)} – ${formatShortDate(deliverEnd)}`

  useEffect(() => {
    const id = window.setInterval(() => setCountdownMs(msUntilEndOfLocalDay()), 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    track('item_profile_view', { id: item.id, tag: item.tag })
  }, [item.id, item.tag])

  const faqs = useMemo(
    () => [
      {
        q: `Does the ${shortTitle(item.title)} run true to size?`,
        a: youth
          ? 'Youth kits follow the size printed on the listing. If between sizes, size up.'
          : 'Most replica kits run true to size. Training and pre-match tops can run slim — size up when layering.',
      },
      {
        q: 'Is this authentic branded kit?',
        a: 'We sell branded club and national kits from our inventory with clear photos. Condition is listed on each item.',
      },
      {
        q: 'How fast will it ship?',
        a: `Orders placed today typically ship ${formatShortDate(shipDate)}. Estimated delivery ${deliverLabel}. ${FAMILY_NOTE}`,
      },
      {
        q: 'What is your return policy?',
        a: `Returns follow the policy at Square checkout. Email ${CONTACT_EMAIL} before opening a case if something arrives not as described.`,
      },
    ],
    [item.title, youth, shipDate, deliverLabel],
  )

  function submitQuestion(e: FormEvent) {
    e.preventDefault()
    const text = question.trim()
    if (!text) return
    track('item_ask_question', { id: item.id })
    const subject = encodeURIComponent(`Question about ${shortTitle(item.title)}`)
    const body = encodeURIComponent(
      `${text}\n\n—\nItem: ${item.title}\nListing id: ${item.id}\n`,
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="fixed inset-0 z-[72] flex min-h-dvh flex-col bg-white text-navy">
      <header className="flex items-center justify-between border-b border-navy/10 bg-white px-5 py-3.5">
        <button
          type="button"
          onClick={() => leaveItemPage()}
          className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy transition hover:text-crimson"
        >
          ← Back
        </button>
        <p className="font-brand text-[0.65rem] font-bold uppercase tracking-[0.14em] text-navy">
          Item
        </p>
        <span className="w-12" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto" aria-label={shortTitle(item.title)}>
        <ProfileGallery item={item} />

        <div className="mx-auto w-full max-w-lg px-5 pb-4 pt-5">
          <h1 className="font-display text-2xl font-bold uppercase leading-tight tracking-wide text-navy sm:text-3xl">
            {shortTitle(item.title)}
          </h1>
          {item.sku || item.itemId ? (
            <p className="mt-2 text-[0.65rem] uppercase tracking-[0.12em] text-muted">
              Style: {item.sku || item.itemId}
              {kit !== 'Other' ? ` · ${kit}` : ''}
              {item.brand ? ` · ${item.brand}` : ''}
            </p>
          ) : (
            <p className="mt-2 text-[0.65rem] uppercase tracking-[0.12em] text-muted">
              {[kit !== 'Other' ? kit : null, item.brand, club?.name].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              {compareAt != null ? (
                <span className="font-display text-xl font-semibold text-navy/35 line-through">
                  {formatPrice(compareAt, item.currency)}
                </span>
              ) : null}
              <span className="font-display text-3xl font-bold text-navy">
                {formatPrice(item.price, item.currency)}
              </span>
            </div>
            {item.brand ? (
              <span className="shrink-0 font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy/70">
                {item.brand}
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-navy/70">
            Have a product question?{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Question about ${shortTitle(item.title)}`)}`}
              className="font-semibold text-[#e85d04] underline-offset-2 hover:underline"
              onClick={() => track('item_ask_us', { id: item.id })}
            >
              Ask us
            </a>
          </p>

          <div className="mt-6">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-navy">
              Color: {color.name}
            </p>
            <span
              className="mt-2 inline-block h-9 w-9 rounded-full border border-navy/20 shadow-inner"
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={`Color ${color.name}`}
            />
          </div>

          <div className="mt-6">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-navy">Size:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex min-w-[2.75rem] items-center justify-center bg-navy px-3 py-2.5 font-brand text-xs font-bold uppercase tracking-[0.12em] text-cream">
                {size && size !== 'Other' ? size : 'One size'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                track('item_size_chart', { id: item.id, brand: item.brand || '' })
                setSizeChartOpen(true)
              }}
              className="mt-3 inline-flex items-center gap-2 border border-navy/20 bg-white px-3.5 py-2.5 font-brand text-[0.7rem] font-bold uppercase tracking-[0.12em] text-navy transition hover:border-navy"
            >
              <span className="grid h-5 w-5 place-items-center bg-crimson text-[0.65rem] font-bold text-white">
                T
              </span>
              What&apos;s my size?
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              track('add_to_cart', { id: item.id, tag: item.tag, place: 'item_profile' })
              onAddToCart(item)
            }}
            className="mt-6 flex w-full items-center justify-center bg-[#e85d04] py-4 font-display text-base font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#d35400]"
          >
            Add to cart +
          </button>

          <p className="mt-5 text-sm text-navy/80">
            Estimated delivery <strong className="text-navy">{deliverLabel}</strong>. Order within{' '}
            <strong className="text-emerald-700">{formatCountdown(countdownMs)}</strong>
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { title: 'Today', sub: 'Order placed', icon: '📅' },
              { title: formatShortDate(shipDate), sub: 'Order ships', icon: '🚚' },
              { title: deliverLabel, sub: 'Delivered', icon: '📦' },
            ].map((step, i) => (
              <div
                key={step.sub}
                className={`relative border border-navy/15 bg-white px-2 py-3 text-center ${
                  i < 2
                    ? "after:absolute after:right-[-0.45rem] after:top-1/2 after:z-10 after:-translate-y-1/2 after:text-navy/25 after:content-['›']"
                    : ''
                }`}
              >
                <p className="text-base" aria-hidden>
                  {step.icon}
                </p>
                <p className="mt-1 font-display text-[0.7rem] font-bold uppercase leading-tight tracking-wide text-navy">
                  {step.title}
                </p>
                <p className="mt-0.5 text-[0.6rem] text-muted">{step.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <p className="inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-navy">
              <span aria-hidden>🔒</span> Guaranteed secure checkout
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center border border-navy/15 bg-[#006aff] px-3 py-1.5 font-brand text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white">
                Square
              </span>
              <span className="text-xs text-muted">Visa · Mastercard · Apple Pay · Google Pay</span>
            </div>
          </div>

          <div className="mt-8 border-t border-navy/15">
            <Accordion title="Description" defaultOpen>
              <p>
                {item.description?.trim() ||
                  `${shortTitle(item.title)}${item.brand ? ` by ${item.brand}` : ''}. ${
                    kit !== 'Other' ? `${kit} kit. ` : ''
                  }${conditionLabel(item)}. Real photos from our inventory — what you see is what ships.`}
              </p>
              {item.quantity > 0 ? (
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">
                  In stock · {item.quantity} available
                </p>
              ) : null}
            </Accordion>
            <Accordion title="Return & exchange">
              <p>
                Returns follow the policy at Square checkout. Items must be unused with tags when
                applicable. Email {CONTACT_EMAIL} before opening a case if something arrives not as
                described.
              </p>
            </Accordion>
            <Accordion title="Shipping & delivery">
              <p>
                We ship from US inventory. Shipping is 10% of your item total under $100 — orders
                $100+ get free shipping. Estimated delivery {deliverLabel} for orders placed today.
              </p>
            </Accordion>
          </div>
        </div>

        <div className="bg-navy px-5 py-3.5 text-center">
          <a
            href={EBAY_SELLER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('outbound_click', { place: 'item_ratings_bar', channel: 'ebay' })}
            className="inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.12em] text-[#e85d04]"
          >
            <span className="text-cream" aria-hidden>
              ★
            </span>
            {EBAY_FEEDBACK_COUNT}+ 5-star reviews · {EBAY_OVERALL_RATING.toFixed(1)} eBay
          </a>
        </div>

        <section className="bg-white px-5 py-10">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-navy">
              Our customers love us!
            </h2>
            <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.14em] text-navy/70">
              Check it out
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-lg">
            {reviews[reviewIndex] ? (
              <article className="border border-navy/10 bg-cream px-5 py-5 text-left">
                <p className="text-[#e85d04]" aria-label="5 stars">
                  {'★★★★★'}
                </p>
                <p className="mt-2 font-display text-sm font-bold uppercase tracking-wide text-navy">
                  {reviews[reviewIndex].productLabel}
                </p>
                <p className="mt-2 font-brand text-sm leading-relaxed text-navy/80">
                  {reviews[reviewIndex].body}
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-2 font-brand text-xs font-bold uppercase tracking-[0.12em] text-navy">
                  {reviews[reviewIndex].reviewer}
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[0.55rem] text-white">
                      ✓
                    </span>
                    Verified customer
                  </span>
                </p>
                <p className="mt-2 text-[0.65rem] text-muted">From eBay · @{EBAY_SELLER}</p>
              </article>
            ) : null}
            {reviews.length > 1 ? (
              <div className="mt-3 flex justify-center gap-2">
                {reviews.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-label={`Review ${i + 1}`}
                    onClick={() => setReviewIndex(i)}
                    className={`h-2 w-2 rounded-full ${
                      i === reviewIndex ? 'bg-[#e85d04]' : 'bg-navy/20'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="border-t border-navy/10 bg-white px-5 py-12">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-navy">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-sm text-muted">Got questions? We&apos;ve got answers.</p>
            <button
              type="button"
              onClick={() => {
                leaveItemPage()
                window.setTimeout(() => onShopInventory(), 40)
              }}
              className="mt-5 inline-flex bg-[#e85d04] px-6 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#d35400]"
            >
              Explore best sellers
            </button>
          </div>
          <ul className="mx-auto mt-8 max-w-lg divide-y divide-navy/10 border-y border-navy/10">
            {faqs.map((row, index) => {
              const open = openFaq === index
              return (
                <li key={row.q}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-baseline justify-between gap-4 py-4 text-left"
                  >
                    <span className="font-display text-sm font-bold uppercase tracking-wide text-navy">
                      {row.q}
                    </span>
                    <span className="text-lg text-navy" aria-hidden>
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open ? <p className="pb-4 text-sm leading-relaxed text-navy/75">{row.a}</p> : null}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="border-t border-navy/10 bg-white px-5 py-10">
          <div className="mx-auto max-w-lg">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
              Questions &amp; answers
            </h2>
            <form onSubmit={submitQuestion} className="mt-4 flex items-center gap-2">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy/10 text-navy/50"
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 19.5c1.4-3.2 3.7-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
                </svg>
              </span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="min-w-0 flex-1 border border-navy/15 bg-white px-3 py-2.5 text-base text-navy outline-none placeholder:text-muted focus:ring-2 focus:ring-crimson/30"
              />
              <button
                type="submit"
                className="shrink-0 bg-navy px-3 py-2.5 font-brand text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cream"
              >
                Ask
              </button>
            </form>
            <p className="mt-6 font-display text-sm font-bold uppercase tracking-wide text-navy">
              Popular questions
            </p>
            <div className="mt-2 border-t border-navy/10 pt-3 text-sm text-muted">
              No questions have been asked yet — ask your question above.
            </div>
          </div>
        </section>

        <div className="bg-navy px-5 py-3">
          <p className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center font-display text-xs font-bold uppercase tracking-[0.12em] text-[#e85d04]">
            <span>Fast &amp; reliable shipping</span>
            <span>Family-run shop</span>
          </p>
        </div>

        {related.length > 0 ? (
          <section className="bg-white px-5 py-12">
            <h2 className="text-center font-display text-3xl font-bold uppercase tracking-wide text-navy">
              You may also like
            </h2>
            <ul className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-x-3 gap-y-8">
              {related.map((row) => {
                const img = listingImages(row)[0] || FALLBACK_IMAGE
                const was = saleCompareAtPrice(row)
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => {
                        track('item_related_click', { from: item.id, to: row.id })
                        goToItemPage(row.id)
                      }}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-white">
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE
                          }}
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 font-display text-xs font-bold uppercase leading-snug tracking-wide text-navy">
                        {shortTitle(row.title)}
                      </p>
                      <p className="mt-1 flex items-baseline gap-1.5">
                        {was != null ? (
                          <span className="text-[0.65rem] text-navy/35 line-through">
                            {formatPrice(was, row.currency)}
                          </span>
                        ) : null}
                        <span className="font-brand text-sm font-bold text-[#e85d04]">
                          {formatPrice(row.price, row.currency)}
                        </span>
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <section className="bg-navy px-5 py-10 text-cream">
          <div className="mx-auto max-w-lg">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-crimson-hot">
              Members
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold uppercase tracking-wide text-cream">
              Become a member
            </h2>
            <p className="mt-1.5 font-brand text-sm leading-snug text-cream/75">
              Free Rewards Club — email or phone for offers, restocks, and member drops.
            </p>
            <div className="mt-5">
              <RewardsSectionJoin compact />
            </div>
          </div>
        </section>

        <SiteFooter
          onInventory={() => {
            leaveItemPage()
            window.setTimeout(() => onShopInventory(), 40)
          }}
          onYouth={() => {
            leaveItemPage()
            window.setTimeout(() => (onShopYouth ?? onShopInventory)(), 40)
          }}
          onBeforeNavigate={() => leaveItemPage()}
          bottomPadClass="pb-28 md:pb-16"
        />
      </main>

      {sizeChartOpen ? (
        <SizeChartModal
          brand={item.brand}
          youth={youth}
          onClose={() => setSizeChartOpen(false)}
        />
      ) : null}
    </div>
  )
}
