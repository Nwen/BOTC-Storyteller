import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { RoleBase, Team } from '@/types'

const TEAM_BG: Record<Team, string> = {
  townsfolk: 'bg-blue-800',
  outsider:  'bg-cyan-800',
  minion:    'bg-orange-800',
  demon:     'bg-red-800',
  traveler:  'bg-purple-800',
  fabled:    'bg-yellow-800',
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
  className?: string
}

export function CharacterIcon({ role, size = 48, fill = false, className = '' }: Props) {
  const iconBaseUrl = useGameStore((s) => s.iconBaseUrl)
  const [imgError, setImgError] = useState(false)

  const iconUrl = role.image ? role.image : `${iconBaseUrl}${role.id}.png`
  const team = role.team as Team
  const bg = TEAM_BG[team] ?? 'bg-gray-700'

  if (fill) {
    // Fill the parent positioned container — no fixed dimensions
    if (!imgError) {
      return (
        <img
          src={iconUrl}
          alt={role.name}
          className={`absolute inset-0 w-full h-full object-cover object-center ${className}`}
          onError={() => setImgError(true)}
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
  if (!imgError) {
    return (
      <img
        src={iconUrl}
        alt={role.name}
        width={size}
        height={size}
        className={`rounded-full object-cover object-center ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
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
