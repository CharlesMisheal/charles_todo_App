import { describe, expect, it } from 'vitest'
import { loadTasks, saveTasks, TASKS_KEY } from './storage.ts'
import {
  clearCompleted,
  createTask,
  deleteTask,
  mergeTasks,
  parseImport,
  selectTasks,
  serializeTasks,
  formatHeadingDate,
  msUntilNextLocalDay,
  toDateKey,
  toggleTask,
  updateTask,
} from './tasks.ts'
import type { Task, TaskDraft } from './types.ts'

const now = new Date('2026-09-29T12:00:00.000Z')
const later = new Date('2026-09-29T15:00:00.000Z')
const today = '2026-09-29'

function draft(overrides: Partial<TaskDraft> = {}): TaskDraft {
  return {
    title: 'Write tests',
    description: 'Cover the core flows',
    priority: 'medium',
    dueDate: '2026-09-30',
    tags: 'work, testing',
    ...overrides,
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write tests',
    description: 'Cover the core flows',
    completed: false,
    priority: 'medium',
    dueDate: '2026-09-30',
    tags: ['work', 'testing'],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  }
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
    dump() {
      return Object.fromEntries(values)
    },
  }
}

describe('creating a task', () => {
  it('stores the entered details and timestamps', () => {
    const created = createTask(draft({ tags: ' Work, work, #Home ' }), now, 'task-1')

    expect(created).toEqual({
      id: 'task-1',
      title: 'Write tests',
      description: 'Cover the core flows',
      completed: false,
      priority: 'medium',
      dueDate: '2026-09-30',
      tags: ['Work', 'Home'],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
  })

  it('rejects a blank title', () => {
    expect(() => createTask(draft({ title: '   ' }), now)).toThrow(/title is required/i)
  })

  it('uses the local calendar day', () => {
    expect(toDateKey(new Date(2026, 8, 29, 0, 30))).toBe('2026-09-29')
    expect(formatHeadingDate('2026-09-29')).toBe('Tuesday, 29 September')
    expect(formatHeadingDate('2026-09-30')).toBe('Wednesday, 30 September')
    expect(msUntilNextLocalDay(new Date(2026, 8, 29, 23, 0, 0))).toBe(60 * 60 * 1000)
  })
})

describe('editing a task', () => {
  it('updates fields and the updated timestamp without changing identity', () => {
    const original = task()
    const [edited] = updateTask(
      [original],
      original.id,
      draft({ title: 'Revise tests', description: 'Add an edit case', priority: 'high', dueDate: '', tags: 'home' }),
      later,
    )

    expect(edited).toMatchObject({
      id: original.id,
      title: 'Revise tests',
      description: 'Add an edit case',
      completed: false,
      priority: 'high',
      dueDate: null,
      tags: ['home'],
      createdAt: original.createdAt,
      updatedAt: later.toISOString(),
    })
  })
})

describe('completing a task', () => {
  it('toggles completion and records when it changed', () => {
    const original = task()
    const [completed] = toggleTask([original], original.id, later)
    expect(completed.completed).toBe(true)
    expect(completed.updatedAt).toBe(later.toISOString())

    const [reopened] = toggleTask([completed], original.id, now)
    expect(reopened.completed).toBe(false)
  })
})

describe('deleting a task', () => {
  it('removes only the selected task', () => {
    const tasks = [task({ id: 'a' }), task({ id: 'b', title: 'Keep me' })]
    expect(deleteTask(tasks, 'a').map((item) => item.id)).toEqual(['b'])
  })

  it('clears completed tasks and leaves active ones', () => {
    const tasks = [task({ id: 'a', completed: true }), task({ id: 'b', completed: false })]
    expect(clearCompleted(tasks).map((item) => item.id)).toEqual(['b'])
  })
})

describe('searching and filtering', () => {
  const tasks = [
    task({
      id: 'new-high',
      title: 'Ship notes',
      description: 'Draft the release',
      priority: 'high',
      dueDate: '2026-09-28',
      tags: ['release'],
      createdAt: '2026-09-29T10:00:00.000Z',
    }),
    task({
      id: 'done',
      title: 'File taxes',
      description: 'Done yesterday',
      completed: true,
      priority: 'low',
      dueDate: today,
      tags: ['personal'],
      createdAt: '2026-09-28T10:00:00.000Z',
    }),
    task({
      id: 'later',
      title: 'Plan workshop',
      description: 'Outline the session',
      priority: 'medium',
      dueDate: '2026-10-02',
      tags: ['work'],
      createdAt: '2026-09-27T10:00:00.000Z',
    }),
    task({
      id: 'undated',
      title: 'Read paper',
      description: '',
      priority: 'low',
      dueDate: null,
      tags: [],
      createdAt: '2026-09-26T10:00:00.000Z',
    }),
  ]

  it('finds tasks by title, description, or tag without case sensitivity', () => {
    expect(selectTasks(tasks, { query: 'RELEASE', filter: 'all', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'new-high',
    ])
    expect(selectTasks(tasks, { query: 'session', filter: 'all', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'later',
    ])
    expect(selectTasks(tasks, { query: 'personal', filter: 'all', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'done',
    ])
  })

  it('filters by status, today, and overdue', () => {
    expect(selectTasks(tasks, { query: '', filter: 'active', sort: 'oldest', today }).map((item) => item.id)).toEqual([
      'undated',
      'later',
      'new-high',
    ])
    expect(selectTasks(tasks, { query: '', filter: 'completed', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'done',
    ])
    expect(selectTasks(tasks, { query: '', filter: 'today', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'done',
    ])
    expect(selectTasks(tasks, { query: '', filter: 'overdue', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'new-high',
    ])
  })

  it('sorts by newest, oldest, due date, and priority', () => {
    expect(selectTasks(tasks, { query: '', filter: 'all', sort: 'newest', today }).map((item) => item.id)).toEqual([
      'new-high',
      'done',
      'later',
      'undated',
    ])
    expect(selectTasks(tasks, { query: '', filter: 'all', sort: 'oldest', today }).map((item) => item.id)).toEqual([
      'undated',
      'later',
      'done',
      'new-high',
    ])
    expect(selectTasks(tasks, { query: '', filter: 'all', sort: 'due', today }).map((item) => item.id)).toEqual([
      'new-high',
      'done',
      'later',
      'undated',
    ])
    expect(selectTasks(tasks, { query: '', filter: 'all', sort: 'priority', today }).map((item) => item.id)).toEqual([
      'new-high',
      'later',
      'done',
      'undated',
    ])
  })
})

describe('local persistence', () => {
  it('saves tasks and loads them again', () => {
    const storage = memoryStorage()
    const tasks = [task({ id: 'saved' })]
    saveTasks(storage, tasks)

    expect(storage.dump()[TASKS_KEY]).toContain('saved')
    expect(loadTasks(storage)).toEqual(tasks)
  })

  it('keeps the app usable when stored data is corrupt', () => {
    const storage = memoryStorage({ [TASKS_KEY]: '{not json' })
    expect(loadTasks(storage)).toEqual([])
  })

  it('loads the valid tasks from a partially invalid list', () => {
    const storage = memoryStorage({
      [TASKS_KEY]: JSON.stringify([task({ id: 'good' }), { title: '   ' }, null]),
    })
    expect(loadTasks(storage).map((item) => item.id)).toEqual(['good'])
  })
})

describe('import and export', () => {
  it('round-trips exported tasks', () => {
    const tasks = [task()]
    const result = parseImport(serializeTasks(tasks, now.toISOString()), now)
    expect(result).toEqual({ ok: true, tasks, skipped: 0 })
  })

  it('rejects JSON that is not a task list', () => {
    expect(parseImport('{"name":"nope"}', now)).toEqual({
      ok: false,
      error: 'This file does not contain a task list.',
    })
    expect(parseImport('{', now)).toEqual({
      ok: false,
      error: 'This file is not valid JSON.',
    })
  })

  it('skips invalid items and fills safe defaults', () => {
    const result = parseImport(
      JSON.stringify([
        { title: 'Imported', priority: 'urgent', completed: 'yes', dueDate: '2026-02-31', tags: ['a', 'a', 4] },
        { description: 'missing title' },
      ]),
      now,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toBe(1)
    expect(result.tasks[0]).toMatchObject({
      title: 'Imported',
      completed: false,
      priority: 'medium',
      dueDate: null,
      tags: ['a'],
      createdAt: now.toISOString(),
    })
  })

  it('assigns a new id when an imported task collides with an existing one', () => {
    const existing = [task({ id: 'same' })]
    const incoming = [task({ id: 'same', title: 'Copy' })]
    const merged = mergeTasks(existing, incoming)
    expect(merged).toHaveLength(2)
    expect(new Set(merged.map((item) => item.id)).size).toBe(2)
    expect(merged[1].title).toBe('Copy')
  })
})
