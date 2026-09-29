import type { Task, ThemeName } from './types.ts'
import { parseImport } from './tasks.ts'

export const TASKS_KEY = 'taskly.tasks'
export const THEME_KEY = 'taskly.theme'

export function loadTasks(storage: Pick<Storage, 'getItem'>): Task[] {
  try {
    const raw = storage.getItem(TASKS_KEY)
    if (!raw) return []
    const result = parseImport(raw)
    return result.ok ? result.tasks : []
  } catch {
    return []
  }
}

export function saveTasks(storage: Pick<Storage, 'setItem'>, tasks: Task[]): void {
  storage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function loadTheme(storage: Pick<Storage, 'getItem'>, prefersDark: boolean): ThemeName {
  try {
    const value = storage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Ignore unreadable storage and fall back to the system theme.
  }
  return prefersDark ? 'dark' : 'light'
}

export function saveTheme(storage: Pick<Storage, 'setItem'>, theme: ThemeName): void {
  storage.setItem(THEME_KEY, theme)
}
