import { sortTasks } from '../tasks.ts'
import type { SortId, Task } from '../types.ts'

type TaskListProps = {
  tasks: Task[]
  today: string
  sort: SortId
  grouped: boolean
  isArchiveEmpty: boolean
  onAdd: () => void
  onImport: () => void
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onClearCompleted: () => void
}

type GroupId = 'overdue' | 'todo' | 'later' | 'completed'

const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'todo', label: 'To do' },
  { id: 'later', label: 'Later' },
  { id: 'completed', label: 'Completed' },
]

export function TaskList({
  tasks,
  today,
  sort,
  grouped,
  isArchiveEmpty,
  onAdd,
  onImport,
  onToggle,
  onEdit,
  onDelete,
  onClearCompleted,
}: TaskListProps) {
  if (tasks.length === 0) {
    if (isArchiveEmpty) {
      return (
        <div className="empty">
          <div className="empty-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48">
              <rect x="10" y="8" width="28" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 18h10M16 24h16M16 30h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M18 16.5l1.4 1.4 2.6-2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <h2>Your list is empty — start with one thing</h2>
          <p className="empty-subtitle">Finish what matters today.</p>
          <p>Capture a task in a few seconds.</p>
          <div className="empty-actions">
            <button type="button" className="btn primary" onClick={onAdd}>
              + Add your first task
            </button>
            <button type="button" className="btn ghost" onClick={onImport}>
              Import tasks
            </button>
          </div>
          <p className="empty-hint">Press N anytime to add a task</p>
        </div>
      )
    }

    return (
      <div className="empty empty-compact">
        <h2>Nothing to show</h2>
        <p>No tasks match this search or filter.</p>
      </div>
    )
  }

  if (!grouped) {
    return (
      <ul className="task-list">
        {sortTasks(tasks, sort).map((task) => (
          <TaskRow key={task.id} task={task} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>
    )
  }

  const groups = GROUPS.map((group) => ({
    ...group,
    items: sortTasks(
      tasks.filter((task) => groupOf(task, today) === group.id),
      sort,
    ),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="groups">
      {groups.map((group) => (
        <section key={group.id} className={`group group-${group.id}`} aria-labelledby={`group-${group.id}`}>
          <div className="group-heading">
            <h2 id={`group-${group.id}`}>
              {group.label}
              <span className="group-count">{group.items.length}</span>
            </h2>
            {group.id === 'completed' ? (
              <button type="button" className="text-button" onClick={onClearCompleted}>
                Clear completed
              </button>
            ) : null}
          </div>
          <ul className="task-list">
            {group.items.map((task) => (
              <TaskRow key={task.id} task={task} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function TaskRow({
  task,
  today,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  today: string
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const badge = dueBadge(task, today)

  return (
    <li>
      <article className={task.completed ? 'task is-complete' : 'task'}>
        <label className="check">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            aria-label={`${task.completed ? 'Mark active' : 'Mark completed'}: ${task.title}`}
          />
          <span className="check-ui" aria-hidden="true" />
        </label>
        <div className="task-body">
          <h3 id={`task-title-${task.id}`} className="task-title">
            {task.title}
          </h3>
          {task.description ? <p className="task-note">{task.description}</p> : null}
          <div className="task-meta">
            {badge ? <span className={`pill pill-${badge.tone}`}>{badge.text}</span> : null}
            <span className={`pill priority priority-${task.priority}`}>{priorityLabel(task.priority)}</span>
            {task.tags.map((tag) => (
              <span key={tag} className="pill tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="task-actions">
          <button type="button" className="icon-button" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task.id)}>
            <PencilIcon />
          </button>
          <button type="button" className="icon-button danger" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task.id)}>
            <TrashIcon />
          </button>
        </div>
      </article>
    </li>
  )
}

function groupOf(task: Task, today: string): GroupId {
  if (task.completed) return 'completed'
  if (task.dueDate && task.dueDate < today) return 'overdue'
  if (task.dueDate && task.dueDate > today) return 'later'
  return 'todo'
}

function dueBadge(task: Task, today: string): { text: string; tone: 'overdue' | 'today' | 'later' | 'plain' } | null {
  if (!task.dueDate) return null
  if (!task.completed && task.dueDate < today) {
    return { text: `Overdue · ${formatShort(task.dueDate, false)}`, tone: 'overdue' }
  }
  if (!task.completed && task.dueDate === today) return { text: 'Today', tone: 'today' }
  return { text: formatShort(task.dueDate, true), tone: task.completed ? 'plain' : 'later' }
}

function formatShort(value: string, withWeekday: boolean): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, withWeekday
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short' })
}

function priorityLabel(priority: Task['priority']): string {
  if (priority === 'high') return 'High'
  if (priority === 'low') return 'Low'
  return 'Medium'
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13 7.5 16.5 11" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
