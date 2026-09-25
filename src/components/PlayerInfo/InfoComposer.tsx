import { useState } from 'react'
import { useInfoStore } from '@/store/infoStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useGameStore } from '@/store/gameStore'
import { useAllResolvedRoles } from '@/hooks/useRoleResolution'
import { useDemonPlayerId } from '@/hooks/useRolePool'
import { getAllTemplates, expandTemplateForGame, resolveStatement, resolveTemplateLabel } from '@/lib/infoResolution'
import { CharacterPicker } from '@/components/Grimoire/CharacterPicker'
import { AtomRenderer } from './AtomRenderer'
import ENGLISH_STATEMENTS from '@/data/statements.json'
import type { DraftAtom, Team } from '@/types'

const STATEMENT_KEYS = Object.keys(ENGLISH_STATEMENTS) as (keyof typeof ENGLISH_STATEMENTS)[]
const TEAM_OPTIONS: Array<'good' | 'evil' | Team> = ['good', 'evil', 'townsfolk', 'outsider', 'minion', 'demon']

export function InfoComposer() {
  const {
    draft, templateId,
    closeComposer, updateAtom, addAtom, removeAtom, moveAtom,
    startPresentation,
  } = useInfoStore()

  const { locales, activeLocale, customStatements, customTemplates } = useLibraryStore()
  const { players, bluffs } = useGameStore()
  const allRoles = useAllResolvedRoles()
  const demonPlayerId = useDemonPlayerId()
  const [charPickerIndex, setCharPickerIndex] = useState<number | null>(null)
  const templates = getAllTemplates(customTemplates)

  const currentTemplateLabel = templateId
    ? (templates.find((t) => t.id === templateId)?.label ?? null)
    : null

  const handleLoadTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    useInfoStore.getState().openComposer({
      draft: expandTemplateForGame(tpl, { bluffs, demonPlayerId }),
      templateId: id,
    })
  }

  const handleShowToPlayer = () => {
    if (draft.length === 0) return
    startPresentation()
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-700 overflow-hidden">

          {/* ── Left: composer ── */}
          <div className="flex-1 scrollable p-4 space-y-4 min-w-0">

            {/* Template loader */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Load template{currentTemplateLabel && <span className="text-blue-400 ml-1">— {currentTemplateLabel}</span>}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleLoadTemplate(t.id)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${
                      t.id === templateId
                        ? 'bg-blue-800 border-blue-600 text-blue-200'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {resolveTemplateLabel(t, locales, activeLocale)}
                  </button>
                ))}
              </div>
            </div>

            {/* Atom list */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Atoms</label>
              {draft.length === 0 && (
                <p className="text-xs text-gray-600 italic py-2">No atoms yet — load a template or add below.</p>
              )}
              <div className="space-y-1">
                {draft.map((atom, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-800 rounded p-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                      <button
                        onClick={() => moveAtom(i, Math.max(0, i - 1))}
                        disabled={i === 0}
                        className="text-gray-500 hover:text-white disabled:opacity-30 text-xs leading-none"
                      >▲</button>
                      <button
                        onClick={() => moveAtom(i, Math.min(draft.length - 1, i + 1))}
                        disabled={i === draft.length - 1}
                        className="text-gray-500 hover:text-white disabled:opacity-30 text-xs leading-none"
                      >▼</button>
                    </div>

                    {/* Editor */}
                    <div className="flex-1 min-w-0">
                      <AtomEditor
                        atom={atom}
                        onChange={(a) => updateAtom(i, a)}
                        onPickCharacter={() => setCharPickerIndex(i)}
                        players={players}
                        statementKeys={STATEMENT_KEYS.map((k) => ({
                          key: k,
                          label: resolveStatement(k, locales, activeLocale, customStatements),
                        }))}
                        allRoles={allRoles}
                      />
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeAtom(i)}
                      className="text-gray-500 hover:text-red-400 shrink-0 text-sm px-1"
                      title="Remove atom"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add atom buttons */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Add atom</label>
              <div className="flex flex-wrap gap-1.5">
                {ADD_ATOM_DEFS.map(({ label, atom }) => (
                  <button
                    key={label}
                    onClick={() => addAtom(atom)}
                    className="px-2 py-1 rounded text-xs bg-gray-800 border border-gray-700 hover:bg-gray-700"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: preview ── */}
          <div className="lg:w-64 p-4 shrink-0">
            <label className="text-xs text-gray-400 mb-2 block">Preview</label>
            <div className="bg-gray-950 rounded-lg p-3 space-y-3 min-h-[120px] flex flex-col items-center justify-center">
              {draft.length === 0
                ? <p className="text-xs text-gray-600 italic">Empty composition</p>
                : draft.map((a, i) => <AtomRenderer key={i} atom={a} size="preview" />)
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 shrink-0">
          <button
            onClick={closeComposer}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Clear
          </button>
          <button
            onClick={handleShowToPlayer}
            disabled={draft.length === 0}
            className="px-5 py-2 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Show to player →
          </button>
        </div>
      </div>

      {/* Character picker for character atoms */}
      <CharacterPicker
        open={charPickerIndex !== null}
        onClose={() => setCharPickerIndex(null)}
        currentRoleId={charPickerIndex !== null ? (draft[charPickerIndex] as { roleId?: string | null })?.roleId : null}
        onSelect={(roleId) => {
          if (charPickerIndex !== null) {
            const atom = draft[charPickerIndex]
            if (atom?.kind === 'character') {
              updateAtom(charPickerIndex, { ...atom, roleId })
            }
          }
          setCharPickerIndex(null)
        }}
      />
    </>
  )
}


// ── Atom editor ───────────────────────────────────────────────────────────────

interface EditorProps {
  atom: DraftAtom
  onChange: (atom: DraftAtom) => void
  onPickCharacter: () => void
  players: Array<{ id: string; name: string; seatIndex: number }>
  statementKeys: Array<{ key: string; label: string }>
  allRoles: Array<{ id: string; displayName: string; team: string }>
}

function AtomEditor({ atom, onChange, onPickCharacter, players, statementKeys, allRoles }: Readonly<EditorProps>) {
  switch (atom.kind) {
    case 'statement':
      return (
        <select
          value={atom.key}
          onChange={(e) => onChange({ ...atom, key: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
        >
          {statementKeys.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      )

    case 'player':
      return (
        <select
          value={atom.playerId ?? ''}
          onChange={(e) => onChange({ ...atom, playerId: e.target.value || null })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
        >
          <option value="">— pick player —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (seat {p.seatIndex + 1})</option>
          ))}
        </select>
      )

    case 'character': {
      const role = atom.roleId ? allRoles.find((r) => r.id === atom.roleId) : null
      const filterLabel = atom.filter?.team ? ` (${atom.filter.team})` : ''
      return (
        <button
          onClick={onPickCharacter}
          className="w-full text-left bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs hover:bg-gray-600"
        >
          {role ? role.displayName : `Pick character${filterLabel}…`}
        </button>
      )
    }

    case 'team': {
      type TeamValue = 'good' | 'evil' | Team
      return (
        <select
          value={atom.value ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onChange({ kind: 'team', value: v ? v as TeamValue : null })
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
        >
          <option value="">— pick team —</option>
          {TEAM_OPTIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      )
    }

    case 'yesno':
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...atom, value: true })}
            className={`flex-1 py-1 rounded text-xs font-bold ${atom.value ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            YES
          </button>
          <button
            onClick={() => onChange({ ...atom, value: false })}
            className={`flex-1 py-1 rounded text-xs font-bold ${!atom.value ? 'bg-red-800 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            NO
          </button>
        </div>
      )

    case 'number': {
      const max = atom.max ?? 20
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ ...atom, value: Math.max(0, atom.value - 1) })}
            disabled={atom.value <= 0}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-30"
          >−</button>
          <span className="flex-1 text-center text-sm font-bold">{atom.value}</span>
          <button
            onClick={() => onChange({ ...atom, value: Math.min(max, atom.value + 1) })}
            disabled={atom.value >= max}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-30"
          >+</button>
        </div>
      )
    }

    case 'free_text':
      return (
        <input
          type="text"
          value={atom.text}
          onChange={(e) => onChange({ ...atom, text: e.target.value })}
          placeholder="Free text…"
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
          style={{ userSelect: 'text' }}
        />
      )
  }
}

// ── Default atoms for the "Add atom" buttons ──────────────────────────────────

const ADD_ATOM_DEFS: Array<{ label: string; atom: DraftAtom }> = [
  { label: 'Statement', atom: { kind: 'statement', key: 'you_are' } },
  { label: 'Player',    atom: { kind: 'player',    playerId: null } },
  { label: 'Character', atom: { kind: 'character', roleId: null } },
  { label: 'Team',      atom: { kind: 'team',      value: null } },
  { label: 'Yes / No',  atom: { kind: 'yesno',     value: false } },
  { label: 'Number',    atom: { kind: 'number',    value: 0 } },
  { label: 'Text',      atom: { kind: 'free_text', text: '' } },
]
