import { useEffect, useRef, type ReactNode } from 'react'

type Focusable = { focus(): void }

type DialogProps = {
  title: string
  titleId: string
  describedBy?: string
  onClose: () => void
  initialFocusRef?: { current: Focusable | null }
  children: ReactNode
}

export function Dialog({ title, titleId, describedBy, onClose, initialFocusRef, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onCancel(event: Event) {
      event.preventDefault()
      onCloseRef.current()
    }

    dialog.addEventListener('cancel', onCancel)
    if (!dialog.open) dialog.showModal()
    initialFocusRef?.current?.focus()

    return () => {
      dialog.removeEventListener('cancel', onCancel)
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [initialFocusRef])

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current()
      }}
    >
      <div className="dialog-card">
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
