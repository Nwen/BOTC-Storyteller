import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import { getTeamComposition, getAllCompositions } from '@/lib/teamComposition'
import { ROLE_MAP } from '@/lib/scriptImport'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InfoComposer } from '@/components/PlayerInfo/InfoComposer'
import type { RoleBase } from '@/types'

type Tab = 'info' | 'bluffs' | 'setup' | 'config' | 'notes'

const TABS: Tab[] = ['info', 'bluffs', 'setup', 'config', 'notes']

const TAB_LABELS: Record<Tab, string> = {
  info: 'Player Info', bluffs: 'Bluffs', setup: 'Setup', config: 'Config', notes: 'Notes',
}

export function ToolsPanel() {
  const [tab, setTab] = useState<Tab>('info')

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-800 shrink-0">
        <div className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm whitespace-nowrap shrink-0 ${tab === t ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'info'   && <InfoComposer />}
        {tab === 'bluffs' && <BluffsTab />}
        {tab === 'setup'  && <SetupTab />}
        {tab === 'config' && <ConfigTab />}
        {tab === 'notes'  && <NotesTab />}
      </div>
    </div>
  )
}

function NotesTab() {
  const { globalNotes, setGlobalNotes } = useGameStore()
  return (
    <div className="h-full p-4 flex flex-col">
      <label className="text-sm text-gray-400 mb-2 block">Storyteller scratchpad</label>
      <textarea
        value={globalNotes}
        onChange={(e) => setGlobalNotes(e.target.value)}
        placeholder="Freely jot down anything here…"
        className="flex-1 bg-gray-800 rounded p-3 text-sm border border-gray-700 outline-none focus:border-blue-500 resize-none"
        style={{ userSelect: 'text' }}
      />
    </div>
  )
}

function BluffsTab() {
  const { script, players, bluffs, addBluff, removeBluff } = useGameStore()
  const { editOverrides, locales, activeLocale } = useLibraryStore()

  // Good-team roles from the script that are not currently assigned to any player
  const inPlayIds = new Set(players.map((p) => p.roleId).filter(Boolean) as string[])
  const goodRoles = (script?.roles ?? []).filter(
    (r) => (r.team === 'townsfolk' || r.team === 'outsider') && !inPlayIds.has(r.id),
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700 shrink-0">
        <p className="text-sm font-medium">Demon bluffs</p>
        <p className="text-xs text-gray-500 mt-0.5">Not-in-play good characters shown to the demon</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {bluffs.map((id) => {
            const role = script?.roles.find((r) => r.id === id) ?? ROLE_MAP.get(id)
            if (!role) return null
            const res = resolveRoleText(role, editOverrides, locales, activeLocale)
            return (
              <button
                key={id}
                onClick={() => removeBluff(id)}
                className="flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1.5 text-sm hover:bg-red-900/50"
                title="Remove bluff"
              >
                <CharacterIcon role={role} size={20} />
                {res.displayName} ×
              </button>
            )
          })}
          {bluffs.length === 0 && <p className="text-sm text-gray-600">None assigned.</p>}
        </div>
      </div>
      <div className="flex-1 scrollable p-4">
        <p className="text-xs text-gray-500 mb-2">Click to add as bluff:</p>
        <div className="space-y-1">
          {goodRoles.map((role) => {
            const res = resolveRoleText(role, editOverrides, locales, activeLocale)
            const already = bluffs.includes(role.id)
            return (
              <button
                key={role.id}
                onClick={() => already ? removeBluff(role.id) : addBluff(role.id)}
                className={`w-full flex items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
                  already ? 'bg-blue-900 border border-blue-700' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <CharacterIcon role={role} size={28} />
                {res.displayName}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SetupTab() {
  const { script, players } = useGameStore()
  const playerCount = players.length
  const comp = getTeamComposition(playerCount)
  const allComps = getAllCompositions()

  const setupRoles = script?.roles.filter((r) => r.setup) ?? []

  return (
    <div className="scrollable h-full p-4 space-y-6">
      <div>
        <p className="text-sm font-medium mb-2">Current game ({playerCount} players)</p>
        {comp ? (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Townsfolk', value: comp.townsfolk, color: 'text-blue-400' },
              { label: 'Outsiders', value: comp.outsiders, color: 'text-cyan-400' },
              { label: 'Minions', value: comp.minions, color: 'text-orange-400' },
              { label: 'Demon', value: comp.demons, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Add players to see composition.</p>
        )}
      </div>

      {setupRoles.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-yellow-400">⚠ Setup-modifying roles in script</p>
          <div className="space-y-1">
            {setupRoles.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm bg-yellow-900/20 border border-yellow-800 rounded px-3 py-2">
                <CharacterIcon role={r as RoleBase} size={28} />
                <span>{r.name}</span>
                <span className="text-gray-400 text-xs">— {(r as RoleBase).ability}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2 text-gray-400">Full composition table</p>
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-1.5">Players</th>
              <th className="p-1.5 text-blue-400">TF</th>
              <th className="p-1.5 text-cyan-400">Out</th>
              <th className="p-1.5 text-orange-400">Min</th>
              <th className="p-1.5 text-red-400">Dem</th>
            </tr>
          </thead>
          <tbody>
            {allComps.map(({ players: n, townsfolk, outsiders, minions, demons }) => (
              <tr key={n} className={`border-t border-gray-800 ${n === playerCount ? 'bg-blue-900/30' : ''}`}>
                <td className="p-1.5 font-medium">{n}</td>
                <td className="p-1.5 text-center text-blue-300">{townsfolk}</td>
                <td className="p-1.5 text-center text-cyan-300">{outsiders}</td>
                <td className="p-1.5 text-center text-orange-300">{minions}</td>
                <td className="p-1.5 text-center text-red-300">{demons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfigTab() {
  const { iconBaseUrl, setIconBaseUrl, exportGameState, importGameState, newGame, newGameKeepPlayersAndScript } =
    useGameStore()
  const [urlDraft, setUrlDraft] = useState(iconBaseUrl)
  const [confirmNew, setConfirmNew] = useState<'full' | 'keep' | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleImportGame = async (file: File) => {
    setImportError(null)
    try {
      const text = await file.text()
      importGameState(text)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="scrollable h-full p-4 space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Character icon base URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none focus:border-blue-500"
            style={{ userSelect: 'text' }}
          />
          <button
            onClick={() => setIconBaseUrl(urlDraft)}
            className="px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-sm"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Icons are loaded as: base_url + role_id + ".png"
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Game state</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const data = exportGameState()
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'botc-game.json'; a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Export game
          </button>
          <label className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm cursor-pointer">
            Import game
            <input type="file" accept=".json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportGame(f); e.target.value = '' }} />
          </label>
        </div>
        {importError && <p className="text-xs text-red-400">{importError}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-red-400">Danger zone</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirmNew('keep')}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-orange-900 text-sm"
          >
            New game (keep players & script)
          </button>
          <button
            onClick={() => setConfirmNew('full')}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-red-900 text-sm"
          >
            New game (full reset)
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmNew === 'full'}
        onCancel={() => setConfirmNew(null)}
        onConfirm={() => { newGame(); setConfirmNew(null) }}
        title="New Game"
        message="Reset everything? All players, assignments, and logs will be cleared."
        confirmLabel="Reset"
        danger
      />
      <ConfirmDialog
        open={confirmNew === 'keep'}
        onCancel={() => setConfirmNew(null)}
        onConfirm={() => { newGameKeepPlayersAndScript(); setConfirmNew(null) }}
        title="New Game"
        message="Keep players and script, but reset all roles, tokens, and notes?"
        confirmLabel="Reset"
        danger
      />
    </div>
  )
}
