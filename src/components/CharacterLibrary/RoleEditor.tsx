import { useState } from 'react'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import { Modal } from '@/components/ui/Modal'
import { TeamBadge } from '@/components/ui/TeamBadge'
import type { RoleBase } from '@/types'

interface Props {
  role: RoleBase
  open: boolean
  onClose: () => void
}

export function RoleEditor({ role, open, onClose }: Props) {
  const { editOverrides, locales, activeLocale, setEditOverride, clearEditOverride, importLocale } =
    useLibraryStore()

  const resolved = resolveRoleText(role, editOverrides, locales, activeLocale)

  const [name, setName] = useState(resolved.displayName)
  const [ability, setAbility] = useState(resolved.displayAbility)
  const [remindersText, setRemindersText] = useState(resolved.displayReminders.join(', '))
  const [firstReminder, setFirstReminder] = useState(resolved.displayFirstNightReminder)
  const [otherReminder, setOtherReminder] = useState(resolved.displayOtherNightReminder)

  const save = () => {
    const override = {
      name: name || undefined,
      ability: ability || undefined,
      reminders: remindersText ? remindersText.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      firstNightReminder: firstReminder || undefined,
      otherNightReminder: otherReminder || undefined,
    }
    if (activeLocale !== 'en') {
      // Write to active locale
      const existing = locales[activeLocale] ?? { locale: activeLocale, name: activeLocale, roles: {} }
      importLocale({
        ...existing,
        roles: { ...existing.roles, [role.id]: override },
      })
    } else {
      setEditOverride(role.id, override)
    }
    onClose()
  }

  const reset = () => {
    if (activeLocale !== 'en') {
      const existing = locales[activeLocale]
      if (existing) {
        const roles = { ...existing.roles }
        delete roles[role.id]
        importLocale({ ...existing, roles })
      }
    } else {
      clearEditOverride(role.id)
    }
    onClose()
  }

  const isEditing = activeLocale !== 'en'
    ? !!(locales[activeLocale]?.roles[role.id])
    : !!(editOverrides[role.id])

  return (
    <Modal open={open} onClose={onClose} title="Edit Role Text" className="w-[520px] max-w-full">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <TeamBadge team={role.team} />
          <span className="text-sm text-gray-400">{role.id}</span>
          {activeLocale !== 'en' && (
            <span className="text-xs bg-indigo-900 text-indigo-300 rounded px-2 py-0.5 border border-indigo-700">
              Editing: {activeLocale}
            </span>
          )}
        </div>

        <Field label="Name" value={name} onChange={setName} />
        <Field label="Ability" value={ability} onChange={setAbility} textarea rows={3} />
        <Field label="Reminders (comma-separated)" value={remindersText} onChange={setRemindersText} />
        <Field label="First-night reminder" value={firstReminder} onChange={setFirstReminder} textarea rows={3} />
        <Field label="Other-nights reminder" value={otherReminder} onChange={setOtherReminder} textarea rows={3} />

        <div className="flex gap-3 justify-end pt-2">
          {isEditing && (
            <button onClick={reset} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">
              Reset to original
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">
            Cancel
          </button>
          <button onClick={save} className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium">
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({
  label, value, onChange, textarea, rows,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
  rows?: number
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 2}
          className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500 resize-y"
          style={{ userSelect: 'text' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500"
          style={{ userSelect: 'text' }}
        />
      )}
    </div>
  )
}
