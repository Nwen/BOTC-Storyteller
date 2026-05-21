import { useLibraryStore } from '@/store/libraryStore'
import type { Team } from '@/types'

export const TEAM_LABELS: Record<Team, string> = {
  townsfolk: 'Townsfolk',
  outsider:  'Outsider',
  minion:    'Minion',
  demon:     'Demon',
  traveler:  'Traveler',
  fabled:    'Fabled',
}

export const TEAM_COLORS: Record<Team, string> = {
  townsfolk: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  outsider:  'bg-cyan-900/60 text-cyan-300 border border-cyan-700',
  minion:    'bg-orange-900/60 text-orange-300 border border-orange-700',
  demon:     'bg-red-900/60 text-red-300 border border-red-700',
  traveler:  'bg-purple-900/60 text-purple-300 border border-purple-700',
  fabled:    'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
}

export function useTeamLabel(team: Team): string {
  const { activeLocale, locales } = useLibraryStore()
  return locales[activeLocale]?.teams?.[team] ?? TEAM_LABELS[team]
}

export function TeamBadge({ team }: Readonly<{ team: Team }>) {
  const label = useTeamLabel(team)
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TEAM_COLORS[team]}`}>
      {label}
    </span>
  )
}
