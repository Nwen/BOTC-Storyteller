import { parseTranslationFile } from './translationImport'
import { useLibraryStore } from '@/store/libraryStore'

export async function loadBundledLocales(): Promise<void> {
  let keys: string[]
  try {
    const res = await fetch('/locales/index.json')
    if (!res.ok) return
    keys = (await res.json()) as string[]
  } catch {
    return
  }

  const { importLocale } = useLibraryStore.getState()
  await Promise.all(
    keys.map(async (key) => {
      try {
        const res = await fetch(`/locales/${key}.json`)
        if (!res.ok) return
        const raw = (await res.json()) as unknown
        importLocale(parseTranslationFile(raw))
      } catch {
        // ignore individual locale failures silently
      }
    }),
  )
}
