import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useUiStore } from '@/store/uiStore'
import type { View } from '@/store/uiStore'
import { loadBundledLocales } from '@/lib/loadBundledLocales'
import { loadBundledScripts } from '@/lib/loadBundledScripts'
import { PresentationMode } from '@/components/PlayerInfo/PresentationMode'
import { Grimoire } from '@/components/Grimoire/Grimoire'
import { ScriptManager } from '@/components/ScriptManager/ScriptManager'
import { NightRunner } from '@/components/NightRunner/NightRunner'
import { DayPhase } from '@/components/DayPhase/DayPhase'
import { CharacterLibrary } from '@/components/CharacterLibrary/CharacterLibrary'
import { ToolsPanel } from '@/components/Tools/ToolsPanel'
import { GameLog } from '@/components/GameLog/GameLog'

interface NavItem {
  id: View
  label: string
  icon: string
}

const NAV: NavItem[] = [
  { id: 'grimoire', label: 'Grimoire',   icon: '🏰' },
  { id: 'script',   label: 'Script',     icon: '📖' },
  { id: 'night',    label: 'Night',      icon: '🌙' },
  { id: 'day',      label: 'Day',        icon: '☀️' },
  { id: 'library',  label: 'Library',    icon: '📚' },
  { id: 'tools',    label: 'Tools',      icon: '🔧' },
  { id: 'log',      label: 'Log',        icon: '📋' },
]

export default function App() {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const { phase, day } = useGameStore()
  const { activeLocale, locales } = useLibraryStore()

  useEffect(() => {
    void loadBundledLocales()
    void loadBundledScripts()
  }, [])

  const localeName = activeLocale === 'en' ? 'EN' : (locales[activeLocale]?.name ?? activeLocale)

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-wide text-gray-300">BotC Storyteller</span>
          <span className={`text-xs px-2 py-0.5 rounded ${phaseColor(phase)}`}>
            {phase.toUpperCase()}{day > 0 ? ` · Day ${day}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{localeName}</span>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex bg-gray-900 border-b border-gray-800 shrink-0 overflow-x-auto">
        {NAV.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 ${
              view === id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <FullscreenButton />
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {view === 'grimoire' && <Grimoire />}
        {view === 'script'   && <ScriptManager />}
        {view === 'night'    && <NightRunner />}
        {view === 'day'      && <DayPhase />}
        {view === 'library'  && <CharacterLibrary />}
        {view === 'tools'    && <ToolsPanel />}
        {view === 'log'      && <GameLog />}
      </main>

      {/* Global fullscreen overlay — rendered above everything */}
      <PresentationMode />
    </div>
  )
}

// Safari on iPad only has the prefixed Fullscreen API — and may still refuse the whole page
type WebkitDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void }
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void }

const fullscreenElement = () =>
  document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement ?? null

/** Launched from the home screen: no browser bar to hide */
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(() => fullscreenElement() !== null)
  // Where to anchor the "add to home screen" tip, when fullscreen isn't available
  const [tipAt, setTipAt] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    const onChange = () => setIsFullscreen(fullscreenElement() !== null)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  if (isStandalone()) return null

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const doc = document as WebkitDocument
    if (fullscreenElement()) {
      if (document.exitFullscreen) void document.exitFullscreen()
      else doc.webkitExitFullscreen?.()
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const showTip = () => setTipAt({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    const root = document.documentElement as WebkitElement
    try {
      if (root.requestFullscreen) void root.requestFullscreen().catch(() => {})
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen()
      else return showTip()   // e.g. iPad / iPhone Safari in mobile mode
    } catch {
      return showTip()
    }
    // Some browsers (iPad Safari) accept the call and silently do nothing
    setTimeout(() => { if (!fullscreenElement()) showTip() }, 600)
  }

  return (
    <>
      <button
        onClick={toggle}
        className="ml-auto shrink-0 px-4 py-3 text-gray-500 hover:text-gray-300 transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isFullscreen
            // corners pointing in
            ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            // corners pointing out
            : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
        </svg>
      </button>

      {tipAt && (
        // Fixed, outside the nav's horizontal scroll so it isn't clipped; any tap closes it
        <div className="fixed inset-0 z-50" onClick={() => setTipAt(null)}>
          <div
            className="absolute w-72 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300 shadow-xl"
            style={{ top: tipAt.top, right: tipAt.right }}
          >
            <p className="font-medium text-gray-100 mb-1">Fullscreen isn&rsquo;t available in this browser</p>
            <p className="mb-1.5">
              On iPad, try in <strong>Safari</strong>: other iOS browsers (Firefox, Chrome…) can&rsquo;t go fullscreen.
            </p>
            <p>
              Or tap <span className="whitespace-nowrap">Share <ShareIcon /></span> then{' '}
              <strong>Add to Home Screen</strong>, and open the app from its icon: it runs without the browser bar.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/** Safari's share glyph, so the tip matches what's on screen */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-1">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function phaseColor(phase: string): string {
  switch (phase) {
    case 'night': return 'bg-indigo-900 text-indigo-300'
    case 'dawn':  return 'bg-purple-900 text-purple-300'
    case 'day':   return 'bg-yellow-900 text-yellow-300'
    case 'dusk':  return 'bg-orange-900 text-orange-300'
    default:      return 'bg-gray-800 text-gray-400'
  }
}
