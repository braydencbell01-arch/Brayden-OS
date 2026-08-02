import { useState } from 'react'
import type { ReactNode } from 'react'
import { isSurvivalLeague } from '../../lib/fantasy/survival'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import { FantasyButton } from './FantasyChrome'

type ChecklistRow = {
  label: string
  done: boolean
  detail?: string
  action?: ReactNode
}

function shareText(leagueName: string, inviteCode: string, syncBlobId?: string): string {
  const parts = [`Join ${leagueName} on BrayStats Fantasy -- code ${inviteCode}`]
  if (syncBlobId && typeof window !== 'undefined') {
    parts.push(`${window.location.origin}${import.meta.env.BASE_URL}#fantasy-join=${syncBlobId}`)
  }
  return parts.join('\n')
}

export function FantasyCommissionerChecklist({ fantasy }: { fantasy: FantasyApi }) {
  const league = fantasy.activeLeague!
  const [inviteShared, setInviteShared] = useState(false)
  const [remindersEnabled, setRemindersEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  )
  const [reminderMessage, setReminderMessage] = useState<string | null>(null)
  const isCommish = Boolean(fantasy.me?.isCommissioner)

  if (!isCommish || league.phase !== 'lobby') return null

  const survival = isSurvivalLeague(league)

  const rows: ChecklistRow[] = survival
    ? [
        {
          label: 'Invite shared',
          done: inviteShared,
          action: (
            <FantasyButton
              variant="ghost"
              onClick={() => {
                void navigator.clipboard
                  .writeText(shareText(league.name, league.inviteCode, league.syncBlobId))
                  .then(() => {
                    setInviteShared(true)
                  })
              }}
            >
              Copy share
            </FantasyButton>
          ),
        },
        {
          label: 'Managers ready',
          done: league.members.length >= 2,
          detail: `${league.members.length}/${league.teamCount}`,
        },
        {
          label: 'Season started',
          done: false,
          action: (
            <FantasyButton
              disabled={league.members.length < 2}
              onClick={() => {
                try {
                  fantasy.startSurvival()
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed')
                }
              }}
            >
              Start survival
            </FantasyButton>
          ),
        },
        {
          label: 'Reminders enabled',
          done: remindersEnabled,
          action: (
            <FantasyButton
              variant="ghost"
              onClick={() => {
                void fantasy.enableReminders().then((status) => {
                  setRemindersEnabled(status === 'granted')
                  setReminderMessage(
                    status === 'granted'
                      ? 'Reminders enabled.'
                      : status === 'unsupported'
                        ? 'Reminders are not supported here.'
                        : 'Reminders were not enabled.',
                  )
                })
              }}
            >
              Enable
            </FantasyButton>
          ),
        },
      ]
    : [
        {
          label: 'Invite shared',
          done: inviteShared,
          action: (
            <FantasyButton
              variant="ghost"
              onClick={() => {
                void navigator.clipboard
                  .writeText(shareText(league.name, league.inviteCode, league.syncBlobId))
                  .then(() => {
                    setInviteShared(true)
                  })
              }}
            >
              Copy share
            </FantasyButton>
          ),
        },
        {
          label: 'Teams filled',
          done: league.members.length === league.teamCount,
          detail: `${league.members.length}/${league.teamCount}`,
        },
        {
          label: 'Draft order set',
          done: league.draftOrder.length === league.members.length && league.draftOrder.length > 0,
          action: (
            <FantasyButton
              variant="ghost"
              disabled={league.members.length !== league.teamCount}
              onClick={() => {
                try {
                  fantasy.randomizeOrder()
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed')
                }
              }}
            >
              Randomize
            </FantasyButton>
          ),
        },
        {
          label: 'Draft started',
          done: false,
          action: (
            <FantasyButton
              disabled={league.draftOrder.length !== league.teamCount}
              onClick={() => {
                try {
                  fantasy.startDraft()
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed')
                }
              }}
            >
              Start draft
            </FantasyButton>
          ),
        },
        {
          label: 'Reminders enabled',
          done: remindersEnabled,
          action: (
            <FantasyButton
              variant="ghost"
              onClick={() => {
                void fantasy.enableReminders().then((status) => {
                  setRemindersEnabled(status === 'granted')
                  setReminderMessage(
                    status === 'granted'
                      ? 'Reminders enabled.'
                      : status === 'unsupported'
                        ? 'Reminders are not supported here.'
                        : 'Reminders were not enabled.',
                  )
                })
              }}
            >
              Enable
            </FantasyButton>
          ),
        },
      ]

  return (
    <section className="rounded-2xl border border-lime/25 bg-lime/10 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">
        Commissioner checklist
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
            <span className="text-sm font-semibold text-cream">
              <span className={row.done ? 'text-lime' : 'text-mist/45'}>{row.done ? '[x]' : '[ ]'}</span>{' '}
              {row.label}
              {row.detail ? <span className="ml-2 text-xs text-mist/50">{row.detail}</span> : null}
            </span>
            {row.done ? null : row.action}
          </li>
        ))}
      </ul>
      {reminderMessage ? <p className="mt-2 text-xs text-mist/60">{reminderMessage}</p> : null}
    </section>
  )
}
