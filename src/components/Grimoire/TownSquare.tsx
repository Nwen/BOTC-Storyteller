import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import { useGameStore } from '@/store/gameStore'
import { executionThreshold } from '@/lib/voteLogic'
import { PlayerToken, tokenSizeForCount } from './PlayerToken'
import { PlayerDetail } from './PlayerDetail'
import { BluffDisplay } from './BluffDisplay'
import type { Player } from '@/types'

function seatPositions(n: number, radiusPct = 38): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    return {
      x: 50 + radiusPct * Math.cos(angle),
      y: 50 + radiusPct * Math.sin(angle),
    }
  })
}

interface Props {
  players: Player[]
  hidden: boolean
}

export function TownSquare({ players, hidden }: Props) {
  const { reorderPlayers } = useGameStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  const n = players.length
  // The circle shrinks when the detail panel is open: keep tokens from overlapping
  const circleRef = useRef<HTMLDivElement>(null)
  const diameter = useElementWidth(circleRef)
  const tokenSize = tokenSizeForDiameter(n, diameter)
  const positions = seatPositions(n)

  const handleDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      setDraggingId(String(event.active.id))
    },
    [],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      const ids = players.map((p) => p.id)
      const aIdx = ids.indexOf(String(active.id))
      const bIdx = ids.indexOf(String(over.id))
      if (aIdx < 0 || bIdx < 0) return
      ;[ids[aIdx], ids[bIdx]] = [ids[bIdx], ids[aIdx]]
      reorderPlayers(ids)
    },
    [players, reorderPlayers],
  )

  // Close detail panel when hidden mode is active
  const selectedPlayer = hidden ? null : (players.find((p) => p.id === selectedId) ?? null)
  const draggingPlayer = players.find((p) => p.id === draggingId) ?? null

  // Stats for hidden-mode centre
  const living = players.filter((p) => p.isAlive).length
  const dead = players.length - living
  const threshold = executionThreshold(players)
  const ghostVotes = players.filter((p) => !p.isAlive && p.ghostVoteAvailable).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Circle area — a size container, so the circle fits whatever room the detail panel leaves */}
      <div
        className="flex-1 flex items-center justify-center min-h-0 p-4"
        style={{ containerType: 'size' }}
        onClick={() => setSelectedId(null)}
      >
        <div className="relative">
          <div
            ref={circleRef}
            className="relative mx-auto"
            style={{ width: 'min(100cqw, 100cqh)', aspectRatio: '1 / 1' }}
          >
            {/* Decorative ring */}
            <div
              className="absolute rounded-full border border-gray-700/40 pointer-events-none"
              style={{ inset: `${50 - 38}% ${50 - 38}%` }}
            />
            <div
              className="absolute rounded-full border border-gray-800/30 pointer-events-none"
              style={{ inset: '42%' }}
            />

            {/* Centre content: bluffs normally, execution info when hidden */}
            {hidden ? (
              <ExecutionInfo
                threshold={threshold}
                living={living}
                dead={dead}
                ghostVotes={ghostVotes}
              />
            ) : (
              <BluffDisplay />
            )}

            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {players.map((player, i) => {
                const pos = positions[i]!
                return (
                  <PlayerToken
                    key={player.id}
                    player={player}
                    x={pos.x}
                    y={pos.y}
                    tokenSize={tokenSize}
                    isSelected={player.id === selectedId}
                    hidden={hidden}
                    onSelect={() =>
                      setSelectedId((prev) => (prev === player.id ? null : player.id))
                    }
                  />
                )
              })}

              <DragOverlay dropAnimation={null}>
                {draggingPlayer ? (
                  <div
                    className="rounded-full border-2 border-white shadow-2xl opacity-80 overflow-hidden"
                    style={{ width: tokenSize, height: tokenSize }}
                  >
                    <div className="w-full h-full bg-blue-600/40 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {draggingPlayer.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Detail panel — suppressed while hidden */}
      {selectedPlayer && (
        <PlayerDetail
          key={selectedPlayer.id}
          player={selectedPlayer}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function useElementWidth(ref: React.RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** The usual size for this many players, capped so neighbouring seats keep some room */
function tokenSizeForDiameter(n: number, diameter: number | null): number {
  const base = tokenSizeForCount(n)
  if (!diameter || n < 2) return base
  const seatGap = 2 * (diameter * 0.38) * Math.sin(Math.PI / n)   // chord between two seats
  return Math.round(Math.max(36, Math.min(base, seatGap * 0.62)))
}

interface ExecutionInfoProps {
  threshold: number
  living: number
  dead: number
  ghostVotes: number
}

function ExecutionInfo({ threshold, living, dead, ghostVotes }: ExecutionInfoProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
      }}
    >
      <div className="flex flex-col items-center gap-2 text-center select-none">
        {/* Votes needed — most prominent */}
        <div className="flex flex-col items-center">
          <span
            className="font-bold text-white tabular-nums"
            style={{ fontSize: 'clamp(1.5rem, 4cqi, 2.5rem)', lineHeight: 1 }}
          >
            {threshold}
          </span>
          <span className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
            votes to execute
          </span>
        </div>

        {/* Divider */}
        <div className="w-12 border-t border-gray-700" />

        {/* Living / dead */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-400">
            <span className="text-white font-semibold">{living}</span> alive
          </span>
          {dead > 0 && (
            <span className="text-xs text-gray-500">
              <span className="text-gray-300 font-semibold">{dead}</span> dead
              {ghostVotes > 0 && (
                <span className="text-blue-400">
                  {' '}·{' '}
                  <span className="font-semibold">{ghostVotes}</span> ghost vote{ghostVotes !== 1 ? 's' : ''}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
