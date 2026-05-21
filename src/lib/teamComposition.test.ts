import { describe, it, expect } from 'vitest'
import { getTeamComposition } from './teamComposition'

describe('getTeamComposition', () => {
  it('5 players: 3/0/1/1', () => {
    expect(getTeamComposition(5)).toEqual({ townsfolk: 3, outsiders: 0, minions: 1, demons: 1 })
  })
  it('6 players: 3/1/1/1', () => {
    expect(getTeamComposition(6)).toEqual({ townsfolk: 3, outsiders: 1, minions: 1, demons: 1 })
  })
  it('12 players: 7/2/2/1', () => {
    expect(getTeamComposition(12)).toEqual({ townsfolk: 7, outsiders: 2, minions: 2, demons: 1 })
  })
  it('15 players: 9/2/3/1', () => {
    expect(getTeamComposition(15)).toEqual({ townsfolk: 9, outsiders: 2, minions: 3, demons: 1 })
  })
  it('returns null for < 5 players', () => {
    expect(getTeamComposition(4)).toBeNull()
  })
})
