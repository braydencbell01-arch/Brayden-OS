import type { FavoriteTeam } from '../lib/favorites'
import { MISSING_LONG, missingLong, missingShort } from '../lib/display'
import type { MatchDetailStats, MatchLineupPlayer, MatchMoment } from '../lib/stats/types'
import { MatchLineupPanel } from './MatchLineupPanel'

function SoccerBallIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 6.2 14.6 8.1 13.7 11.2h-3.4L9.4 8.1 12 6.2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M8.2 12.4 9.4 15.4 7.2 17.6M15.8 12.4 14.6 15.4 16.8 17.6M7.2 17.6h9.6M6.4 10.2 8.2 12.4M17.6 10.2 15.8 12.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardIcon({
  tone,
  className = '',
}: {
  tone: 'yellow' | 'red'
  className?: string
}) {
  const fill = tone === 'red' ? '#ef4444' : '#e8c547'
  return (
    <svg
      className={className}
      width="12"
      height="14"
      viewBox="0 0 12 16"
      fill="none"
      aria-hidden
    >
      <rect x="1.25" y="0.75" width="9.5" height="14.5" rx="1.4" fill={fill} />
      <rect
        x="1.25"
        y="0.75"
        width="9.5"
        height="14.5"
        rx="1.4"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.8"
      />
    </svg>
  )
}

function SecondYellowIcon({ className = '' }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-3.5 w-3.5 items-center justify-center ${className}`}
      title="Second yellow"
    >
      <CardIcon tone="yellow" className="absolute -left-0.5 rotate-[-18deg] opacity-90" />
      <CardIcon tone="red" className="absolute left-1 rotate-[12deg]" />
    </span>
  )
}

function SubIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M7 16V8m0 0 2.5 2.5M7 8l-2.5 2.5"
        stroke="#86efac"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8v8m0 0 2.5-2.5M17 16l-2.5-2.5"
        stroke="#fca5a5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MomentIcon({ moment }: { moment: MatchMoment }) {
  if (moment.kind === 'goal') {
    const own = /own/i.test(moment.label || '')
    return (
      <span className={own ? 'text-mist/80' : 'text-lime'} title={moment.label || 'Goal'}>
        <SoccerBallIcon />
      </span>
    )
  }
  if (moment.kind === 'card') {
    if (/second/i.test(moment.label || '')) {
      return <SecondYellowIcon />
    }
    if (moment.cardKind === 'red') {
      return (
        <span title="Red card">
          <CardIcon tone="red" />
        </span>
      )
    }
    return (
      <span title="Yellow card">
        <CardIcon tone="yellow" />
      </span>
    )
  }
  if (moment.kind === 'sub') {
    return (
      <span title="Substitution">
        <SubIcon />
      </span>
    )
  }
  return <span className="h-3.5 w-3.5 rounded-full bg-white/20" aria-hidden />
}

function MomentRow({ moment }: { moment: MatchMoment }) {
  const isGoal = moment.kind === 'goal'
  const isRed = moment.cardKind === 'red' || /second/i.test(moment.label || '')
  const isSub = moment.kind === 'sub'
  const label = moment.label || (isGoal ? 'Goal' : isSub ? 'Substitution' : 'Card')
  const showLabelDetail = isGoal
    ? label !== 'Goal'
    : !isSub && label !== 'Yellow card' && label !== 'Red card'

  const primary = moment.primaryPlayer
  const secondary = moment.secondaryPlayer

  const metaParts: string[] = []
  if (showLabelDetail) metaParts.push(label)
  if (isGoal && secondary) metaParts.push(`Assist ${missingShort(secondary)}`)
  if (isSub && secondary) metaParts.push(`on ${missingShort(secondary)}`)
  if (moment.teamName) metaParts.push(missingShort(moment.teamName))

  return (
    <li className="flex items-start gap-2.5 text-xs">
      <span
        className={[
          'w-9 shrink-0 pt-0.5 text-right font-bold tabular-nums',
          isGoal ? 'text-lime' : isRed ? 'text-red-300' : 'text-mist/65',
        ].join(' ')}
      >
        {missingShort(moment.clock)}
      </span>
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <MomentIcon moment={moment} />
      </span>
      <span className="min-w-0 flex-1">
        {primary ? (
          <>
            <span className="block font-semibold text-cream">
              {isSub && secondary ? (
                <>
                  <span className="text-mist/70">{missingShort(primary)}</span>
                  <span className="mx-1 text-mist/40">→</span>
                  <span>{missingShort(secondary)}</span>
                </>
              ) : (
                missingShort(primary)
              )}
            </span>
            {metaParts.length > 0 ? (
              <span className="mt-0.5 block text-[0.7rem] leading-snug text-mist/60">
                {isSub
                  ? metaParts.filter((part) => !part.startsWith('on ')).join(' · ')
                  : metaParts.join(' · ')}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span
              className={[
                'block font-semibold',
                isGoal ? 'text-cream' : isRed ? 'text-red-200' : 'text-cream',
              ].join(' ')}
            >
              {label}
            </span>
            <span className="mt-0.5 block text-[0.7rem] text-mist/65">
              {moment.teamName ? `${missingShort(moment.teamName)} · ` : ''}
              {missingLong(moment.text)}
            </span>
          </>
        )}
      </span>
    </li>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
      {title}
    </p>
  )
}

export function MatchStatsPanel({
  stats,
  loading,
  error,
  scheduled,
  onOpenPlayer,
  onOpenTeam,
}: {
  stats: MatchDetailStats | null
  loading: boolean
  error: string | null
  scheduled: boolean
  onOpenPlayer?: (player: MatchLineupPlayer) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (scheduled) {
    return (
      <p className="mt-3 text-xs text-mist/65">
        Lineups usually post closer to kickoff.
        <span className="mt-1 block text-mist/55">
          Ratings and full match stats unlock once the match starts.
        </span>
      </p>
    )
  }

  if (loading && !stats) {
    return (
      <div className="mt-3 space-y-2" aria-label="Loading match details">
        <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
        <div className="h-10 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-10 animate-pulse rounded bg-white/[0.06]" />
      </div>
    )
  }

  if (error && !stats) {
    return <p className="mt-3 text-xs text-mist/70">{error}</p>
  }

  if (!stats) {
    return <p className="mt-3 text-xs text-mist/65">{MISSING_LONG}</p>
  }

  const majorMoments = stats.moments.filter(
    (moment) =>
      moment.kind === 'goal' || moment.kind === 'card' || moment.kind === 'sub',
  )

  return (
    <div className="mt-2 space-y-4 border-t border-white/10 pt-3">
      <section>
        <SectionHeader title="Key moments" />
        {majorMoments.length > 0 ? (
          <ul className="flex flex-col gap-2.5 rounded-lg border border-white/8 bg-black/15 px-2.5 py-2.5">
            {majorMoments.map((moment) => (
              <MomentRow key={moment.id} moment={moment} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mist/65">No goals, cards, or subs yet.</p>
        )}
      </section>

      <section className="border-t border-white/10 pt-3">
        <SectionHeader title="Lineups" />
        <MatchLineupPanel
          lineups={stats.lineups}
          onOpenPlayer={onOpenPlayer}
          onOpenTeam={onOpenTeam}
        />
      </section>

      <section className="border-t border-white/10 pt-3">
        <SectionHeader title="Match stats" />
        {stats.lines.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {stats.lines.map((line) => {
              const homeNum = Number(line.home)
              const awayNum = Number(line.away)
              const bothNumeric =
                Number.isFinite(homeNum) &&
                Number.isFinite(awayNum) &&
                line.home !== '' &&
                line.away !== ''
              const homeLead = bothNumeric && homeNum > awayNum
              const awayLead = bothNumeric && awayNum > homeNum
              return (
                <li
                  key={line.key}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-white/[0.03]"
                >
                  <span
                    className={[
                      'text-right font-semibold tabular-nums',
                      homeLead ? 'text-lime' : 'text-cream',
                    ].join(' ')}
                  >
                    {missingShort(line.home)}
                  </span>
                  <span className="min-w-[5.5rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/60">
                    {line.label}
                  </span>
                  <span
                    className={[
                      'text-left font-semibold tabular-nums',
                      awayLead ? 'text-lime' : 'text-cream',
                    ].join(' ')}
                  >
                    {missingShort(line.away)}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-xs text-mist/65">{MISSING_LONG}</p>
        )}
      </section>
    </div>
  )
}
