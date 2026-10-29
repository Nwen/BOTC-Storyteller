import type { SavedScript } from '@/types'

/**
 * Server-side store for saved scripts, shared by every device using this deployment.
 * Backed by nginx WebDAV (see nginx.conf): one `<id>.json` file per script,
 * listed through nginx's JSON autoindex. Every call fails soft — in `vite dev` or
 * offline there is no server and scripts simply stay local.
 */
const BASE = '/api/scripts/'

const fileUrl = (id: string) => `${BASE}${encodeURIComponent(id)}.json`

/** Fetch every script stored on the server, or null if the server can't be reached. */
export async function fetchRemoteScripts(): Promise<SavedScript[] | null> {
  let listing: { name: string; type: string }[]
  try {
    const res = await fetch(BASE, { cache: 'no-store' })
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null
    listing = await res.json()
  } catch {
    return null
  }

  const entries = await Promise.all(
    listing
      .filter((f) => f.type === 'file' && f.name.endsWith('.json'))
      .map(async (f) => {
        try {
          const res = await fetch(`${BASE}${encodeURIComponent(f.name)}`, { cache: 'no-store' })
          if (!res.ok) return null
          const entry = (await res.json()) as SavedScript
          return entry?.id && entry.script ? entry : null
        } catch {
          return null
        }
      }),
  )
  return entries.filter((e): e is SavedScript => e !== null)
}

/** Upload a script; resolves true once the server has it. */
export async function pushRemoteScript(entry: SavedScript): Promise<boolean> {
  const { synced: _, ...body } = entry
  try {
    const res = await fetch(fileUrl(entry.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteRemoteScript(id: string): Promise<void> {
  try {
    await fetch(fileUrl(id), { method: 'DELETE' })
  } catch {
    // offline — the server copy will be pulled back on next sync
  }
}
