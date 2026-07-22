import type { FantasyPosition, ScoringPreset } from './types'

export type ScoringConfig = {
  appearanceUnder60: number
  appearance60Plus: number
  goal: Record<FantasyPosition, number>
  assist: number
  cleanSheet: Record<FantasyPosition, number>
  goalsConcededPerTwo: number
  savePerThree: number
  penaltySave: number
  penaltyMiss: number
  yellow: number
  red: number
  ownGoal: number
  bonusMax: number
  projectionMultiplier: Record<FantasyPosition, number>
}

const baseProjection: Record<FantasyPosition, number> = {
  GKP: 1,
  DEF: 1,
  MID: 1,
  FWD: 1,
}

export const SCORING_PRESETS: Record<ScoringPreset, ScoringConfig> = {
  classic: {
    appearanceUnder60: 1,
    appearance60Plus: 2,
    goal: { GKP: 8, DEF: 6, MID: 5, FWD: 4 },
    assist: 3,
    cleanSheet: { GKP: 5, DEF: 4, MID: 1, FWD: 0 },
    goalsConcededPerTwo: -1,
    savePerThree: 1,
    penaltySave: 5,
    penaltyMiss: -2,
    yellow: -1,
    red: -3,
    ownGoal: -2,
    bonusMax: 3,
    projectionMultiplier: baseProjection,
  },
  offense: {
    appearanceUnder60: 1,
    appearance60Plus: 2,
    goal: { GKP: 9, DEF: 7, MID: 6, FWD: 5 },
    assist: 4,
    cleanSheet: { GKP: 3, DEF: 3, MID: 0, FWD: 0 },
    goalsConcededPerTwo: -1,
    savePerThree: 1,
    penaltySave: 5,
    penaltyMiss: -2,
    yellow: -1,
    red: -3,
    ownGoal: -2,
    bonusMax: 3,
    projectionMultiplier: { GKP: 0.96, DEF: 0.98, MID: 1.05, FWD: 1.08 },
  },
  clean_sheet: {
    appearanceUnder60: 1,
    appearance60Plus: 2,
    goal: { GKP: 8, DEF: 6, MID: 5, FWD: 4 },
    assist: 3,
    cleanSheet: { GKP: 7, DEF: 6, MID: 2, FWD: 0 },
    goalsConcededPerTwo: -1,
    savePerThree: 1,
    penaltySave: 6,
    penaltyMiss: -2,
    yellow: -1,
    red: -3,
    ownGoal: -2,
    bonusMax: 3,
    projectionMultiplier: { GKP: 1.08, DEF: 1.07, MID: 0.99, FWD: 0.98 },
  },
}

export const SCORING_PRESET_OPTIONS: Array<{
  value: ScoringPreset
  label: string
  description: string
}> = [
  { value: 'classic', label: 'Classic', description: 'Balanced FPL-style scoring.' },
  { value: 'offense', label: 'Offense', description: 'Boosts goals and assists for attackers.' },
  {
    value: 'clean_sheet',
    label: 'Clean sheet',
    description: 'Rewards defensive shutouts and keeper penalty saves.',
  },
]

export function getScoring(preset: ScoringPreset = 'classic'): ScoringConfig {
  return SCORING_PRESETS[preset] ?? SCORING_PRESETS.classic
}

export function scoringBlurb(preset: ScoringPreset = 'classic'): string {
  const scoring = getScoring(preset)
  return [
    `Preset: ${preset.replace('_', ' ')}`,
    `Appearance: ${scoring.appearanceUnder60} (<60') / ${scoring.appearance60Plus} (60'+)`,
    `Goals: GKP ${scoring.goal.GKP} · DEF ${scoring.goal.DEF} · MID ${scoring.goal.MID} · FWD ${scoring.goal.FWD}`,
    `Assist: ${scoring.assist}`,
    `CS (60'+): GKP ${scoring.cleanSheet.GKP} · DEF ${scoring.cleanSheet.DEF} · MID ${scoring.cleanSheet.MID}`,
    `GC: ${scoring.goalsConcededPerTwo} / 2 (GKP/DEF)`,
    `Saves: ${scoring.savePerThree} / 3 · Pen save ${scoring.penaltySave} · Pen miss ${scoring.penaltyMiss}`,
    `Cards: Y ${scoring.yellow} · R ${scoring.red} · OG ${scoring.ownGoal} · Bonus up to ${scoring.bonusMax}`,
  ].join(' · ')
}
