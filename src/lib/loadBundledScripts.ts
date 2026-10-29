import { importScriptJson } from './scriptImport'
import { useLibraryStore } from '@/store/libraryStore'

/**
 * Scripts dropped into the `scripts/` folder on the host machine, served read-only
 * by nginx (docker-compose.yml mounts it) or by the dev server (vite.config.ts).
 * The listing is nginx's JSON autoindex: [{ name, type, ... }].
 */
const HOST_SCRIPTS = '/host-scripts/'

/** Filenames listed in public/scripts/index.json, shipped with the build */
async function listBuiltInFiles(): Promise<string[]> {
  try {
    const res = await fetch('/scripts/index.json')
    if (!res.ok) return []
    const names = (await res.json()) as string[]
    return names.map((name) => `/scripts/${name}`)
  } catch {
    return []
  }
}

/** Every .json file in the host folder; none if it isn't mounted */
async function listHostFiles(): Promise<string[]> {
  try {
    const res = await fetch(HOST_SCRIPTS, { cache: 'no-store' })
    // Without the folder, the SPA fallback answers with index.html
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return []
    const listing = (await res.json()) as { name: string; type: string }[]
    return listing
      .filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => `${HOST_SCRIPTS}${encodeURIComponent(f.name)}`)
  } catch {
    return []
  }
}

export async function loadBundledScripts(): Promise<void> {
  const urls = [...(await listBuiltInFiles()), ...(await listHostFiles())]
  const { addBundledScript } = useLibraryStore.getState()

  // Fetch in parallel, but add in listing order so the buttons stay stable
  const scripts = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return null
        const { script } = importScriptJson((await res.json()) as unknown)
        // A script without a _meta name is shown under its filename
        const filename = decodeURIComponent(url.split('/').pop() ?? '').replace(/\.json$/i, '')
        return script.meta.name ? script : { ...script, meta: { ...script.meta, name: filename } }
      } catch {
        return null // skip invalid files silently
      }
    }),
  )
  for (const script of scripts) if (script) addBundledScript(script)
}
