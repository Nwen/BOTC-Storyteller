/**
 * Role-text resolution layer.
 *
 * Precedence (highest first):
 *   1. Active-locale translation
 *   2. English edit override
 *   3. Base definition (roles.json / custom role / homebrew)
 *
 * Only display text fields are layered; mechanical fields come from base.
 */
import type { RoleBase, RoleTextOverride, LocaleData, ResolvedRole } from '@/types'

export function resolveRoleText(
  base: RoleBase,
  editOverrides: Record<string, RoleTextOverride>,
  locales: Record<string, LocaleData>,
  activeLocale: string,
): ResolvedRole {
  const edit = editOverrides[base.id] ?? {}
  const translation = activeLocale !== 'en' ? (locales[activeLocale]?.roles[base.id] ?? {}) : {}

  const pick = <K extends keyof RoleTextOverride>(
    field: K,
    fallback: RoleTextOverride[K],
  ): RoleTextOverride[K] =>
    (translation[field] as RoleTextOverride[K] | undefined) ??
    (edit[field] as RoleTextOverride[K] | undefined) ??
    fallback

  return {
    ...base,
    displayName: pick('name', base.name) ?? base.name,
    displayAbility: pick('ability', base.ability ?? '') ?? '',
    displayReminders: pick('reminders', base.reminders ?? []) ?? [],
    displayFirstNightReminder:
      pick('firstNightReminder', base.firstNightReminder ?? '') ?? '',
    displayOtherNightReminder:
      pick('otherNightReminder', base.otherNightReminder ?? '') ?? '',
  }
}

/** Resolve an array of roles in one call */
export function resolveAll(
  roles: RoleBase[],
  editOverrides: Record<string, RoleTextOverride>,
  locales: Record<string, LocaleData>,
  activeLocale: string,
): ResolvedRole[] {
  return roles.map((r) => resolveRoleText(r, editOverrides, locales, activeLocale))
}
