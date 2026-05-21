import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useRoleById, useRolePool } from '@/hooks/useRolePool'
import { resolveRoleText } from '@/lib/roleResolution'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { CharacterPicker } from './CharacterPicker'
import { ReminderPicker } from './ReminderPicker'
import type { Player } from '@/types'

interface Props {
  player: Player
  onClose: () => void
}

export function PlayerDetail({ player, onClose }: Props) {
  const {
    renamePlayer, removePlayer, setPlayerRole, setPlayerAlignment,
    killPlayer, revivePlayer, spendGhostVote, restoreGhostVote,
    setPlayerNotes, addReminderToken, removeReminderToken,
  } = useGameStore()

  const { editOverrides, locales, activeLocale } = useLibraryStore()
  const role = useRoleById(player.roleId)
  const resolved = role ? resolveRoleText(role, editOverrides, locales, activeLocale) : null
  const rolePool = useRolePool()

  const [showPicker, setShowPicker] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(player.name)

  const alignmentLabel =
    player.alignment === 'good' ? '😇 Good' :
    player.alignment === 'evil' ? '😈 Evil' : '❓ Unknown'

  const cycleAlignment = () => {
    const next = player.alignment === 'unknown' ? 'good' : player.alignment === 'good' ? 'evil' : 'unknown'
    setPlayerAlignment(player.id, next)
  }

  return (
    <div className="w-72 shrink-0 border-l border-gray-800 flex flex-col bg-gray-950">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
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

      <div className="flex-1 scrollable p-4 space-y-4">
        {/* Character */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Character</p>
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center gap-3 rounded-lg bg-gray-800 hover:bg-gray-700 p-3 text-left min-h-[56px]"
          >
            {resolved && role ? (
              <>
                <CharacterIcon role={role} size={44} className="shrink-0" />
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
            <p className="text-xs text-gray-500 mt-1.5 leading-snug">{resolved.displayAbility}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Status</p>
          <div className="flex flex-wrap gap-2">
            {player.isAlive ? (
              <button
                onClick={() => killPlayer(player.id)}
                className="px-3 py-2 rounded bg-gray-800 hover:bg-red-900 text-sm border border-gray-700 min-h-[40px]"
              >
                ☽ Kill
              </button>
            ) : (
              <>
                <button
                  onClick={() => revivePlayer(player.id)}
                  className="px-3 py-2 rounded bg-gray-800 hover:bg-green-900 text-sm border border-gray-700 min-h-[40px]"
                >
                  ✦ Revive
                </button>
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

            <button
              onClick={cycleAlignment}
              className={`px-3 py-2 rounded text-sm border min-h-[40px] ${
                player.alignment === 'good' ? 'bg-blue-900 border-blue-700' :
                player.alignment === 'evil' ? 'bg-red-900 border-red-700' :
                'bg-gray-800 border-gray-700'
              }`}
            >
              {alignmentLabel}
            </button>
          </div>
        </div>

        {/* Reminder tokens */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500">Reminders</p>
            <button
              onClick={() => setShowReminder(true)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add
            </button>
          </div>
          {player.reminders.length === 0 ? (
            <p className="text-xs text-gray-600">None.</p>
          ) : (
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
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Notes</p>
          <textarea
            value={player.notes}
            onChange={(e) => setPlayerNotes(player.id, e.target.value)}
            placeholder="Freeform notes…"
            rows={4}
            className="w-full bg-gray-800 rounded px-3 py-2 text-xs border border-gray-700 outline-none focus:border-blue-500 resize-none"
            style={{ userSelect: 'text' }}
          />
        </div>
      </div>

      <CharacterPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => setPlayerRole(player.id, id || null)}
        currentRoleId={player.roleId}
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
