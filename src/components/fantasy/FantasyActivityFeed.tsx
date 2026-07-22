import type { FantasyLeague } from '../../lib/fantasy/types'

function formatActivityTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(at))
}

export function FantasyActivityFeed({
  league,
  compact = false,
}: {
  league: FantasyLeague
  compact?: boolean
}) {
  const events = (league.activity ?? []).slice(0, compact ? 4 : 12)

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Activity</h2>
        {compact ? <span className="text-[10px] uppercase tracking-[0.14em] text-mist/45">Latest</span> : null}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-mist/60">League activity will appear here.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((event) => {
            const member = event.memberId ? league.members.find((m) => m.id === event.memberId) : null
            return (
              <li
                key={event.id}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <p className="text-cream">{event.message}</p>
                <p className="mt-0.5 text-[11px] text-mist/45">
                  {formatActivityTime(event.at)}
                  {member ? ` - ${member.name}` : ''}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
