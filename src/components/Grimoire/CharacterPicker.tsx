import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import { BASE_ROLES } from '@/lib/scriptImport'
import type { RoleBase, Team } from '@/types'

const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled']

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (roleId: string) => void
  currentRoleId?: string | null
}

export function CharacterPicker({ open, onClose, onSelect, currentRoleId }: Props) {
  const [search, setSearch] = useState('')
  const script = useGameStore((s) => s.script)
  const customRoles = useLibraryStore((s) => s.customRoles)
  const editOverrides = useLibraryStore((s) => s.editOverrides)
  const locales = useLibraryStore((s) => s.locales)
  const activeLocale = useLibraryStore((s) => s.activeLocale)

  const pool: RoleBase[] = useMemo(() => {
    const map = new Map<string, RoleBase>()
    for (const r of BASE_ROLES) map.set(r.id, r)
    for (const r of customRoles) map.set(r.id, r)
    if (script) {
      for (const r of script.roles) map.set(r.id, r)
    }
    return [...map.values()]
  }, [script, customRoles])

  const resolved = useMemo(
    () => pool.map((r) => resolveRoleText(r, editOverrides, locales, activeLocale)),
    [pool, editOverrides, locales, activeLocale],
  )

  // Prefer script roles; if no script, show all
  const filtered = resolved.filter((r) => {
    if (search) {
      return r.displayName.toLowerCase().includes(search.toLowerCase())
    }
    if (script) {
      return script.roles.some((sr) => sr.id === r.id) || r.custom
    }
    return true
  })

  const byTeam = TEAM_ORDER.map((team) => ({
    team,
    roles: filtered.filter((r) => r.team === team),
  })).filter((g) => g.roles.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Assign Character" className="w-[480px] max-w-full">
      <div className="px-4 pt-3 pb-2 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
        <input
          autoFocus
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none border border-gray-700 focus:border-blue-500"
        />
        {currentRoleId && (
          <button
            onClick={() => { onSelect(''); onClose() }}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Clear character
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {byTeam.map(({ team, roles }) => (
          <div key={team}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 team-${team}`}>{team}</p>
            <div className="grid grid-cols-2 gap-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => { onSelect(role.id); onClose() }}
                  className={`flex items-center gap-2 rounded-lg p-2 text-left transition-colors
                    ${currentRoleId === role.id ? 'bg-blue-800 border border-blue-500' : 'bg-gray-800 hover:bg-gray-700 border border-transparent'}
                  `}
                >
                  <CharacterIcon role={role} size={32} className="shrink-0" />
                  <span className="text-sm font-medium truncate">{role.displayName}</span>
                  {role.custom && <span className="text-xs text-gray-400 shrink-0">✦</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
        {byTeam.length === 0 && (
          <p className="text-center text-gray-500 py-8">No characters found.</p>
        )}
      </div>
    </Modal>
  )
}
