import { useState, type ReactNode } from 'react'
import { track } from './analytics'
import {
  CONTACT_EMAIL,
  EBAY_FEEDBACK_COUNT,
  EBAY_OVERALL_RATING,
  EBAY_SELLER,
  EBAY_SELLER_URL,
  EBAY_SHOP_URL,
  FACEBOOK_PAGE_URL,
  INSTAGRAM_URL,
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

/** Footer social icons — bright green on the black strip. */
const SOCIAL_GREEN = '#3DDC84'

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

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M14 8.2h2.2V5.1c-.4-.05-1.6-.15-3-.15-3 0-5 1.8-5 5.1V13H5.8v3.3H8.2V22h3.4v-5.7h2.7l.4-3.3h-3.1v-2.5c0-.95.26-1.6 1.6-1.6Z"
      />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.1a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0ZM21 12.1c0-2.45.05-3.46-.2-4.68a4.3 4.3 0 0 0-2.45-2.45C17.12 4.7 16.1 4.7 13.65 4.7h-3.3c-2.45 0-3.46 0-4.68.25A4.3 4.3 0 0 0 3.22 7.4C2.95 8.64 3 9.65 3 12.1s-.05 3.46.22 4.68a4.3 4.3 0 0 0 2.45 2.45c1.22.25 2.23.25 4.68.25h3.3c2.45 0 3.46 0 4.68-.25a4.3 4.3 0 0 0 2.45-2.45c.25-1.22.22-2.23.22-4.68Zm-1.7 4.5a2.6 2.6 0 0 1-1.48 1.48c-.97.2-3.26.19-4.82.19s-3.85 0-4.82-.19a2.6 2.6 0 0 1-1.48-1.48c-.2-.97-.19-3.26-.19-4.82s0-3.85.19-4.82A2.6 2.6 0 0 1 8.2 5.8c.97-.2 3.26-.19 4.82-.19s3.85 0 4.82.19a2.6 2.6 0 0 1 1.48 1.48c.2.97.19 3.26.19 4.82s0 3.85-.19 4.82Z"
      />
    </svg>
  )
}

function EbayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 24" className={className} aria-hidden>
      <text
        x="0"
        y="18"
        fill="currentColor"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        ebay
      </text>
    </svg>
  )
}

function FooterSocials({ ebaySeller }: { ebaySeller: string }) {
  const iconClass = 'h-7 w-7'
  const linkClass =
    'inline-flex items-center justify-center transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DDC84]'

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-7"
      aria-label="Social links"
      style={{ color: SOCIAL_GREEN }}
    >
      <a
        href={FACEBOOK_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Jersey Deals on Facebook"
        onClick={() => track('outbound_click', { place: 'footer_social', channel: 'facebook' })}
      >
        <FacebookIcon className={iconClass} />
      </a>
      {INSTAGRAM_URL ? (
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="Jersey Deals on Instagram"
          onClick={() => track('outbound_click', { place: 'footer_social', channel: 'instagram' })}
        >
          <InstagramIcon className={iconClass} />
        </a>
      ) : (
        <span
          className="inline-flex cursor-default items-center justify-center opacity-90"
          aria-label="Instagram coming soon"
          title="Instagram coming soon"
        >
          <InstagramIcon className={iconClass} />
        </span>
      )}
      <a
        href={ebaySeller}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Jersey Deals on eBay"
        onClick={() => track('outbound_click', { place: 'footer_social', channel: 'ebay' })}
      >
        <EbayIcon className="h-7 w-12" />
      </a>
    </nav>
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

        <FooterSocials ebaySeller={ebaySeller} />

        <p className="mt-6 pb-6 text-center text-xs text-white/55">
          © {new Date().getFullYear()} JerseyDeals
        </p>
      </div>
    </footer>
  )
}
