import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Composer } from './components/Composer.tsx'
import { ConfirmDialog } from './components/ConfirmDialog.tsx'
import { TaskDialog } from './components/TaskDialog.tsx'
import { TaskList } from './components/TaskList.tsx'
import { loadTasks, loadTheme, saveTasks, saveTheme } from './storage.ts'
import {
  SORTS,
  clearCompleted,
  createTask,
  deleteTask,
  formatHeadingDate,
  matchesFilter,
  matchesSearch,
  mergeTasks,
  parseImport,
  serializeTasks,
  toDateKey,
  toggleTask,
  updateTask,
} from './tasks.ts'
import type { SortId, Task, TaskDraft, ThemeName } from './types.ts'

type ViewId = 'all' | 'today' | 'upcoming' | 'completed'
type EditorState = { mode: 'create' } | { mode: 'edit'; taskId: string } | null
type ConfirmState = { type: 'delete'; taskId: string } | { type: 'clear' } | null
type Toast = { id: string; message: string }
type ChipId = 'all' | 'overdue' | 'high'

const VIEWS: { id: ViewId; label: string; short: string }[] = [
  { id: 'all', label: 'All tasks', short: 'All' },
  { id: 'today', label: 'Today', short: 'Today' },
  { id: 'upcoming', label: 'Upcoming', short: 'Upcoming' },
  { id: 'completed', label: 'Completed', short: 'Done' },
]

export default function App() {
  const [tasks, setTasks] = useState(() => loadTasks(localStorage))
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewId>('today')
  const [tag, setTag] = useState<string | null>(null)
  const [chip, setChip] = useState<ChipId>('all')
  const [sort, setSort] = useState<SortId>('newest')
  const [theme, setTheme] = useState<ThemeName>(() =>
    loadTheme(localStorage, window.matchMedia('(prefers-color-scheme: dark)').matches),
  )
  const [today, setToday] = useState(() => toDateKey(new Date()))
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 719px)').matches)
  const [composerOpen, setComposerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editor, setEditor] = useState<EditorState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  const tasksRef = useRef(tasks)

  const pushToast = useCallback((message: string) => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current.slice(-2), { id, message }])
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4000)
    timers.current.push(timer)
  }, [])

  const commitTasks = useCallback(
    (updater: (current: Task[]) => Task[]) => {
      const next = updater(tasksRef.current)
      tasksRef.current = next
      setTasks(next)
      try {
        saveTasks(localStorage, next)
      } catch {
        pushToast('Could not save tasks in this browser.')
      }
    },
    [pushToast],
  )

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      saveTheme(localStorage, theme)
    } catch {
      // Theme still applies for this visit when storage is blocked.
    }
  }, [theme])

  useEffect(() => {
    function refreshToday() {
      setToday(toDateKey(new Date()))
    }
    window.addEventListener('focus', refreshToday)
    return () => window.removeEventListener('focus', refreshToday)
  }, [])

  useEffect(() => {
    const queryList = window.matchMedia('(max-width: 719px)')
    const onChange = () => setNarrow(queryList.matches)
    queryList.addEventListener('change', onChange)
    return () => queryList.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        const mobileSearch = document.getElementById('mobile-search-input')
        const headerSearch = document.getElementById('header-search')
        if (mobileSearch instanceof HTMLInputElement && mobileSearch.offsetParent) mobileSearch.focus()
        else if (headerSearch instanceof HTMLInputElement && headerSearch.offsetParent) headerSearch.focus()
        else searchRef.current?.focus()
        return
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== 'n') return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      if (window.matchMedia('(max-width: 719px)').matches) setEditor({ mode: 'create' })
      else setComposerOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const searched = useMemo(() => tasks.filter((task) => matchesSearch(task, query)), [tasks, query])

  const counts = useMemo(() => {
    const next = { all: searched.length, today: 0, upcoming: 0, completed: 0, overdue: 0, todo: 0 }
    for (const task of searched) {
      if (task.completed) next.completed += 1
      else if (task.dueDate && task.dueDate < today) next.overdue += 1
      else if (task.dueDate && task.dueDate > today) next.upcoming += 1
      else next.todo += 1
    }
    next.today = next.todo + next.overdue
    return next
  }, [searched, today])

  const tagCounts = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    for (const task of searched) {
      for (const item of task.tags) {
        const key = item.toLowerCase()
        const current = map.get(key)
        if (current) current.count += 1
        else map.set(key, { label: item, count: 1 })
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [searched])

  const visible = useMemo(() => {
    return searched.filter((task) => {
      if (tag && !task.tags.some((item) => item.toLowerCase() === tag)) return false
      if (chip === 'overdue' && !matchesFilter(task, 'overdue', today)) return false
      if (chip === 'high' && (task.priority !== 'high' || task.completed)) return false
      if (view === 'completed') return task.completed
      if (view === 'upcoming') return !task.completed && task.dueDate !== null && task.dueDate > today
      return true
    })
  }, [searched, tag, chip, view, today])

  const completedCount = tasks.filter((task) => task.completed).length
  const editingTask = editor?.mode === 'edit' ? tasks.find((task) => task.id === editor.taskId) : undefined
  const deletingTask = confirm?.type === 'delete' ? tasks.find((task) => task.id === confirm.taskId) : undefined
  const viewMeta = VIEWS.find((item) => item.id === view) ?? VIEWS[1]
  const headingDate = formatHeadingDate(today)

  function openCreate() {
    if (narrow) setEditor({ mode: 'create' })
    else setComposerOpen(true)
  }

  function saveDraft(draft: TaskDraft) {
    if (!editor) return
    if (editor.mode === 'create') {
      commitTasks((current) => [createTask(draft), ...current])
      pushToast('Task added.')
    } else {
      commitTasks((current) => updateTask(current, editor.taskId, draft))
      pushToast('Task updated.')
    }
    setEditor(null)
  }

  function toggle(id: string) {
    const task = tasksRef.current.find((item) => item.id === id)
    commitTasks((current) => toggleTask(current, id))
    pushToast(task?.completed ? 'Task marked active.' : 'Task completed.')
  }

  function applyConfirm() {
    if (!confirm) return
    if (confirm.type === 'delete') {
      commitTasks((current) => deleteTask(current, confirm.taskId))
      pushToast('Task deleted.')
    } else {
      commitTasks((current) => clearCompleted(current))
      pushToast('Completed tasks cleared.')
    }
    setConfirm(null)
  }

  function exportTasks() {
    const blob = new Blob([serializeTasks(tasks)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'taskly-tasks.json'
    link.click()
    URL.revokeObjectURL(url)
    pushToast('Tasks exported.')
    setMenuOpen(false)
  }

  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImport(String(reader.result ?? ''))
      if (!result.ok) {
        pushToast(result.error)
        return
      }
      if (result.tasks.length === 0) {
        pushToast(result.skipped > 0 ? 'No valid tasks found in that file.' : 'That file has no tasks.')
        return
      }
      commitTasks((current) => mergeTasks(current, result.tasks))
      const skipped =
        result.skipped > 0
          ? ` Skipped ${result.skipped} invalid ${result.skipped === 1 ? 'item' : 'items'}.`
          : ''
      pushToast(`Imported ${result.tasks.length} ${result.tasks.length === 1 ? 'task' : 'tasks'}.${skipped}`)
    }
    reader.onerror = () => pushToast('Could not read that file.')
    reader.readAsText(file)
    setMenuOpen(false)
  }

  function selectView(next: ViewId) {
    setView(next)
    setChip('all')
    setMenuOpen(false)
    setSearchOpen(false)
  }

  const summary =
    view === 'today'
      ? `${counts.todo} to do, ${counts.overdue} overdue`
      : view === 'upcoming'
        ? `${counts.upcoming} upcoming`
        : view === 'completed'
          ? `${counts.completed} completed`
          : `${counts.all} ${counts.all === 1 ? 'task' : 'tasks'}`

  return (
    <>
      <a className="skip" href="#tasks">
        Skip to tasks
      </a>
      <div className="shell">
        <aside className="sidebar">
          <p className="brand">
            <Logo />
            <span className="brand-name">Taskly</span>
          </p>
          <div className="sidebar-search">
            <label className="sr-only" htmlFor="search">
              Search tasks
            </label>
            <SearchIcon />
            <input
              id="search"
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search"
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>Ctrl K</kbd>
          </div>
          <nav className="side-nav" aria-label="Views">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={view === item.id && !tag ? 'nav-item is-selected' : 'nav-item'}
                aria-current={view === item.id && !tag ? 'page' : undefined}
                onClick={() => {
                  selectView(item.id)
                  setTag(null)
                }}
              >
                <ViewIcon id={item.id} />
                <span className="nav-label">{item.label}</span>
                <span className="nav-count">{counts[item.id]}</span>
              </button>
            ))}
          </nav>
          <div className="tag-block">
            <p className="section-label">Tags</p>
            {tagCounts.length === 0 ? (
              <p className="tag-empty">Tags you add show up here.</p>
            ) : (
              <ul className="tag-list">
                {tagCounts.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className={tag === item.label.toLowerCase() ? 'nav-item is-selected' : 'nav-item'}
                      aria-pressed={tag === item.label.toLowerCase()}
                      onClick={() => setTag((current) => (current === item.label.toLowerCase() ? null : item.label.toLowerCase()))}
                    >
                      <span className="nav-label">#{item.label}</span>
                      <span className="nav-count">{item.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="sidebar-footer">
            <p className="footer-note">Finish what matters today.</p>
            <div className="footer-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
              <button type="button" className="icon-button" aria-label="Import tasks" onClick={() => fileInputRef.current?.click()}>
                <ImportIcon />
              </button>
              <button type="button" className="icon-button" aria-label="Export tasks" onClick={exportTasks}>
                <ExportIcon />
              </button>
            </div>
          </div>
        </aside>

        <div className="workspace">
          <header className="mobile-bar">
            <p className="brand">
              <Logo />
              <span className="brand-name">Taskly</span>
            </p>
            <div className="mobile-tools">
              <button type="button" className="icon-button" aria-expanded={searchOpen} aria-controls="mobile-search" onClick={() => setSearchOpen((open) => !open)}>
                <span className="sr-only">{searchOpen ? 'Hide search' : 'Show search'}</span>
                <SearchIcon />
              </button>
              <button type="button" className="icon-button" aria-expanded={menuOpen} aria-controls="more-menu" onClick={() => setMenuOpen((open) => !open)}>
                <span className="sr-only">More actions</span>
                <MoreIcon />
              </button>
            </div>
          </header>
          {searchOpen ? (
            <div className="mobile-search" id="mobile-search">
              <label className="sr-only" htmlFor="mobile-search-input">
                Search tasks
              </label>
              <input
                id="mobile-search-input"
                type="search"
                value={query}
                placeholder="Search"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          ) : null}
          {menuOpen ? (
            <div className="more-menu" id="more-menu">
              <button type="button" className="btn" onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}>
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>
              <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
                Import
              </button>
              <button type="button" className="btn" onClick={exportTasks}>
                Export
              </button>
              <label className="field" htmlFor="mobile-sort">
                Sort
                <select
                  id="mobile-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortId)}
                >
                  {SORTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <main className="canvas">
            <div className="page-head">
              <div>
                <h1>{viewMeta.label}</h1>
                <p className="page-kicker">
                  {headingDate}
                  <span aria-hidden="true"> · </span>
                  {summary}
                </p>
                <p className="page-subtitle">Finish what matters today.</p>
              </div>
              <div className="page-tools">
                <div className="header-search">
                  <label className="sr-only" htmlFor="header-search">
                    Search tasks
                  </label>
                  <input
                    id="header-search"
                    type="search"
                    value={query}
                    placeholder="Search"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <label className="sort-control">
                  <span className="sr-only">Sort</span>
                  <select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
                    {SORTS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="btn primary" onClick={openCreate}>
                  + New task <kbd>N</kbd>
                </button>
              </div>
            </div>

            <div className="chips" role="group" aria-label="Quick filters">
              <button type="button" className={chip === 'all' ? 'chip is-selected' : 'chip'} aria-pressed={chip === 'all'} onClick={() => setChip('all')}>
                All <span>{counts.all}</span>
              </button>
              <button type="button" className={chip === 'overdue' ? 'chip is-selected' : 'chip'} aria-pressed={chip === 'overdue'} onClick={() => setChip('overdue')}>
                Overdue <span>{counts.overdue}</span>
              </button>
              <button type="button" className={chip === 'high' ? 'chip is-selected' : 'chip'} aria-pressed={chip === 'high'} onClick={() => setChip('high')}>
                High priority
              </button>
              {tagCounts.slice(0, 3).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={tag === item.label.toLowerCase() ? 'chip is-selected' : 'chip'}
                  aria-pressed={tag === item.label.toLowerCase()}
                  onClick={() => setTag((current) => (current === item.label.toLowerCase() ? null : item.label.toLowerCase()))}
                >
                  #{item.label} <span>{item.count}</span>
                </button>
              ))}
            </div>

            {tasks.length > 0 ? (
              <Composer
                open={composerOpen}
                onClose={() => setComposerOpen(false)}
                onCreate={(draft) => {
                  commitTasks((current) => [createTask(draft), ...current])
                  pushToast('Task added.')
                }}
              />
            ) : null}

            <section id="tasks" aria-labelledby="tasks-heading">
              <h2 id="tasks-heading" className="sr-only">
                Tasks
              </h2>
              <TaskList
                tasks={visible}
                today={today}
                sort={sort}
                grouped={view === 'today' && chip === 'all' && !tag}
                isArchiveEmpty={tasks.length === 0}
                onAdd={openCreate}
                onImport={() => fileInputRef.current?.click()}
                onToggle={toggle}
                onEdit={(taskId) => setEditor({ mode: 'edit', taskId })}
                onDelete={(taskId) => setConfirm({ type: 'delete', taskId })}
                onClearCompleted={() => setConfirm({ type: 'clear' })}
              />
            </section>
          </main>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'bottom-item is-selected' : 'bottom-item'}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => {
              selectView(item.id)
              setTag(null)
            }}
          >
            <ViewIcon id={item.id} />
            <span>{item.short}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="fab" onClick={openCreate}>
        <span aria-hidden="true">+</span>
        <span className="sr-only">New task</span>
      </button>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        aria-hidden="true"
        tabIndex={-1}
        onChange={importFile}
      />

      {editor && (editor.mode === 'create' || editingTask) ? (
        <TaskDialog
          key={editor.mode === 'edit' ? editor.taskId : 'create'}
          mode={editor.mode}
          task={editingTask}
          onClose={() => setEditor(null)}
          onSave={saveDraft}
        />
      ) : null}

      {confirm?.type === 'delete' && deletingTask ? (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${deletingTask.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={applyConfirm}
          onClose={() => setConfirm(null)}
        />
      ) : null}

      {confirm?.type === 'clear' ? (
        <ConfirmDialog
          title="Clear completed tasks"
          message={`Delete ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}? This cannot be undone.`}
          confirmLabel="Clear completed"
          onConfirm={applyConfirm}
          onClose={() => setConfirm(null)}
        />
      ) : null}

      <div className="toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" role="status">
            <p>{toast.message}</p>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect width="24" height="24" rx="6" fill="currentColor" />
        <path
          d="M6.5 12.5 10 16l7.5-8"
          fill="none"
          stroke="var(--logo-check)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function ViewIcon({ id }: { id: ViewId }) {
  if (id === 'all') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'today') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5V7M16 3.5V7M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'upcoming') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 12v4M12 12l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.2 11 14.5 15.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M15 3.5A8 8 0 1 0 20.5 14 6.5 6.5 0 0 1 15 3.5z" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 4v10M8 10l4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 14V4M8 8l4-4 4 4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
