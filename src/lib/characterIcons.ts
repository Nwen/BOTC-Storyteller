import type { Alignment, IconSource, RoleBase, Team } from '@/types'

const OFFICIAL_BASE = 'https://release.botc.app/resources/characters/'
const ALTERNATE_BASE = 'https://raw.githubusercontent.com/tomozbot/botc-icons/main/WEBP/Alternate/'

/**
 * Official and alternate art sits in a wide transparent margin (the artwork spans
 * at most ~77% of the canvas), so it is scaled up to fill its box without clipping.
 */
export const PADDED_ICON_ZOOM = 1.3

export function isPaddedIconUrl(url: string): boolean {
  return url.startsWith(OFFICIAL_BASE) || url.startsWith(ALTERNATE_BASE)
}

/** Official team-level art (e.g. for info that isn't tied to one character) */
export function genericTeamIconUrl(team: Team | 'good' | 'evil'): string {
  return `${OFFICIAL_BASE}generic/${team === 'traveler' ? 'traveller' : team}.webp`
}

const GOOD_TEAMS = new Set(['townsfolk', 'outsider'])
const EVIL_TEAMS = new Set(['minion', 'demon'])

/**
 * Official icons come as {edition}/{id}_g.webp / _e.webp for aligned characters
 * and {edition}/{id}.webp for unaligned ones (fabled, loric, travellers' neutral art).
 */
function officialUrl(role: RoleBase, alignment: Alignment): string | null {
  if (!role.edition) return null
  let suffix = ''
  if (role.team === 'traveler') {
    if (alignment === 'good') suffix = '_g'
    else if (alignment === 'evil') suffix = '_e'
  } else if (GOOD_TEAMS.has(role.team) || EVIL_TEAMS.has(role.team)) {
    const evil = alignment === 'unknown' ? EVIL_TEAMS.has(role.team) : alignment === 'evil'
    suffix = evil ? '_e' : '_g'
  }
  return `${OFFICIAL_BASE}${role.edition}/${role.id}${suffix}.webp`
}

/** The alternate set is flat; only travellers have _g / _e variants (no neutral one). */
function alternateUrl(role: RoleBase, alignment: Alignment): string {
  const suffix = role.team === 'traveler' ? (alignment === 'evil' ? '_e' : '_g') : ''
  return `${ALTERNATE_BASE}${role.id}${suffix}.webp`
}

/**
 * Ordered list of URLs to try for a role's icon; the caller falls through to the
 * next one on load error, then to the initials badge.
 * `alignment` is the player's current alignment when known, so a turned-evil
 * Townsfolk shows its evil art.
 */
export function iconCandidates(
  role: RoleBase,
  source: IconSource,
  customBaseUrl: string,
  alignment: Alignment = 'unknown',
): string[] {
  if (role.image) return [role.image]
  const official = officialUrl(role, alignment)
  const alternate = alternateUrl(role, alignment)
  const urls =
    source === 'custom' ? [`${customBaseUrl}${role.id}.png`, official, alternate]
    : source === 'alternate' ? [alternate, official]
    : [official, alternate]
  return urls.filter((u): u is string => !!u)
}
