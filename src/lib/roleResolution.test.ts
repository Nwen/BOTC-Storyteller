import { describe, it, expect } from 'vitest'
import { resolveRoleText } from './roleResolution'
import type { RoleBase, LocaleData } from '@/types'

const BASE_ROLE: RoleBase = {
  id: 'imp',
  name: 'Imp',
  team: 'demon',
  ability: 'Each night*, choose a player: they die.',
  firstNight: 0,
  firstNightReminder: '',
  otherNight: 25,
  otherNightReminder: 'The Imp wakes and points to a player. That player dies.',
  reminders: ['Dead'],
  setup: false,
}

describe('resolveRoleText', () => {
  it('returns base data when no overrides or translations', () => {
    const resolved = resolveRoleText(BASE_ROLE, {}, {}, 'en')
    expect(resolved.displayName).toBe('Imp')
    expect(resolved.displayAbility).toBe(BASE_ROLE.ability)
    expect(resolved.displayReminders).toEqual(['Dead'])
  })

  it('applies edit override over base', () => {
    const overrides = { imp: { name: 'Evil Imp', ability: 'Edited ability' } }
    const resolved = resolveRoleText(BASE_ROLE, overrides, {}, 'en')
    expect(resolved.displayName).toBe('Evil Imp')
    expect(resolved.displayAbility).toBe('Edited ability')
    expect(resolved.displayReminders).toEqual(['Dead']) // unedited field falls back
  })

  it('applies locale translation over edit override', () => {
    const overrides = { imp: { name: 'Evil Imp' } }
    const locales: Record<string, LocaleData> = {
      fr: {
        locale: 'fr',
        name: 'Français',
        roles: { imp: { name: 'Démon', ability: 'Chaque nuit*...' } },
      },
    }
    const resolved = resolveRoleText(BASE_ROLE, overrides, locales, 'fr')
    expect(resolved.displayName).toBe('Démon')       // locale wins over edit
    expect(resolved.displayAbility).toBe('Chaque nuit*...')
    // Reminder not translated — falls back to base
    expect(resolved.displayReminders).toEqual(['Dead'])
  })

  it('falls back per-field when locale has partial translation', () => {
    const locales: Record<string, LocaleData> = {
      fr: {
        locale: 'fr',
        name: 'Français',
        roles: { imp: { name: 'Démon' } }, // only name translated
      },
    }
    const resolved = resolveRoleText(BASE_ROLE, {}, locales, 'fr')
    expect(resolved.displayName).toBe('Démon')
    expect(resolved.displayAbility).toBe(BASE_ROLE.ability) // falls back to base
  })
})
