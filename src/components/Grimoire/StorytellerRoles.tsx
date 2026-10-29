import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { TeamBadge, useTeamLabel } from '@/components/ui/TeamBadge'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useRolePool } from '@/hooks/useRolePool'
import { resolveRoleText } from '@/lib/roleResolution'
import { STORYTELLER_TEAMS } from '@/lib/storytellerRoles'
import type { ResolvedRole, Team } from '@/types'

const TEAMS: Team[] = [...STORYTELLER_TEAMS]

/** Fabled & Loric in play: the Storyteller's own characters, shown as standing reminders */
export function StorytellerRoles() {
  const { script, storytellerRoles } = useGameStore()
  const { editOverrides, locales, activeLocale } = useLibraryStore()
  const pool = useRolePool()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const active = useMemo(
    () =>
      storytellerRoles
        .map((id) => pool.find((r) => r.id === id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined)
        .map((r) => resolveRoleText(r, editOverrides, locales, activeLocale)),
    [storytellerRoles, pool, editOverrides, locales, activeLocale],
  )

  if (!script && active.length === 0) return null

  const detail = active.find((r) => r.id === detailId) ?? null

  return (
    <>
      <div className="px-4 py-2 border-b border-gray-800 shrink-0 flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] uppercase tracking-widest text-yellow-400/70 font-semibold select-none shrink-0">
          Storyteller
        </span>

        {active.map((role) => (
          <button
            key={role.id}
            onClick={() => setDetailId(role.id)}
            title={role.displayAbility}
            className="flex items-center gap-2 rounded-full bg-gray-900 hover:bg-gray-800 border border-gray-700 pl-0.5 pr-3 py-0.5 shrink-0 max-w-[260px]"
          >
            <CharacterIcon role={role} size={36} className="shrink-0" />
            <span className="text-left min-w-0">
              <span className={`block text-xs font-semibold team-${role.team}`}>{role.displayName}</span>
              <span className="block text-[10px] text-gray-400 truncate">{role.displayAbility}</span>
            </span>
          </button>
        ))}

        {active.length === 0 && <span className="text-xs text-gray-700 italic shrink-0">No Fabled or Loric</span>}

        <button
          onClick={() => setShowPicker(true)}
          className="text-[11px] text-yellow-500/70 hover:text-yellow-400 px-2 py-1 rounded shrink-0"
        >
          {active.length === 0 ? '+ add' : '✎ edit'}
        </button>
      </div>

      <StorytellerRoleDetail role={detail} onClose={() => setDetailId(null)} />
      <StorytellerRolePicker open={showPicker} onClose={() => setShowPicker(false)} />
    </>
  )
}

function StorytellerRoleDetail({ role, onClose }: Readonly<{ role: ResolvedRole | null; onClose: () => void }>) {
  const removeStorytellerRole = useGameStore((s) => s.removeStorytellerRole)
  if (!role) return null

  return (
    <Modal open onClose={onClose} title={role.displayName} className="w-[420px] max-w-full">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <CharacterIcon role={role} size={64} className="shrink-0" />
          <div className="space-y-1.5">
            <TeamBadge team={role.team} />
            <p className="text-sm">{role.displayAbility}</p>
          </div>
        </div>
        {role.setup && (
          <p className="text-xs text-yellow-300/80">⚙ Changes the game setup.</p>
        )}
        {role.displayReminders.length > 0 && (
          <p className="text-xs text-gray-400">
            Reminders: {role.displayReminders.join(', ')}
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={() => { removeStorytellerRole(role.id); onClose() }}
            className="px-3 py-1.5 rounded text-sm bg-red-900/60 hover:bg-red-900 border border-red-800 text-red-200"
          >
            Remove from game
          </button>
        </div>
      </div>
    </Modal>
  )
}

function StorytellerRolePicker({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const { script, storytellerRoles, addStorytellerRole, removeStorytellerRole } = useGameStore()
  const { editOverrides, locales, activeLocale } = useLibraryStore()
  const pool = useRolePool()

  const byTeam = useMemo(() => {
    const onScript = new Set(script?.roles.map((r) => r.id))
    return TEAMS.map((team) => ({
      team,
      roles: pool
        .filter((r) => r.team === team)
        .map((r) => resolveRoleText(r, editOverrides, locales, activeLocale))
        // Script characters first, then alphabetical
        .sort((a, b) =>
          Number(onScript.has(b.id)) - Number(onScript.has(a.id)) ||
          a.displayName.localeCompare(b.displayName),
        )
        .map((r) => ({ role: r, onScript: onScript.has(r.id) })),
    })).filter((g) => g.roles.length > 0)
  }, [script, pool, editOverrides, locales, activeLocale])

  return (
    <Modal open={open} onClose={onClose} title="Fabled & Loric in play" className="w-[480px] max-w-full">
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">
          Characters of the Storyteller. They modify the game but aren't held by anyone. Tap to toggle.
        </p>
        {byTeam.map(({ team, roles }) => (
          <div key={team}>
            <TeamHeading team={team} />
            <div className="space-y-1">
              {roles.map(({ role, onScript }) => {
                const selected = storytellerRoles.includes(role.id)
                return (
                  <button
                    key={role.id}
                    onClick={() => (selected ? removeStorytellerRole(role.id) : addStorytellerRole(role.id))}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'bg-yellow-900/40 border border-yellow-700'
                        : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <CharacterIcon role={role} size={36} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {role.displayName}
                        {onScript && <span className="ml-2 text-[10px] text-gray-400 font-normal">on script</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{role.displayAbility}</p>
                    </div>
                    {selected && <span className="shrink-0 text-yellow-400 text-lg leading-none">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function TeamHeading({ team }: Readonly<{ team: Team }>) {
  const label = useTeamLabel(team)
  return <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 team-${team}`}>{label}</p>
}
