import { Dialog } from './Dialog.tsx'

type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog title={title} titleId="confirm-dialog-title" describedBy="confirm-dialog-message" onClose={onClose}>
      <p id="confirm-dialog-message" className="confirm-message">
        {message}
      </p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
