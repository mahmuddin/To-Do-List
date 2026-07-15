/**
 * taskStore.js — Model / Data Layer
 *
 * @typedef {Object} Task
 * @property {string}  id        - Unique UUID
 * @property {string}  title     - Task title (3–50 characters, trimmed)
 * @property {boolean} completed - Completion status
 * @property {number}  createdAt - Unix timestamp (Date.now())
 */

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "StorageError";
    if (cause !== undefined) this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Constants & internal state
// ---------------------------------------------------------------------------

const STORAGE_KEY = "todolist-tasks";

/** @type {Task[]} */
let tasks = [];

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a raw object has the required Task fields.
 * @param {unknown} item
 * @returns {boolean}
 */
function isValidTask(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.completed === "boolean"
  );
}

/**
 * Reads tasks from localStorage, validates each item, and populates the
 * internal `tasks` array.
 *
 * - If the key is absent, `tasks` stays empty.
 * - If JSON parsing fails or any item fails validation, `tasks` is set to []
 *   and the key is removed from localStorage.
 *
 * @returns {Task[]} The loaded (and now in-memory) task list.
 */
function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    tasks = [];
    return tasks;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt JSON — clear storage and return empty list
    localStorage.removeItem(STORAGE_KEY);
    tasks = [];
    return tasks;
  }

  // Must be a non-null array
  if (!Array.isArray(parsed)) {
    localStorage.removeItem(STORAGE_KEY);
    tasks = [];
    return tasks;
  }

  // Every item must pass field validation
  const allValid = parsed.every(isValidTask);
  if (!allValid) {
    localStorage.removeItem(STORAGE_KEY);
    tasks = [];
    return tasks;
  }

  tasks = parsed;
  return tasks;
}

/**
 * Persists the current `tasks` array to localStorage.
 *
 * @throws {StorageError} When localStorage write fails (e.g., quota exceeded).
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    if (err instanceof DOMException) {
      throw new StorageError(
        "Gagal menyimpan data ke localStorage. Storage mungkin penuh.",
        err
      );
    }
    // Re-throw unexpected errors as-is
    throw err;
  }
}

/**
 * Returns a shallow copy of the current tasks array.
 *
 * @returns {Task[]}
 */
function getAllTasks() {
  return tasks.slice();
}

// ---------------------------------------------------------------------------
// CRUD operations (stubs — implemented in subsequent tasks)
// ---------------------------------------------------------------------------

/**
 * Adds a new task to the top of the list.
 *
 * @param {string} title
 * @returns {Task}
 * @throws {ValidationError} When title is less than 3 or exceeds 50 characters.
 */
function addTask(title) {
  const trimmed = typeof title === "string" ? title.trim() : "";

  if (trimmed.length < 3 || trimmed.length > 50) {
    throw new ValidationError("Judul tugas harus antara 3 dan 50 karakter");
  }

  /** @type {Task} */
  const task = {
    id: crypto.randomUUID(),
    title: trimmed,
    completed: false,
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  saveTasks();
  return task;
}

/**
 * Updates the title of an existing task.
 *
 * @param {string} id
 * @param {string} title
 * @returns {Task|undefined} Updated task, or undefined if not found.
 * @throws {ValidationError} When new title is less than 3 or exceeds 50 characters.
 */
function updateTaskTitle(id, title) {
  const trimmed = typeof title === "string" ? title.trim() : "";

  if (trimmed.length < 3 || trimmed.length > 50) {
    throw new ValidationError("Judul tugas harus antara 3 dan 50 karakter");
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) return undefined;

  task.title = trimmed;
  saveTasks();
  return task;
}

/**
 * Toggles the `completed` status of a task.
 *
 * @param {string} id
 * @returns {Task|undefined} Updated task, or undefined if not found.
 */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return undefined;

  task.completed = !task.completed;
  saveTasks();
  return task;
}

/**
 * Marks all tasks completed if any are active; otherwise marks all active.
 *
 * @returns {Task[]} Updated tasks array (shallow copy).
 */
function toggleAllTasks() {
  const hasActive = tasks.some((t) => !t.completed);
  tasks.forEach((t) => {
    t.completed = hasActive;
  });
  saveTasks();
  return tasks.slice();
}

/**
 * Removes a task by id.
 *
 * @param {string} id
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
}

/**
 * Removes all completed tasks.
 */
function deleteCompletedTasks() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
}

/**
 * Moves a task to a new position in the list, just before the reference task.
 * If referenceId is null or not found, the task is moved to the end of the list.
 *
 * @param {string} sourceId
 * @param {string|null} referenceId
 */
function moveTaskBefore(sourceId, referenceId) {
  const sourceIndex = tasks.findIndex((t) => t.id === sourceId);
  if (sourceIndex === -1) return;

  // Remove task from original position
  const [task] = tasks.splice(sourceIndex, 1);

  if (!referenceId) {
    tasks.push(task);
  } else {
    const refIndex = tasks.findIndex((t) => t.id === referenceId);
    if (refIndex === -1) {
      tasks.push(task);
    } else {
      tasks.splice(refIndex, 0, task);
    }
  }

  saveTasks();
}

// ---------------------------------------------------------------------------
// Exports — expose via window for vanilla browser usage
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.ValidationError = ValidationError;
  window.StorageError = StorageError;
  window.loadTasks = loadTasks;
  window.saveTasks = saveTasks;
  window.getAllTasks = getAllTasks;
  window.addTask = addTask;
  window.updateTaskTitle = updateTaskTitle;
  window.toggleTask = toggleTask;
  window.toggleAllTasks = toggleAllTasks;
  window.deleteTask = deleteTask;
  window.deleteCompletedTasks = deleteCompletedTasks;
  window.moveTaskBefore = moveTaskBefore;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ValidationError,
    StorageError,
    loadTasks,
    saveTasks,
    getAllTasks,
    addTask,
    updateTaskTitle,
    toggleTask,
    toggleAllTasks,
    deleteTask,
    deleteCompletedTasks,
    moveTaskBefore,
  };
}
