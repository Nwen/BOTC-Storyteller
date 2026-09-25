import ENGLISH_STATEMENTS from '@/data/statements.json'
import BUNDLED_TEMPLATES from '@/data/templates.json'
import type { DraftAtom, InfoTemplate, LocaleData, TemplateAtom } from '@/types'

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
}

/**
 * Expand a template and pre-fill the slots the grimoire can already answer:
 * the demon's bluffs, and — for minion info — who the demon is.
 */
export function expandTemplateForGame(
  template: InfoTemplate,
  ctx: GameContext = {},
): DraftAtom[] {
  const atoms = expandTemplate(template)
  const bluffs = ctx.bluffs ?? []

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
      out.push({ kind: 'character', roleId: null, ...(atom.filter ? { filter: atom.filter } : {}) })
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
