import { describe, it, expect } from 'vitest'
import { iconCandidates } from './characterIcons'
import type { RoleBase } from '@/types'

const OFF = 'https://release.botc.app/resources/characters/'
const ALT = 'https://raw.githubusercontent.com/tomozbot/botc-icons/main/WEBP/Alternate/'

const imp: RoleBase = { id: 'imp', name: 'Imp', team: 'demon', edition: 'tb' }
const chef: RoleBase = { id: 'chef', name: 'Chef', team: 'townsfolk', edition: 'tb' }
const thief: RoleBase = { id: 'thief', name: 'Thief', team: 'traveler', edition: 'tb' }
const angel: RoleBase = { id: 'angel', name: 'Angel', team: 'fabled', edition: 'fabled' }

describe('iconCandidates', () => {
  it('uses the team alignment by default', () => {
    expect(iconCandidates(imp, 'official', '')[0]).toBe(`${OFF}tb/imp_e.webp`)
    expect(iconCandidates(chef, 'official', '')[0]).toBe(`${OFF}tb/chef_g.webp`)
  })

  it("follows the player's alignment when known", () => {
    expect(iconCandidates(chef, 'official', '', 'evil')[0]).toBe(`${OFF}tb/chef_e.webp`)
  })

  it('uses unaligned art for fabled and unassigned travellers', () => {
    expect(iconCandidates(angel, 'official', '')[0]).toBe(`${OFF}fabled/angel.webp`)
    expect(iconCandidates(thief, 'official', '')[0]).toBe(`${OFF}tb/thief.webp`)
    expect(iconCandidates(thief, 'official', '', 'evil')[0]).toBe(`${OFF}tb/thief_e.webp`)
  })

  it('falls back to the alternate set', () => {
    expect(iconCandidates(imp, 'official', '')).toEqual([`${OFF}tb/imp_e.webp`, `${ALT}imp.webp`])
    expect(iconCandidates(thief, 'alternate', '')[0]).toBe(`${ALT}thief_g.webp`)
  })

  it('skips the official source for roles without an edition', () => {
    const homebrew: RoleBase = { id: 'x', name: 'X', team: 'townsfolk', custom: true }
    expect(iconCandidates(homebrew, 'official', '')).toEqual([`${ALT}x.webp`])
  })

  it('prefers an explicit image, then a custom base URL', () => {
    expect(iconCandidates({ ...imp, image: 'a.png' }, 'official', '')).toEqual(['a.png'])
    expect(iconCandidates(imp, 'custom', '/icons/')[0]).toBe('/icons/imp.png')
  })
})
