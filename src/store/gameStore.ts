import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/lib/nanoid'
import { getTeamComposition } from '@/lib/teamComposition'
import type {
  GameState, GamePhase, Player, Nomination, VoteChoice, LogEntry, LogEntryKind,
  LoadedScript, Alignment, ReminderToken,
} from '@/types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface GameActions {
  // Script
  loadScript: (script: LoadedScript) => void

  // Phase management
  setPhase: (phase: GamePhase) => void
  advancePhase: () => void

  // Players
  addPlayer: (name: string) => void
  removePlayer: (id: string) => void
  renamePlayer: (id: string, name: string) => void
  reorderPlayers: (orderedIds: string[]) => void
  setPlayerRole: (id: string, roleId: string | null) => void
  setPlayerAlignment: (id: string, alignment: Alignment) => void
  killPlayer: (id: string) => void
  revivePlayer: (id: string) => void
  spendGhostVote: (id: string) => void
  restoreGhostVote: (id: string) => void
  setPlayerNotes: (id: string, notes: string) => void
  addReminderToken: (playerId: string, token: Omit<ReminderToken, 'id'>) => void
  removeReminderToken: (playerId: string, tokenId: string) => void

  // Nominations
  addNomination: (nominatorId: string, nomineeId: string) => void
  recordVote: (nominationId: string, playerId: string, choice: VoteChoice) => void
  resolveNomination: (nominationId: string, executed: boolean) => void
  clearNominations: () => void

  // Log
  addLogEntry: (kind: LogEntryKind, text: string) => void

  // Notes & bluffs
  setGlobalNotes: (notes: string) => void
  addBluff: (roleId: string) => void
  removeBluff: (roleId: string) => void

  // Config
  setIconBaseUrl: (url: string) => void

  // Role assignment
  randomizeRoles: () => void

  // Game control
  newGame: () => void
  newGameKeepPlayersAndScript: () => void
  exportGameState: () => string
  importGameState: (json: string) => void
}

// ─── Phase cycle ──────────────────────────────────────────────────────────────

const PHASE_CYCLE: GamePhase[] = ['night', 'dawn', 'day', 'dusk']

function nextPhase(current: GamePhase): { phase: GamePhase; dayIncrement: number } {
  if (current === 'setup') return { phase: 'night', dayIncrement: 0 }
  const idx = PHASE_CYCLE.indexOf(current)
  const next = PHASE_CYCLE[(idx + 1) % PHASE_CYCLE.length]!
  return { phase: next, dayIncrement: next === 'night' ? 1 : 0 }
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_STATE: GameState = {
  phase: 'setup',
  day: 0,
  players: [],
  nominations: [],
  log: [],
  globalNotes: '',
  bluffs: [],
  script: null,
  iconBaseUrl: '/assets/icons/Icon_',
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      loadScript: (script) => set({ script }),

      setPhase: (phase) => set({ phase }),

      advancePhase: () => {
        const { phase, day } = get()
        const { phase: next, dayIncrement } = nextPhase(phase)
        get().addLogEntry('phase_change', `Phase: ${next}${dayIncrement ? ` (Day ${day + dayIncrement})` : ''}`)
        set({ phase: next, day: day + dayIncrement })
        if (next === 'day') get().clearNominations()
      },

      // ── Players ──
      addPlayer: (name) => {
        const players = get().players
        const player: Player = {
          id: nanoid(),
          name,
          seatIndex: players.length,
          roleId: null,
          alignment: 'unknown',
          isAlive: true,
          ghostVoteAvailable: true,
          reminders: [],
          notes: '',
        }
        set({ players: [...players, player] })
      },

      removePlayer: (id) =>
        set((s) => ({ players: s.players.filter((p) => p.id !== id) })),

      renamePlayer: (id, name) =>
        set((s) => ({ players: s.players.map((p) => p.id === id ? { ...p, name } : p) })),

      reorderPlayers: (orderedIds) =>
        set((s) => ({
          players: orderedIds
            .map((id, seatIndex) => {
              const p = s.players.find((pl) => pl.id === id)
              return p ? { ...p, seatIndex } : null
            })
            .filter((p): p is Player => p !== null),
        })),

      setPlayerRole: (id, roleId) =>
        set((s) => ({ players: s.players.map((p) => p.id === id ? { ...p, roleId } : p) })),

      setPlayerAlignment: (id, alignment) =>
        set((s) => ({ players: s.players.map((p) => p.id === id ? { ...p, alignment } : p) })),

      killPlayer: (id) => {
        set((s) => ({
          players: s.players.map((p) => p.id === id ? { ...p, isAlive: false } : p),
        }))
        const player = get().players.find((p) => p.id === id)
        if (player) get().addLogEntry('player_death', `${player.name} died`)
      },

      revivePlayer: (id) =>
        set((s) => ({ players: s.players.map((p) => p.id === id ? { ...p, isAlive: true } : p) })),

      spendGhostVote: (id) =>
        set((s) => ({
          players: s.players.map((p) => p.id === id ? { ...p, ghostVoteAvailable: false } : p),
        })),

      restoreGhostVote: (id) =>
        set((s) => ({
          players: s.players.map((p) => p.id === id ? { ...p, ghostVoteAvailable: true } : p),
        })),

      setPlayerNotes: (id, notes) =>
        set((s) => ({ players: s.players.map((p) => p.id === id ? { ...p, notes } : p) })),

      addReminderToken: (playerId, token) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === playerId
              ? { ...p, reminders: [...p.reminders, { ...token, id: nanoid() }] }
              : p,
          ),
        })),

      removeReminderToken: (playerId, tokenId) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === playerId
              ? { ...p, reminders: p.reminders.filter((r) => r.id !== tokenId) }
              : p,
          ),
        })),

      // ── Nominations ──
      addNomination: (nominatorId, nomineeId) => {
        const { players } = get()
        const nom = players.find((p) => p.id === nominatorId)
        const nee = players.find((p) => p.id === nomineeId)
        if (!nom || !nee) return
        const nomination: Nomination = {
          id: nanoid(),
          nominatorId,
          nomineeId,
          votes: {},
          isResolved: false,
          executed: false,
        }
        set((s) => ({ nominations: [...s.nominations, nomination] }))
        get().addLogEntry('nomination', `${nom.name} nominated ${nee.name}`)
      },

      recordVote: (nominationId, playerId, choice) =>
        set((s) => ({
          nominations: s.nominations.map((n) =>
            n.id === nominationId
              ? { ...n, votes: { ...n.votes, [playerId]: choice } }
              : n,
          ),
        })),

      resolveNomination: (nominationId, executed) => {
        const { nominations, players } = get()
        const nom = nominations.find((n) => n.id === nominationId)
        if (!nom) return
        const nominee = players.find((p) => p.id === nom.nomineeId)
        set((s) => ({
          nominations: s.nominations.map((n) =>
            n.id === nominationId ? { ...n, isResolved: true, executed } : n,
          ),
        }))
        if (executed && nominee) {
          get().killPlayer(nom.nomineeId)
          get().addLogEntry('execution', `${nominee.name} was executed`)
        } else if (nominee) {
          get().addLogEntry('vote_result', `${nominee.name} was not executed`)
        }
      },

      clearNominations: () => set({ nominations: [] }),

      // ── Log ──
      addLogEntry: (kind, text) => {
        const { day, phase } = get()
        const entry: LogEntry = { id: nanoid(), timestamp: Date.now(), day, phase, kind, text }
        set((s) => ({ log: [...s.log, entry] }))
      },

      // ── Notes / bluffs ──
      setGlobalNotes: (notes) => set({ globalNotes: notes }),
      addBluff: (roleId) => set((s) => ({ bluffs: [...new Set([...s.bluffs, roleId])] })),
      removeBluff: (roleId) => set((s) => ({ bluffs: s.bluffs.filter((b) => b !== roleId) })),

      // ── Config ──
      setIconBaseUrl: (url) => set({ iconBaseUrl: url }),

      // ── Role assignment ──
      randomizeRoles: () => {
        const { script, players } = get()
        if (!script || players.length === 0) return
        const comp = getTeamComposition(players.length)
        if (!comp) return

        const byTeam = {
          townsfolk: shuffle(script.roles.filter((r) => r.team === 'townsfolk')),
          outsider:  shuffle(script.roles.filter((r) => r.team === 'outsider')),
          minion:    shuffle(script.roles.filter((r) => r.team === 'minion')),
          demon:     shuffle(script.roles.filter((r) => r.team === 'demon')),
        }

        const picked = shuffle([
          ...byTeam.townsfolk.slice(0, comp.townsfolk),
          ...byTeam.outsider.slice(0, comp.outsiders),
          ...byTeam.minion.slice(0, comp.minions),
          ...byTeam.demon.slice(0, comp.demons),
        ])

        set({
          players: players.map((p, i) => {
            const role = picked[i]
            if (!role) return p
            const alignment: Alignment =
              role.team === 'townsfolk' || role.team === 'outsider' ? 'good' : 'evil'
            return { ...p, roleId: role.id, alignment }
          }),
        })
      },

      // ── Game control ──
      newGame: () => set({ ...DEFAULT_STATE }),

      newGameKeepPlayersAndScript: () =>
        set((s) => ({
          ...DEFAULT_STATE,
          script: s.script,
          players: s.players.map((p) => ({
            ...p,
            isAlive: true,
            ghostVoteAvailable: true,
            reminders: [],
            notes: '',
            roleId: null,
            alignment: 'unknown',
          })),
          iconBaseUrl: s.iconBaseUrl,
        })),

      exportGameState: () => JSON.stringify(get(), null, 2),

      importGameState: (json) => {
        try {
          const data = JSON.parse(json) as Partial<GameState>
          set((s) => ({ ...s, ...data }))
        } catch {
          throw new Error('Invalid game state JSON')
        }
      },
    }),
    {
      name: 'botc-game',
      partialize: ({ phase: _phase, day: _day, ...rest }) => rest,
    },
  ),
)
