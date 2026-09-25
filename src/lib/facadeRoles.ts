/**
 * Characters whose player believes they are someone else. The grimoire keeps the
 * believed ("façade") character on the player separately from their real role, so
 * that a "YOU ARE …" reveal and the matching info template follow the façade.
 */
export const FACADE_ROLE_IDS = new Set(['drunk', 'marionette'])

export function hasFacade(roleId: string | null | undefined): boolean {
  return !!roleId && FACADE_ROLE_IDS.has(roleId)
}

/** The character this player should be shown as — the façade when there is one. */
export function shownRoleId(
  roleId: string | null | undefined,
  facadeRoleId: string | null | undefined,
): string | null {
  if (hasFacade(roleId)) return facadeRoleId ?? null
  return roleId ?? null
}
