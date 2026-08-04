import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FavoriteStar } from './FavoriteStar'
import {
  compareLeaguesForDisplay,
  continentalLeagues,
  domesticCupCompetitions,
  domesticTableLeagues,
  internationalLeagues,
  leaguesInDisplayOrder,
  type League,
  type LeagueId,
} from '../lib/leagues'
import type { FavoritesApi } from '../lib/favorites'
import { leagueAccentColor } from '../lib/stats/branding'
import { LeagueLogoMark } from './LeagueLogoMark'

type SectionId =
  | 'favorites'
  | 'international'
  | 'continental'
  | 'domestic-leagues'
  | 'domestic-cups'

type SectionDef = {
  id: SectionId
  label: string
  count: number
}

export function LeaguesScreen({
  favorites,
  onOpenLeague,
  reduce,
}: {
  favorites: FavoritesApi
  onOpenLeague: (id: LeagueId) => void
  reduce: boolean | null
}) {
  const leagues = leaguesInDisplayOrder(favorites.leagueIds)
  const favoriteLeagues = leagues.filter((league) => favorites.isLeagueFavorite(league.id))
  const sortByDisplay = (a: League, b: League) =>
    compareLeaguesForDisplay(a.id, b.id, favorites.leagueIds)
  const international = internationalLeagues()
    .filter((league) => !favorites.isLeagueFavorite(league.id))
    .sort(sortByDisplay)
  const continental = continentalLeagues()
    .filter((league) => !favorites.isLeagueFavorite(league.id))
    .sort(sortByDisplay)
  const domesticTables = domesticTableLeagues()
    .filter((league) => !favorites.isLeagueFavorite(league.id))
    .sort(sortByDisplay)
  const domesticCups = domesticCupCompetitions()
    .filter((league) => !favorites.isLeagueFavorite(league.id))
    .sort(sortByDisplay)

  const sections = useMemo(() => {
    const list: SectionDef[] = []
    if (favoriteLeagues.length > 0) {
      list.push({ id: 'favorites', label: 'Favorites', count: favoriteLeagues.length })
    }
    if (international.length > 0) {
      list.push({ id: 'international', label: 'International', count: international.length })
    }
    if (continental.length > 0) {
      list.push({ id: 'continental', label: 'Continental', count: continental.length })
    }
    if (domesticTables.length > 0) {
      list.push({ id: 'domestic-leagues', label: 'Domestic leagues', count: domesticTables.length })
    }
    if (domesticCups.length > 0) {
      list.push({ id: 'domestic-cups', label: 'Domestic cups', count: domesticCups.length })
    }
    return list
  }, [
    favoriteLeagues.length,
    international.length,
    continental.length,
    domesticTables.length,
    domesticCups.length,
  ])

  const [activeSection, setActiveSection] = useState<SectionId | null>(sections[0]?.id ?? null)
  const [showMoreHint, setShowMoreHint] = useState(true)
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({})

  useEffect(() => {
    const nodes = sections
      .map((section) => sectionRefs.current[section.id])
      .filter((node): node is HTMLElement => Boolean(node))
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]?.target.getAttribute('data-section-id') as SectionId | null
        if (top) setActiveSection(top)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.35, 0.6] },
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [sections])

  useEffect(() => {
    const onScroll = () => {
      const remaining =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      setShowMoreHint(remaining > 120)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections.length])

  const jumpTo = (id: SectionId) => {
    const node = sectionRefs.current[id]
    if (!node) return
    const top = node.getBoundingClientRect().top + window.scrollY - 88
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    setActiveSection(id)
  }

  const laterSections = sections.filter((section) => section.id !== sections[0]?.id)
  const laterLabels = laterSections.map((section) => section.label).join(' · ')
  const activeIndex = sections.findIndex((section) => section.id === activeSection)
  const remainingBelow = sections.slice(Math.max(activeIndex, 0) + 1)
  const moreBelowLabel =
    remainingBelow.length > 0
      ? `More below · ${remainingBelow.map((section) => section.label).join(' · ')}`
      : 'More below'

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,107,74,0.55), transparent 55%), radial-gradient(ellipse 45% 40% at 100% 20%, rgba(200,245,66,0.12), transparent 50%), radial-gradient(ellipse 40% 35% at 0% 80%, rgba(20,107,74,0.35), transparent 55%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-40" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <header className="mb-4">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Competitions
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl"
          >
            Leagues
          </motion.h1>
          <p className="mt-2 text-sm text-mist/80">
            Domestic leagues and cups, continental competitions, and international tournaments. Star
            a competition to pin it on Match day.
          </p>
          {laterLabels ? (
            <p className="mt-2 text-[0.7rem] text-mist/55">
              Scroll for more: {laterLabels}
            </p>
          ) : null}
        </header>

        {sections.length > 1 ? (
          <nav
            aria-label="Jump to competition section"
            className="sticky top-[max(0.65rem,env(safe-area-inset-top,0px))] z-30 -mx-5 mb-3 w-[calc(100%+2.5rem)] max-w-none self-start border-b border-white/10 bg-pitch-deep/92 py-2 backdrop-blur-md md:-mx-6 md:w-[calc(100%+3rem)]"
          >
            <div className="scrollbar-hide flex gap-1.5 overflow-x-auto overscroll-x-contain px-5 md:px-6">
              {sections.map((section) => {
                const active = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpTo(section.id)}
                    className={[
                      'shrink-0 rounded-full border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] transition outline-none focus-visible:ring-2 focus-visible:ring-lime',
                      active
                        ? 'border-lime/55 bg-lime/20 text-lime'
                        : 'border-white/12 bg-white/[0.04] text-mist/75 hover:border-lime/35 hover:text-lime',
                    ].join(' ')}
                  >
                    {section.label}
                    <span className={active ? 'ml-1 text-lime/80' : 'ml-1 text-mist/45'}>
                      {section.count}
                    </span>
                  </button>
                )
              })}
              {/* Trailing spacer so the last pill isn’t clipped at the right edge. */}
              <span className="w-3 shrink-0" aria-hidden />
            </div>
          </nav>
        ) : null}

        {favoriteLeagues.length > 0 ? (
          <section
            ref={(node) => {
              sectionRefs.current.favorites = node
            }}
            data-section-id="favorites"
            className="mb-6 scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
            aria-label="Favorite leagues"
          >
            <SectionHeading
              title="Favorites"
              count={favoriteLeagues.length}
              nextLabel={nextSectionLabel(sections, 'favorites')}
            />
            <div className="flex flex-col gap-3">
              {favoriteLeagues.map((league, i) => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  favorited
                  index={i}
                  reduce={reduce}
                  onOpen={() => onOpenLeague(league.id)}
                  onToggleFavorite={() => favorites.toggleLeague(league.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {international.length > 0 ? (
          <section
            ref={(node) => {
              sectionRefs.current.international = node
            }}
            data-section-id="international"
            className="mb-6 scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
            aria-label="International competitions"
          >
            <SectionHeading
              title="International"
              count={international.length}
              nextLabel={nextSectionLabel(sections, 'international')}
            />
            <div className="flex flex-col gap-3">
              {international.map((league, i) => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  favorited={favorites.isLeagueFavorite(league.id)}
                  index={i}
                  reduce={reduce}
                  onOpen={() => onOpenLeague(league.id)}
                  onToggleFavorite={() => favorites.toggleLeague(league.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {continental.length > 0 ? (
          <section
            ref={(node) => {
              sectionRefs.current.continental = node
            }}
            data-section-id="continental"
            className="mb-6 scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
            aria-label="Continental club competitions"
          >
            <SectionHeading
              title="Continental"
              count={continental.length}
              nextLabel={nextSectionLabel(sections, 'continental')}
            />
            <div className="flex flex-col gap-3">
              {continental.map((league, i) => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  favorited={favorites.isLeagueFavorite(league.id)}
                  index={i}
                  reduce={reduce}
                  onOpen={() => onOpenLeague(league.id)}
                  onToggleFavorite={() => favorites.toggleLeague(league.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {domesticTables.length > 0 ? (
          <section
            ref={(node) => {
              sectionRefs.current['domestic-leagues'] = node
            }}
            data-section-id="domestic-leagues"
            className="mb-6 scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
            aria-label="Domestic leagues"
          >
            <SectionHeading
              title="Domestic leagues"
              count={domesticTables.length}
              nextLabel={nextSectionLabel(sections, 'domestic-leagues')}
            />
            <div className="flex flex-col gap-3">
              {domesticTables.map((league, i) => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  favorited={favorites.isLeagueFavorite(league.id)}
                  index={i}
                  reduce={reduce}
                  onOpen={() => onOpenLeague(league.id)}
                  onToggleFavorite={() => favorites.toggleLeague(league.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {domesticCups.length > 0 ? (
          <section
            ref={(node) => {
              sectionRefs.current['domestic-cups'] = node
            }}
            data-section-id="domestic-cups"
            className="scroll-mt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
            aria-label="Domestic cups"
          >
            <SectionHeading title="Domestic cups" count={domesticCups.length} />
            <div className="flex flex-col gap-3">
              {domesticCups.map((league, i) => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  favorited={favorites.isLeagueFavorite(league.id)}
                  index={i}
                  reduce={reduce}
                  onOpen={() => onOpenLeague(league.id)}
                  onToggleFavorite={() => favorites.toggleLeague(league.id)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {showMoreHint && remainingBelow.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="max-w-[min(100%,22rem)] truncate rounded-full border border-white/15 bg-pitch-deep/90 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/75 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            {moreBelowLabel}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function nextSectionLabel(sections: SectionDef[], current: SectionId): string | null {
  const index = sections.findIndex((section) => section.id === current)
  if (index < 0 || index >= sections.length - 1) return null
  return sections[index + 1]!.label
}

function SectionHeading({
  title,
  count,
  nextLabel,
}: {
  title: string
  count: number
  nextLabel?: string | null
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/65">
          {title}
        </p>
        {nextLabel ? (
          <p className="mt-0.5 text-[0.6rem] text-mist/45">Next: {nextLabel}</p>
        ) : null}
      </div>
      <p className="text-[0.65rem] tabular-nums text-mist/45">{count}</p>
    </div>
  )
}

function formatBadge(league: League): string | null {
  if (league.format === 'supercup') return 'Super cup'
  if (league.format === 'cup' && league.kind === 'domestic') return 'Cup'
  if (league.format === 'friendlies') return 'Friendlies'
  if (league.format === 'tournament') return 'Tournament'
  return null
}

function LeagueRow({
  league,
  favorited,
  index,
  reduce,
  onOpen,
  onToggleFavorite,
}: {
  league: League
  favorited: boolean
  index: number
  reduce: boolean | null
  onOpen: () => void
  onToggleFavorite: () => void
}) {
  const badge = formatBadge(league)
  const accent = leagueAccentColor(league.id)
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: reduce ? 0 : 0.06 + Math.min(index, 10) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={[
        'flex items-stretch border transition hover:border-lime/50',
        favorited ? 'border-star/35' : 'border-white/10',
      ].join(' ')}
      style={{
        borderColor: favorited ? undefined : `${accent}66`,
        background: `linear-gradient(90deg, ${accent}28, transparent 58%), linear-gradient(90deg, rgba(11,61,46,0.9), rgba(20,107,74,0.4))`,
        boxShadow: `inset 3px 0 0 ${accent}`,
      }}
    >
      <div className="flex items-center px-2">
        <FavoriteStar active={favorited} label={league.name} onToggle={onToggleFavorite} />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="group flex min-w-0 flex-1 items-center gap-3 px-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
      >
        <LeagueLogoMark
          leagueId={league.id}
          name={league.name}
          size="md"
          ringColor={accent}
        />
        <span className="min-w-0">
          <span className="profile-link block font-display text-3xl tracking-[0.06em] text-cream transition group-hover:text-lime sm:text-4xl">
            {league.name}
          </span>
          <span className="mt-0.5 block text-xs font-medium uppercase tracking-[0.16em] text-mist/70">
            {league.country}
            {badge ? ` · ${badge}` : ''}
          </span>
        </span>
      </button>
    </motion.div>
  )
}
