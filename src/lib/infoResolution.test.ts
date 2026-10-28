import { describe, it, expect } from 'vitest'
import { linkedCharacterIndex } from './infoResolution'
import type { DraftAtom } from '@/types'

const player: DraftAtom = { kind: 'player', playerId: null }
const character: DraftAtom = { kind: 'character', roleId: null }
const stmt = (key: string): DraftAtom => ({ kind: 'statement', key })

describe('linkedCharacterIndex', () => {
  it('links through "this player is/was the"', () => {
    expect(linkedCharacterIndex([player, stmt('this_player_is_the'), character], 0)).toBe(2)
    expect(linkedCharacterIndex([player, stmt('this_player_was_the'), character], 0)).toBe(2)
  })

  it('links a player directly followed by a character', () => {
    expect(linkedCharacterIndex([stmt('your_grandchild_is'), player, character], 1)).toBe(2)
  })

  it('does not link "one of these two" players', () => {
    const washerwoman = [stmt('one_of_these_is_the'), player, player, character]
    expect(linkedCharacterIndex(washerwoman, 1)).toBeNull()
    expect(linkedCharacterIndex(washerwoman, 2)).toBeNull()
  })

  it('does not link through unrelated statements', () => {
    expect(linkedCharacterIndex([player, stmt('you_are'), character], 0)).toBeNull()
  })
})

describe('bundled templates', () => {
  it('reference known statements, translated in every bundled locale, and known characters', async () => {
    const { readFileSync } = await import('node:fs')
    const templates = (await import('@/data/templates.json')).default as Array<{ characterId?: string; atoms: Array<{ kind: string; key?: string; roleId?: string }> }>
    const statements = (await import('@/data/statements.json')).default as Record<string, string>
    const roleIds = new Set(((await import('@/data/roles.json')).default as Array<{ id: string }>).map((r) => r.id))
    const locales = ['fr', 'fr-off'].map((l) =>
      JSON.parse(readFileSync(`public/locales/${l}.json`, 'utf-8')) as { statements: Record<string, string> },
    )
    for (const t of templates) {
      if (t.characterId) expect(roleIds, t.characterId).toContain(t.characterId)
      for (const a of t.atoms) {
        if (a.roleId) expect(roleIds, a.roleId).toContain(a.roleId)
        if (a.key) {
          expect(statements, a.key).toHaveProperty([a.key])
          for (const l of locales) expect(l.statements, a.key).toHaveProperty([a.key])
        }
      }
    }
  })
})

describe('expandTemplateForGame', () => {
  it('gives the Demon one player slot per minion', async () => {
    const { expandTemplateForGame, getTemplateById } = await import('./infoResolution')
    const tpl = getTemplateById('demon_minions', [])!
    expect(expandTemplateForGame(tpl, { minionPlayerIds: ['a', 'b'] })).toEqual([
      { kind: 'statement', key: 'these_are_your_minions' },
      { kind: 'player', playerId: 'a' },
      { kind: 'player', playerId: 'b' },
    ])
  })
})

describe('fillOneOfPair', () => {
  const dreamer: DraftAtom[] = [player, stmt('this_player_is_one_of'), character, character]

  it('puts a good character first and prepares an evil decoy', async () => {
    const { fillOneOfPair } = await import('./infoResolution')
    expect(fillOneOfPair(dreamer, 0, { id: 'chef', team: 'townsfolk' })).toEqual([
      { index: 2, atom: { kind: 'character', roleId: 'chef' } },
      { index: 3, atom: { kind: 'character', roleId: null, filter: { alignment: 'evil' } } },
    ])
  })

  it('puts an evil character second, after a good decoy', async () => {
    const { fillOneOfPair } = await import('./infoResolution')
    expect(fillOneOfPair(dreamer, 0, { id: 'imp', team: 'demon' })).toEqual([
      { index: 2, atom: { kind: 'character', roleId: null, filter: { alignment: 'good' } } },
      { index: 3, atom: { kind: 'character', roleId: 'imp' } },
    ])
  })
})
