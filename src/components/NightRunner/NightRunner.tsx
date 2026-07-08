import { useState, useMemo, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useInfoStore } from '@/store/infoStore'
import { buildNightOrder } from '@/lib/nightOrder'
import { resolveRoleText } from '@/lib/roleResolution'
import { getTemplateForCharacter, expandTemplate } from '@/lib/infoResolution'
import { useRolePool } from '@/hooks/useRolePool'
import type { NightStep } from '@/types'

export function NightRunner() {
  const { script, players, day, advancePhase, setPhase } = useGameStore()
  const { editOverrides, locales, activeLocale, customTemplates } = useLibraryStore()
  const openComposer = useInfoStore((s) => s.openComposer)
  const rolePool = useRolePool()

  const [nightType, setNightType] = useState<'first' | 'other'>(day === 0 ? 'first' : 'other')
  const [includeAll, setIncludeAll] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  useEffect(() => {
    setNightType(day === 0 ? 'first' : 'other')
    setCurrentStep(0)
    setChecked(new Set())
  }, [day])

  const steps: NightStep[] = useMemo(() => {
    if (!script) return []
    const resolvedPool = rolePool.map((r) => {
      const res = resolveRoleText(r, editOverrides, locales, activeLocale)
      return {
        ...r,
        name: res.displayName,
        firstNightReminder: res.displayFirstNightReminder,
        otherNightReminder: res.displayOtherNightReminder,
      }
    })
    return buildNightOrder(nightType, script, players, resolvedPool, includeAll)
  }, [nightType, script, players, rolePool, includeAll, editOverrides, locales, activeLocale])

  const total = steps.length
  const step = steps[currentStep]

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })

  const reset = () => { setCurrentStep(0); setChecked(new Set()) }

  if (!script) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-4xl mb-3">🌙</p>
          <p>No script loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b border-gray-800 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">Night Order</h2>
          <span className="text-sm text-gray-400">Day {day}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex rounded overflow-hidden border border-gray-700">
            <button
              onClick={() => { setNightType('first'); reset() }}
              className={`px-4 py-2 text-sm ${nightType === 'first' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              First Night
            </button>
            <button
              onClick={() => { setNightType('other'); reset() }}
              className={`px-4 py-2 text-sm ${nightType === 'other' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              Other Nights
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAll}
              onChange={(e) => { setIncludeAll(e.target.checked); reset() }}
              className="w-4 h-4"
            />
            Show full script
          </label>

          <button onClick={reset} className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm">
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Current step highlight */}
        {step && (
          <div className="md:w-80 border-b md:border-b-0 md:border-r border-gray-800 p-6 shrink-0 flex flex-col gap-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Step {currentStep + 1} of {total}
            </div>

            <div>
              <p className={`text-2xl font-bold ${step.type === 'special' ? 'text-yellow-400' : 'text-white'}`}>
                {step.label}
              </p>
              {step.players && step.players.length > 0 && (
                <p className="text-sm text-blue-400 mt-1">{step.players.join(', ')}</p>
              )}
            </div>

            {step.reminder && (
              <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 leading-relaxed">
                {step.reminder}
              </div>
            )}

            {step.type === 'special' && step.id === 'minioninfo' && (
              <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 text-sm text-orange-300">
                Tell minions: who the demon is, and (if 3+ minions) who each other is.
              </div>
            )}
            {step.type === 'special' && step.id === 'demoninfo' && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">
                Tell demon: who the minions are, and 3 not-in-play good characters as bluffs.
              </div>
            )}

            {step.type === 'role' && (() => {
              const tpl = getTemplateForCharacter(step.id, customTemplates)
              if (!tpl) return null
              return (
                <button
                  onClick={() => openComposer({
                    draft: expandTemplate(tpl),
                    templateId: tpl.id,
                  })}
                  className="px-3 py-2 rounded bg-indigo-800 hover:bg-indigo-700 border border-indigo-600 text-sm text-indigo-200"
                >
                  📋 Show info
                </button>
              )
            })()}

            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => setCurrentStep((i) => Math.max(0, i - 1))}
                disabled={currentStep === 0}
                className="flex-1 py-3 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm"
              >
                ← Back
              </button>
              <NextStepButton
                step={step}
                nextStepId={steps[currentStep + 1]?.id}
                onNext={() => {
                  toggle(currentStep)
                  const nextId = steps[currentStep + 1]?.id
                  if (step.id === 'dusk') {
                    // Enters the night phase; advancePhase also bumps the day counter
                    // when coming from a previous day's dusk (not on the very first night).
                    advancePhase()
                  } else if (nextId === 'dawn') {
                    setPhase('dawn')
                  } else if (step.id === 'dawn') {
                    setPhase('day')
                  }
                  if (currentStep === total - 1) reset()
                  else setCurrentStep((i) => i + 1)
                }}
              />
            </div>
          </div>
        )}

        {/* Step list */}
        <div className="flex-1 scrollable p-4 space-y-1">
          {steps.map((s, i) => (
            <button
              key={s.id + String(i)}
              onClick={() => setCurrentStep(i)}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                i === currentStep
                  ? 'bg-blue-800 border border-blue-600'
                  : checked.has(i)
                  ? 'bg-gray-800/50 opacity-60'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs ${
                checked.has(i) ? 'bg-green-800 border-green-600 text-green-300' : 'border-gray-600'
              }`}>
                {checked.has(i) ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <span className={`text-sm font-medium ${s.type === 'special' ? 'text-yellow-400' : ''}`}>
                  {s.label}
                </span>
                {s.players && s.players.length > 0 && (
                  <span className="text-xs text-blue-400 ml-2">{s.players.join(', ')}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function NextStepButton({
  step, nextStepId, onNext,
}: Readonly<{
  step: NightStep
  nextStepId: string | undefined
  onNext: () => void
}>) {
  let label = 'Next →'
  let cls = 'bg-blue-700 hover:bg-blue-600'

  if (step.id === 'dusk') {
    label = '→ Night'
    cls = 'bg-indigo-700 hover:bg-indigo-600'
  } else if (nextStepId === 'dawn') {
    label = '→ Dawn'
    cls = 'bg-indigo-700 hover:bg-indigo-600'
  } else if (step.id === 'dawn') {
    label = '→ Day'
    cls = 'bg-yellow-700 hover:bg-yellow-600'
  }

  return (
    <button onClick={onNext} className={`flex-1 py-3 rounded text-sm font-medium ${cls}`}>
      {label}
    </button>
  )
}
