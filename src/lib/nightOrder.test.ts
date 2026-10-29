import { describe, it, expect } from 'vitest'
import { buildNightOrder } from './nightOrder'
import type { LoadedScript, Player, RoleBase } from '@/types'

const IMP: RoleBase = {
  id: 'imp', name: 'Imp', team: 'demon',
  firstNight: 0, firstNightReminder: '',
  otherNight: 25, otherNightReminder: 'Imp kills.',
  reminders: [],
}
const WASHERWOMAN: RoleBase = {
  id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk',
  firstNight: 33, firstNightReminder: 'Show townsfolk.',
  otherNight: 0, otherNightReminder: '',
  reminders: [],
}

const SCRIPT: LoadedScript = {
  meta: { name: 'Test' },
  roles: [IMP, WASHERWOMAN],
}

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Alice', seatIndex: 0, roleId: 'imp', alignment: 'evil', isAlive: true, ghostVoteAvailable: true, reminders: [], notes: '' },
  { id: 'p2', name: 'Bob', seatIndex: 1, roleId: 'washerwoman', alignment: 'good', isAlive: true, ghostVoteAvailable: true, reminders: [], notes: '' },
]

describe('buildNightOrder', () => {
  it('includes dusk, demoninfo/minioninfo, dawn on first night', () => {
    const steps = buildNightOrder('first', SCRIPT, PLAYERS, [IMP, WASHERWOMAN])
    const ids = steps.map((s) => s.id)
    expect(ids).toContain('dusk')
    expect(ids).toContain('minioninfo')
    expect(ids).toContain('demoninfo')
    expect(ids).toContain('dawn')
  })

  it('excludes minioninfo/demoninfo on other nights', () => {
    const steps = buildNightOrder('other', SCRIPT, PLAYERS, [IMP, WASHERWOMAN])
    const ids = steps.map((s) => s.id)
    expect(ids).not.toContain('minioninfo')
    expect(ids).not.toContain('demoninfo')
  })

  it('sorts roles by night order number', () => {
    const steps = buildNightOrder('first', SCRIPT, PLAYERS, [IMP, WASHERWOMAN])
    const roleSteps = steps.filter((s) => s.type === 'role').map((s) => s.id)
    // Washerwoman firstNight=33 is the only first-night role; imp has firstNight=0
    expect(roleSteps).toEqual(['washerwoman'])
  })

  it('includes in-play players for each step', () => {
    const steps = buildNightOrder('other', SCRIPT, PLAYERS, [IMP, WASHERWOMAN])
    const impStep = steps.find((s) => s.id === 'imp')
    expect(impStep).toBeDefined()
    expect(impStep?.players).toContain('Alice')
  })

  it('filters out-of-play roles when includeAll=false', () => {
    const playersNoWasher = PLAYERS.filter((p) => p.roleId !== 'washerwoman')
    const steps = buildNightOrder('first', SCRIPT, playersNoWasher, [IMP, WASHERWOMAN])
    const ids = steps.filter((s) => s.type === 'role').map((s) => s.id)
    expect(ids).not.toContain('washerwoman')
  })

  it('uses the translated role text from the pool, not the raw script roles', () => {
    const translated = { ...WASHERWOMAN, name: 'Lavandière', firstNightReminder: 'Montrer un villageois.' }
    const step = buildNightOrder('first', SCRIPT, PLAYERS, [IMP, translated]).find((s) => s.id === 'washerwoman')
    expect(step?.label).toBe('Lavandière')
    expect(step?.reminder).toBe('Montrer un villageois.')
  })

  it('runs Fabled & Loric in play right after dusk, even when off-script', () => {
    const toymaker: RoleBase = {
      id: 'toymaker', name: 'Toymaker', team: 'fabled',
      firstNight: 3, firstNightReminder: 'Resolve Minion info.',
      otherNight: 2, otherNightReminder: 'No final attack.',
    }
    const all = [IMP, WASHERWOMAN, toymaker]
    expect(buildNightOrder('first', SCRIPT, PLAYERS, all, false, ['toymaker']).map((s) => s.id))
      .toEqual(['dusk', 'toymaker', 'minioninfo', 'demoninfo', 'washerwoman', 'dawn'])
    expect(buildNightOrder('other', SCRIPT, PLAYERS, all, false, ['toymaker']).map((s) => s.id))
      .toEqual(['dusk', 'toymaker', 'imp', 'dawn'])
    // Not in play: no step
    expect(buildNightOrder('other', SCRIPT, PLAYERS, all).map((s) => s.id)).not.toContain('toymaker')
  })
})
