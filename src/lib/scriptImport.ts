import type { RoleBase, LoadedScript, ScriptMeta } from '@/types'
import rolesDb from '@/data/roles.json'

const BASE_ROLES: RoleBase[] = rolesDb as RoleBase[]
const ROLE_MAP = new Map(BASE_ROLES.map((r) => [r.id, r]))

export interface ImportResult {
  script: LoadedScript
  warnings: string[]
}

/** Resolve a single script entry against the bundled database or treat as homebrew. */
function resolveEntry(
  entry: unknown,
  warnings: string[],
): RoleBase | null {
  if (typeof entry === 'string') {
    const found = ROLE_MAP.get(entry)
    if (!found) { warnings.push(`Unknown character id: "${entry}"`) }
    return found ?? null
  }
  if (typeof entry !== 'object' || entry === null) return null

  const obj = entry as Record<string, unknown>
  const id = String(obj['id'] ?? '')

  // _meta entry handled separately
  if (id === '_meta') return null

  // Object with only an id — resolve against DB
  if (Object.keys(obj).filter((k) => k !== 'id').length === 0) {
    const found = ROLE_MAP.get(id)
    if (!found) { warnings.push(`Unknown character id: "${id}"`) }
    return found ?? null
  }

  // Homebrew / full object — use as-is, merging missing fields from DB
  const base = ROLE_MAP.get(id)
  return { ...(base ?? {}), ...(obj as Partial<RoleBase>), id, custom: !base } as RoleBase
}

export function importScriptJson(raw: unknown): ImportResult {
  if (!Array.isArray(raw)) {
    throw new Error('Script JSON must be an array')
  }

  const warnings: string[] = []
  let meta: Omit<ScriptMeta, 'id'> = {}
  const roles: RoleBase[] = []

  for (const entry of raw) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      (entry as Record<string, unknown>)['id'] === '_meta'
    ) {
      const m = entry as ScriptMeta
      meta = {
        name: m.name,
        author: m.author,
        logo: m.logo,
        firstNight: m.firstNight,
        otherNight: m.otherNight,
      }
      continue
    }

    const resolved = resolveEntry(entry, warnings)
    if (resolved) roles.push(resolved)
  }

  const script: LoadedScript = {
    meta,
    roles,
    metaFirstNight: meta.firstNight,
    metaOtherNight: meta.otherNight,
  }

  return { script, warnings }
}

/** Parse a JSON string into a script, throwing on invalid JSON */
export function parseScriptFile(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON — could not parse script file')
  }
  return importScriptJson(parsed)
}

// ─── Built-in base scripts ────────────────────────────────────────────────────

const TB_IDS = [
  'washerwoman','librarian','investigator','chef','empath','fortuneteller',
  'undertaker','monk','ravenkeeper','virgin','slayer','soldier','mayor',
  'butler','drunk','recluse','saint',
  'poisoner','spy','scarletwoman','baron',
  'imp',
]

const SV_IDS = [
  'clockmaker','dreamer','snakecharmer','mathematician','flowergirl',
  'towncryer','oracle','savant','seamstress','philosopher','artist',
  'juggler','sage',
  'klutz','envoy','mutant','sweetheart',
  'fanggu','eviltwin','witch','cerenovus','pithag',
  'vortox','vigormortis','nodashii','zombuul',
]

const BMR_IDS = [
  'grandmother','sailor','chambermaid','exorcist','innkeeper','gambler',
  'sculptor','pixie','nightwatchman','courtier','professor','choleric',
  'minstrel','tealeaf','goon','lunatic','tinker',
  'godfather','devilsadvocate','assassin','mastermind',
  'zombuul','pukka','shabaloth','po',
]

function makePreset(ids: string[], name: string, _edition: string): LoadedScript {
  const roles = ids.map((id) => ROLE_MAP.get(id)).filter((r): r is RoleBase => r !== undefined)
  return { meta: { name, author: 'The Pandemonium Institute' }, roles, metaFirstNight: undefined, metaOtherNight: undefined }
}

export const BASE_SCRIPTS: Record<string, LoadedScript> = {
  tb:  makePreset(TB_IDS,  'Trouble Brewing',   'tb'),
  sv:  makePreset(SV_IDS,  'Sects & Violets',   'sv'),
  bmr: makePreset(BMR_IDS, 'Bad Moon Rising',   'bmr'),
}

export { BASE_ROLES, ROLE_MAP }
