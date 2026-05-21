import { useState, useRef } from 'react'
import { useLibraryStore } from '@/store/libraryStore'
import { useAllResolvedRoles } from '@/hooks/useRoleResolution'
import { parseTranslationFile } from '@/lib/translationImport'
import { TeamBadge, useTeamLabel } from '@/components/ui/TeamBadge'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { RoleEditor } from './RoleEditor'
import { CustomRoleCreator } from './CustomRoleCreator'
import type { ResolvedRole, Team } from '@/types'

const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled']

export function CharacterLibrary() {
  const {
    locales, activeLocale, setActiveLocale, importLocale, deleteLocale, exportLibrary, importLibrary,
    customRoles, removeCustomRole,
  } = useLibraryStore()

  const allRoles = useAllResolvedRoles()
  const [search, setSearch] = useState('')
  const [editRole, setEditRole] = useState<ResolvedRole | null>(null)
  const [showCreator, setShowCreator] = useState(false)
  const [localeError, setLocaleError] = useState<string | null>(null)

  const transFileRef = useRef<HTMLInputElement>(null)
  const libFileRef = useRef<HTMLInputElement>(null)

  const filtered = allRoles.filter(
    (r) =>
      search === '' ||
      r.displayName.toLowerCase().includes(search.toLowerCase()) ||
      r.displayAbility.toLowerCase().includes(search.toLowerCase()),
  )

  const byTeam = TEAM_ORDER.map((team) => ({
    team,
    roles: filtered.filter((r) => r.team === team),
  })).filter((g) => g.roles.length > 0)

  const handleLocaleFile = async (file: File) => {
    setLocaleError(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const data = parseTranslationFile(parsed)
      importLocale(data)
    } catch (e) {
      setLocaleError(e instanceof Error ? e.message : String(e))
    }
  }

  const exportCustom = () => {
    const data = customRoles.map((r) => ({
      id: r.id, name: r.name, team: r.team, ability: r.ability ?? '',
      firstNight: r.firstNight ?? 0, firstNightReminder: r.firstNightReminder ?? '',
      otherNight: r.otherNight ?? 0, otherNightReminder: r.otherNightReminder ?? '',
      reminders: r.reminders ?? [], setup: r.setup ?? false,
      ...(r.image ? { image: r.image } : {}),
    }))
    download(JSON.stringify(data, null, 2), 'custom-roles.json')
  }

  const exportLib = () => download(exportLibrary(), 'botc-library.json')

  const handleLibFile = async (file: File) => {
    try {
      const text = await file.text()
      importLibrary(text)
    } catch (e) {
      setLocaleError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Character Library</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreator(true)}
              className="px-3 py-1.5 rounded bg-green-800 hover:bg-green-700 text-sm border border-green-600"
            >
              + New custom role
            </button>
          </div>
        </div>

        {/* Language / locale row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400">Language:</span>
          <button
            onClick={() => setActiveLocale('en')}
            className={`px-3 py-1 rounded text-sm ${activeLocale === 'en' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            English
          </button>
          {Object.entries(locales).map(([key, loc]) => (
            <button
              key={key}
              onClick={() => setActiveLocale(key)}
              className={`px-3 py-1 rounded text-sm ${activeLocale === key ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              {loc.name}
            </button>
          ))}
          <button
            onClick={() => transFileRef.current?.click()}
            className="px-3 py-1 rounded bg-indigo-800 hover:bg-indigo-700 text-sm border border-indigo-700"
          >
            Import translation…
          </button>
          <input ref={transFileRef} type="file" accept=".json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLocaleFile(f); e.target.value = '' }} />
          {activeLocale !== 'en' && (
            <button
              onClick={() => {
                const data = locales[activeLocale]
                if (data) download(JSON.stringify(data, null, 2), `translation-${activeLocale}.json`)
              }}
              className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm"
            >
              Export {activeLocale}
            </button>
          )}
          {activeLocale !== 'en' && (
            <button
              onClick={() => deleteLocale(activeLocale)}
              className="px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-sm text-red-300"
            >
              Delete locale
            </button>
          )}
        </div>

        {/* Library backup */}
        <div className="flex flex-wrap gap-2">
          <button onClick={exportLib} className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm">
            Export library
          </button>
          <button onClick={() => libFileRef.current?.click()} className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm">
            Import library
          </button>
          <input ref={libFileRef} type="file" accept=".json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLibFile(f); e.target.value = '' }} />
          {customRoles.length > 0 && (
            <button onClick={exportCustom} className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm">
              Export custom roles
            </button>
          )}
        </div>

        {localeError && (
          <div className="bg-red-900/50 border border-red-700 rounded p-2 text-red-300 text-sm">{localeError}</div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-800 shrink-0">
        <input
          type="text"
          placeholder="Search characters…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 rounded px-3 py-1.5 text-sm outline-none border border-gray-700 focus:border-blue-500"
        />
      </div>

      {/* List */}
      <div className="flex-1 scrollable p-4 space-y-6">
        {byTeam.map(({ team, roles }) => (
          <div key={team}>
            <TeamSectionHeader team={team} count={roles.length} />

            <div className="space-y-1">
              {roles.map((role) => (
                <div key={role.id} className={`flex items-start gap-3 rounded-lg p-2 bg-team-${team} group`}>
                  <CharacterIcon role={role} size={40} className="shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{role.displayName}</span>
                      <TeamBadge team={role.team} />
                      {role.custom && (
                        <span className="text-xs bg-gray-700 text-gray-300 rounded px-1">custom</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{role.displayAbility}</p>
                    {role.displayReminders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.displayReminders.map((r) => (
                          <span key={r} className="text-xs bg-gray-800 text-gray-300 rounded-full px-2 py-0.5 border border-gray-600">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditRole(role)}
                      className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs min-h-[32px]"
                    >
                      Edit
                    </button>
                    {role.custom && (
                      <button
                        onClick={() => removeCustomRole(role.id)}
                        className="px-2 py-1 rounded bg-red-900 hover:bg-red-800 text-xs text-red-300 min-h-[32px]"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editRole && (
        <RoleEditor role={editRole} open={!!editRole} onClose={() => setEditRole(null)} />
      )}
      <CustomRoleCreator open={showCreator} onClose={() => setShowCreator(false)} />
    </div>
  )
}

function TeamSectionHeader({ team, count }: Readonly<{ team: Team; count: number }>) {
  const label = useTeamLabel(team)
  return (
    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 team-${team}`}>
      {label} <span className="text-gray-500 font-normal">({count})</span>
    </h3>
  )
}

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
