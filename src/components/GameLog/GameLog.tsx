import { useGameStore } from '@/store/gameStore'

export function GameLog() {
  const { log, addLogEntry } = useGameStore()

  const exportLog = () => {
    const text = log
      .map((e) => `[Day ${e.day} ${e.phase}] ${e.text}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'botc-game-log.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-800 shrink-0 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Game Log</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const text = prompt('Add annotation:')
              if (text?.trim()) addLogEntry('annotation', text.trim())
            }}
            className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm min-h-[44px]"
          >
            + Annotation
          </button>
          <button
            onClick={exportLog}
            className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm min-h-[44px]"
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 scrollable p-4 space-y-1">
        {log.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No events yet.</p>
        )}
        {[...log].reverse().map((entry) => (
          <div
            key={entry.id}
            className={`flex gap-3 rounded px-3 py-2 text-sm ${kindStyle(entry.kind)}`}
          >
            <span className="text-gray-600 shrink-0 text-xs mt-0.5">
              D{entry.day} {entry.phase}
            </span>
            <span className="flex-1">{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function kindStyle(kind: string): string {
  switch (kind) {
    case 'execution':   return 'bg-red-900/40 text-red-300'
    case 'player_death': return 'bg-orange-900/30 text-orange-300'
    case 'nomination':  return 'bg-indigo-900/30 text-indigo-300'
    case 'phase_change': return 'bg-gray-800 text-gray-400'
    case 'annotation':  return 'bg-yellow-900/30 text-yellow-300'
    default:            return 'bg-gray-800 text-gray-300'
  }
}
