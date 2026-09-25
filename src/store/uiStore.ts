import { create } from 'zustand'

export type View = 'grimoire' | 'script' | 'night' | 'day' | 'library' | 'tools' | 'log'
export type ToolsTab = 'info' | 'bluffs' | 'setup' | 'config' | 'notes'

/**
 * Navigation state, shared so that features can hand off to another view —
 * e.g. prefilling the info composer and jumping straight to Tools → Player Info.
 */
interface UiState {
  view: View
  toolsTab: ToolsTab
  setView: (view: View) => void
  setToolsTab: (tab: ToolsTab) => void
  /** Jump to Tools → Player Info (call after seeding the info composer draft) */
  goToPlayerInfo: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'tools',
  toolsTab: 'setup',
  setView: (view) => set({ view }),
  setToolsTab: (toolsTab) => set({ toolsTab }),
  goToPlayerInfo: () => set({ view: 'tools', toolsTab: 'info' }),
}))
