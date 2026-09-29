# Taskly

Taskly is a small task list that runs in the browser. Tasks stay on this device in local storage. There is no account and no server.

## Setup

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

## Scripts

- `npm run dev` starts the local app
- `npm test` runs the unit tests
- `npm run build` typechecks and creates a production build
- `npm run preview` serves the production build
- `npm run lint` runs the linter

## Using the app

Add a task with a title, and optionally a description, priority, due date, and tags. Search, filter, and sort the list from the toolbar. Completed tasks can be cleared after a confirmation.

Export downloads `taskly-tasks.json`. Import adds tasks from a JSON file. A file can be a task array or an object with a `tasks` array. Invalid files are rejected, and invalid items in an otherwise valid file are skipped.

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "task-1",
      "title": "Write the notes",
      "description": "Share them with the team",
      "completed": false,
      "priority": "high",
      "dueDate": "2026-10-02",
      "tags": ["work"],
      "createdAt": "2026-09-29T12:00:00.000Z",
      "updatedAt": "2026-09-29T12:00:00.000Z"
    }
  ]
}
```
