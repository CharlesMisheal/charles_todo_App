export type Priority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  title: string
  description: string
  completed: boolean
  priority: Priority
  dueDate: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type TaskDraft = {
  title: string
  description: string
  priority: Priority
  dueDate: string
  tags: string
}

export type FilterId = 'all' | 'active' | 'completed' | 'today' | 'overdue'

export type SortId = 'newest' | 'oldest' | 'due' | 'priority'

export type ThemeName = 'light' | 'dark'

export type ImportResult =
  | { ok: true; tasks: Task[]; skipped: number }
  | { ok: false; error: string }
