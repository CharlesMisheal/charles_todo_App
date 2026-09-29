import { useRef, useState, type FormEvent } from 'react'
import { Dialog } from './Dialog.tsx'
import { DESCRIPTION_MAX, PRIORITIES, TITLE_MAX } from '../tasks.ts'
import type { Task, TaskDraft } from '../types.ts'

type TaskDialogProps = {
  mode: 'create' | 'edit'
  task?: Task
  onClose: () => void
  onSave: (draft: TaskDraft) => void
}

export function TaskDialog({ mode, task, onClose, onSave }: TaskDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Enter a title.')
      titleRef.current?.focus()
      return
    }
    onSave({ title, description, priority, dueDate, tags })
  }

  return (
    <Dialog
      title={mode === 'create' ? 'New task' : 'Edit task'}
      titleId="task-dialog-title"
      onClose={onClose}
      initialFocusRef={titleRef}
    >
      <form className="task-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="task-title">Title</label>
          <input
            ref={titleRef}
            id="task-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              if (error) setError('')
            }}
            maxLength={TITLE_MAX}
            required
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'task-title-error' : undefined}
          />
          {error ? (
            <p id="task-title-error" className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={3}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={priority}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'low' || value === 'medium' || value === 'high') setPriority(value)
              }}
            >
              {PRIORITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-due">Due date</label>
            <input id="task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-tags">Tags</label>
          <input
            id="task-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="work, personal"
            autoComplete="off"
            aria-describedby="task-tags-hint"
          />
          <p id="task-tags-hint" className="field-hint">
            Separate tags with commas.
          </p>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            {mode === 'create' ? 'Add task' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
