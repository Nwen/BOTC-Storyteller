// ─── Core character / role types ────────────────────────────────────────────

export type Team = 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveler' | 'fabled'

export interface RoleBase {
  id: string
  name: string
  team: Team
  edition?: string
  ability?: string
  firstNight?: number
  firstNightReminder?: string
  otherNight?: number
  otherNightReminder?: string
  reminders?: string[]
  remindersGlobal?: string[]
  setup?: boolean
  image?: string
  /** Custom / homebrew roles have this flag */
  custom?: boolean
  /** Jinx descriptions keyed by the other character id */
  jinxes?: Record<string, string>
}

/** A fully resolved role with all display text applied via the resolution layer */
export type ResolvedRole = RoleBase & {
  displayName: string
  displayAbility: string
  displayReminders: string[]
  displayFirstNightReminder: string
  displayOtherNightReminder: string
}

// ─── Script / import types ───────────────────────────────────────────────────

export interface ScriptMeta {
  id: '_meta'
  name?: string
  author?: string
  logo?: string
  firstNight?: string[]
  otherNight?: string[]
}

/** One element in a custom-script JSON array */
export type ScriptEntry = string | { id: string } | (RoleBase & { id: string })

export interface LoadedScript {
  meta: Omit<ScriptMeta, 'id'>
  /** Fully resolved characters in script order, homebrew merged in */
  roles: RoleBase[]
  /** Explicit night-order overrides from _meta (if present) */
  metaFirstNight?: string[]
  metaOtherNight?: string[]
}

// ─── Night order ─────────────────────────────────────────────────────────────

export type SpecialStep = 'dusk' | 'minioninfo' | 'demoninfo' | 'dawn'

export interface NightStep {
  type: 'role' | 'special'
  id: string            // role id or special step id
  label: string
  reminder: string
  /** Player name(s) holding this character in the current game */
  players?: string[]
}

// ─── Player / Grimoire types ─────────────────────────────────────────────────

export type Alignment = 'good' | 'evil' | 'unknown'

export interface ReminderToken {
  id: string            // unique token instance id
  roleId: string        // which role owns this reminder type
  label: string         // display text (resolved)
  custom?: boolean      // user-created free-text token
}

export interface Player {
  id: string
  name: string
  seatIndex: number     // 0-based position around the circle
  roleId: string | null
  /** For roles whose player believes they are someone else (Drunk, Marionette):
   *  the character they think they have. See lib/facadeRoles.ts */
  facadeRoleId?: string | null
  alignment: Alignment
  isAlive: boolean
  ghostVoteAvailable: boolean
  reminders: ReminderToken[]
  notes: string
}

// ─── Vote / Nomination types ─────────────────────────────────────────────────

export type VoteChoice = 'yes' | 'no' | 'abstain' | null

export interface Nomination {
  id: string
  nominatorId: string
  nomineeId: string
  votes: Record<string, VoteChoice>   // playerId → choice
  isResolved: boolean
  executed: boolean
}

// ─── Game log ────────────────────────────────────────────────────────────────

export type LogEntryKind =
  | 'phase_change'
  | 'player_death'
  | 'nomination'
  | 'vote_result'
  | 'execution'
  | 'annotation'
  | 'info_reveal'

export interface LogEntry {
  id: string
  timestamp: number   // Date.now()
  day: number
  phase: GamePhase
  kind: LogEntryKind
  text: string
}

// ─── Game phase ───────────────────────────────────────────────────────────────

export type GamePhase = 'setup' | 'night' | 'dawn' | 'day' | 'dusk'

// ─── Full game state (persisted) ──────────────────────────────────────────────

export interface GameState {
  phase: GamePhase
  day: number
  players: Player[]
  nominations: Nomination[]
  log: LogEntry[]
  globalNotes: string
  bluffs: string[]    // role ids shown to demon as bluffs
  script: LoadedScript | null
  iconBaseUrl: string
}

// ─── Player Info ─────────────────────────────────────────────────────────────

export type DraftAtom =
  | { kind: 'statement';  key: string }
  | { kind: 'player';     playerId: string | null }
  | { kind: 'character';  roleId: string | null; filter?: { team?: Team } }
  | { kind: 'team';       value: 'good' | 'evil' | Team | null }
  | { kind: 'yesno';      value: boolean }
  | { kind: 'number';     value: number; max?: number }
  | { kind: 'free_text';  text: string }

export type TemplateAtom =
  | { kind: 'statement';  key: string }
  | { kind: 'player';     slots: number }
  | { kind: 'character';  filter?: { team?: Team } }
  | { kind: 'team' }
  | { kind: 'yesno' }
  | { kind: 'number';     max?: number }
  | { kind: 'free_text' }

export interface InfoTemplate {
  id: string
  characterId?: string
  label: string
  atoms: TemplateAtom[]
  custom?: boolean
}

// ─── Library state (separate persistence) ────────────────────────────────────

export interface RoleTextOverride {
  name?: string
  ability?: string
  reminders?: string[]
  firstNightReminder?: string
  otherNightReminder?: string
}

export interface LocaleData {
  locale: string        // e.g. 'fr'
  name: string          // e.g. 'Français'
  roles: Record<string, RoleTextOverride>
  teams?: Record<string, string>
  statements?: Record<string, string>
  yesno?: { yes?: string; no?: string }
  templates?: Record<string, { label: string }>
}

/** A script the user imported, kept so it can be reloaded in a later session */
export interface SavedScript {
  id: string
  /** Name shown in the picker — script meta name, else the imported filename */
  name: string
  savedAt: number
  script: LoadedScript
}

export interface LibraryState {
  customRoles: RoleBase[]
  /** English-level edit overrides (layer 2) */
  editOverrides: Record<string, RoleTextOverride>
  /** Imported / built translation locales (layer 1) */
  locales: Record<string, LocaleData>
  activeLocale: string   // 'en' = no translation applied
  customTemplates: InfoTemplate[]
  customStatements: Record<string, string>
  /** Scripts loaded from public/scripts/ at startup — not persisted */
  bundledScripts: LoadedScript[]
  /** Scripts the user imported — persisted */
  savedScripts: SavedScript[]
}

// ─── Team composition ────────────────────────────────────────────────────────

export interface TeamComposition {
  townsfolk: number
  outsiders: number
  minions: number
  demons: number
}
