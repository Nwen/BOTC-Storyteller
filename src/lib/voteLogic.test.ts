import { describe, it, expect } from 'vitest'
import {
  executionThreshold, countYesVotes, resolveNomination,
  eligibleVoters, canNominate,
} from './voteLogic'
import type { Player, Nomination } from '@/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Alice', seatIndex: 0, roleId: null,
    alignment: 'good', isAlive: true, ghostVoteAvailable: true,
    reminders: [], notes: '',
    ...overrides,
  }
}

const PLAYERS: Player[] = [
  makePlayer({ id: 'p1', name: 'Alice', seatIndex: 0 }),
  makePlayer({ id: 'p2', name: 'Bob', seatIndex: 1 }),
  makePlayer({ id: 'p3', name: 'Carol', seatIndex: 2 }),
  makePlayer({ id: 'p4', name: 'Dave', seatIndex: 3, isAlive: false, ghostVoteAvailable: true }),
  makePlayer({ id: 'p5', name: 'Eve', seatIndex: 4, isAlive: false, ghostVoteAvailable: false }),
]

describe('executionThreshold', () => {
  it('ceil(living/2)', () => {
    expect(executionThreshold(PLAYERS)).toBe(2) // 3 alive → ceil(3/2)=2
  })
  it('5 alive → 3', () => {
    const players = Array.from({ length: 5 }, (_, i) =>
      makePlayer({ id: `p${i}`, seatIndex: i }),
    )
    expect(executionThreshold(players)).toBe(3)
  })
})

describe('countYesVotes', () => {
  it('counts yes votes from alive players', () => {
    const nom: Nomination = {
      id: 'n1', nominatorId: 'p1', nomineeId: 'p2',
      votes: { p1: 'yes', p2: 'no', p3: 'yes', p4: 'yes', p5: 'yes' },
      isResolved: false, executed: false,
    }
    // p5 has spent ghost vote → should not count
    expect(countYesVotes(nom, PLAYERS)).toBe(3) // p1, p3 (alive), p4 (ghost available)
  })
})

describe('eligibleVoters', () => {
  it('includes alive players and dead with ghost vote, sorted by seat', () => {
    const eligible = eligibleVoters(PLAYERS)
    expect(eligible.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
    // p5 is dead with spent ghost vote — excluded
  })
})

describe('canNominate', () => {
  const nominations: Nomination[] = [
    { id: 'n1', nominatorId: 'p1', nomineeId: 'p2', votes: {}, isResolved: false, executed: false },
  ]
  it('blocks duplicate nominator', () => {
    expect(canNominate('p1', 'p3', nominations).allowed).toBe(false)
  })
  it('blocks duplicate nominee', () => {
    expect(canNominate('p3', 'p2', nominations).allowed).toBe(false)
  })
  it('allows fresh nomination', () => {
    expect(canNominate('p3', 'p4', nominations).allowed).toBe(true)
  })
})

describe('resolveNomination', () => {
  it('executes when votes meet threshold and no higher tie', () => {
    const nom: Nomination = {
      id: 'n1', nominatorId: 'p1', nomineeId: 'p2',
      votes: { p1: 'yes', p3: 'yes' }, // 2 yes = threshold
      isResolved: false, executed: false,
    }
    const { executed } = resolveNomination(nom, [nom], PLAYERS)
    expect(executed).toBe(true)
  })
  it('does not execute when below threshold', () => {
    const nom: Nomination = {
      id: 'n1', nominatorId: 'p1', nomineeId: 'p2',
      votes: { p1: 'yes' }, // 1 yes < 2 threshold
      isResolved: false, executed: false,
    }
    const { executed } = resolveNomination(nom, [nom], PLAYERS)
    expect(executed).toBe(false)
  })
})
