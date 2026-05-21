import { useCallback } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useRoleById } from '@/hooks/useRolePool'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import type { Player, ReminderToken } from '@/types'

interface Props {
  player: Player
  x: number
  y: number
  tokenSize: number
  isSelected: boolean
  hidden: boolean
  onSelect: () => void
}

const ALIGN_BORDER: Record<string, string> = {
  good: 'border-blue-400',
  evil: 'border-red-500',
  unknown: 'border-gray-600',
}

function zIndexForToken(isDragging: boolean, isSelected: boolean): number {
  if (isDragging) return 999
  if (isSelected) return 10
  return 1
}

export function PlayerToken({ player, x, y, tokenSize, isSelected, hidden, onSelect }: Readonly<Props>) {
  const role = useRoleById(player.roleId)
  const { editOverrides, locales, activeLocale } = useLibraryStore()
  const resolved = role ? resolveRoleText(role, editOverrides, locales, activeLocale) : null

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: player.id,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: player.id })

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDragRef(node)
      setDropRef(node)
    },
    [setDragRef, setDropRef],
  )

  const alignBorder = hidden ? 'border-gray-700' : (ALIGN_BORDER[player.alignment] ?? ALIGN_BORDER.unknown)
  const dimmed = player.isAlive ? '' : 'brightness-50'

  const dragStyle: React.CSSProperties = transform
    ? { translate: `${transform.x}px ${transform.y}px` }
    : {}

  const reminderSize = Math.max(26, tokenSize * 0.46)
  const orbitR = tokenSize / 2 + reminderSize / 2 + 4

  return (
    <div
      ref={setRef}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%)`,
        ...dragStyle,
        zIndex: zIndexForToken(isDragging, isSelected),
        transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
        width: tokenSize,
      }}
      {...attributes}
      {...listeners}
    >
      {/* Wrapper: positioning context for badges outside overflow-hidden */}
      <div className="relative" style={{ width: tokenSize, height: tokenSize }}>
        {/* Token circle */}
        <button
          onPointerDown={() => { /* DnD handles pointer; onClick fires on short taps */ }}
          onClick={(e) => { e.stopPropagation(); onSelect() }}
          className={`
            relative rounded-full border-2 select-none
            ${alignBorder}
            ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-950' : ''}
            ${isOver && !isDragging ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-950' : ''}
            ${isDragging ? 'opacity-70 scale-110 shadow-2xl' : ''}
            ${dimmed}
            overflow-hidden transition-transform duration-100 w-full h-full
          `}
          title={player.name}
        >
          {/* Role icon — hidden in hidden mode */}
          {hidden || !role ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500 font-bold"
              style={{ fontSize: tokenSize * 0.3 }}
            >
              {hidden ? '' : '?'}
            </div>
          ) : (
            <CharacterIcon role={role} fill />
          )}

          {/* Dead overlay */}
          {!player.isAlive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
              <span style={{ fontSize: tokenSize * 0.45 }}>💀</span>
            </div>
          )}
        </button>

        {/* Ghost vote dot — shown in both modes */}
        {!player.isAlive && player.ghostVoteAvailable && (
          <div
            className="absolute top-0 right-0 bg-blue-500 rounded-full border-2 border-gray-950 pointer-events-none"
            style={{ width: tokenSize * 0.28, height: tokenSize * 0.28 }}
            title="Ghost vote available"
          />
        )}

        {/* Orbital reminder tokens — hidden in hidden mode */}
        {!hidden && (() => {
          const gap = 4
          const nRight = Math.ceil(player.reminders.length / 2)
          const rightList = player.reminders.slice(0, nRight)
          const leftList  = player.reminders.slice(nRight)
          const cxRight = tokenSize / 2 + orbitR
          const cxLeft  = tokenSize / 2 - orbitR

          const columnY = (k: number, idx: number) => {
            const totalH = k * reminderSize + (k - 1) * gap
            return tokenSize / 2 - totalH / 2 + idx * (reminderSize + gap) + reminderSize / 2
          }

          return [
            ...rightList.map((token, i) => (
              <OrbitalReminder
                key={token.id} token={token} size={reminderSize}
                cx={cxRight} cy={columnY(nRight, i)} side="right"
              />
            )),
            ...leftList.map((token, i) => (
              <OrbitalReminder
                key={token.id} token={token} size={reminderSize}
                cx={cxLeft} cy={columnY(leftList.length, i)} side="left"
              />
            )),
          ]
        })()}
      </div>

      {/* Name label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
        style={{ top: tokenSize + 3, width: Math.max(tokenSize + 24, 72) }}
      >
        <span
          className={`inline-block text-white rounded px-1 leading-tight ${isSelected ? 'font-semibold' : 'font-medium'}`}
          style={{ fontSize: Math.max(10, tokenSize * 0.19), textShadow: '0 1px 3px #000, 0 0 8px #000' }}
        >
          {player.name}
        </span>
        {/* Character name — hidden in hidden mode */}
        {!hidden && resolved && (
          <span
            className="block text-gray-400 truncate"
            style={{ fontSize: Math.max(9, tokenSize * 0.16), textShadow: '0 1px 3px #000' }}
          >
            {resolved.displayName}
          </span>
        )}
      </div>

      {/* Seat number */}
      <div
        className="absolute bg-gray-900/70 text-gray-500 rounded-full flex items-center justify-center pointer-events-none"
        style={{
          top: -4,
          left: -4,
          width: Math.max(16, tokenSize * 0.28),
          height: Math.max(16, tokenSize * 0.28),
          fontSize: Math.max(9, tokenSize * 0.17),
        }}
      >
        {player.seatIndex + 1}
      </div>
    </div>
  )
}

export function tokenSizeForCount(n: number): number {
  if (n <= 10) return 72
  if (n <= 14) return 64
  return 52
}

function OrbitalReminder({ token, size, cx, cy, side }: Readonly<{ token: ReminderToken; size: number; cx: number; cy: number; side: 'left' | 'right' }>) {
  const role = useRoleById(token.roleId)
  const labelW = 52
  const labelLeft = side === 'right' ? cx + size / 2 + 3 : cx - size / 2 - labelW - 3
  return (
    <>
      <div
        className="absolute pointer-events-none rounded-full border border-yellow-600 bg-yellow-900/90 flex items-center justify-center"
        style={{ left: cx - size / 2, top: cy - size / 2, width: size, height: size }}
        title={token.label}
      >
        {role
          ? <CharacterIcon role={role} size={Math.round(size * 0.95)} />
          : <div className="text-yellow-300 font-bold" style={{ fontSize: size * 0.5 }}>★</div>
        }
      </div>
      <div
        className="absolute pointer-events-none leading-tight text-white"
        style={{
          left: labelLeft,
          top: cy - size / 2,
          width: labelW,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: side === 'right' ? 'flex-start' : 'flex-end',
          fontSize: Math.max(7, size * 0.4),
          textShadow: '0 1px 2px #000, 0 0 6px #000',
        }}
      >
        {token.label}
      </div>
    </>
  )
}
