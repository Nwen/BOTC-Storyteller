import type { TeamComposition } from '@/types'

const TABLE: Record<number, TeamComposition> = {
  5:  { townsfolk: 3, outsiders: 0, minions: 1, demons: 1 },
  6:  { townsfolk: 3, outsiders: 1, minions: 1, demons: 1 },
  7:  { townsfolk: 5, outsiders: 0, minions: 1, demons: 1 },
  8:  { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 },
  9:  { townsfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  10: { townsfolk: 7, outsiders: 0, minions: 2, demons: 1 },
  11: { townsfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  12: { townsfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  13: { townsfolk: 9, outsiders: 0, minions: 3, demons: 1 },
  14: { townsfolk: 9, outsiders: 1, minions: 3, demons: 1 },
  15: { townsfolk: 9, outsiders: 2, minions: 3, demons: 1 },
}

export function getTeamComposition(playerCount: number): TeamComposition | null {
  if (playerCount in TABLE) return TABLE[playerCount]!
  // Extrapolate for 16-20 using the same pattern
  if (playerCount >= 16 && playerCount <= 20) {
    const extra = playerCount - 15
    return {
      townsfolk: 9 + extra,
      outsiders: (extra % 3 === 1 ? 0 : extra % 3 === 2 ? 1 : 2),
      minions: 3,
      demons: 1,
    }
  }
  return null
}

export function getAllCompositions(): Array<{ players: number } & TeamComposition> {
  return Array.from({ length: 16 }, (_, i) => i + 5).map((p) => ({
    players: p,
    ...(getTeamComposition(p) ?? { townsfolk: 0, outsiders: 0, minions: 0, demons: 0 }),
  }))
}
