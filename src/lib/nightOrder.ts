import type { RoleBase, NightStep, LoadedScript, Player } from '@/types'

const SPECIAL_STEPS = {
  dusk:       'Dusk',
  minioninfo: 'Minion info',
  demoninfo:  'Demon info',
  dawn:       'Dawn',
} as const

type SpecialId = keyof typeof SPECIAL_STEPS

function specialStep(id: SpecialId): NightStep {
  return { type: 'special', id, label: SPECIAL_STEPS[id], reminder: '' }
}

/** Build the first-night or other-night order from in-play roles and meta overrides. */
export function buildNightOrder(
  night: 'first' | 'other',
  script: LoadedScript,
  players: Player[],
  allRoles: RoleBase[],
  includeAll = false,
): NightStep[] {
  const roleField = night === 'first' ? 'firstNight' : 'otherNight'
  const reminderField = night === 'first' ? 'firstNightReminder' : 'otherNightReminder'

  // Characters actually in play
  const inPlayIds = new Set(players.map((p) => p.roleId).filter(Boolean) as string[])

  // Determine ordered role list
  let ordered: RoleBase[]
  const metaOrder = night === 'first' ? script.metaFirstNight : script.metaOtherNight

  if (metaOrder) {
    // Use explicit meta order, resolving ids against full role pool
    const roleById = new Map(allRoles.map((r) => [r.id, r]))
    ordered = metaOrder
      .filter((id) => !['dusk', 'minioninfo', 'demoninfo', 'dawn'].includes(id))
      .map((id) => roleById.get(id))
      .filter((r): r is RoleBase => r !== undefined && (includeAll || inPlayIds.has(r.id)))
  } else {
    const pool = includeAll ? script.roles : script.roles.filter((r) => inPlayIds.has(r.id))
    ordered = pool
      .filter((r) => (r[roleField] ?? 0) > 0)
      .sort((a, b) => (a[roleField] ?? 0) - (b[roleField] ?? 0))
  }

  const steps: NightStep[] = []

  steps.push(specialStep('dusk'))

  if (night === 'first') {
    steps.push(specialStep('minioninfo'))
    steps.push(specialStep('demoninfo'))
  }

  for (const role of ordered) {
    const reminder = role[reminderField] ?? ''
    const holders = players.filter((p) => p.roleId === role.id).map((p) => p.name)
    steps.push({
      type: 'role',
      id: role.id,
      label: role.name,
      reminder,
      players: holders,
    })
  }

  steps.push(specialStep('dawn'))

  return steps
}
