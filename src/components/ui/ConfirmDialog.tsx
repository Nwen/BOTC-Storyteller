import { Modal } from './Modal'

interface Props {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title?: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  open, onConfirm, onCancel, title = 'Confirm', message, confirmLabel = 'Confirm', danger = false,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className="w-96">
      <div className="p-5 space-y-4">
        <p className="text-gray-300">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-sm font-medium ${
              danger ? 'bg-red-700 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
