import type { Match, TeamFormResult } from './matches'
import { recentFormForTeam, teamResult } from './matches'

export type PreMatchBriefing = {
  homeForm: TeamFormResult[]
  awayForm: TeamFormResult[]
  h2h: Array<{ dateKey: string; home: string; away: string; score: string; winnerId: string | null }>
  homeWins: number
  awayWins: number
  draws: number
  tip: string
}

/** Build a lightweight pre-match card from fixtures already in the cache. */
export function buildPreMatchBriefing(
  match: Match,
  allMatches: Match[],
): PreMatchBriefing {
  const homeForm = recentFormForTeam(allMatches, match.home.id, 5)
  const awayForm = recentFormForTeam(allMatches, match.away.id, 5)

  const h2hMatches = allMatches
    .filter(
      (m) =>
        m.status === 'finished' &&
        ((m.home.id === match.home.id && m.away.id === match.away.id) ||
          (m.home.id === match.away.id && m.away.id === match.home.id)),
    )
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, 5)

  let homeWins = 0
  let awayWins = 0
  let draws = 0
  const h2h = h2hMatches.map((m) => {
    const homeScore = m.home.score ?? 0
    const awayScore = m.away.score ?? 0
    let winnerId: string | null = null
    if (homeScore === awayScore) draws += 1
    else if (homeScore > awayScore) {
      winnerId = m.home.id
      if (m.home.id === match.home.id) homeWins += 1
      else awayWins += 1
    } else {
      winnerId = m.away.id
      if (m.away.id === match.home.id) homeWins += 1
      else awayWins += 1
    }
    return {
      dateKey: m.dateKey,
      home: m.home.shortName,
      away: m.away.shortName,
      score: `${homeScore}–${awayScore}`,
      winnerId,
    }
  })

  const homeStrength = homeForm.filter((r) => r === 'W').length - homeForm.filter((r) => r === 'L').length
  const awayStrength = awayForm.filter((r) => r === 'W').length - awayForm.filter((r) => r === 'L').length
  let tip = 'Even on recent form — expect a tight match.'
  if (homeStrength >= awayStrength + 2) {
    tip = `${match.home.shortName} look sharper on recent form.`
  } else if (awayStrength >= homeStrength + 2) {
    tip = `${match.away.shortName} arrive in better form.`
  } else if (homeWins > awayWins + 1 && h2h.length >= 2) {
    tip = `${match.home.shortName} have the edge in recent H2H.`
  } else if (awayWins > homeWins + 1 && h2h.length >= 2) {
    tip = `${match.away.shortName} have the edge in recent H2H.`
  }

  return { homeForm, awayForm, h2h, homeWins, awayWins, draws, tip }
}

export type MatchPrediction = {
  homeWinPct: number
  drawPct: number
  awayWinPct: number
  predictedScore: string
  confidence: 'low' | 'medium' | 'high'
  rationale: string
}

function formScore(form: TeamFormResult[]): number {
  return form.reduce((sum, r) => sum + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0)
}

/** Simple form + H2H model — clearly a BrayStats estimate, not betting odds. */
export function predictMatch(match: Match, allMatches: Match[]): MatchPrediction {
  const briefing = buildPreMatchBriefing(match, allMatches)
  const homePts = formScore(briefing.homeForm) + briefing.homeWins * 0.8 + 0.6 // slight home bump
  const awayPts = formScore(briefing.awayForm) + briefing.awayWins * 0.8
  const drawBase = 1.4 + briefing.draws * 0.35
  const total = homePts + awayPts + drawBase || 1
  const homeWinPct = Math.round((homePts / total) * 100)
  const awayWinPct = Math.round((awayPts / total) * 100)
  const drawPct = Math.max(0, 100 - homeWinPct - awayWinPct)

  const homeGoals = Math.max(0, Math.round(homePts / 4))
  const awayGoals = Math.max(0, Math.round(awayPts / 4.5))
  const samples = briefing.homeForm.length + briefing.awayForm.length + briefing.h2h.length
  const confidence: MatchPrediction['confidence'] =
    samples >= 10 ? 'high' : samples >= 5 ? 'medium' : 'low'

  return {
    homeWinPct,
    drawPct,
    awayWinPct,
    predictedScore: `${homeGoals}–${awayGoals}`,
    confidence,
    rationale: briefing.tip,
  }
}

/** Narrative season story beats for a club from finished matches. */
export function buildTeamSeasonStory(
  matches: Match[],
  teamId: string,
  teamName: string,
): string[] {
  const finished = matches
    .filter((m) => m.status === 'finished' && (m.home.id === teamId || m.away.id === teamId))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  if (finished.length === 0) {
    return [`No finished matches in the loaded window for ${teamName} yet.`]
  }

  const beats: string[] = []
  let streak = 0
  let streakKind: TeamFormResult | null = null
  let bestWin: { text: string; margin: number } | null = null
  let worstLoss: { text: string; margin: number } | null = null

  for (const match of finished) {
    const result = teamResult(match, teamId)
    if (!result) continue
    const isHome = match.home.id === teamId
    const forScore = isHome ? match.home.score! : match.away.score!
    const against = isHome ? match.away.score! : match.home.score!
    const opp = isHome ? match.away.shortName : match.home.shortName
    const margin = forScore - against

    if (result === 'W' && (!bestWin || margin > bestWin.margin)) {
      bestWin = { margin, text: `${forScore}–${against} vs ${opp}` }
    }
    if (result === 'L' && (!worstLoss || margin < worstLoss.margin)) {
      worstLoss = { margin, text: `${forScore}–${against} vs ${opp}` }
    }

    if (result === streakKind) streak += 1
    else {
      if (streak >= 3 && streakKind) {
        beats.push(
          streakKind === 'W'
            ? `${streak}-match winning run`
            : streakKind === 'L'
              ? `${streak}-match losing run`
              : `${streak} draws in a row`,
        )
      }
      streakKind = result
      streak = 1
    }
  }
  if (streak >= 3 && streakKind) {
    beats.push(
      streakKind === 'W'
        ? `Currently on a ${streak}-match winning run`
        : streakKind === 'L'
          ? `Currently on a ${streak}-match losing run`
          : `${streak} consecutive draws`,
    )
  }

  const wins = finished.filter((m) => teamResult(m, teamId) === 'W').length
  const draws = finished.filter((m) => teamResult(m, teamId) === 'D').length
  const losses = finished.filter((m) => teamResult(m, teamId) === 'L').length
  beats.unshift(
    `${finished.length} matches loaded · ${wins}W ${draws}D ${losses}L`,
  )
  if (bestWin) beats.push(`Biggest win: ${bestWin.text}`)
  if (worstLoss) beats.push(`Toughest night: ${worstLoss.text}`)
  return beats.slice(0, 6)
}
