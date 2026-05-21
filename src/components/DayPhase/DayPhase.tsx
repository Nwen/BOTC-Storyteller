import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { canNominate, countYesVotes, executionThreshold, eligibleVoters } from '@/lib/voteLogic'
import type { Nomination, Player, VoteChoice } from '@/types'

export function DayPhase() {
  const {
    players, nominations, day, phase,
    addNomination, advancePhase,
  } = useGameStore()

  const [nominatorId, setNominatorId] = useState('')
  const [nomineeId, setNomineeId] = useState('')
  const [nomError, setNomError] = useState<string | null>(null)
  const [activeNomId, setActiveNomId] = useState<string | null>(null)

  const threshold = executionThreshold(players)
  const livingCount = players.filter((p) => p.isAlive).length
  const canVote = phase === 'day'

  const submitNomination = () => {
    setNomError(null)
    if (!nominatorId || !nomineeId) { setNomError('Select both players.'); return }
    if (nominatorId === nomineeId) { setNomError('A player cannot nominate themselves.'); return }
    const check = canNominate(nominatorId, nomineeId, nominations)
    if (!check.allowed) { setNomError(check.reason ?? 'Cannot nominate.'); return }
    addNomination(nominatorId, nomineeId)
    setNominatorId('')
    setNomineeId('')
  }

  const activeNom = nominations.find((n) => n.id === activeNomId) ?? null

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-800 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Day {day} — {phase}</h2>
            <p className="text-sm text-gray-500">
              Threshold: {threshold} votes ({livingCount} living)
            </p>
          </div>
          <button
            onClick={advancePhase}
            className="px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-sm font-medium min-h-[44px]"
          >
            Advance Phase →
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Nomination form + list */}
        <div className="md:w-72 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col">
          <div className="p-4 space-y-3 border-b border-gray-700">
            <p className="text-sm font-medium text-gray-300">New Nomination</p>
            {!canVote && (
              <p className="text-xs text-yellow-600">Nominations only available during the Day phase.</p>
            )}
            <PlayerSelect
              label="Nominator"
              players={players}
              value={nominatorId}
              onChange={setNominatorId}
              disabledIds={nominations.map((n) => n.nominatorId)}
              disabled={!canVote}
            />
            <PlayerSelect
              label="Nominee"
              players={players}
              value={nomineeId}
              onChange={setNomineeId}
              disabledIds={nominations.map((n) => n.nomineeId)}
              disabled={!canVote}
            />
            {nomError && <p className="text-xs text-red-400">{nomError}</p>}
            <button
              onClick={submitNomination}
              disabled={!canVote}
              className="w-full py-2.5 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Nominate
            </button>
          </div>

          <div className="flex-1 scrollable p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nominations today</p>
            {nominations.length === 0 && (
              <p className="text-sm text-gray-600">None yet.</p>
            )}
            {nominations.map((nom) => {
              const nominator = players.find((p) => p.id === nom.nominatorId)
              const nominee = players.find((p) => p.id === nom.nomineeId)
              const yes = countYesVotes(nom, players)
              return (
                <button
                  key={nom.id}
                  onClick={() => setActiveNomId(activeNomId === nom.id ? null : nom.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition-colors text-sm ${
                    activeNomId === nom.id
                      ? 'bg-blue-800 border border-blue-600'
                      : nom.isResolved
                      ? 'bg-gray-800/50 opacity-70'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">
                    {nominator?.name ?? '?'} → {nominee?.name ?? '?'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {yes} votes
                    {nom.isResolved && (nom.executed ? ' — EXECUTED' : ' — not executed')}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Voting panel */}
        <div className="flex-1 scrollable p-4">
          {activeNom ? (
            <VotingPanel nomination={activeNom} players={players} threshold={threshold} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a nomination to run the vote.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerSelect({
  label, players, value, onChange, disabledIds = [], disabled = false,
}: {
  label: string
  players: Player[]
  value: string
  onChange: (id: string) => void
  disabledIds?: string[]
  disabled?: boolean
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-gray-800 rounded px-3 py-2 text-sm border border-gray-700 outline-none disabled:opacity-40"
      >
        <option value="">— Select —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id} disabled={disabledIds.includes(p.id)}>
            {p.name} {disabledIds.includes(p.id) ? '(used)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

function VotingPanel({
  nomination, players, threshold,
}: {
  nomination: Nomination
  players: Player[]
  threshold: number
}) {
  const { recordVote, resolveNomination } = useGameStore()
  const nominator = players.find((p) => p.id === nomination.nominatorId)
  const nominee = players.find((p) => p.id === nomination.nomineeId)
  const eligible = eligibleVoters(players)
  const yes = countYesVotes(nomination, players)
  const meetsThreshold = yes >= threshold

  const choiceFor = (playerId: string): VoteChoice =>
    (nomination.votes[playerId] as VoteChoice | undefined) ?? null

  const cycleVote = (playerId: string) => {
    if (nomination.isResolved) return
    const current = choiceFor(playerId)
    const next: VoteChoice = current === null ? 'yes' : current === 'yes' ? 'no' : null
    recordVote(nomination.id, playerId, next)
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">
          {nominator?.name ?? '?'} nominated {nominee?.name ?? '?'}
        </h3>
        <p className="text-sm text-gray-400">
          {yes} / {threshold} votes needed
          <span className={`ml-2 font-medium ${meetsThreshold ? 'text-green-400' : 'text-gray-500'}`}>
            {meetsThreshold ? '✓ Meets threshold' : '✗ Below threshold'}
          </span>
        </p>
      </div>

      {/* Vote tracker */}
      <div className="space-y-1">
        {eligible.map((player) => {
          const choice = choiceFor(player.id)
          return (
            <button
              key={player.id}
              onClick={() => cycleVote(player.id)}
              disabled={nomination.isResolved}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                choice === 'yes'
                  ? 'bg-green-900 border border-green-700'
                  : choice === 'no'
                  ? 'bg-red-900/40 border border-red-900'
                  : 'bg-gray-800 hover:bg-gray-700'
              } ${nomination.isResolved ? 'cursor-default' : ''}`}
            >
              <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm shrink-0 ${
                choice === 'yes' ? 'bg-green-700 border-green-500 text-white' :
                choice === 'no' ? 'bg-red-900 border-red-700 text-gray-300' :
                'border-gray-600 text-gray-500'
              }`}>
                {choice === 'yes' ? '✓' : choice === 'no' ? '✗' : '—'}
              </span>
              <div>
                <span className="text-sm font-medium">{player.name}</span>
                {!player.isAlive && (
                  <span className="text-xs text-gray-500 ml-2">
                    👻 {player.ghostVoteAvailable ? 'ghost vote' : 'spent'}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Resolve */}
      {!nomination.isResolved && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => resolveNomination(nomination.id, true)}
            className="flex-1 py-3 rounded bg-red-700 hover:bg-red-600 text-sm font-medium"
          >
            Execute
          </button>
          <button
            onClick={() => resolveNomination(nomination.id, false)}
            className="flex-1 py-3 rounded bg-gray-700 hover:bg-gray-600 text-sm font-medium"
          >
            No execution
          </button>
        </div>
      )}

      {nomination.isResolved && (
        <div className={`rounded-lg p-3 text-sm font-medium ${
          nomination.executed ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-gray-800 text-gray-400'
        }`}>
          {nomination.executed ? `⚰ ${nominee?.name} was executed.` : 'Not executed.'}
        </div>
      )}
    </div>
  )
}
