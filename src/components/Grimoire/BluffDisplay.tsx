import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLibraryStore } from '@/store/libraryStore'
import { resolveRoleText } from '@/lib/roleResolution'
import { useRolePool } from '@/hooks/useRolePool'
import { CharacterIcon } from '@/components/ui/CharacterIcon'
import { BluffPicker } from './BluffPicker'

/** Shown in the centre of the town-square circle */
export function BluffDisplay() {
  const { script, bluffs, removeBluff } = useGameStore()
  const { editOverrides, locales, activeLocale } = useLibraryStore()
  const pool = useRolePool()
  const [showPicker, setShowPicker] = useState(false)

  if (!script) return null

  const bluffRoles = bluffs
    .map((id) => pool.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)

  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(140px, 28%, 220px)',
          zIndex: 5,
        }}
      >
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          {/* Label */}
          <span className="text-[10px] uppercase tracking-widest text-red-400/70 font-semibold select-none">
            Demon bluffs
          </span>

          {/* Bluff token row */}
          <div className="flex items-end justify-center gap-2 flex-wrap">
            {bluffRoles.map((role) => {
              const res = resolveRoleText(role, editOverrides, locales, activeLocale)
              return (
                <button
                  key={role.id}
                  onClick={() => removeBluff(role.id)}
                  title={`${res.displayName} — click to remove`}
                  className="flex flex-col items-center gap-0.5 group"
                >
                  <div className="relative">
                    <CharacterIcon
                      role={role}
                      size={44}
                      className="ring-1 ring-red-700 ring-offset-1 ring-offset-gray-950 rounded-full"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                      <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                    </div>
                  </div>
                  <span
                    className="text-[9px] text-gray-400 leading-none text-center max-w-[48px] truncate"
                    style={{ textShadow: '0 1px 3px #000' }}
                  >
                    {res.displayName}
                  </span>
                </button>
              )
            })}

            {/* Empty slots */}
            {bluffRoles.length === 0 && (
              <span className="text-xs text-gray-700 italic">None</span>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={() => setShowPicker(true)}
            className="text-[10px] text-red-500/60 hover:text-red-400 transition-colors mt-0.5 px-2 py-0.5 rounded"
          >
            {bluffRoles.length === 0 ? '+ set bluffs' : '✎ edit'}
          </button>
        </div>
      </div>

      <BluffPicker open={showPicker} onClose={() => setShowPicker(false)} />
    </>
  )
}
