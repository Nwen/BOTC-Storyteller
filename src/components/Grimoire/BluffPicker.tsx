import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import type { RoleBase } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

export function BluffPicker({ open, onClose }: Props) {
  const { script, players, bluffs, addBluff, removeBluff } = useGameStore()
  const { editOverrides, locales, activeLocale } = useLibraryStore()

  // Good-team roles in the script that are not currently assigned to any player
  const inPlayIds = useMemo(
    () => new Set(players.map((p) => p.roleId).filter(Boolean) as string[]),
    [players],
  )

  const bluffable = useMemo<RoleBase[]>(() => {
    if (!script) return []
    return script.roles.filter(
      (r) => (r.team === 'townsfolk' || r.team === 'outsider') && !inPlayIds.has(r.id),
    )
  }, [script, inPlayIds])

  if (!script) return null

  return (
    <Modal open={open} onClose={onClose} title="Choose demon bluffs" className="w-[420px] max-w-full">
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">
          Showing good-team characters in the script that are <em>not</em> currently in play.
          Tap to toggle.
        </p>
        {bluffable.length === 0 && (
          <p className="text-sm text-gray-600 py-4 text-center">
            No available bluff characters — all good-team script roles are in play.
          </p>
        )}
        <div className="space-y-1">
          {bluffable.map((role) => {
            const res = resolveRoleText(role, editOverrides, locales, activeLocale)
            const selected = bluffs.includes(role.id)
            return (
              <button
                key={role.id}
                onClick={() => (selected ? removeBluff(role.id) : addBluff(role.id))}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  selected
                    ? 'bg-red-900/60 border border-red-700'
                    : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                }`}
              >
                <CharacterIcon role={role} size={36} className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{res.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{res.displayAbility}</p>
                </div>
                {selected && (
                  <span className="shrink-0 text-red-400 text-lg leading-none">✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
