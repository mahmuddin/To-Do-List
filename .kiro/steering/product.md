# Product: Todo List App

A client-side-only web app for managing daily tasks. Runs entirely in the browser with no server or external API.

## Core Features

- Add, edit, complete, and delete tasks
- Filter tasks by status: All, Active, Completed
- Mark all tasks as complete/incomplete in one click
- Bulk delete completed tasks
- Data persists via `localStorage` (key: `"todolist-tasks"`)

## UI Language

All user-facing text is in **Bahasa Indonesia** (e.g., "Tambah", "Hapus", "Selesai", "Tugas tersisa").

## Business Rules

- Task titles: 3–50 characters (trimmed); blank/whitespace-only titles are rejected
- New tasks appear at the top of the list
- Tasks can be manually reordered via drag-and-drop
- Inline double-click to edit a task; Enter or blur saves, Escape cancels
- Delete is immediate — no confirmation dialog
- `localStorage` errors are surfaced to the user but the in-memory state is preserved
