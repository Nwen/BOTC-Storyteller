import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/lib/nanoid'
import type { LibraryState, RoleBase, RoleTextOverride, LocaleData, InfoTemplate, LoadedScript } from '@/types'

interface LibraryActions {
  // Custom roles
  addCustomRole: (role: RoleBase) => void
  updateCustomRole: (id: string, updates: Partial<RoleBase>) => void
  removeCustomRole: (id: string) => void

  // Edit overrides (English layer)
  setEditOverride: (id: string, override: RoleTextOverride) => void
  clearEditOverride: (id: string) => void

  // Locale management
  importLocale: (locale: LocaleData) => void
  deleteLocale: (localeKey: string) => void
  setActiveLocale: (localeKey: string) => void

  // Custom templates
  addCustomTemplate: (template: Omit<InfoTemplate, 'id' | 'custom'>) => void
  updateCustomTemplate: (id: string, updates: Partial<Omit<InfoTemplate, 'id'>>) => void
  removeCustomTemplate: (id: string) => void

  // Custom statement phrases
  setCustomStatement: (key: string, text: string) => void
  removeCustomStatement: (key: string) => void

  // Bundled scripts (loaded from public/scripts/ at startup)
  addBundledScript: (script: LoadedScript) => void

  // Bulk export / import
  exportLibrary: () => string
  importLibrary: (json: string) => void
}

const defaultState: LibraryState = {
  customRoles: [],
  editOverrides: {},
  locales: {},
  activeLocale: 'en',
  customTemplates: [],
  customStatements: {},
  bundledScripts: [],
}

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  persist(
    (set, get) => ({
      ...defaultState,

      addCustomRole: (role) =>
        set((s) => ({ customRoles: [...s.customRoles, { ...role, custom: true }] })),

      updateCustomRole: (id, updates) =>
        set((s) => ({
          customRoles: s.customRoles.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      removeCustomRole: (id) =>
        set((s) => ({ customRoles: s.customRoles.filter((r) => r.id !== id) })),

      setEditOverride: (id, override) =>
        set((s) => ({ editOverrides: { ...s.editOverrides, [id]: { ...s.editOverrides[id], ...override } } })),

      clearEditOverride: (id) =>
        set((s) => {
          const next = { ...s.editOverrides }
          delete next[id]
          return { editOverrides: next }
        }),

      importLocale: (incoming) => {
        set((s) => {
          const key = incoming.locale
          const existing = s.locales[key] ?? { locale: key, name: incoming.name, roles: {} }
          return {
            locales: {
              ...s.locales,
              [key]: {
                ...existing,
                name: incoming.name,
                roles: { ...existing.roles, ...incoming.roles },
                ...(incoming.teams      ? { teams:      { ...existing.teams,      ...incoming.teams      } } : {}),
                ...(incoming.statements ? { statements: { ...existing.statements, ...incoming.statements } } : {}),
                ...(incoming.yesno      ? { yesno:      { ...existing.yesno,      ...incoming.yesno      } } : {}),
                ...(incoming.templates  ? { templates:  { ...existing.templates,  ...incoming.templates  } } : {}),
              },
            },
          }
        })
      },

      deleteLocale: (key) =>
        set((s) => {
          const next = { ...s.locales }
          delete next[key]
          return {
            locales: next,
            activeLocale: s.activeLocale === key ? 'en' : s.activeLocale,
          }
        }),

      setActiveLocale: (key) => set({ activeLocale: key }),

      addCustomTemplate: (template) =>
        set((s) => ({
          customTemplates: [...s.customTemplates, { ...template, id: nanoid(), custom: true }],
        })),

      updateCustomTemplate: (id, updates) =>
        set((s) => ({
          customTemplates: s.customTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeCustomTemplate: (id) =>
        set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) })),

      setCustomStatement: (key, text) =>
        set((s) => ({ customStatements: { ...s.customStatements, [key]: text } })),

      removeCustomStatement: (key) =>
        set((s) => {
          const next = { ...s.customStatements }
          delete next[key]
          return { customStatements: next }
        }),

      addBundledScript: (script) =>
        set((s) => ({ bundledScripts: [...s.bundledScripts, script] })),

      exportLibrary: () => JSON.stringify(get(), null, 2),

      importLibrary: (json) => {
        try {
          const data = JSON.parse(json) as Partial<LibraryState>
          set((s) => ({
            customRoles:       data.customRoles       ?? s.customRoles,
            editOverrides:     data.editOverrides     ?? s.editOverrides,
            locales:           data.locales           ?? s.locales,
            activeLocale:      data.activeLocale      ?? s.activeLocale,
            customTemplates:   data.customTemplates   ?? s.customTemplates,
            customStatements:  data.customStatements  ?? s.customStatements,
          }))
        } catch {
          throw new Error('Invalid library JSON')
        }
      },
    }),
    {
      name: 'botc-library',
      partialize: ({ bundledScripts: _, ...rest }) => rest,
    },
  ),
)
