import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DESCRIPTION_MAX, PRIORITIES, TITLE_MAX } from '../tasks.ts'
import type { Priority, TaskDraft } from '../types.ts'

type ComposerProps = {
  open: boolean
  onClose: () => void
  onCreate: (draft: TaskDraft) => void
}

export function Composer({ open, onClose, onCreate }: ComposerProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const quickRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    titleRef.current?.focus()
    titleRef.current?.scrollIntoView({ block: 'center' })
  }, [open])

  function reset() {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setTags('')
    setError('')
  }

  function create(draft: TaskDraft) {
    onCreate(draft)
    reset()
    onClose()
  }

  function submitQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = quickRef.current?.value ?? ''
    if (!next.trim()) return
    create({ title: next, description: '', priority: 'medium', dueDate: '', tags: '' })
    if (quickRef.current) quickRef.current.value = ''
  }

  function submitFull(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Enter a title.')
      titleRef.current?.focus()
      return
    }
    create({ title, description, priority, dueDate, tags })
  }

  if (!open) {
    return (
      <form className="quick-add" onSubmit={submitQuick}>
        <span className="quick-plus" aria-hidden="true">
          +
        </span>
        <label className="sr-only" htmlFor="quick-add">
          Add a task
        </label>
        <input id="quick-add" ref={quickRef} placeholder="Add a task..." autoComplete="off" maxLength={TITLE_MAX} />
        <span className="quick-hint">Enter to add</span>
      </form>
    )
  }

  return (
    <form className="composer" onSubmit={submitFull} noValidate>
      <div className="field">
        <label htmlFor="composer-title">Title</label>
        <input
          id="composer-title"
          ref={titleRef}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (error) setError('')
          }}
          placeholder="Add a task..."
          maxLength={TITLE_MAX}
          autoComplete="off"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'composer-title-error' : undefined}
        />
        {error ? (
          <p id="composer-title-error" className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="composer-description">Description</label>
        <textarea
          id="composer-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add a note"
          maxLength={DESCRIPTION_MAX}
          rows={2}
        />
      </div>
      <div className="composer-row">
        <div className="field">
          <label htmlFor="composer-due">Due date</label>
          <input id="composer-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="composer-priority">Priority</label>
          <select
            id="composer-priority"
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
        <div className="field composer-tags">
          <label htmlFor="composer-tags">Tags</label>
          <input
            id="composer-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="work, personal"
            autoComplete="off"
          />
        </div>
        <div className="composer-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Add task
          </button>
        </div>
      </div>
    </form>
  )
}
