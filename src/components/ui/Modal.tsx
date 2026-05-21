import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className = '' }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-gray-900 rounded-xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh] ${className}`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none px-2 py-1 rounded"
            >
              ×
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 scrollable">
          {children}
        </div>
      </div>
    </div>
  )
}
