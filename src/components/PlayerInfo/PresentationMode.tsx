import { useEffect, useState } from 'react'
import { useInfoStore } from '@/store/infoStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useGameStore } from '@/store/gameStore'
import { compositionToLogText, getAllTemplates } from '@/lib/infoResolution'
import { ROLE_MAP } from '@/lib/scriptImport'
import { AtomRenderer } from './AtomRenderer'

export function PresentationMode() {
  const {
    isPresenting, presentationPhase, draft, templateId,
    revealPresentation, endPresentation, closeComposer,
  } = useInfoStore()

  const { players, addLogEntry } = useGameStore()
  const { customTemplates, customRoles } = useLibraryStore()
  const [rotated, setRotated] = useState(false)

  const templates = getAllTemplates(customTemplates)
  const templateLabel = templateId ? (templates.find((t) => t.id === templateId)?.label ?? null) : null

  const getRoleName = (id: string): string => {
    const custom = customRoles.find((r) => r.id === id)
    return custom?.name ?? ROLE_MAP.get(id)?.name ?? id
  }

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

  const handleReveal = () => {
    revealPresentation()
    const summary = compositionToLogText(draft, players, getRoleName)
    const templatePart = templateLabel ? `[${templateLabel}] ` : ''
    addLogEntry('info_reveal', `Showed info: ${templatePart}${summary}`)
  }

  const handleClose = () => {
    endPresentation()
    closeComposer()
  }

  if (!isPresenting) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col select-none touch-none">
      {presentationPhase === 'covering' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
          {templateLabel && (
            <p className="text-sm text-gray-500">{templateLabel}</p>
          )}
          <button
            onClick={handleReveal}
            className="mt-4 px-10 py-5 rounded-2xl bg-blue-700 hover:bg-blue-600 text-xl font-bold active:scale-95 transition-transform"
          >
            Tap to reveal
          </button>
          <button
            onClick={endPresentation}
            className="text-sm text-gray-600 hover:text-gray-400 mt-4"
          >
            ← Back to composer
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-end px-4 py-3 shrink-0 gap-2">
            <button
              onClick={() => setRotated((r) => !r)}
              className="text-sm text-gray-500 hover:text-gray-300 px-4 py-2 rounded bg-gray-900 border border-gray-700"
            >
              ↕ Rotate
            </button>
            <button
              onClick={handleClose}
              className="text-sm font-medium px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300"
            >
              ✕ Close
            </button>
          </div>

          <div
            className={`flex-1 flex flex-col items-center justify-center gap-6 p-8 overflow-auto transition-transform duration-300 ${rotated ? 'rotate-180' : ''}`}
          >
            {draft.map((atom, i) => (
              <AtomRenderer key={`${atom.kind}-${i}`} atom={atom} size="full" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
