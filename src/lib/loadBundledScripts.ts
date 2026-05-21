import { importScriptJson } from './scriptImport'
import { useLibraryStore } from '@/store/libraryStore'

export async function loadBundledScripts(): Promise<void> {
  let filenames: string[]
  try {
    const res = await fetch('/scripts/index.json')
    if (!res.ok) return
    filenames = (await res.json()) as string[]
  } catch {
    return
  }

  const { addBundledScript } = useLibraryStore.getState()
  await Promise.all(
    filenames.map(async (filename) => {
      try {
        const res = await fetch(`/scripts/${filename}`)
        if (!res.ok) return
        const raw = (await res.json()) as unknown
        const { script } = importScriptJson(raw)
        addBundledScript(script)
      } catch {
        // skip invalid files silently
      }
    }),
  )
}
