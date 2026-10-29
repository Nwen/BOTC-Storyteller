import { useMemo, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useInfoStore } from '@/store/infoStore'
import { useUiStore } from '@/store/uiStore'
import { useRoleById, useRolePool } from '@/hooks/useRolePool'
import { resolveRoleText } from '@/lib/roleResolution'
import { hasFacade, shownRoleId } from '@/lib/facadeRoles'
import { getTemplateForCharacter, expandTemplate, compositionToLogText } from '@/lib/infoResolution'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { CharacterPicker } from './CharacterPicker'
import { ReminderPicker } from './ReminderPicker'
import type { DraftAtom, Player } from '@/types'

interface Props {
  player: Player
  onClose: () => void
}

export function PlayerDetail({ player, onClose }: Props) {
  const {
    renamePlayer, removePlayer, setPlayerRole, setPlayerAlignment,
    killPlayer, revivePlayer, spendGhostVote, restoreGhostVote,
    addReminderToken, removeReminderToken, setPlayerFacadeRole,
    addLogEntry, players, bluffs,
  } = useGameStore()

  const { editOverrides, locales, activeLocale, customTemplates } = useLibraryStore()
  const openComposer = useInfoStore((s) => s.openComposer)
  const presentDraft = useInfoStore((s) => s.presentDraft)
  const goToPlayerInfo = useUiStore((s) => s.goToPlayerInfo)
  const role = useRoleById(player.roleId)
  const resolved = role ? resolveRoleText(role, editOverrides, locales, activeLocale) : null
  const rolePool = useRolePool()

  // What the player believes they are: the façade for a Drunk/Marionette, their real role otherwise
  const perceivedId = shownRoleId(player.roleId, player.facadeRoleId)
  const perceivedRole = useRoleById(perceivedId)
  const perceivedResolved = perceivedRole
    ? resolveRoleText(perceivedRole, editOverrides, locales, activeLocale)
    : null
  const template = perceivedId ? getTemplateForCharacter(perceivedId, customTemplates) : undefined

  const [showPicker, setShowPicker] = useState(false)
  const [showFacadePicker, setShowFacadePicker] = useState(false)
  const takenRoleIds = useMemo(
    () => new Set(players.flatMap((p) => (p.roleId ? [p.roleId] : []))),
    [players],
  )
  const [showReminder, setShowReminder] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(player.name)

  const [alignmentEmoji, alignmentName] =
    player.alignment === 'good' ? ['😇', 'Good'] :
    player.alignment === 'evil' ? ['😈', 'Evil'] : ['❓', 'Unknown']

  const cycleAlignment = () => {
    const next = player.alignment === 'unknown' ? 'good' : player.alignment === 'good' ? 'evil' : 'unknown'
    setPlayerAlignment(player.id, next)
  }

  const alignmentButton = (compact: boolean) => (
    <button
      onClick={cycleAlignment}
      title={compact ? alignmentName : undefined}
      className={`px-3 py-2 rounded text-sm border min-h-[40px] ${
        player.alignment === 'good' ? 'bg-blue-900 border-blue-700' :
        player.alignment === 'evil' ? 'bg-red-900 border-red-700' :
        'bg-gray-800 border-gray-700'
      }`}
    >
      {compact ? alignmentEmoji : `${alignmentEmoji} ${alignmentName}`}
    </button>
  )

  /** Show "YOU ARE <character>" to the player straight away, without the composer */
  const showYouAre = () => {
    if (!perceivedId) {
      setShowFacadePicker(true)
      return
    }
    const draft: DraftAtom[] = [
      { kind: 'statement', key: 'you_are' },
      { kind: 'character', roleId: perceivedId },
    ]
    presentDraft(draft)
    addLogEntry('info_reveal', `Showed info: ${compositionToLogText(draft, players, () => perceivedRole?.name ?? perceivedId)}`)
  }

  /** Show the Demon bluffs to the player straight away, without the composer */
  const showBluffs = () => {
    const draft: DraftAtom[] = [
      { kind: 'statement', key: 'demon_bluffs' },
      ...bluffs.map((roleId): DraftAtom => ({ kind: 'character', roleId })),
    ]
    presentDraft(draft)
    const roleName = (id: string) => rolePool.find((r) => r.id === id)?.name ?? id
    addLogEntry('info_reveal', `Showed info: ${compositionToLogText(draft, players, roleName)}`)
  }

  const showsBluffs = role?.team === 'demon'
  const showButtonCount = 1 + Number(showsBluffs) + Number(!!template)

  /** Load this character's info template into the composer and jump to it */
  const prepareInfo = () => {
    if (!template) return
    openComposer({ draft: expandTemplate(template), templateId: template.id })
    goToPlayerInfo()
  }

  return (
    <div className="shrink-0 max-h-[40%] border-t border-gray-800 flex flex-col bg-gray-950">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-800">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => { renamePlayer(player.id, nameValue || player.name); setEditingName(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { renamePlayer(player.id, nameValue || player.name); setEditingName(false) }
              if (e.key === 'Escape') { setNameValue(player.name); setEditingName(false) }
            }}
            className="flex-1 bg-gray-800 rounded px-2 py-1 text-sm outline-none border border-blue-500 mr-2"
            style={{ userSelect: 'text' }}
          />
        ) : (
          <button
            className="font-semibold text-base text-left hover:text-blue-300 flex-1 truncate"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {player.name}
          </button>
        )}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => { removePlayer(player.id); onClose() }}
            className="text-gray-600 hover:text-red-400 px-2 py-1 rounded text-sm"
            title="Remove player"
          >
            🗑
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white px-2 py-1 rounded text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto flex items-start gap-5 px-4 py-3">
        {/* Character */}
        <div className="flex-[1.4] min-w-56">
          <p className="text-xs text-gray-500 mb-1.5">Character</p>
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center gap-3 rounded-lg bg-gray-800 hover:bg-gray-700 p-3 text-left min-h-[56px]"
          >
            {resolved && role ? (
              <>
                <CharacterIcon role={role} alignment={player.alignment} size={44} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{resolved.displayName}</p>
                  <TeamBadge team={role.team} />
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">Assign character…</span>
            )}
          </button>
          {resolved && (
            <p className="text-xs text-gray-500 mt-1.5 leading-snug line-clamp-3" title={resolved.displayAbility}>{resolved.displayAbility}</p>
          )}
        </div>

        {/* Façade */}
        {hasFacade(player.roleId) && (
          <div className="flex-1 min-w-40">
            <p className="text-xs text-gray-500 mb-1.5">Thinks they are</p>
            <button
              onClick={() => setShowFacadePicker(true)}
              className="w-full flex items-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 p-2 text-left border border-dashed border-gray-600"
            >
              {perceivedResolved && perceivedRole ? (
                <>
                  <CharacterIcon role={perceivedRole} size={28} className="shrink-0" />
                  <span className="text-sm truncate">{perceivedResolved.displayName}</span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Pick the façade character…</span>
              )}
            </button>
          </div>
        )}

        {/* Status */}
        <div className="shrink-0">
          <p className="text-xs text-gray-500 mb-1.5">Status</p>
          <div className="flex flex-col items-stretch gap-2">
            {player.isAlive ? (
              <>
                <button
                  onClick={() => killPlayer(player.id)}
                  className="px-3 py-2 rounded bg-gray-800 hover:bg-red-900 text-sm border border-gray-700 min-h-[40px]"
                >
                  ☽ Kill
                </button>
                {alignmentButton(false)}
              </>
            ) : (
              <>
                {/* Dead: alignment shrinks to its emoji, beside Revive */}
                <div className="flex gap-2">
                  {alignmentButton(true)}
                  <button
                    onClick={() => revivePlayer(player.id)}
                    className="flex-1 px-3 py-2 rounded bg-gray-800 hover:bg-green-900 text-sm border border-gray-700 min-h-[40px]"
                  >
                    ✦ Revive
                  </button>
                </div>
                <button
                  onClick={() => player.ghostVoteAvailable ? spendGhostVote(player.id) : restoreGhostVote(player.id)}
                  className={`px-3 py-2 rounded text-sm border min-h-[40px] ${
                    player.ghostVoteAvailable
                      ? 'bg-blue-900 border-blue-700 hover:bg-blue-800'
                      : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  👻 {player.ghostVoteAvailable ? 'Vote available' : 'Vote spent'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Show to player — one column of buttons, or two rows once there are 3 */}
        <div className="shrink-0">
          <p className="text-xs text-gray-500 mb-1.5">Show to player</p>
          <div className={showButtonCount > 2 ? 'grid grid-rows-2 grid-flow-col gap-2' : 'flex flex-col items-stretch gap-2'}>
            <button
              onClick={showYouAre}
              disabled={!player.roleId}
              className="px-3 py-2 rounded bg-indigo-800 hover:bg-indigo-700 border border-indigo-600 text-sm text-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
              title={
                perceivedResolved
                  ? `Show "YOU ARE ${perceivedResolved.displayName}"`
                  : 'Pick the façade character first'
              }
            >
              👁 Role
            </button>
            {/* Not the Lunatic: its made-up bluffs come from the lunatic_info template */}
            {showsBluffs && (
              <button
                onClick={showBluffs}
                disabled={bluffs.length === 0}
                className="px-3 py-2 rounded bg-red-900 hover:bg-red-800 border border-red-700 text-sm text-red-100 disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
                title={bluffs.length > 0 ? 'Show the Demon bluffs' : 'Set the Demon bluffs first'}
              >
                🎭 Bluffs
              </button>
            )}
            {template && (
              <button
                onClick={prepareInfo}
                className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm min-h-[40px]"
                title={`Load the ${perceivedResolved?.displayName ?? ''} info template`}
              >
                📋 Info
              </button>
            )}
          </div>
        </div>

        {/* Reminder tokens */}
        <div className="flex-1 min-w-44">
          <p className="text-xs text-gray-500 mb-1.5">Reminders</p>
          <div className="flex flex-wrap gap-1.5">
            {player.reminders.map((token) => {
              const sourceRole = token.roleId !== '_custom'
                ? rolePool.find((r) => r.id === token.roleId)
                : undefined
              return (
                <button
                  key={token.id}
                  onClick={() => removeReminderToken(player.id, token.id)}
                  className="flex items-center gap-1 text-xs bg-yellow-900/50 border border-yellow-700 text-yellow-300 rounded-full pl-1 pr-2 py-1 hover:bg-red-900/50 hover:border-red-700 hover:text-red-300 transition-colors"
                  title="Tap to remove"
                >
                  {sourceRole && (
                    <CharacterIcon role={sourceRole} size={16} className="rounded-full shrink-0" />
                  )}
                  {token.label} ×
                </button>
              )
            })}
            {/* Same pill shape as a reminder, so it reads as "the next one" */}
            <button
              onClick={() => setShowReminder(true)}
              className="flex items-center gap-1 text-xs bg-blue-900/50 border border-blue-700 text-blue-200 rounded-full px-2.5 py-1 min-h-[26px] hover:bg-blue-800 transition-colors"
            >
              + Add
            </button>
          </div>
        </div>

      </div>

      <CharacterPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => setPlayerRole(player.id, id || null)}
        currentRoleId={player.roleId}
      />
      <CharacterPicker
        open={showFacadePicker}
        onClose={() => setShowFacadePicker(false)}
        onSelect={(id) => setPlayerFacadeRole(player.id, id || null)}
        currentRoleId={player.facadeRoleId ?? null}
        takenRoleIds={takenRoleIds}
      />
      <ReminderPicker
        open={showReminder}
        onClose={() => setShowReminder(false)}
        onSelect={(roleId, label) =>
          addReminderToken(player.id, { roleId, label, custom: roleId === '_custom' })
        }
      />
    </div>
  )
}
