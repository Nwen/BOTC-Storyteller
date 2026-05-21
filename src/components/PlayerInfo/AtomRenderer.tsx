import { useLibraryStore } from '@/store/libraryStore'
import { useGameStore } from '@/store/gameStore'
import { useAllResolvedRoles } from '@/hooks/useRoleResolution'
import { resolveStatement, resolveYesNo } from '@/lib/infoResolution'
import { TEAM_LABELS } from '@/components/ui/TeamBadge'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import type { DraftAtom, Team } from '@/types'

const TEAM_COLORS: Record<string, string> = {
  good:      'text-blue-300',
  evil:      'text-red-300',
  townsfolk: 'text-blue-300',
  outsider:  'text-cyan-300',
  minion:    'text-orange-300',
  demon:     'text-red-300',
  traveler:  'text-purple-300',
  fabled:    'text-yellow-300',
}

type Size = 'preview' | 'full'

interface Props {
  atom: DraftAtom
  size?: Size
}

export function AtomRenderer({ atom, size = 'full' }: Readonly<Props>) {
  switch (atom.kind) {
    case 'statement': return <StatementAtom atom={atom} size={size} />
    case 'player':    return <PlayerAtom atom={atom} size={size} />
    case 'character': return <CharacterAtom atom={atom} size={size} />
    case 'team':      return <TeamAtom atom={atom} size={size} />
    case 'yesno':     return <YesNoAtom atom={atom} size={size} />
    case 'number':    return <NumberAtom atom={atom} size={size} />
    case 'free_text': return <FreeTextAtom atom={atom} size={size} />
  }
}

function StatementAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'statement' }>; size: Size }>) {
  const { locales, activeLocale, customStatements } = useLibraryStore()
  const sm = size === 'preview'
  const text = resolveStatement(atom.key, locales, activeLocale, customStatements)
  return (
    <div className={`font-bold text-yellow-300 uppercase tracking-widest text-center leading-tight ${
      sm ? 'text-xs' : 'text-4xl md:text-5xl lg:text-6xl'
    }`}>
      {text}
    </div>
  )
}

function PlayerAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'player' }>; size: Size }>) {
  const { players } = useGameStore()
  const sm = size === 'preview'
  const player = atom.playerId ? players.find((p) => p.id === atom.playerId) : null
  if (!player) {
    return <div className={`italic text-gray-500 text-center ${sm ? 'text-xs' : 'text-2xl'}`}>[Player]</div>
  }
  return (
    <div className="text-center">
      <div className={`font-black text-white leading-tight ${sm ? 'text-sm' : 'text-5xl md:text-6xl lg:text-7xl'}`}>
        {player.name}
      </div>
      <div className={`text-gray-400 font-medium mt-1 ${sm ? 'text-xs' : 'text-xl md:text-2xl'}`}>
        Seat {player.seatIndex + 1}
      </div>
    </div>
  )
}

function CharacterAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'character' }>; size: Size }>) {
  const allRoles = useAllResolvedRoles()
  const sm = size === 'preview'
  const role = atom.roleId ? allRoles.find((r) => r.id === atom.roleId) : null
  if (!role) {
    return <div className={`italic text-gray-500 text-center ${sm ? 'text-xs' : 'text-2xl'}`}>[Character]</div>
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <CharacterIcon role={role} size={sm ? 36 : 250} />
      <span className={`font-black text-white text-center leading-tight ${sm ? 'text-xs' : 'text-3xl md:text-4xl'}`}>
        {role.displayName}
      </span>
    </div>
  )
}

function TeamAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'team' }>; size: Size }>) {
  const { locales, activeLocale } = useLibraryStore()
  const sm = size === 'preview'
  if (!atom.value) {
    return <div className={`italic text-gray-500 text-center ${sm ? 'text-xs' : 'text-2xl'}`}>[Team]</div>
  }
  const color = TEAM_COLORS[atom.value] ?? 'text-white'
  const teamNames = locales[activeLocale]?.teams
  const label = (teamNames?.[atom.value] ?? TEAM_LABELS[atom.value as Team] ?? atom.value).toUpperCase()
  return (
    <div className={`font-black uppercase text-center leading-none ${color} ${
      sm ? 'text-lg' : 'text-6xl md:text-7xl lg:text-8xl'
    }`}>
      {label}
    </div>
  )
}

function YesNoAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'yesno' }>; size: Size }>) {
  const { locales, activeLocale } = useLibraryStore()
  const sm = size === 'preview'
  const text = resolveYesNo(atom.value, locales, activeLocale)
  return (
    <div className={`font-black text-center leading-none ${
      atom.value ? 'text-green-400' : 'text-red-400'
    } ${sm ? 'text-2xl' : 'text-[10rem] md:text-[14rem]'}`}>
      {text}
    </div>
  )
}

function NumberAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'number' }>; size: Size }>) {
  const sm = size === 'preview'
  return (
    <div className={`font-black text-white text-center leading-none ${
      sm ? 'text-3xl' : 'text-[10rem] md:text-[14rem]'
    }`}>
      {atom.value}
    </div>
  )
}

function FreeTextAtom({ atom, size }: Readonly<{ atom: Extract<DraftAtom, { kind: 'free_text' }>; size: Size }>) {
  const sm = size === 'preview'
  return (
    <div className={`font-bold text-white text-center leading-snug ${
      sm ? 'text-xs' : 'text-4xl md:text-5xl lg:text-6xl'
    }`}>
      {atom.text || <span className="italic text-gray-500">[Free text]</span>}
    </div>
  )
}
