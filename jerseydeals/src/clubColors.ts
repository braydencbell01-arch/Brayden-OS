/** Club outline / name accent colors for Jersey Deals tiles. */

/** Premier League club accents. */
export const EPL_TEAM_COLOR: Record<string, string> = {
  chelsea: '#034694',
  arsenal: '#EF0107',
  liverpool: '#C8102E',
  'manchester-city': '#6CABDD',
  'manchester-united': '#DA291C',
  tottenham: '#132257',
  newcastle: '#241F20',
}

/** Champions League + big-club accents (includes EPL). */
export const UCL_TEAM_COLOR: Record<string, string> = {
  ...EPL_TEAM_COLOR,
  'real-madrid': '#FEBE10',
  barcelona: '#A50044',
  bayern: '#DC052D',
  'paris-saint-germain': '#004170',
  'inter-milan': '#010E80',
  'ac-milan': '#FB090B',
  juventus: '#000000',
  napoli: '#12A0D7',
  'atletico-madrid': '#CB3524',
  'borussia-dortmund': '#FDE100',
  'bayer-leverkusen': '#E32221',
  ajax: '#D2122E',
  'aston-villa': '#95BFE5',
  monaco: '#E31837',
  lille: '#E01E26',
  atalanta: '#1E71B8',
}

/** Outline color for club tiles / listing cards. */
export const CLUB_OUTLINE_COLOR: Record<string, string> = {
  ...UCL_TEAM_COLOR,
  germany: '#000000',
  argentina: '#74ACDF',
  brazil: '#009C3B',
  spain: '#AA151B',
  france: '#002395',
  italy: '#009246',
  portugal: '#006600',
  mexico: '#006847',
  usa: '#002868',
  'inter-miami': '#F7B5CD',
  'rb-leipzig': '#E32219',
  marseille: '#2FA3E0',
  lyon: '#0033A0',
  villarreal: '#FFE500',
  lazio: '#87D8F7',
}

/** Red outer ring when a club tile is favorited (inner border stays team color). */
export const FAVORITE_OUTER_RING_CLASS =
  'ring-[3px] ring-[#c8102e] ring-offset-1 ring-offset-cream'

export function clubOutlineColor(clubId: string, fallback = '#0b223f') {
  return CLUB_OUTLINE_COLOR[clubId] || fallback
}
