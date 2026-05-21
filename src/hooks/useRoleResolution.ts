import { useMemo } from 'react'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText, resolveAll } from '@/lib/roleResolution'
import { BASE_ROLES } from '@/lib/scriptImport'
import type { RoleBase, ResolvedRole } from '@/types'

export function useResolvedRole(role: RoleBase | null | undefined): ResolvedRole | null {
  const editOverrides = useLibraryStore((s) => s.editOverrides)
  const locales = useLibraryStore((s) => s.locales)
  const activeLocale = useLibraryStore((s) => s.activeLocale)

  return useMemo(() => {
    if (!role) return null
    return resolveRoleText(role, editOverrides, locales, activeLocale)
  }, [role, editOverrides, locales, activeLocale])
}

export function useResolvedRoles(roles: RoleBase[]): ResolvedRole[] {
  const editOverrides = useLibraryStore((s) => s.editOverrides)
  const locales = useLibraryStore((s) => s.locales)
  const activeLocale = useLibraryStore((s) => s.activeLocale)

  return useMemo(
    () => resolveAll(roles, editOverrides, locales, activeLocale),
    [roles, editOverrides, locales, activeLocale],
  )
}

/** Returns all roles (DB + custom), resolved for active locale */
export function useAllResolvedRoles(): ResolvedRole[] {
  const customRoles = useLibraryStore((s) => s.customRoles)
  const editOverrides = useLibraryStore((s) => s.editOverrides)
  const locales = useLibraryStore((s) => s.locales)
  const activeLocale = useLibraryStore((s) => s.activeLocale)

  return useMemo(() => {
    const all: RoleBase[] = [...BASE_ROLES, ...customRoles]
    return resolveAll(all, editOverrides, locales, activeLocale)
  }, [customRoles, editOverrides, locales, activeLocale])
}
