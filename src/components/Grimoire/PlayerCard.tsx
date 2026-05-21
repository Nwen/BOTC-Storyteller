import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useRoleById } from '@/hooks/useRolePool'
import { resolveRoleText } from '@/lib/roleResolution'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { CharacterPicker } from './CharacterPicker'
import { ReminderPicker } from './ReminderPicker'
import type { Player, ReminderToken } from '@/types'

interface Props {
  player: Player
  /** Called by drag handle interactions */
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?: boolean
  style?: React.CSSProperties
}

export function PlayerCard({ player, dragHandleProps, isDragging, style }: Props) {
  const {
    renamePlayer, removePlayer, setPlayerRole, setPlayerAlignment,
    killPlayer, revivePlayer, spendGhostVote, restoreGhostVote,
    setPlayerNotes, addReminderToken, removeReminderToken,
  } = useGameStore()

  const { editOverrides, locales, activeLocale } = useLibraryStore()

  const role = useRoleById(player.roleId)
  const resolved = role ? resolveRoleText(role, editOverrides, locales, activeLocale) : null

  const [showPicker, setShowPicker] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(player.name)
  const [showNotes, setShowNotes] = useState(false)

  const alignColor = player.alignment === 'evil'
    ? 'border-red-500'
    : player.alignment === 'good'
    ? 'border-blue-500'
    : 'border-gray-600'

  return (
    <>
      <div
        style={style}
        className={`
          bg-gray-900 rounded-xl border-2 ${alignColor} p-2 flex flex-col gap-1.5 select-none
          transition-all duration-100
          ${!player.isAlive ? 'opacity-60' : ''}
          ${isDragging ? 'shadow-2xl scale-105 z-50' : ''}
        `}
      >
        {/* Drag handle + name row */}
        <div className="flex items-center gap-1.5">
          <span
            {...dragHandleProps}
            className="text-gray-600 cursor-grab active:cursor-grabbing touch-none text-base leading-none px-0.5"
          >
            ⠿
          </span>
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
              className="flex-1 bg-gray-800 rounded px-1.5 py-0.5 text-sm outline-none border border-blue-500 min-w-0"
              style={{ userSelect: 'text' }}
            />
          ) : (
            <span
              className="flex-1 text-sm font-semibold truncate cursor-pointer"
              onPointerDown={(e) => { e.preventDefault(); setEditingName(true) }}
            >
              {player.name}
            </span>
          )}
          <button
            onPointerDown={(e) => { e.preventDefault(); removePlayer(player.id) }}
            className="text-gray-600 hover:text-red-400 text-xs px-1 shrink-0"
            title="Remove player"
          >
            ✕
          </button>
        </div>

        {/* Character token */}
        <button
          onPointerDown={(e) => { e.preventDefault(); setShowPicker(true) }}
          className="flex items-center gap-2 rounded-lg bg-gray-800 p-1.5 hover:bg-gray-700 active:bg-gray-700 text-left w-full min-h-[44px]"
        >
          {resolved ? (
            <>
              <CharacterIcon role={role!} size={36} className="shrink-0" />
              <span className="text-xs font-medium leading-tight">{resolved.displayName}</span>
            </>
          ) : (
            <span className="text-xs text-gray-500 px-1">Assign character…</span>
          )}
        </button>

        {/* Reminder tokens */}
        {player.reminders.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {player.reminders.map((token) => (
              <ReminderTokenBadge
                key={token.id}
                token={token}
                onRemove={() => removeReminderToken(player.id, token.id)}
              />
            ))}
          </div>
        )}

        {/* Notes preview */}
        {player.notes && !showNotes && (
          <p
            className="text-xs text-gray-500 italic truncate cursor-pointer"
            onPointerDown={(e) => { e.preventDefault(); setShowNotes(true) }}
          >
            📝 {player.notes}
          </p>
        )}
        {showNotes && (
          <textarea
            autoFocus
            value={player.notes}
            onChange={(e) => setPlayerNotes(player.id, e.target.value)}
            onBlur={() => setShowNotes(false)}
            className="text-xs bg-gray-800 rounded p-1.5 border border-gray-600 resize-none outline-none w-full"
            style={{ userSelect: 'text' }}
            rows={3}
          />
        )}

        {/* Action bar */}
        <div className="flex gap-1 flex-wrap">
          {/* Alive/dead */}
          {player.isAlive ? (
            <button
              onPointerDown={(e) => { e.preventDefault(); killPlayer(player.id) }}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-red-900 min-h-[32px]"
              title="Mark dead"
            >
              ☽ Kill
            </button>
          ) : (
            <>
              <button
                onPointerDown={(e) => { e.preventDefault(); revivePlayer(player.id) }}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-green-900 min-h-[32px]"
                title="Revive"
              >
                ✦ Revive
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault()
                  if (player.ghostVoteAvailable) spendGhostVote(player.id)
                  else restoreGhostVote(player.id)
                }}
                className={`text-xs px-2 py-1 rounded min-h-[32px] ${
                  player.ghostVoteAvailable ? 'bg-blue-900 hover:bg-blue-800' : 'bg-gray-800 text-gray-500'
                }`}
                title={player.ghostVoteAvailable ? 'Spend ghost vote' : 'Restore ghost vote'}
              >
                👻 {player.ghostVoteAvailable ? 'Vote' : 'Spent'}
              </button>
            </>
          )}

          {/* Alignment */}
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              const next = player.alignment === 'unknown' ? 'good' : player.alignment === 'good' ? 'evil' : 'unknown'
              setPlayerAlignment(player.id, next)
            }}
            className={`text-xs px-2 py-1 rounded min-h-[32px] ${
              player.alignment === 'good' ? 'bg-blue-900' :
              player.alignment === 'evil' ? 'bg-red-900' : 'bg-gray-700'
            }`}
            title="Cycle alignment"
          >
            {player.alignment === 'good' ? '😇' : player.alignment === 'evil' ? '😈' : '❓'}
          </button>

          {/* Reminder */}
          <button
            onPointerDown={(e) => { e.preventDefault(); setShowReminder(true) }}
            className="text-sm px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 min-h-[44px]"
            title="Add reminder token"
          >
            + Token
          </button>

          {/* Notes */}
          <button
            onPointerDown={(e) => { e.preventDefault(); setShowNotes(!showNotes) }}
            className={`text-xs px-2 py-1 rounded min-h-[32px] ${showNotes ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Notes"
          >
            📝
          </button>
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
    </>
  )
}

function ReminderTokenBadge({ token, onRemove }: Readonly<{ token: ReminderToken; onRemove: () => void }>) {
  const role = useRoleById(token.roleId)
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onRemove() }}
      className="text-xs bg-yellow-900/60 border border-yellow-700 text-yellow-300 rounded-full pl-0.5 pr-2 py-0.5 flex items-center gap-1 hover:bg-red-900/60 hover:border-red-700 hover:text-red-300 transition-colors"
      title="Tap to remove"
    >
      {role && <CharacterIcon role={role} size={18} className="shrink-0" />}
      {token.label}
      <span className="text-[10px]">×</span>
    </button>
  )
}
