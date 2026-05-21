import { create } from 'zustand'
import type { DraftAtom } from '@/types'

interface InfoState {
  isOpen: boolean
  draft: DraftAtom[]
  templateId: string | null

  isPresenting: boolean
  presentationPhase: 'covering' | 'revealed'

  openComposer: (opts?: { draft?: DraftAtom[]; templateId?: string }) => void
  closeComposer: () => void
  setDraft: (atoms: DraftAtom[]) => void
  updateAtom: (index: number, atom: DraftAtom) => void
  addAtom: (atom: DraftAtom) => void
  removeAtom: (index: number) => void
  moveAtom: (from: number, to: number) => void

  startPresentation: () => void
  revealPresentation: () => void
  endPresentation: () => void
}

export const useInfoStore = create<InfoState>()((set) => ({
  isOpen: false,
  draft: [],
  templateId: null,
  isPresenting: false,
  presentationPhase: 'covering',

  openComposer: (opts) =>
    set({
      isOpen: true,
      draft: opts?.draft ?? [],
      templateId: opts?.templateId ?? null,
    }),

  closeComposer: () =>
    set({ isOpen: false, draft: [], templateId: null }),

  setDraft: (atoms) => set({ draft: atoms }),

  updateAtom: (index, atom) =>
    set((s) => {
      const next = [...s.draft]
      next[index] = atom
      return { draft: next }
    }),

  addAtom: (atom) => set((s) => ({ draft: [...s.draft, atom] })),

  removeAtom: (index) =>
    set((s) => ({ draft: s.draft.filter((_, i) => i !== index) })),

  moveAtom: (from, to) =>
    set((s) => {
      const next = [...s.draft]
      const [item] = next.splice(from, 1)
      if (item !== undefined) next.splice(to, 0, item)
      return { draft: next }
    }),

  startPresentation: () =>
    set({ isPresenting: true, presentationPhase: 'covering' }),

  revealPresentation: () => set({ presentationPhase: 'revealed' }),

  endPresentation: () =>
    set({ isPresenting: false, presentationPhase: 'covering' }),
}))
