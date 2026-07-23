import type { ActivityEvent, FantasyLeague } from './types'
import { ACTIVITY_LIMIT } from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function pushActivity(
  league: FantasyLeague,
  type: string,
  message: string,
  memberId?: string,
): FantasyLeague {
  const event: ActivityEvent = {
    id: uid('act'),
    at: Date.now(),
    type,
    message,
    memberId,
  }

  return {
    ...league,
    activity: [event, ...(league.activity ?? [])].slice(0, ACTIVITY_LIMIT),
  }
}
