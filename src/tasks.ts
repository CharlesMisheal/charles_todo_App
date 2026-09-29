import type { FilterId, ImportResult, Priority, SortId, Task, TaskDraft } from './types.ts'

export const TITLE_MAX = 200
export const DESCRIPTION_MAX = 2000
export const TAG_MAX = 30
export const TAG_COUNT_MAX = 8

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
]

export const SORTS: { id: SortId; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'due', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
]

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
]

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatHeadingDate(value: string): string {
  const parts = value.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
  const monthName = date.toLocaleDateString('en-GB', { month: 'long' })
  return `${weekday}, ${parts[2]} ${monthName}`
}

export function formatDateKey(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function normalizeTags(value: string | string[]): string[] {
  const parts = Array.isArray(value) ? value : value.split(',')
  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of parts) {
    if (typeof part !== 'string') continue
    const tag = part.trim().replace(/^#/, '').slice(0, TAG_MAX)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length >= TAG_COUNT_MAX) break
  }

  return tags
}

function requireTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Title is required.')
  return trimmed.slice(0, TITLE_MAX)
}

function cleanDueDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return isDateKey(trimmed) ? trimmed : null
}

export function createTask(draft: TaskDraft, now = new Date(), id: string = crypto.randomUUID()): Task {
  const timestamp = now.toISOString()
  return {
    id,
    title: requireTitle(draft.title),
    description: draft.description.trim().slice(0, DESCRIPTION_MAX),
    completed: false,
    priority: draft.priority,
    dueDate: cleanDueDate(draft.dueDate),
    tags: normalizeTags(draft.tags),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function updateTask(tasks: Task[], id: string, draft: TaskDraft, now = new Date()): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) return task
    return {
      ...task,
      title: requireTitle(draft.title),
      description: draft.description.trim().slice(0, DESCRIPTION_MAX),
      priority: draft.priority,
      dueDate: cleanDueDate(draft.dueDate),
      tags: normalizeTags(draft.tags),
      updatedAt: now.toISOString(),
    }
  })
}

export function toggleTask(tasks: Task[], id: string, now = new Date()): Task[] {
  const timestamp = now.toISOString()
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed, updatedAt: timestamp } : task,
  )
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id)
}

export function clearCompleted(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.completed)
}

export function matchesSearch(task: Task, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [task.title, task.description, ...task.tags].join(' ').toLowerCase()
  return haystack.includes(needle)
}

export function matchesFilter(task: Task, filter: FilterId, today: string): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'active':
      return !task.completed
    case 'completed':
      return task.completed
    case 'today':
      return task.dueDate === today
    case 'overdue':
      return !task.completed && task.dueDate !== null && task.dueDate < today
    default:
      return true
  }
}

function compareNewest(a: Task, b: Task): number {
  const byCreated = b.createdAt.localeCompare(a.createdAt)
  return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id)
}

export function sortTasks(tasks: Task[], sort: SortId): Task[] {
  const copy = [...tasks]
  copy.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return compareNewest(a, b)
      case 'oldest':
        return -compareNewest(a, b)
      case 'due': {
        if (!a.dueDate && !b.dueDate) return compareNewest(a, b)
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        const byDue = a.dueDate.localeCompare(b.dueDate)
        return byDue !== 0 ? byDue : compareNewest(a, b)
      }
      case 'priority': {
        const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        return byPriority !== 0 ? byPriority : compareNewest(a, b)
      }
      default:
        return 0
    }
  })
  return copy
}

export function selectTasks(
  tasks: Task[],
  options: { query: string; filter: FilterId; sort: SortId; today: string },
): Task[] {
  const visible = tasks.filter(
    (task) => matchesSearch(task, options.query) && matchesFilter(task, options.filter, options.today),
  )
  return sortTasks(visible, options.sort)
}

export function serializeTasks(tasks: Task[], exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ version: 1, exportedAt, tasks }, null, 2)
}

export function mergeTasks(existing: Task[], incoming: Task[]): Task[] {
  const ids = new Set(existing.map((task) => task.id))
  const added = incoming.map((task) => {
    if (!ids.has(task.id)) {
      ids.add(task.id)
      return task
    }
    let id = crypto.randomUUID()
    while (ids.has(id)) id = crypto.randomUUID()
    ids.add(id)
    return { ...task, id }
  })
  return [...existing, ...added]
}

export function parseImport(text: string, now = new Date()): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, '').trim())
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }

  const list = taskListFromImport(data)
  if (!list) return { ok: false, error: 'This file does not contain a task list.' }

  const ids = new Set<string>()
  const tasks: Task[] = []
  let skipped = 0

  for (const item of list) {
    const task = normalizeImportedTask(item, now, ids)
    if (task) tasks.push(task)
    else skipped += 1
  }

  return { ok: true, tasks, skipped }
}

function taskListFromImport(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const tasks = (data as { tasks?: unknown }).tasks
    if (Array.isArray(tasks)) return tasks
  }
  return null
}

function normalizeImportedTask(value: unknown, now: Date, ids: Set<string>): Task | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (typeof record.title !== 'string' || !record.title.trim()) return null

  const id = takeId(record.id, ids)
  const timestamp = now.toISOString()
  const priority = isPriority(record.priority) ? record.priority : 'medium'
  const tags = Array.isArray(record.tags)
    ? normalizeTags(record.tags.filter((tag): tag is string => typeof tag === 'string'))
    : typeof record.tags === 'string'
      ? normalizeTags(record.tags)
      : []

  return {
    id,
    title: record.title.trim().slice(0, TITLE_MAX),
    description:
      typeof record.description === 'string' ? record.description.trim().slice(0, DESCRIPTION_MAX) : '',
    completed: record.completed === true,
    priority,
    dueDate: typeof record.dueDate === 'string' ? cleanDueDate(record.dueDate) : null,
    tags,
    createdAt: typeof record.createdAt === 'string' && isIso(record.createdAt) ? record.createdAt : timestamp,
    updatedAt: typeof record.updatedAt === 'string' && isIso(record.updatedAt) ? record.updatedAt : timestamp,
  }
}

function takeId(value: unknown, ids: Set<string>): string {
  if (typeof value === 'string') {
    const id = value.trim()
    if (id && !ids.has(id)) {
      ids.add(id)
      return id
    }
  }
  let id = crypto.randomUUID()
  while (ids.has(id)) id = crypto.randomUUID()
  ids.add(id)
  return id
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function isIso(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}
