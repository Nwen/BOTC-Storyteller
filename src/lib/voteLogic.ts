import type { Player, Nomination, VoteChoice } from '@/types'

/** Execution threshold = ceil(livingCount / 2) */
export function executionThreshold(players: Player[]): number {
  const living = players.filter((p) => p.isAlive).length
  return Math.ceil(living / 2)
}

/** Count yes votes for a nomination */
export function countYesVotes(nomination: Nomination, players: Player[]): number {
  let count = 0
  for (const [playerId, choice] of Object.entries(nomination.votes)) {
    if (choice !== 'yes') continue
    const player = players.find((p) => p.id === playerId)
    if (!player) continue
    // Dead players may only vote if ghost vote is available
    if (!player.isAlive && !player.ghostVoteAvailable) continue
    count++
  }
  return count
}

/** Determine if a nomination results in execution given current results */
export function resolveNomination(
  nomination: Nomination,
  allNominations: Nomination[],
  players: Player[],
): { executed: boolean; reason: string } {
  const threshold = executionThreshold(players)
  const yesVotes = countYesVotes(nomination, players)

  if (yesVotes < threshold) {
    return { executed: false, reason: `${yesVotes} votes — below threshold of ${threshold}` }
  }

  // Check if any other resolved nomination has >= this vote count (tie = no execution)
  const otherMax = Math.max(
    0,
    ...allNominations
      .filter((n) => n.id !== nomination.id && n.isResolved)
      .map((n) => countYesVotes(n, players)),
  )

  if (yesVotes <= otherMax) {
    return { executed: false, reason: `${yesVotes} votes — tied with or beaten by another nominee` }
  }

  return { executed: true, reason: `${yesVotes} votes — meets threshold of ${threshold}` }
}

/** Players who can vote (alive, or dead with ghost vote) in seating order */
export function eligibleVoters(players: Player[]): Player[] {
  return [...players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .filter((p) => p.isAlive || p.ghostVoteAvailable)
}

/** Check if a player can nominate another player today */
export function canNominate(
  nominatorId: string,
  nomineeId: string,
  nominations: Nomination[],
): { allowed: boolean; reason?: string } {
  if (nominations.some((n) => n.nominatorId === nominatorId)) {
    return { allowed: false, reason: 'This player has already nominated today' }
  }
  if (nominations.some((n) => n.nomineeId === nomineeId)) {
    return { allowed: false, reason: 'This player has already been nominated today' }
  }
  return { allowed: true }
}

export function nextVoter(
  players: Player[],
  nominations: Nomination[],
  nominationId: string,
  afterSeatIndex: number,
): Player | null {
  const eligible = eligibleVoters(players)
  const nomination = nominations.find((n) => n.id === nominationId)
  if (!nomination) return null

  const voted = new Set(Object.keys(nomination.votes).filter((id) => nomination.votes[id] !== null))
  return eligible.find((p) => p.seatIndex > afterSeatIndex && !voted.has(p.id)) ?? null
}

export function voteChoiceLabel(choice: VoteChoice): string {
  if (choice === 'yes') return 'Yes'
  if (choice === 'no') return 'No'
  if (choice === 'abstain') return 'Abstain'
  return '—'
}
