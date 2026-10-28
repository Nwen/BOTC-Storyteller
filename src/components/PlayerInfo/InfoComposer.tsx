import { useMemo, useState } from 'react'
import { useInfoStore } from '@/store/infoStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useGameStore } from '@/store/gameStore'
import { useAllResolvedRoles } from '@/hooks/useRoleResolution'
import { useDemonPlayerId, useMinionPlayerIds } from '@/hooks/useRolePool'
import { getAllTemplates, expandTemplateForGame, resolveStatement, resolveTemplateLabel, linkedCharacterIndex, fillOneOfPair, compositionToLogText } from '@/lib/infoResolution'
import { CharacterPicker } from '@/components/Grimoire/CharacterPicker'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { genericTeamIconUrl } from '@/lib/characterIcons'
import { AtomRenderer } from './AtomRenderer'
import ENGLISH_STATEMENTS from '@/data/statements.json'
import type { CharacterFilter, DraftAtom, InfoTemplate, RoleBase, Team } from '@/types'

const STATEMENT_KEYS = Object.keys(ENGLISH_STATEMENTS) as (keyof typeof ENGLISH_STATEMENTS)[]
/** Built-in templates not tied to one character, shown with their team's generic icon */
const TEMPLATE_TEAMS: Record<string, Team> = { demon_minions: 'minion', demon_info: 'demon', minion_info: 'minion' }

/** Teams to list first in the character picker for a slot's filter */
function filterTeams(filter: CharacterFilter | undefined): Team[] | undefined {
  if (filter?.team) return [filter.team]
  if (filter?.alignment === 'good') return ['townsfolk', 'outsider']
  if (filter?.alignment === 'evil') return ['minion', 'demon']
  return undefined
}

const TEAM_OPTIONS: Array<'good' | 'evil' | Team> = ['good', 'evil', 'townsfolk', 'outsider', 'minion', 'demon']

export function InfoComposer() {
  const {
    draft, templateId,
    closeComposer, updateAtom, addAtom, removeAtom, moveAtom,
    startPresentation,
  } = useInfoStore()

  const { locales, activeLocale, customStatements, customTemplates } = useLibraryStore()
  const { players, bluffs, script, addLogEntry } = useGameStore()
  const allRoles = useAllResolvedRoles()
  const demonPlayerId = useDemonPlayerId()
  const minionPlayerIds = useMinionPlayerIds()
  const [charPickerIndex, setCharPickerIndex] = useState<number | null>(null)
  const takenRoleIds = useMemo(
    () => new Set(players.flatMap((p) => (p.roleId ? [p.roleId] : []))),
    [players],
  )
  // A character shown as "YOU ARE …" is normally one not in play: list those first
  const pickerAtom = charPickerIndex !== null ? draft[charPickerIndex] : undefined
  const pickerAfter = charPickerIndex !== null ? draft[charPickerIndex - 1] : undefined
  const pickingYouAre = pickerAfter?.kind === 'statement' && pickerAfter.key === 'you_are'
  const templates = getAllTemplates(customTemplates)
  // Only offer templates for characters on the current script (plus general and custom ones)
  const shownTemplates = templates.filter((t) =>
    !script || !t.characterId || t.custom || script.roles.some((r) => r.id === t.characterId),
  )

  const templateIconRole = (t: InfoTemplate, label: string): RoleBase | undefined => {
    if (t.characterId) return allRoles.find((r) => r.id === t.characterId)
    const team = TEMPLATE_TEAMS[t.id]
    return team ? { id: t.id, name: label, team, image: genericTeamIconUrl(team) } : undefined
  }

  const currentTemplateLabel = templateId
    ? (templates.find((t) => t.id === templateId)?.label ?? null)
    : null

  const handleLoadTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    useInfoStore.getState().openComposer({
      draft: expandTemplateForGame(tpl, { bluffs, demonPlayerId, minionPlayerIds }),
      templateId: id,
    })
  }

  /** Picking a player also fills in the character linked to them with their real role */
  const handleAtomChange = (i: number, atom: DraftAtom) => {
    updateAtom(i, atom)
    if (atom.kind !== 'player' || !atom.playerId) return
    const roleId = players.find((p) => p.id === atom.playerId)?.roleId
    const role = roleId ? allRoles.find((r) => r.id === roleId) : undefined
    const pair = role ? fillOneOfPair(draft, i, role) : null
    if (pair) {
      for (const { index, atom: a } of pair) updateAtom(index, a)
      return
    }
    const charIndex = linkedCharacterIndex(draft, i)
    const charAtom = charIndex !== null ? draft[charIndex] : undefined
    if (roleId && charIndex !== null && charAtom?.kind === 'character') {
      updateAtom(charIndex, { ...charAtom, roleId })
    }
  }

  const handleShowToPlayer = () => {
    if (draft.length === 0) return
    startPresentation()
    const roleName = (id: string) => allRoles.find((r) => r.id === id)?.name ?? id
    const templatePart = currentTemplateLabel ? `[${currentTemplateLabel}] ` : ''
    addLogEntry('info_reveal', `Showed info: ${templatePart}${compositionToLogText(draft, players, roleName)}`)
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-700 overflow-hidden">

          {/* ── Left: composer ── */}
          <div className="flex-1 scrollable p-4 space-y-5 min-w-0">

            {/* Template loader */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Load template{currentTemplateLabel && <span className="text-blue-400 ml-1">— {currentTemplateLabel}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {shownTemplates.map((t) => {
                  const label = resolveTemplateLabel(t, locales, activeLocale)
                  const iconRole = templateIconRole(t, label)
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleLoadTemplate(t.id)}
                      className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 min-h-[44px] rounded-lg text-sm border transition-colors ${
                        t.id === templateId
                          ? 'bg-blue-800 border-blue-600 text-blue-200'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      {iconRole && <CharacterIcon role={iconRole} size={32} className="shrink-0" />}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Atom list */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Atoms</label>
              {draft.length === 0 && (
                <p className="text-sm text-gray-600 italic py-2">No atoms yet — load a template or add below.</p>
              )}
              <div className="space-y-2">
                {draft.map((atom, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveAtom(i, Math.max(0, i - 1))}
                        disabled={i === 0}
                        className="w-10 h-8 rounded bg-gray-700/60 text-gray-400 hover:text-white disabled:opacity-30 text-sm leading-none"
                      >▲</button>
                      <button
                        onClick={() => moveAtom(i, Math.min(draft.length - 1, i + 1))}
                        disabled={i === draft.length - 1}
                        className="w-10 h-8 rounded bg-gray-700/60 text-gray-400 hover:text-white disabled:opacity-30 text-sm leading-none"
                      >▼</button>
                    </div>

                    {/* Editor */}
                    <div className="flex-1 min-w-0">
                      <AtomEditor
                        atom={atom}
                        onChange={(a) => handleAtomChange(i, a)}
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
                      className="w-11 h-11 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-700 shrink-0 text-lg"
                      title="Remove atom"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add atom buttons */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Add atom</label>
              <div className="flex flex-wrap gap-2">
                {ADD_ATOM_DEFS.map(({ label, atom }) => (
                  <button
                    key={label}
                    onClick={() => addAtom(atom)}
                    className="px-4 py-2 min-h-[44px] rounded-lg text-sm bg-gray-800 border border-gray-700 hover:bg-gray-700"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: preview ── */}
          <div className="lg:w-80 p-4 shrink-0">
            <label className="text-sm text-gray-400 mb-2 block">Preview</label>
            <div className="bg-gray-950 rounded-lg p-3 space-y-3 min-h-[120px] flex flex-col items-center justify-center">
              {draft.length === 0
                ? <p className="text-sm text-gray-600 italic">Empty composition</p>
                : draft.map((a, i) => <AtomRenderer key={i} atom={a} size="preview" />)
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 shrink-0">
          <button
            onClick={closeComposer}
            className="px-5 py-3 min-h-[48px] rounded-lg bg-gray-800 hover:bg-gray-700 text-base"
          >
            Clear
          </button>
          <button
            onClick={handleShowToPlayer}
            disabled={draft.length === 0}
            className="px-6 py-3 min-h-[48px] rounded-lg bg-blue-700 hover:bg-blue-600 text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
        takenRoleIds={pickingYouAre ? takenRoleIds : undefined}
        preferredTeams={pickerAtom?.kind === 'character' ? filterTeams(pickerAtom.filter) : undefined}
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
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-base outline-none focus:border-blue-500"
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
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-base outline-none focus:border-blue-500"
        >
          <option value="">— pick player —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (seat {p.seatIndex + 1})</option>
          ))}
        </select>
      )

    case 'character': {
      const role = atom.roleId ? allRoles.find((r) => r.id === atom.roleId) : null
      const filterLabel = atom.filter?.team ?? atom.filter?.alignment
        ? ` (${atom.filter.team ?? atom.filter.alignment})` : ''
      return (
        <button
          onClick={onPickCharacter}
          className="w-full text-left bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-base hover:bg-gray-600"
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
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-base outline-none focus:border-blue-500"
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
            className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-base font-bold ${atom.value ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            YES
          </button>
          <button
            onClick={() => onChange({ ...atom, value: false })}
            className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-base font-bold ${!atom.value ? 'bg-red-800 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
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
            className="w-11 h-11 rounded-lg bg-gray-700 hover:bg-gray-600 text-xl disabled:opacity-30"
          >−</button>
          <span className="flex-1 text-center text-xl font-bold">{atom.value}</span>
          <button
            onClick={() => onChange({ ...atom, value: Math.min(max, atom.value + 1) })}
            disabled={atom.value >= max}
            className="w-11 h-11 rounded-lg bg-gray-700 hover:bg-gray-600 text-xl disabled:opacity-30"
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
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-base outline-none focus:border-blue-500"
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
