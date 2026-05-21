import { useState, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
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

type View = 'grimoire' | 'script' | 'night' | 'day' | 'library' | 'tools' | 'log'

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
  const [view, setView] = useState<View>('grimoire')
  const { phase, day, advancePhase } = useGameStore()
  const { activeLocale, locales } = useLibraryStore()

  useEffect(() => { void loadBundledLocales(); void loadBundledScripts() }, [])

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
            onClick={() => { if (id === 'night' && phase === 'setup') { advancePhase() } setView(id) }}
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

function phaseColor(phase: string): string {
  switch (phase) {
    case 'night': return 'bg-indigo-900 text-indigo-300'
    case 'dawn':  return 'bg-purple-900 text-purple-300'
    case 'day':   return 'bg-yellow-900 text-yellow-300'
    case 'dusk':  return 'bg-orange-900 text-orange-300'
    default:      return 'bg-gray-800 text-gray-400'
  }
}
