import { useState, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { LoadedScript, Player } from '@/types'
import { TownSquare } from './TownSquare'

export function Grimoire() {
  const { players, phase, script, addPlayer, randomizeRoles } = useGameStore()
  const [newName, setNewName] = useState('')
  const [hidden, setHidden] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    addPlayer(name)
    setNewName('')
    inputRef.current?.focus()
  }

  const alive = players.filter((p) => p.isAlive).length
  const dead = players.length - alive

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Grimoire</h2>
            <p className="text-sm text-gray-500">
              {players.length} players — {alive} alive
              {dead > 0 && <span className="text-gray-600">, {dead} dead</span>}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-600 hidden sm:block">
              Tap a token to select · Long-press to drag
            </span>

            {/* Random role assignment — setup only */}
            {phase === 'setup' && (
              <RandomButton players={players} script={script} onRandom={randomizeRoles} />
            )}

            {/* Hide / show toggle */}
            <button
              onClick={() => setHidden((h) => !h)}
              className={`px-3 py-2 rounded text-sm font-medium min-h-[44px] border transition-colors ${
                hidden
                  ? 'bg-yellow-800 border-yellow-600 text-yellow-200 hover:bg-yellow-700'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
              title={hidden ? 'Show roles & alignment' : 'Hide roles & alignment'}
            >
              {hidden ? '👁 Show' : '🙈 Hide'}
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder="Player name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              className="bg-gray-800 rounded px-3 py-2 text-sm outline-none border border-gray-700 focus:border-blue-500 w-36"
              style={{ userSelect: 'text' }}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium min-h-[44px]"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Town square */}
      <div className="flex-1 overflow-hidden">
        {players.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-500">
              <p className="text-5xl mb-4">🏰</p>
              <p className="text-lg">No players yet.</p>
              <p className="text-sm mt-1">Add players above to begin.</p>
            </div>
          </div>
        ) : (
          <TownSquare players={players} hidden={hidden} />
        )}
      </div>
    </div>
  )
}

function RandomButton({ players, script, onRandom }: Readonly<{
  players: Player[]
  script: LoadedScript | null
  onRandom: () => void
}>) {
  const canRandom = script !== null && players.length >= 5
  let title = 'Randomly assign roles by team composition'
  if (script === null) title = 'Load a script first'
  else if (players.length < 5) title = 'Need at least 5 players'

  return (
    <button
      onClick={onRandom}
      disabled={!canRandom}
      className="px-3 py-2 rounded text-sm font-medium min-h-[44px] border bg-purple-900 border-purple-700 text-purple-200 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed"
      title={title}
    >
      🎲 Random
    </button>
  )
}
