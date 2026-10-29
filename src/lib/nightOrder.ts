import type { RoleBase, NightStep, LoadedScript, Player } from '@/types'
import { isStorytellerTeam } from './storytellerRoles'

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
  /** Fabled & Loric in play (GameState.storytellerRoles) */
  storytellerRoleIds: string[] = [],
): NightStep[] {
  const roleField = night === 'first' ? 'firstNight' : 'otherNight'
  const reminderField = night === 'first' ? 'firstNightReminder' : 'otherNightReminder'

  // Characters actually in play
  const inPlayIds = new Set([
    ...(players.map((p) => p.roleId).filter(Boolean) as string[]),
    ...storytellerRoleIds,
  ])

  // Determine ordered role list, always resolving against the full (translated) role pool
  let ordered: RoleBase[]
  const metaOrder = night === 'first' ? script.metaFirstNight : script.metaOtherNight
  const roleById = new Map(allRoles.map((r) => [r.id, r]))

  if (metaOrder) {
    // Use explicit meta order
    ordered = metaOrder
      .filter((id) => !['dusk', 'minioninfo', 'demoninfo', 'dawn'].includes(id))
      .map((id) => roleById.get(id))
      .filter((r): r is RoleBase => r !== undefined && (includeAll || inPlayIds.has(r.id)))
  } else {
    const scriptIds = new Set(script.roles.map((r) => r.id))
    // The Storyteller may bring in Fabled the script doesn't list
    const offScript = storytellerRoleIds
      .filter((id) => !scriptIds.has(id))
      .map((id) => roleById.get(id))
      .filter((r): r is RoleBase => r !== undefined)
    const pool = [
      ...(includeAll ? script.roles : script.roles.filter((r) => inPlayIds.has(r.id))),
      ...offScript,
    ].map((r) => roleById.get(r.id) ?? r)
    ordered = pool
      .filter((r) => (r[roleField] ?? 0) > 0)
      .sort((a, b) => (a[roleField] ?? 0) - (b[roleField] ?? 0))
  }

  const steps: NightStep[] = []

  // Fabled & Loric act right after dusk, before Minion & Demon info (official night sheet)
  const storytellerSteps = ordered.filter((r) => isStorytellerTeam(r.team))
  const playerSteps = ordered.filter((r) => !isStorytellerTeam(r.team))

  steps.push(specialStep('dusk'))

  for (const role of storytellerSteps) {
    steps.push({ type: 'role', id: role.id, label: role.name, reminder: role[reminderField] ?? '' })
  }

  if (night === 'first') {
    steps.push(specialStep('minioninfo'))
    steps.push(specialStep('demoninfo'))
  }

  for (const role of playerSteps) {
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
