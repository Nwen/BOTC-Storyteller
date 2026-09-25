import { useCallback, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { parseScriptFile, BASE_SCRIPTS } from '@/lib/scriptImport'
import { useResolvedRoles } from '@/hooks/useRoleResolution'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import type { Team, SavedScript } from '@/types'

const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled']

export function ScriptManager() {
  const { script, loadScript } = useGameStore()
  const bundledScripts = useLibraryStore((s) => s.bundledScripts)
  const savedScripts = useLibraryStore((s) => s.savedScripts)
  const saveScript = useLibraryStore((s) => s.saveScript)
  const removeSavedScript = useLibraryStore((s) => s.removeSavedScript)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<SavedScript | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setWarnings([])
    try {
      const text = await file.text()
      const { script: loaded, warnings: w } = parseScriptFile(text)
      loadScript(loaded)
      saveScript(loaded, file.name.replace(/\.json$/i, ''))
      setWarnings(w)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [loadScript, saveScript])

  // Drag-and-drop on the whole section
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const resolved = useResolvedRoles(script?.roles ?? [])
  const filtered = resolved.filter((r) =>
    search === '' ||
    r.displayName.toLowerCase().includes(search.toLowerCase()) ||
    r.displayAbility.toLowerCase().includes(search.toLowerCase()),
  )

  const byTeam = TEAM_ORDER.map((team) => ({
    team,
    roles: filtered.filter((r) => r.team === team),
  })).filter((g) => g.roles.length > 0)

  return (
    <div className="h-full flex flex-col" onDragOver={onDragOver} onDrop={onDrop}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">Script</h2>
          {script?.meta.name && (
            <span className="text-gray-400 text-sm">
              {script.meta.name}
              {script.meta.author && ` — ${script.meta.author}`}
            </span>
          )}
        </div>

        {/* Base preset buttons */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(BASE_SCRIPTS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => { loadScript(s); setWarnings([]); setError(null) }}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm border border-gray-700"
            >
              {s.meta.name}
            </button>
          ))}

          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-sm border border-blue-600"
          >
            Import JSON…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
        </div>

        {/* Imported scripts, kept across sessions */}
        {savedScripts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">Saved:</span>
            {savedScripts.map((entry) => (
              <div
                key={entry.id}
                className="flex items-stretch rounded overflow-hidden border border-gray-600 bg-gray-700"
              >
                <button
                  onClick={() => { loadScript(entry.script); setWarnings([]); setError(null) }}
                  className="px-3 py-1.5 text-sm hover:bg-gray-600"
                >
                  {entry.name}
                  {entry.script.meta.author && (
                    <span className="text-gray-400 ml-1 text-xs">— {entry.script.meta.author}</span>
                  )}
                </button>
                <button
                  onClick={() => setPendingDelete(entry)}
                  className="px-2 text-gray-400 hover:bg-red-900 hover:text-red-200 border-l border-gray-600"
                  title={`Delete "${entry.name}"`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Scripts from public/scripts/ folder */}
        {bundledScripts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">Bundled:</span>
            {bundledScripts.map((s) => (
              <button
                key={s.meta.name ?? ''}
                onClick={() => { loadScript(s); setWarnings([]); setError(null) }}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm border border-gray-600"
              >
                {s.meta.name ?? 'Unnamed script'}
                {s.meta.author && <span className="text-gray-400 ml-1 text-xs">— {s.meta.author}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Drop hint */}
        <p className="text-xs text-gray-500">
          Drop a script JSON file anywhere on this panel to import it.
        </p>

        {/* Warnings / errors */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded p-2 text-red-300 text-sm">{error}</div>
        )}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/40 border border-yellow-700 rounded p-2 text-yellow-300 text-sm space-y-0.5">
            <p className="font-medium">Warnings:</p>
            {warnings.map((w, i) => <p key={i}>• {w}</p>)}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeSavedScript(pendingDelete.id)
          setPendingDelete(null)
        }}
        title="Delete saved script"
        message={`Remove "${pendingDelete?.name ?? ''}" from your saved scripts? The currently loaded script is not affected.`}
        confirmLabel="Delete"
        danger
      />

      {/* Search */}
      {script && (
        <div className="px-4 py-2 border-b border-gray-800 shrink-0">
          <input
            type="text"
            placeholder="Search characters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 rounded px-3 py-1.5 text-sm outline-none border border-gray-700 focus:border-blue-500"
          />
        </div>
      )}

      {/* Character list */}
      <div className="flex-1 scrollable p-4 space-y-6">
        {!script && (
          <div className="text-center text-gray-500 py-16">
            <p className="text-4xl mb-4">📖</p>
            <p>No script loaded.</p>
            <p className="text-sm mt-1">Choose a base script or import a custom JSON.</p>
          </div>
        )}

        {byTeam.map(({ team, roles }) => (
          <div key={team}>
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 team-${team}`}>
              {team} <span className="text-gray-500 font-normal">({roles.length})</span>
            </h3>
            <div className="space-y-1">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`flex items-start gap-3 rounded-lg p-2 bg-team-${team}`}
                >
                  <CharacterIcon role={role} size={40} className="shrink-0 mt-0.5" />
                  <div className="min-w-0">
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
                          <span key={r} className="text-xs bg-gray-800 text-gray-300 rounded-full px-2 py-0.5 border border-gray-600">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
