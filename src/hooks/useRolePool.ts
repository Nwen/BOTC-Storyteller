import { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { BASE_ROLES, ROLE_MAP } from '@/lib/scriptImport'
import type { RoleBase } from '@/types'

/** Full character pool for the current game: script roles + custom roles */
export function useRolePool(): RoleBase[] {
  const script = useGameStore((s) => s.script)
  const customRoles = useLibraryStore((s) => s.customRoles)

  return useMemo(() => {
    const pool = new Map<string, RoleBase>()
    for (const r of BASE_ROLES) pool.set(r.id, r)
    for (const r of customRoles) pool.set(r.id, r)
    if (script) {
      for (const r of script.roles) pool.set(r.id, r)
    }
    return [...pool.values()]
  }, [script, customRoles])
}

/** Look up a role from the full pool by id */
export function useRoleById(id: string | null | undefined): RoleBase | null {
  const customRoles = useLibraryStore((s) => s.customRoles)
  return useMemo(() => {
    if (!id) return null
    const custom = customRoles.find((r) => r.id === id)
    if (custom) return custom
    return ROLE_MAP.get(id) ?? null
  }, [id, customRoles])
}

/** The player currently holding a demon-team character, if any */
export function useDemonPlayerId(): string | null {
  const players = useGameStore((s) => s.players)
  const pool = useRolePool()

  return useMemo(() => {
    const demonIds = new Set(pool.filter((r) => r.team === 'demon').map((r) => r.id))
    return players.find((p) => p.roleId && demonIds.has(p.roleId))?.id ?? null
  }, [players, pool])
}
