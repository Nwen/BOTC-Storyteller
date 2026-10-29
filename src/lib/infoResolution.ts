import ENGLISH_STATEMENTS from '@/data/statements.json'
import BUNDLED_TEMPLATES from '@/data/templates.json'
import type { DraftAtom, InfoTemplate, LocaleData, Player, RoleBase, TemplateAtom } from '@/types'

const STATEMENTS = ENGLISH_STATEMENTS as Record<string, string>
const TEMPLATES = BUNDLED_TEMPLATES as InfoTemplate[]

export function resolveStatement(
  key: string,
  locales: Record<string, LocaleData>,
  activeLocale: string,
  customStatements: Record<string, string>,
): string {
  if (activeLocale !== 'en') {
    const fromLocale = locales[activeLocale]?.statements?.[key]
    if (fromLocale) return fromLocale
  }
  return customStatements[key] ?? STATEMENTS[key] ?? key
}

export function resolveYesNo(
  value: boolean,
  locales: Record<string, LocaleData>,
  activeLocale: string,
): string {
  const block = activeLocale !== 'en' ? locales[activeLocale]?.yesno : undefined
  if (value) return block?.yes ?? 'YES'
  return block?.no ?? 'NO'
}

export function resolveTemplateLabel(
  template: InfoTemplate,
  locales: Record<string, LocaleData>,
  activeLocale: string,
): string {
  if (activeLocale !== 'en') {
    const fromLocale = locales[activeLocale]?.templates?.[template.id]?.label
    if (fromLocale) return fromLocale
  }
  return template.label
}

export function getAllTemplates(customTemplates: InfoTemplate[]): InfoTemplate[] {
  return [...TEMPLATES, ...customTemplates]
}

export function getTemplateForCharacter(
  characterId: string,
  customTemplates: InfoTemplate[],
): InfoTemplate | undefined {
  return getAllTemplates(customTemplates).find((t) => t.characterId === characterId)
}

export function getTemplateById(
  id: string,
  customTemplates: InfoTemplate[],
): InfoTemplate | undefined {
  return getAllTemplates(customTemplates).find((t) => t.id === id)
}

/** What the current game already knows, used to pre-fill a freshly loaded template */
export interface GameContext {
  /** Demon bluffs currently set, in order */
  bluffs?: string[]
  /** The player holding the demon, if a demon is assigned */
  demonPlayerId?: string | null
  /** The players holding minions, in seat order */
  minionPlayerIds?: string[]
  /** Everyone at the table, to find who holds a named character */
  players?: Player[]
}

/**
 * Expand a template and pre-fill the slots the grimoire can already answer:
 * the demon's bluffs, who the demon is (minion info) and who the minions are
 * (one player slot per minion), and for "<player> THIS PLAYER IS THE <character>"
 * (e.g. showing the Demon its Marionette) the player holding that character.
 */
export function expandTemplateForGame(
  template: InfoTemplate,
  ctx: GameContext = {},
): DraftAtom[] {
  const atoms = expandTemplate(template)
  const bluffs = ctx.bluffs ?? []

  if (template.id === 'demon_minions' && ctx.minionPlayerIds?.length) {
    const minions = ctx.minionPlayerIds.map((playerId): DraftAtom => ({ kind: 'player', playerId }))
    return [...atoms.filter((atom) => atom.kind !== 'player'), ...minions]
  }

  const pointed = atoms.map((atom, i) => {
    const stmt = atoms[i + 1]
    const char = atoms[i + 2]
    if (atom.kind !== 'player' || atom.playerId) return atom
    if (stmt?.kind !== 'statement' || stmt.key !== 'this_player_is_the') return atom
    if (char?.kind !== 'character' || !char.roleId) return atom
    const holder = ctx.players?.find((p) => p.roleId === char.roleId)
    return holder ? { ...atom, playerId: holder.id } : atom
  })
  if (pointed.some((atom, i) => atom !== atoms[i])) return pointed

  if (template.id === 'demon_info' || template.id === 'minion_info') {
    let bluffIdx = 0
    return atoms.map((atom) => {
      if (atom.kind === 'character' && bluffIdx < bluffs.length) {
        return { ...atom, roleId: bluffs[bluffIdx++] ?? null }
      }
      if (atom.kind === 'player' && template.id === 'minion_info' && ctx.demonPlayerId) {
        return { ...atom, playerId: ctx.demonPlayerId }
      }
      return atom
    })
  }
  return atoms
}

export function expandTemplate(template: InfoTemplate): DraftAtom[] {
  const result: DraftAtom[] = []
  for (const atom of template.atoms) {
    expandAtom(atom, result)
  }
  return result
}

function expandAtom(atom: TemplateAtom, out: DraftAtom[]): void {
  switch (atom.kind) {
    case 'statement':
      out.push({ kind: 'statement', key: atom.key })
      break
    case 'player':
      for (let i = 0; i < atom.slots; i++) {
        out.push({ kind: 'player', playerId: null })
      }
      break
    case 'character':
      out.push({ kind: 'character', roleId: atom.roleId ?? null, ...(atom.filter ? { filter: atom.filter } : {}) })
      break
    case 'team':
      out.push({ kind: 'team', value: null })
      break
    case 'yesno':
      out.push({ kind: 'yesno', value: false })
      break
    case 'number':
      out.push({ kind: 'number', value: 0, ...(atom.max !== undefined ? { max: atom.max } : {}) })
      break
    case 'free_text':
      out.push({ kind: 'free_text', text: '' })
      break
  }
}

export function compositionToLogText(
  atoms: DraftAtom[],
  players: Array<{ id: string; name: string }>,
  getRoleName: (id: string) => string,
): string {
  return atoms
    .map((a) => atomToLog(a, players, getRoleName))
    .filter(Boolean)
    .join(' → ')
}

function atomToLog(
  atom: DraftAtom,
  players: Array<{ id: string; name: string }>,
  getRoleName: (id: string) => string,
): string {
  switch (atom.kind) {
    case 'statement':
      return STATEMENTS[atom.key] ?? atom.key
    case 'player':
      if (!atom.playerId) return '[player?]'
      return players.find((p) => p.id === atom.playerId)?.name ?? '[player?]'
    case 'character':
      if (!atom.roleId) return '[character?]'
      return getRoleName(atom.roleId)
    case 'team':
      return atom.value ? atom.value.toUpperCase() : '[team?]'
    case 'yesno':
      return atom.value ? 'YES' : 'NO'
    case 'number':
      return String(atom.value)
    case 'free_text':
      return atom.text || '[free text]'
  }
}

/** Statements that tie the player before them to the character after them */
const PLAYER_CHARACTER_LINKS = new Set(['this_player_is_the', 'this_player_was_the'])

/**
 * Index of the character atom that names the character of the player atom at
 * `playerIndex` — e.g. Ravenkeeper "<player> THIS PLAYER IS THE <character>" or
 * Grandmother "<player> <character>" — or null when there is none. A player
 * preceded by another player ("one of these two…") is never linked.
 */
export function linkedCharacterIndex(atoms: DraftAtom[], playerIndex: number): number | null {
  if (atoms[playerIndex]?.kind !== 'player') return null
  if (atoms[playerIndex - 1]?.kind === 'player') return null
  let i = playerIndex + 1
  const between = atoms[i]
  if (between?.kind === 'statement' && PLAYER_CHARACTER_LINKS.has(between.key)) i++
  return atoms[i]?.kind === 'character' ? i : null
}

const EVIL_TEAMS = new Set(['minion', 'demon'])

/**
 * Dreamer-style "<player> THIS PLAYER IS ONE OF THESE <character> <character>":
 * the player's real character goes in the slot of its alignment (good first,
 * evil second, so the order gives nothing away) and the other slot is set up
 * for a character of the opposite alignment. Returns the two updated atoms, or
 * null when the pattern doesn't apply.
 */
export function fillOneOfPair(
  atoms: DraftAtom[],
  playerIndex: number,
  role: Pick<RoleBase, 'id' | 'team'>,
): Array<{ index: number; atom: DraftAtom }> | null {
  const stmt = atoms[playerIndex + 1]
  const a = atoms[playerIndex + 2]
  const b = atoms[playerIndex + 3]
  if (atoms[playerIndex]?.kind !== 'player') return null
  if (stmt?.kind !== 'statement' || stmt.key !== 'this_player_is_one_of') return null
  if (a?.kind !== 'character' || b?.kind !== 'character') return null
  const evil = EVIL_TEAMS.has(role.team)
  const real: DraftAtom = { kind: 'character', roleId: role.id }
  const decoy: DraftAtom = { kind: 'character', roleId: null, filter: { alignment: evil ? 'good' : 'evil' } }
  return [
    { index: playerIndex + 2, atom: evil ? decoy : real },
    { index: playerIndex + 3, atom: evil ? real : decoy },
  ]
}
