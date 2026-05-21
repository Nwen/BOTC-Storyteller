import type { LocaleData, RoleTextOverride, Team } from '@/types'

/**
 * Parse a translation file that is either:
 *   { locale, name, roles: { [id]: { name, ability, ... } } }
 * or:
 *   [ { id, name, ability, ... }, ... ]  (array of role objects)
 */
export function parseTranslationFile(raw: unknown): LocaleData {
  if (Array.isArray(raw)) {
    return parseArrayFormat(raw)
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Translation file must be a JSON object or array')
  }
  return parseObjectFormat(raw as Record<string, unknown>)
}

function parseArrayFormat(raw: unknown[]): LocaleData {
  const roles: Record<string, RoleTextOverride> = {}
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const obj = item as Record<string, unknown>
    const id = typeof obj['id'] === 'string' ? obj['id'] : ''
    if (!id) continue
    roles[id] = extractTextFields(obj)
  }
  return { locale: 'unknown', name: 'Imported', roles }
}

function parseObjectFormat(obj: Record<string, unknown>): LocaleData {
  const locale = String(obj['locale'] ?? 'unknown')
  const name = String(obj['name'] ?? locale)
  const rolesRaw = obj['roles']

  if (!rolesRaw || typeof rolesRaw !== 'object' || Array.isArray(rolesRaw)) {
    throw new Error('Translation file must have a "roles" object')
  }

  const roles: Record<string, RoleTextOverride> = {}
  for (const [id, fields] of Object.entries(rolesRaw as Record<string, unknown>)) {
    if (typeof fields !== 'object' || fields === null) continue
    roles[id] = extractTextFields(fields as Record<string, unknown>)
  }

  const teams = extractTeams(obj['teams'])
  const statements = extractStringMap(obj['statements'])
  const yesno = extractYesNo(obj['yesno'])
  const templates = extractTemplateLabels(obj['templates'])

  return {
    locale, name, roles,
    ...(teams ? { teams } : {}),
    ...(statements ? { statements } : {}),
    ...(yesno ? { yesno } : {}),
    ...(templates ? { templates } : {}),
  }
}

function extractStringMap(raw: unknown): Record<string, string> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

function extractYesNo(raw: unknown): LocaleData['yesno'] | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  const out: LocaleData['yesno'] = {}
  if (typeof obj['yes'] === 'string') out.yes = obj['yes']
  if (typeof obj['no'] === 'string') out.no = obj['no']
  return (out.yes !== undefined || out.no !== undefined) ? out : null
}

function extractTemplateLabels(raw: unknown): LocaleData['templates'] | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const out: Record<string, { label: string }> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>)['label'] === 'string') {
      out[k] = { label: (v as Record<string, unknown>)['label'] as string }
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

const TEAM_KEYS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled']

function extractTeams(raw: unknown): LocaleData['teams'] | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  const out: LocaleData['teams'] = {}
  for (const key of TEAM_KEYS) {
    if (typeof obj[key] === 'string') out[key] = obj[key]
  }
  return Object.keys(out).length > 0 ? out : null
}

function extractTextFields(obj: Record<string, unknown>): RoleTextOverride {
  const out: RoleTextOverride = {}
  if (typeof obj['name'] === 'string') out.name = obj['name']
  if (typeof obj['ability'] === 'string') out.ability = obj['ability']
  if (Array.isArray(obj['reminders'])) out.reminders = obj['reminders'].map(String)
  if (typeof obj['firstNightReminder'] === 'string') out.firstNightReminder = obj['firstNightReminder']
  if (typeof obj['otherNightReminder'] === 'string') out.otherNightReminder = obj['otherNightReminder']
  return out
}
