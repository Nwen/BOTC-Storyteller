import type { LoadedScript, Team } from '@/types'

/**
 * Fabled and Loric belong to the Storyteller: passive modifiers to the game,
 * never held by a player. They're tracked in GameState.storytellerRoles instead.
 */
export const STORYTELLER_TEAMS: ReadonlySet<Team> = new Set(['fabled', 'loric'])

export const isStorytellerTeam = (team: Team) => STORYTELLER_TEAMS.has(team)

/** Fabled and Loric listed on a script are in play from the start */
export function scriptStorytellerRoleIds(script: LoadedScript | null): string[] {
  return script?.roles.filter((r) => isStorytellerTeam(r.team)).map((r) => r.id) ?? []
}
