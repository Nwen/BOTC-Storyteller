import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import type { RoleBase } from '@/types'

interface ReminderOption {
  roleId: string
  roleName: string
  label: string
  isGlobal?: boolean
  isCustom?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (roleId: string, label: string) => void
}

export function ReminderPicker({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [customText, setCustomText] = useState('')
  const { script, players } = useGameStore()
  const { editOverrides, locales, activeLocale } = useLibraryStore()

  const options: ReminderOption[] = useMemo(() => {
    if (!script) return []
    const result: ReminderOption[] = []
    const inPlayIds = new Set(players.map((p) => p.roleId).filter(Boolean))

    for (const role of script.roles) {
      const resolved = resolveRoleText(role as RoleBase, editOverrides, locales, activeLocale)
      // Per-role reminders: only add if role is in play
      if (inPlayIds.has(role.id)) {
        for (const label of resolved.displayReminders) {
          result.push({ roleId: role.id, roleName: resolved.displayName, label })
        }
      }
      // Global reminders: always available
      for (const label of role.remindersGlobal ?? []) {
        result.push({ roleId: role.id, roleName: resolved.displayName, label, isGlobal: true })
      }
    }
    return result
  }, [script, players, editOverrides, locales, activeLocale])

  const filtered = options.filter(
    (o) =>
      search === '' ||
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.roleName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Modal open={open} onClose={onClose} title="Add Reminder" className="w-96">
      <div className="px-4 pt-3 pb-2 border-b border-gray-700 sticky top-0 bg-gray-900">
        <input
          autoFocus
          type="text"
          placeholder="Search reminders…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none border border-gray-700 focus:border-blue-500"
        />
      </div>

      <div className="p-4 space-y-3">
        {/* Custom free-text */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Custom reminder…"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customText.trim()) {
                onSelect('_custom', customText.trim())
                setCustomText('')
                onClose()
              }
            }}
            className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm outline-none border border-gray-700 focus:border-blue-500"
          />
          <button
            disabled={!customText.trim()}
            onClick={() => {
              if (customText.trim()) {
                onSelect('_custom', customText.trim())
                setCustomText('')
                onClose()
              }
            }}
            className="px-3 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-40 text-sm"
          >
            Add
          </button>
        </div>

        <hr className="border-gray-700" />

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">No reminders available.</p>
        )}

        <div className="space-y-1">
          {filtered.map((opt, i) => (
            <button
              key={i}
              onClick={() => { onSelect(opt.roleId, opt.label); onClose() }}
              className="w-full flex items-center justify-between gap-2 rounded px-3 py-2 bg-gray-800 hover:bg-gray-700 text-left"
            >
              <span className="text-sm">{opt.label}</span>
              <span className="text-xs text-gray-500 shrink-0">{opt.roleName}{opt.isGlobal ? ' ★' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
