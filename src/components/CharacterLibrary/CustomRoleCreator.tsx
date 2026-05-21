import { useState } from 'react'
import { useLibraryStore } from '@/store/libraryStore'
import { Modal } from '@/components/ui/Modal'
import { BASE_ROLES } from '@/lib/scriptImport'
import type { RoleBase, Team } from '@/types'

const TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled']

interface Props { open: boolean; onClose: () => void }

const empty = (): Partial<RoleBase> => ({
  id: '',
  name: '',
  team: 'townsfolk',
  ability: '',
  reminders: [],
  firstNight: 0,
  firstNightReminder: '',
  otherNight: 0,
  otherNightReminder: '',
  setup: false,
  image: '',
})

export function CustomRoleCreator({ open, onClose }: Props) {
  const { customRoles, addCustomRole } = useLibraryStore()
  const [form, setForm] = useState<Partial<RoleBase>>(empty())
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof RoleBase>(k: K, v: RoleBase[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    setError(null)
    const id = (form.id ?? '').trim()
    if (!id) { setError('ID is required'); return }
    if (!/^[a-z0-9_]+$/.test(id)) { setError('ID must be lowercase letters, digits, and underscores only'); return }
    if (BASE_ROLES.some((r) => r.id === id) || customRoles.some((r) => r.id === id)) {
      setError(`ID "${id}" is already in use`); return
    }
    if (!(form.name ?? '').trim()) { setError('Name is required'); return }

    addCustomRole({
      id,
      name: (form.name ?? '').trim(),
      team: form.team ?? 'townsfolk',
      ability: form.ability ?? '',
      reminders: typeof form.reminders === 'string'
        ? (form.reminders as string).split(',').map((s) => s.trim()).filter(Boolean)
        : form.reminders ?? [],
      firstNight: Number(form.firstNight) || 0,
      firstNightReminder: form.firstNightReminder ?? '',
      otherNight: Number(form.otherNight) || 0,
      otherNightReminder: form.otherNightReminder ?? '',
      setup: !!form.setup,
      image: form.image ?? '',
      custom: true,
    })
    setForm(empty())
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Custom Role" className="w-[560px] max-w-full">
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ID (unique slug)</label>
            <input type="text" value={form.id ?? ''} onChange={(e) => set('id', e.target.value)}
              placeholder="my_custom_role"
              className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500"
              style={{ userSelect: 'text' }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name</label>
            <input type="text" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)}
              className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500"
              style={{ userSelect: 'text' }} />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Team</label>
          <select value={form.team} onChange={(e) => set('team', e.target.value as Team)}
            className="bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none">
            {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Ability</label>
          <textarea value={form.ability ?? ''} onChange={(e) => set('ability', e.target.value)}
            rows={3} className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none resize-y focus:border-blue-500"
            style={{ userSelect: 'text' }} />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Reminders (comma-separated)</label>
          <input type="text"
            value={Array.isArray(form.reminders) ? form.reminders.join(', ') : String(form.reminders ?? '')}
            onChange={(e) => set('reminders', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500"
            style={{ userSelect: 'text' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">First night order (0 = never)</label>
            <input type="number" min={0} value={form.firstNight ?? 0}
              onChange={(e) => set('firstNight', Number(e.target.value))}
              className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Other night order (0 = never)</label>
            <input type="number" min={0} value={form.otherNight ?? 0}
              onChange={(e) => set('otherNight', Number(e.target.value))}
              className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">First-night reminder</label>
          <textarea value={form.firstNightReminder ?? ''} onChange={(e) => set('firstNightReminder', e.target.value)}
            rows={2} className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none resize-y"
            style={{ userSelect: 'text' }} />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Other-nights reminder</label>
          <textarea value={form.otherNightReminder ?? ''} onChange={(e) => set('otherNightReminder', e.target.value)}
            rows={2} className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none resize-y"
            style={{ userSelect: 'text' }} />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Image URL (optional)</label>
          <input type="text" value={form.image ?? ''} onChange={(e) => set('image', e.target.value)}
            placeholder="https://…"
            className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500"
            style={{ userSelect: 'text' }} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!form.setup} onChange={(e) => set('setup', e.target.checked)}
            className="w-4 h-4" />
          Modifies setup (e.g. Baron, Drunk)
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium">Create</button>
        </div>
      </div>
    </Modal>
  )
}
