import { useEffect, useState } from 'react'
import { useInfoStore } from '@/store/infoStore'
import { AtomRenderer } from './AtomRenderer'
import type { DraftAtom } from '@/types'

export function PresentationMode() {
  const { isPresenting, draft, endPresentation, closeComposer } = useInfoStore()
  const [rotated, setRotated] = useState(false)

  // Kiosk lock: absorb back navigation and keyboard shortcuts
  useEffect(() => {
    if (!isPresenting) return
    history.pushState(null, '', location.href)
    const onPopState = () => history.pushState(null, '', location.href)
    const onKeyDown = (e: KeyboardEvent) => e.preventDefault()
    globalThis.addEventListener('popstate', onPopState)
    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      globalThis.removeEventListener('popstate', onPopState)
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isPresenting])

  useEffect(() => {
    if (isPresenting) setRotated(false)
  }, [isPresenting])

  const handleClose = () => {
    endPresentation()
    closeComposer()
  }

  if (!isPresenting) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col select-none touch-none">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-end px-4 py-3 shrink-0 gap-3">
          <button
            onClick={() => setRotated((r) => !r)}
            aria-label="Rotate"
            title="Rotate"
            className="w-14 h-14 rounded-full flex items-center justify-center text-3xl text-gray-400 hover:text-gray-200 bg-gray-900 border border-gray-700"
          >
            ↻
          </button>
          <button
            onClick={handleClose}
            aria-label="Close"
            title="Close"
            className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-bold text-red-500 hover:text-red-400 bg-gray-900 hover:bg-red-950 border border-red-800"
          >
            ✕
          </button>
        </div>

        <div
          className={`flex-1 flex flex-col items-center justify-center gap-6 p-8 overflow-auto transition-transform duration-300 ${rotated ? 'rotate-180' : ''}`}
        >
          {groupCharacters(draft).map((group) =>
            group.atoms.length === 1 ? (
              <AtomRenderer key={group.start} atom={group.atoms[0]!} size="full" />
            ) : (
              <CharacterGroup key={group.start} atoms={group.atoms} />
            ),
          )}
        </div>
      </div>
    </div>
  )
}

/** Consecutive character atoms (e.g. the three Demon bluffs) are laid out together */
function groupCharacters(atoms: DraftAtom[]): Array<{ start: number; atoms: DraftAtom[] }> {
  const groups: Array<{ start: number; atoms: DraftAtom[] }> = []
  atoms.forEach((atom, i) => {
    const last = groups[groups.length - 1]
    if (atom.kind === 'character' && last?.atoms[0]?.kind === 'character') last.atoms.push(atom)
    else groups.push({ start: i, atoms: [atom] })
  })
  return groups
}

/** Two per row; an odd one out is centred below, so three make a triangle */
function CharacterGroup({ atoms }: Readonly<{ atoms: DraftAtom[] }>) {
  const rows: DraftAtom[][] = []
  for (let i = 0; i < atoms.length; i += 2) rows.push(atoms.slice(i, i + 2))
  return (
    <div className="flex flex-col items-center gap-6">
      {rows.map((row, r) => (
        <div key={r} className="flex justify-center gap-12 md:gap-20">
          {row.map((atom, i) => (
            <AtomRenderer key={i} atom={atom} size="grouped" />
          ))}
        </div>
      ))}
    </div>
  )
}
