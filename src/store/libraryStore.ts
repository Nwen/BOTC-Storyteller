import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/lib/nanoid'
import { fetchRemoteScripts, pushRemoteScript, deleteRemoteScript } from '@/lib/scriptSync'
import type { LibraryState, RoleBase, RoleTextOverride, LocaleData, InfoTemplate, LoadedScript, SavedScript } from '@/types'

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

  // Imported scripts, kept across sessions
  saveScript: (script: LoadedScript, fallbackName?: string) => void
  removeSavedScript: (id: string) => void
  /** Pull scripts saved from other devices and upload ones only this device has */
  syncSavedScripts: () => Promise<void>

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
  savedScripts: [],
}

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  persist(
    (set, get) => {
      /** Upload a script, then flag it synced if it hasn't been replaced in the meantime */
      const pushAndMark = async (entry: SavedScript) => {
        if (!(await pushRemoteScript(entry))) return
        set((s) => ({
          savedScripts: s.savedScripts.map((e) =>
            e.id === entry.id && e.savedAt === entry.savedAt ? { ...e, synced: true } : e,
          ),
        }))
      }

      return {
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

        saveScript: (script, fallbackName) => {
          const name = script.meta.name?.trim() || fallbackName?.trim() || 'Unnamed script'
          const saved = get().savedScripts
          // Re-importing a script under a name already saved replaces it rather than duplicating
          const existing = saved.find((e) => e.name === name)
          const entry: SavedScript = { id: existing?.id ?? nanoid(), name, savedAt: Date.now(), script }
          set({
            savedScripts: existing
              ? saved.map((e) => (e.id === existing.id ? entry : e))
              : [...saved, entry],
          })
          void pushAndMark(entry)
        },

        removeSavedScript: (id) => {
          set((s) => ({ savedScripts: s.savedScripts.filter((e) => e.id !== id) }))
          void deleteRemoteScript(id)
        },

        syncSavedScripts: async () => {
          const remote = await fetchRemoteScripts()
          if (!remote) return

          const local = get().savedScripts
          const remoteIds = new Set(remote.map((e) => e.id))
          const toPush: SavedScript[] = []

          // Server copy wins, unless this device changed the script since it last synced
          const merged = remote.map((r) => {
            const l = local.find((e) => e.id === r.id)
            if (l && !l.synced && l.savedAt > r.savedAt) {
              toPush.push(l)
              return l
            }
            return { ...r, synced: true }
          })

          for (const l of local) {
            if (remoteIds.has(l.id)) continue
            // Synced before but gone from the server: deleted on another device
            if (l.synced) continue
            // Never uploaded — but another device may have saved the same name meanwhile
            const i = merged.findIndex((e) => e.name === l.name)
            if (i === -1) {
              merged.push(l)
              toPush.push(l)
            } else if (l.savedAt > merged[i].savedAt) {
              merged[i] = { ...l, id: merged[i].id }
              toPush.push(merged[i])
            }
          }

          set({ savedScripts: merged.sort((a, b) => a.savedAt - b.savedAt) })
          await Promise.all(toPush.map(pushAndMark))
        },

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
              // Sync state is per-device, so imported entries count as not uploaded yet
              savedScripts:      data.savedScripts?.map(({ synced: _, ...e }) => e) ?? s.savedScripts,
            }))
          } catch {
            throw new Error('Invalid library JSON')
          }
        },
      }
    },
    {
      name: 'botc-library',
      partialize: ({ bundledScripts: _, ...rest }) => rest,
    },
  ),
)
