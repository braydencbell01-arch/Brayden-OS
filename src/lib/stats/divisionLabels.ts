/** Compact division name for outcome labels (Championship, League One, …). */
export function shortDivisionName(divisionName: string): string {
  let name = divisionName
    .replace(/^English\s+/i, '')
    .replace(/^EFL\s+/i, '')
    .trim()
  name = name.replace(/^League\s+Championship$/i, 'Championship')
  return name || divisionName
}

/**
 * Label for winning promotion via the play-offs
 * (e.g. "Championship play-off winners").
 */
export function playoffWinnersLabel(divisionName: string): string {
  const short = shortDivisionName(divisionName)
  if (/play-?off/i.test(short)) return short
  return `${short} play-off winners`
}
