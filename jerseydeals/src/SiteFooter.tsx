import { useState, type ReactNode } from 'react'
import { track } from './analytics'
import {
  CONTACT_EMAIL,
  EBAY_FEEDBACK_COUNT,
  EBAY_OVERALL_RATING,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  EBAY_SHOP_URL,
  SQUARE_STORE_URL,
} from './config'
import { goToFavoritesScreen } from './favorites'
import {
  leaveInventoryPage,
  useInventoryPageOpen,
} from './inventoryRoute'
import { suppressLandingScrollRestore } from './landingScroll'
import { goToProfileScreen } from './profile'
import { goToRewardsOffers, isRewardsMember } from './rewardsMember'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

type FooterItem =
  | { kind: 'hash'; label: string; href: string }
  | { kind: 'external'; label: string; href: string; channel?: string }
  | { kind: 'mailto'; label: string; href: string }
  | { kind: 'action'; label: string; action: 'inventory' | 'youth' | 'favorites' | 'profile' | 'offers' }

type FooterSection = {
  id: string
  label: string
  items: FooterItem[]
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5 14.9 9l7.1.6-5.4 4.6 1.7 6.8L12 17.8 5.7 21l1.7-6.8L2 9.6 9.1 9 12 2.5Z"
      />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-3.5 w-3.5 shrink-0 text-white transition-transform duration-200 ${
        open ? 'rotate-180' : ''
      }`}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M5.2 7.3a.9.9 0 0 1 1.27-.05L10 10.55l3.53-3.3a.9.9 0 0 1 1.22 1.32l-4.14 3.87a.9.9 0 0 1-1.22 0L5.25 8.57a.9.9 0 0 1-.05-1.27Z"
      />
    </svg>
  )
}

function buildSections(opts: { ebayShop: string; showTrending: boolean }): FooterSection[] {
  const shop: FooterItem[] = [
    { kind: 'hash', label: 'Collections', href: '#collections' },
    { kind: 'hash', label: 'Premier League', href: '#epl' },
    { kind: 'hash', label: 'Champions League', href: '#ucl' },
    { kind: 'hash', label: 'Shop', href: '#shop' },
    { kind: 'action', label: 'Full inventory', action: 'inventory' },
    { kind: 'hash', label: 'Rewards', href: '#rewards' },
    { kind: 'hash', label: 'Sizing', href: '#size-guide' },
  ]

  const discover: FooterItem[] = [
    { kind: 'action', label: 'Shop favorites', action: 'favorites' },
    { kind: 'hash', label: 'Shop by club', href: '#clubs' },
    { kind: 'hash', label: 'Shop by brand', href: '#brands' },
    { kind: 'action', label: 'Youth sizes', action: 'youth' },
    { kind: 'hash', label: 'Size guide', href: '#size-guide' },
  ]
  if (opts.showTrending) {
    discover.push({ kind: 'hash', label: 'Trending', href: '#trending' })
  }
  discover.push({ kind: 'action', label: 'Profile', action: 'profile' })

  const contact: FooterItem[] = [
    { kind: 'mailto', label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    {
      kind: 'external',
      label: 'Square store',
      href: SQUARE_STORE_URL,
      channel: 'square',
    },
    {
      kind: 'external',
      label: 'eBay shop',
      href: opts.ebayShop,
      channel: 'ebay',
    },
    { kind: 'external', label: 'Privacy', href: asset('privacy.html') },
  ]

  const about: FooterItem[] = [
    { kind: 'hash', label: 'Why Jersey Deals', href: '#buy-direct' },
    { kind: 'hash', label: 'How shopping works', href: '#how-it-works' },
    { kind: 'hash', label: 'FAQ', href: '#faq' },
    { kind: 'hash', label: 'Size guide', href: '#size-guide' },
    { kind: 'hash', label: 'Rewards Club', href: '#rewards' },
    {
      kind: 'action',
      label: isRewardsMember() ? 'My offers' : 'Join Rewards',
      action: 'offers',
    },
    { kind: 'external', label: 'Privacy policy', href: asset('privacy.html') },
  ]

  return [
    { id: 'shop', label: 'Shop', items: shop },
    { id: 'discover', label: 'Discover', items: discover },
    { id: 'contact', label: 'Contact', items: contact },
    { id: 'about', label: 'About', items: about },
  ]
}

function RatingsBadge({ ebaySeller }: { ebaySeller: string }) {
  return (
    <a
      href={ebaySeller}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('outbound_click', { place: 'footer_ratings', channel: 'ebay' })}
      className="mx-auto flex w-full max-w-[14rem] flex-col items-center rounded-md bg-white px-5 py-3.5 text-center shadow-sm transition hover:bg-mist"
      aria-label={`eBay rating ${EBAY_OVERALL_RATING} from ${EBAY_FEEDBACK_COUNT.toLocaleString()} reviews`}
    >
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted">
        JerseyDeals.online
      </span>
      <span className="mt-1.5 flex items-center gap-1.5">
        <span className="font-display text-3xl font-bold leading-none tabular-nums text-navy">
          {EBAY_OVERALL_RATING.toFixed(1)}
        </span>
        <StarIcon className="h-5 w-5 text-[#e85d04]" />
        <span className="font-brand text-sm font-semibold tabular-nums text-navy">
          ({EBAY_FEEDBACK_COUNT.toLocaleString()})
        </span>
      </span>
      <span className="mt-2 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-navy/70">
        eBay · @{EBAY_SELLER}
      </span>
    </a>
  )
}

function FooterLinkButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full py-2 text-left text-sm font-medium uppercase tracking-[0.12em] text-white/75 transition hover:text-white"
    >
      {children}
    </button>
  )
}

/** GoalKick-style ratings badge + accordion footer (Shop / Discover / Contact / About). */
export function SiteFooter({
  ebayShop = EBAY_SHOP_URL,
  ebaySeller = EBAY_SELLER_URL,
  showTrending = false,
  onInventory,
  onYouth,
  onBeforeNavigate,
  /** Extra space under the footer — landing defaults clear the sticky bottom dock. */
  bottomPadClass = 'pb-[calc(var(--jd-bottom-dock)+1.5rem)]',
}: {
  ebayShop?: string
  ebaySeller?: string
  showTrending?: boolean
  onInventory: () => void
  onYouth: () => void
  /** Close overlays (e.g. profile) before in-page navigation. */
  onBeforeNavigate?: () => void
  bottomPadClass?: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const inventoryOpen = useInventoryPageOpen()
  const sections = buildSections({ ebayShop, showTrending })

  function leaveThen(run: () => void, opts?: { closeInventory?: boolean }) {
    onBeforeNavigate?.()
    const closeInventory = Boolean(opts?.closeInventory && inventoryOpen)
    if (closeInventory) {
      suppressLandingScrollRestore()
      leaveInventoryPage()
    }
    const delay = onBeforeNavigate || closeInventory ? 40 : 0
    window.setTimeout(run, delay)
  }

  function goHash(href: string) {
    leaveThen(() => {
      if (window.location.hash === href) {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
        return
      }
      window.location.hash = href.slice(1)
      window.setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 60)
    }, { closeInventory: true })
  }

  function runItem(item: FooterItem) {
    track('footer_nav', { label: item.label, kind: item.kind })
    if (item.kind === 'hash') {
      goHash(item.href)
      return
    }
    if (item.kind === 'mailto') {
      window.location.href = item.href
      return
    }
    if (item.kind === 'external') {
      if (item.channel) {
        track('outbound_click', { place: 'footer', channel: item.channel })
      }
      window.open(item.href, '_blank', 'noopener,noreferrer')
      return
    }
    if (item.action === 'inventory') {
      leaveThen(() => {
        track('cta_click', { place: 'footer_inventory' })
        onInventory()
      })
      return
    }
    if (item.action === 'youth') {
      leaveThen(() => {
        track('cta_click', { place: 'footer_youth' })
        onYouth()
      })
      return
    }
    if (item.action === 'favorites') {
      leaveThen(() => goToFavoritesScreen())
      return
    }
    if (item.action === 'profile') {
      leaveThen(() => goToProfileScreen())
      return
    }
    if (item.action === 'offers') {
      leaveThen(() => goToRewardsOffers())
    }
  }

  return (
    <footer className={`bg-black text-white ${bottomPadClass}`}>
      <div className="mx-auto max-w-lg px-5 pt-10 md:px-8">
        <RatingsBadge ebaySeller={ebaySeller} />

        <ul className="mt-8 border-y border-white/90" role="list">
          {sections.map((section) => {
            const open = openId === section.id
            const panelId = `footer-panel-${section.id}`
            const buttonId = `footer-button-${section.id}`
            return (
              <li key={section.id} className="border-b border-white/90 last:border-b-0">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => {
                    setOpenId(open ? null : section.id)
                    track('footer_accordion', { section: section.id, open: !open })
                  }}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white">
                    {section.label}
                  </span>
                  <Chevron open={open} />
                </button>
                {open ? (
                  <ul id={panelId} role="region" aria-labelledby={buttonId} className="pb-4 pl-0.5">
                    {section.items.map((item) => (
                      <li key={`${section.id}-${item.label}`}>
                        <FooterLinkButton onClick={() => runItem(item)}>
                          {item.label}
                        </FooterLinkButton>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>

        <p className="mt-8 pb-6 text-center text-xs text-white/55">
          © {new Date().getFullYear()} JerseyDeals
        </p>
      </div>
    </footer>
  )
}
