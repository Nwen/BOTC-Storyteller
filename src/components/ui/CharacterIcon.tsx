import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { iconCandidates, isPaddedIconUrl, PADDED_ICON_ZOOM } from '@/lib/characterIcons'
import type { Alignment, RoleBase, Team } from '@/types'

const TEAM_BG: Record<Team, string> = {
  townsfolk: 'bg-blue-800',
  outsider:  'bg-cyan-800',
  minion:    'bg-orange-800',
  demon:     'bg-red-800',
  traveler:  'bg-purple-800',
  fabled:    'bg-yellow-800',
  loric:     'bg-emerald-800',
}

interface Props {
  role: RoleBase
  /** Fixed square size in px. Ignored when fill=true. */
  size?: number
  /**
   * Fill mode: renders position:absolute inset-0 w-full h-full so the icon
   * covers its nearest positioned ancestor (the circular button).
   * The parent must be position:relative with overflow:hidden.
   */
  fill?: boolean
  /** The player's current alignment, to pick the good / evil art variant. */
  alignment?: Alignment
  className?: string
}

export function CharacterIcon({ role, size = 48, fill = false, alignment, className = '' }: Props) {
  const iconSource = useGameStore((s) => s.iconSource)
  const iconBaseUrl = useGameStore((s) => s.iconBaseUrl)
  // URLs that failed to load; the next candidate is tried, then the initials badge
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())

  const iconUrl = iconCandidates(role, iconSource, iconBaseUrl, alignment).find((u) => !failed.has(u))
  const onError = () => iconUrl && setFailed((f) => new Set(f).add(iconUrl))
  const zoom = iconUrl && isPaddedIconUrl(iconUrl) ? { transform: `scale(${PADDED_ICON_ZOOM})` } : undefined
  const team = role.team as Team
  const bg = TEAM_BG[team] ?? 'bg-gray-700'

  if (fill) {
    // Fill the parent positioned container — no fixed dimensions
    if (iconUrl) {
      return (
        <img
          src={iconUrl}
          alt={role.name}
          className={`absolute inset-0 w-full h-full object-cover object-center ${className}`}
          style={zoom}
          onError={onError}
        />
      )
    }
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${bg} ${className}`}
        title={role.name}
      >
        <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
          {role.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    )
  }

  // Fixed-size mode (default — used in lists, pickers, etc.)
  if (iconUrl) {
    // The box (size, rings, borders from className) stays fixed; only the artwork
    // inside is zoomed, so neighbouring icons never overlap
    return (
      <div
        className={`rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={iconUrl}
          alt={role.name}
          width={size}
          height={size}
          className="block w-full h-full rounded-full object-cover object-center pointer-events-none"
          style={zoom}
          onError={onError}
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center ${bg} ${className}`}
      style={{ width: size, height: size }}
      title={role.name}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
        {role.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}
