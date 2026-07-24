import type { LeagueId } from '../lib/leagues'
import { useLeagueLogo } from '../lib/stats/useLeagueLogo'
import { EntityLogo } from './EntityLogo'

/** Lazy-loaded league crest (mirrors player headshots / team logos). */
export function LeagueLogoMark({
  leagueId,
  name,
  size = 'md',
  className = '',
  ringColor,
}: {
  leagueId: LeagueId
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  ringColor?: string | null
}) {
  const { logoUrl } = useLeagueLogo(leagueId)
  return (
    <EntityLogo
      name={name}
      src={logoUrl}
      size={size}
      className={className}
      ringColor={ringColor}
    />
  )
}
