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
})
