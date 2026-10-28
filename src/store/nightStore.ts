import { create } from 'zustand'

type NightType = 'first' | 'other'
type Updater<T> = T | ((prev: T) => T)

/**
 * Night runner progress, kept outside the component so it survives switching
 * views. Tied to the day it was started on: a new day starts a fresh night.
 */
interface NightState {
  /** The game day this progress belongs to; null before the runner is first opened */
  forDay: number | null
  nightType: NightType
  includeAll: boolean
  currentStep: number
  checked: ReadonlySet<number>

  setNightType: (type: NightType) => void
  setIncludeAll: (includeAll: boolean) => void
  setCurrentStep: (step: Updater<number>) => void
  setChecked: (checked: Updater<ReadonlySet<number>>) => void
  /** Start a fresh night for this day */
  resetForDay: (day: number) => void
}

const apply = <T,>(u: Updater<T>, prev: T): T =>
  typeof u === 'function' ? (u as (p: T) => T)(prev) : u

export const useNightStore = create<NightState>()((set) => ({
  forDay: null,
  nightType: 'first',
  includeAll: false,
  currentStep: 0,
  checked: new Set(),

  setNightType: (nightType) => set({ nightType }),
  setIncludeAll: (includeAll) => set({ includeAll }),
  setCurrentStep: (u) => set((s) => ({ currentStep: apply(u, s.currentStep) })),
  setChecked: (u) => set((s) => ({ checked: apply(u, s.checked) })),
  resetForDay: (day) =>
    set({ forDay: day, nightType: day === 0 ? 'first' : 'other', currentStep: 0, checked: new Set() }),
}))
