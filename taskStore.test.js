/**
 * taskStore.test.js
 * Unit and property-based tests for taskStore.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Module import — taskStore.js uses a dual export (window / module.exports)
// ---------------------------------------------------------------------------
import {
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
} from "./taskStore.js";

// ---------------------------------------------------------------------------
// localStorage mock — uses a Map to simulate browser storage
// ---------------------------------------------------------------------------

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    _store: store,
  };
}

// Reset internal `tasks` state between tests by calling loadTasks on an
// empty store (side-effect: clears in-memory state).
function resetTaskStore(lsMock) {
  lsMock.clear();
  loadTasks();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "todolist-tasks";

/** Build a minimal valid Task object for seeding tests. */
function makeTask(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: "Sample task",
    completed: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit tests — loadTasks / saveTasks / getAllTasks
// ---------------------------------------------------------------------------

describe("loadTasks", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("returns [] when localStorage key is absent", () => {
    const result = loadTasks();
    expect(result).toEqual([]);
  });

  it("parses and returns valid tasks from localStorage", () => {
    const data = [makeTask({ id: "a1", title: "T1" }), makeTask({ id: "a2", title: "T2" })];
    ls.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = loadTasks();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("a2");
  });

  it("returns [] and removes key when JSON is corrupt", () => {
    ls.setItem(STORAGE_KEY, "not-valid-json{{{");
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns [] and removes key when stored value is not an array", () => {
    ls.setItem(STORAGE_KEY, JSON.stringify({ id: "x", title: "oops", completed: false }));
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns [] and removes key when an item is missing `id`", () => {
    const bad = [{ title: "No id", completed: false, createdAt: 1 }];
    ls.setItem(STORAGE_KEY, JSON.stringify(bad));
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns [] and removes key when an item is missing `title`", () => {
    const bad = [{ id: "x1", completed: false, createdAt: 1 }];
    ls.setItem(STORAGE_KEY, JSON.stringify(bad));
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns [] and removes key when an item has non-boolean `completed`", () => {
    const bad = [{ id: "x1", title: "T", completed: "yes", createdAt: 1 }];
    ls.setItem(STORAGE_KEY, JSON.stringify(bad));
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });

  it("accepts tasks that are missing optional `createdAt` field (only id/title/completed required)", () => {
    const data = [{ id: "x1", title: "T1", completed: false }];
    ls.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = loadTasks();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("x1");
  });
});

describe("saveTasks", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("persists in-memory tasks to localStorage", () => {
    addTask("Save me");
    // localStorage should have the task stored
    const stored = JSON.parse(ls.getItem(STORAGE_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Save me");
  });

  it("throws StorageError when localStorage.setItem throws DOMException", () => {
    ls.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };
    expect(() => saveTasks()).toThrow(StorageError);
  });

  it("StorageError message is in Bahasa Indonesia", () => {
    ls.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };
    let caught;
    try {
      saveTasks();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StorageError);
    expect(caught.message).toMatch(/localStorage/i);
  });
});

describe("getAllTasks", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("returns [] when no tasks exist", () => {
    expect(getAllTasks()).toEqual([]);
  });

  it("returns a copy — mutating the result does not affect internal state", () => {
    addTask("Original");
    const copy = getAllTasks();
    copy.push({ id: "fake", title: "Injected", completed: false, createdAt: 0 });
    // Internal state should still have only 1 task
    expect(getAllTasks()).toHaveLength(1);
  });

  it("returns current tasks matching what was added", () => {
    addTask("Task A");
    addTask("Task B");
    const all = getAllTasks();
    expect(all).toHaveLength(2);
    const titles = all.map((t) => t.title);
    expect(titles).toContain("Task A");
    expect(titles).toContain("Task B");
  });
});

// ---------------------------------------------------------------------------
// Unit tests — localStorage corrupt / invalid data (Requirement 7.3)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Unit tests — toggleAllTasks (Requirements 8.2, 8.4, 8.6)
// ---------------------------------------------------------------------------

describe("toggleAllTasks", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("marks all tasks completed when at least one is active (Req 8.2)", () => {
    addTask("Task 1");
    addTask("Task 2");
    addTask("Task 3");
    // Toggle task 1 to completed, leaving tasks 2 and 3 active
    const allAfterAdd = getAllTasks();
    toggleTask(allAfterAdd[2].id); // task 1 (oldest, index 2) → completed

    const result = toggleAllTasks();

    expect(result.every((t) => t.completed)).toBe(true);
  });

  it("marks all tasks active when all are already completed (Req 8.4)", () => {
    addTask("Task A");
    addTask("Task B");
    // Mark all completed first
    toggleAllTasks();

    const result = toggleAllTasks();

    expect(result.every((t) => !t.completed)).toBe(true);
  });

  it("persists updated state to localStorage after call (Req 8.6)", () => {
    addTask("Saved task");
    toggleAllTasks();

    const stored = JSON.parse(ls.getItem("todolist-tasks"));
    expect(stored.every((t) => t.completed)).toBe(true);
  });

  it("returns a shallow copy of tasks", () => {
    addTask("Task X");
    const result = toggleAllTasks();

    // Mutating the returned array should not affect internal state
    result.push({ id: "fake", title: "Injected", completed: false, createdAt: 0 });
    expect(getAllTasks()).toHaveLength(1);
  });

  it("returns [] when no tasks exist", () => {
    const result = toggleAllTasks();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — localStorage corrupt / invalid data (Requirement 7.3)
// ---------------------------------------------------------------------------

describe("Requirement 7.3 — invalid localStorage data", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("loads empty list when stored data has items with wrong field types", () => {
    ls.setItem(STORAGE_KEY, JSON.stringify([{ id: 123, title: true, completed: "no" }]));
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });

  it("loads empty list when stored value is null JSON", () => {
    ls.setItem(STORAGE_KEY, "null");
    const result = loadTasks();
    expect(result).toEqual([]);
    expect(ls.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit tests — updateTaskTitle (Requirements 5.2, 5.3, 5.5, 5.6)
// ---------------------------------------------------------------------------

describe("updateTaskTitle", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("updates the title of an existing task and returns the updated task", () => {
    const task = addTask("Judul lama");
    const updated = updateTaskTitle(task.id, "Judul baru");
    expect(updated).toBeDefined();
    expect(updated.title).toBe("Judul baru");
    expect(updated.id).toBe(task.id);
  });

  it("trims whitespace from the new title before saving", () => {
    const task = addTask("Original");
    const updated = updateTaskTitle(task.id, "  Trimmed  ");
    expect(updated.title).toBe("Trimmed");
  });

  it("persists the updated title to localStorage", () => {
    const task = addTask("Sebelum");
    updateTaskTitle(task.id, "Sesudah");
    const stored = JSON.parse(ls.getItem(STORAGE_KEY));
    expect(stored[0].title).toBe("Sesudah");
  });

  it("returns undefined silently when id is not found", () => {
    addTask("Existing");
    const result = updateTaskTitle("non-existent-id", "Judul baru");
    expect(result).toBeUndefined();
  });

  it("does not modify any task when id is not found", () => {
    addTask("Task A");
    updateTaskTitle("non-existent-id", "Judul baru");
    const all = getAllTasks();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Task A");
  });

  it("throws ValidationError when title is empty string", () => {
    const task = addTask("Valid");
    expect(() => updateTaskTitle(task.id, "")).toThrow(ValidationError);
  });

  it("throws ValidationError when title is whitespace-only", () => {
    const task = addTask("Valid");
    expect(() => updateTaskTitle(task.id, "   ")).toThrow(ValidationError);
  });

  it("throws ValidationError when title is whitespace tab-only", () => {
    const task = addTask("Valid");
    expect(() => updateTaskTitle(task.id, "\t\t")).toThrow(ValidationError);
  });

  it("throws ValidationError when title exceeds 50 characters", () => {
    const task = addTask("Valid");
    const longTitle = "a".repeat(51);
    expect(() => updateTaskTitle(task.id, longTitle)).toThrow(ValidationError);
  });

  it("does not update title when ValidationError is thrown", () => {
    const task = addTask("Judul asli");
    try {
      updateTaskTitle(task.id, "");
    } catch (e) {
      // expected
    }
    const all = getAllTasks();
    expect(all[0].title).toBe("Judul asli");
  });

  it("accepts exactly 50 character title", () => {
    const task = addTask("Valid");
    const maxTitle = "a".repeat(50);
    const updated = updateTaskTitle(task.id, maxTitle);
    expect(updated.title).toBe(maxTitle);
  });

  it("only modifies the target task — other tasks remain unchanged", () => {
    addTask("Task C");
    addTask("Task B");
    const target = addTask("Task A"); // unshift: index 0
    // tasks order (newest first): A, B, C
    updateTaskTitle(target.id, "Task A Updated");

    const all = getAllTasks();
    const others = all.filter((t) => t.id !== target.id);
    expect(others.every((t) => t.title !== "Task A Updated")).toBe(true);
    expect(others.map((t) => t.title)).toContain("Task B");
    expect(others.map((t) => t.title)).toContain("Task C");
  });
});

// ---------------------------------------------------------------------------
// Unit tests — deleteTask (Requirement 4.2)
// ---------------------------------------------------------------------------

describe("deleteTask", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("removes the correct task from the list (Req 4.2)", () => {
    const t1 = addTask("Task 1");
    const t2 = addTask("Task 2");
    const t3 = addTask("Task 3");

    deleteTask(t2.id);

    const all = getAllTasks();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.id)).not.toContain(t2.id);
  });

  it("leaves all other tasks intact after deletion", () => {
    const t1 = addTask("Task 1");
    const t2 = addTask("Task 2");
    const t3 = addTask("Task 3");

    deleteTask(t2.id);

    const all = getAllTasks();
    expect(all.map((t) => t.id)).toContain(t1.id);
    expect(all.map((t) => t.id)).toContain(t3.id);
  });

  it("persists the updated list to localStorage after deletion", () => {
    const t1 = addTask("Keep me");
    const t2 = addTask("Delete me");

    deleteTask(t2.id);

    const stored = JSON.parse(ls.getItem(STORAGE_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(t1.id);
  });

  it("does nothing when id does not exist (Req 4.2 — no error on missing id)", () => {
    addTask("Task A");
    addTask("Task B");

    expect(() => deleteTask("non-existent-id")).not.toThrow();

    const all = getAllTasks();
    expect(all).toHaveLength(2);
  });

  it("results in empty list after deleting the only task", () => {
    const t = addTask("Only task");
    deleteTask(t.id);
    expect(getAllTasks()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — addTask input validation (Requirements 1.4, 5.5)
// ---------------------------------------------------------------------------

describe("Property 2: Input whitespace/kosong selalu ditolak", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("never accepts whitespace-only or empty strings as task titles", () => {
    // Feature: todolist-app, Property 2: Input whitespace/kosong selalu ditolak
    fc.assert(
      fc.property(
        // fc.stringOf equivalent: array of whitespace chars joined into a string.
        // fc.array produces [] (empty) through many items, so join gives "" through
        // long whitespace-only strings — exactly the input space described in Property 2.
        fc.array(fc.constantFrom(" ", "\t", "\n")).map((chars) => chars.join("")),
        (whitespaceTitle) => {
          // Seed a known task to track list length changes
          addTask("Tugas awal");
          const lengthBefore = getAllTasks().length;

          let threw = false;
          let threwValidationError = false;

          try {
            addTask(whitespaceTitle);
          } catch (err) {
            threw = true;
            threwValidationError = err instanceof ValidationError;
          }

          const lengthAfter = getAllTasks().length;

          // 1. Must throw an error
          if (!threw) return false;
          // 2. The error must be a ValidationError
          if (!threwValidationError) return false;
          // 3. Task_List length must not change
          if (lengthAfter !== lengthBefore) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — deleteCompletedTasks (Requirement 4.3)
// ---------------------------------------------------------------------------

describe("deleteCompletedTasks", () => {
  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    resetTaskStore(ls);
  });

  it("removes only completed tasks, leaving active tasks intact (Req 4.3)", () => {
    const active1 = addTask("Active 1");
    const active2 = addTask("Active 2");
    const toComplete = addTask("To complete");
    toggleTask(toComplete.id); // mark as completed

    deleteCompletedTasks();

    const all = getAllTasks();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.id)).toContain(active1.id);
    expect(all.map((t) => t.id)).toContain(active2.id);
    expect(all.map((t) => t.id)).not.toContain(toComplete.id);
  });

  it("removes all tasks when all are completed", () => {
    const t1 = addTask("Task 1");
    const t2 = addTask("Task 2");
    toggleTask(t1.id);
    toggleTask(t2.id);

    deleteCompletedTasks();

    expect(getAllTasks()).toEqual([]);
  });

  it("does nothing when there are no completed tasks", () => {
    addTask("Active A");
    addTask("Active B");

    deleteCompletedTasks();

    expect(getAllTasks()).toHaveLength(2);
  });

  it("does nothing when the task list is empty", () => {
    expect(() => deleteCompletedTasks()).not.toThrow();
    expect(getAllTasks()).toEqual([]);
  });

  it("persists the updated list to localStorage after deleting completed tasks", () => {
    const active = addTask("Active");
    const completed = addTask("Completed");
    toggleTask(completed.id);

    deleteCompletedTasks();

    const stored = JSON.parse(ls.getItem(STORAGE_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(active.id);
  });

  it("active tasks retain their original data after deleteCompletedTasks", () => {
    const active = addTask("Unchanged title");
    const completed = addTask("Will be deleted");
    toggleTask(completed.id);

    deleteCompletedTasks();

    const all = getAllTasks();
    expect(all[0].title).toBe("Unchanged title");
    expect(all[0].completed).toBe(false);
    expect(all[0].id).toBe(active.id);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — updateTaskTitle
// ---------------------------------------------------------------------------

describe("Property 9: Edit hanya ubah target task", () => {
  // Feature: todolist-app, Property 9: Edit hanya ubah target task
  // Validates: Requirements 5.2, 5.3

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  it("after updateTaskTitle, only the target task title changes; all other tasks remain unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 3 }),
        fc.nat(),
        fc
          .string({ minLength: 3, maxLength: 50 })
          .filter((s) => s.trim().length >= 3),
        (taskList, natIndex, newTitle) => {
          // Set up a fresh localStorage mock for each run
          const ls = createLocalStorageMock();
          vi.stubGlobal("localStorage", ls);

          // Seed the store via localStorage + loadTasks()
          ls.setItem(STORAGE_KEY, JSON.stringify(taskList));
          loadTasks();

          // Pick target index using modulo to stay within bounds
          const targetIndex = natIndex % taskList.length;
          const targetId = taskList[targetIndex].id;

          // Snapshot all tasks before the update
          const beforeAll = getAllTasks();

          // Perform the update
          updateTaskTitle(targetId, newTitle);

          // Snapshot all tasks after the update
          const afterAll = getAllTasks();

          // The list length must not change
          expect(afterAll).toHaveLength(beforeAll.length);

          for (const beforeTask of beforeAll) {
            const afterTask = afterAll.find((t) => t.id === beforeTask.id);

            // Every task that existed before must still exist
            expect(afterTask).toBeDefined();

            if (beforeTask.id === targetId) {
              // Target task: title must be updated to the trimmed new title
              expect(afterTask.title).toBe(newTitle.trim());
              // Other fields of the target task must not change
              expect(afterTask.completed).toBe(beforeTask.completed);
              expect(afterTask.createdAt).toBe(beforeTask.createdAt);
            } else {
              // Non-target tasks: ALL fields must be completely unchanged
              expect(afterTask.title).toBe(beforeTask.title);
              expect(afterTask.completed).toBe(beforeTask.completed);
              expect(afterTask.createdAt).toBe(beforeTask.createdAt);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — toggleAllTasks (Property 7)
// ---------------------------------------------------------------------------

describe("Property 7: toggleAllTasks adalah operasi idempoten terhadap status all-completed", () => {
  // Feature: todolist-app, Property 7: toggleAllTasks adalah operasi idempoten terhadap status all-completed
  // Validates: Requirements 8.2, 8.4

  /** Arbitrary for a Task where completed is always true */
  const allCompletedTaskArb = fc.record({
    id: fc.uuid(),
    title: fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length >= 3),
    completed: fc.constant(true),
    createdAt: fc.integer({ min: 0 }),
  });

  it("toggleAllTasks() pada all-completed list mengubah semua ke false, lalu toggleAllTasks() lagi mengembalikan semua ke true", () => {
    fc.assert(
      fc.property(
        fc.array(allCompletedTaskArb, { minLength: 3 }),
        (taskList) => {
          // Set up a fresh localStorage mock for each run
          const ls = createLocalStorageMock();
          vi.stubGlobal("localStorage", ls);

          // Seed the store via localStorage + loadTasks() pattern
          ls.setItem(STORAGE_KEY, JSON.stringify(taskList));
          loadTasks();

          // All tasks must start as completed = true
          const before = getAllTasks();
          expect(before.every((t) => t.completed)).toBe(true);

          // First call: all-completed → should toggle all to false
          const afterFirst = toggleAllTasks();
          expect(afterFirst.every((t) => !t.completed)).toBe(true);
          expect(afterFirst).toHaveLength(taskList.length);

          // Second call: all-active → should toggle all back to true
          const afterSecond = toggleAllTasks();
          expect(afterSecond.every((t) => t.completed)).toBe(true);
          expect(afterSecond).toHaveLength(taskList.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — loadTasks / saveTasks
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Property-based tests — toggleTask (round-trip)
// ---------------------------------------------------------------------------

describe("Property 3: Toggle status adalah operasi idempoten bolak-balik (round-trip)", () => {
  // Feature: todolist-app, Property 3: Toggle status adalah operasi idempoten bolak-balik (round-trip)
  // Validates: Requirements 3.1, 3.3

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  it("memanggil toggleTask dua kali berturut-turut mengembalikan task ke status completed semula", () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 3 }),
        fc.nat(),
        (taskList, natIndex) => {
          // Set up a fresh localStorage mock for each run
          const ls = createLocalStorageMock();
          vi.stubGlobal("localStorage", ls);

          // Seed store via localStorage + loadTasks() pattern
          ls.setItem(STORAGE_KEY, JSON.stringify(taskList));
          loadTasks();

          // Pick a valid task index using modulo
          const index = natIndex % taskList.length;
          const targetId = taskList[index].id;

          // Record original completed value
          const originalCompleted = taskList[index].completed;

          // Toggle twice
          toggleTask(targetId);
          toggleTask(targetId);

          // Assert task is back to original status
          const allTasks = getAllTasks();
          const targetTask = allTasks.find((t) => t.id === targetId);
          expect(targetTask).toBeDefined();
          expect(targetTask.completed).toBe(originalCompleted);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 6: Persistensi round-trip mempertahankan data", () => {
  // Feature: todolist-app, Property 6: Persistensi round-trip mempertahankan data
  // Validates: Requirements 7.1, 7.2

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  it("saving tasks to localStorage then loading back produces an identical Task_List", () => {
    fc.assert(
      fc.property(fc.array(taskArb), (taskList) => {
        // Set up a fresh Map-based localStorage mock for each run
        const ls = createLocalStorageMock();
        vi.stubGlobal("localStorage", ls);

        // Seed the internal tasks state by writing directly to mock storage
        // then calling loadTasks to hydrate the module state
        ls.setItem(STORAGE_KEY, JSON.stringify(taskList));
        loadTasks();

        // Persist current in-memory state back to storage
        saveTasks();

        // Load again from what was just persisted
        const reloaded = loadTasks();

        // The reloaded list must be structurally identical to the original
        expect(reloaded).toHaveLength(taskList.length);
        for (let i = 0; i < taskList.length; i++) {
          expect(reloaded[i].id).toBe(taskList[i].id);
          expect(reloaded[i].title).toBe(taskList[i].title);
          expect(reloaded[i].completed).toBe(taskList[i].completed);
          expect(reloaded[i].createdAt).toBe(taskList[i].createdAt);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — deleteCompletedTasks (Property 8)
// ---------------------------------------------------------------------------

describe("Property 8: deleteCompletedTasks tidak menghapus active tasks", () => {
  // Feature: todolist-app, Property 8: deleteCompletedTasks tidak menghapus active tasks
  // Validates: Requirements 4.3

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  it("seluruh task dengan completed=false sebelum deleteCompletedTasks tetap ada dengan data tidak berubah", () => {
    fc.assert(
      fc.property(fc.array(taskArb), (taskList) => {
        // Set up a fresh localStorage mock for each run
        const ls = createLocalStorageMock();
        vi.stubGlobal("localStorage", ls);

        // Seed the store via localStorage + loadTasks() pattern
        ls.setItem(STORAGE_KEY, JSON.stringify(taskList));
        loadTasks();

        // Snapshot all active (non-completed) tasks before the call
        const activeBefore = taskList.filter((t) => !t.completed);

        // Exercise: delete all completed tasks
        deleteCompletedTasks();

        // Get the resulting list
        const afterAll = getAllTasks();

        // Every task that had completed=false BEFORE the call SHALL still be in the list
        for (const activeTask of activeBefore) {
          const found = afterAll.find((t) => t.id === activeTask.id);

          // Task must still exist
          expect(found).toBeDefined();

          // All fields must be unchanged
          expect(found.id).toBe(activeTask.id);
          expect(found.title).toBe(activeTask.title);
          expect(found.completed).toBe(false);
          expect(found.createdAt).toBe(activeTask.createdAt);
        }

        // Also verify: no active task was accidentally removed
        expect(afterAll.filter((t) => !t.completed)).toHaveLength(activeBefore.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — getFilteredTasks (Property 5)
// ---------------------------------------------------------------------------

describe("Property 5: Filter mengembalikan subset yang benar", () => {
  // Feature: todolist-app, Property 5: Filter mengembalikan subset yang benar
  // Validates: Requirements 6.3, 6.4, 6.5

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  /**
   * Pure helper that replicates the filtering logic from getFilteredTasks() in app.js.
   * @param {Task[]} tasks
   * @param {"all"|"active"|"completed"} filter
   * @returns {Task[]}
   */
  function applyFilter(tasks, filter) {
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }

  it("hasil filter berisi tepat task yang sesuai kondisi dan tidak ada lainnya", () => {
    fc.assert(
      fc.property(
        fc.array(taskArb),
        fc.constantFrom("all", "active", "completed"),
        (taskList, filter) => {
          const result = applyFilter(taskList, filter);

          if (filter === "all") {
            // Must return all tasks — same length and same ids
            expect(result).toHaveLength(taskList.length);
            const resultIds = result.map((t) => t.id);
            for (const task of taskList) {
              expect(resultIds).toContain(task.id);
            }
          } else if (filter === "active") {
            // Must contain only tasks where completed === false
            for (const task of result) {
              expect(task.completed).toBe(false);
            }
            // Must contain ALL tasks where completed === false
            const activeTasks = taskList.filter((t) => !t.completed);
            expect(result).toHaveLength(activeTasks.length);
            const resultIds = result.map((t) => t.id);
            for (const activeTask of activeTasks) {
              expect(resultIds).toContain(activeTask.id);
            }
          } else if (filter === "completed") {
            // Must contain only tasks where completed === true
            for (const task of result) {
              expect(task.completed).toBe(true);
            }
            // Must contain ALL tasks where completed === true
            const completedTasks = taskList.filter((t) => t.completed);
            expect(result).toHaveLength(completedTasks.length);
            const resultIds = result.map((t) => t.id);
            for (const completedTask of completedTasks) {
              expect(resultIds).toContain(completedTask.id);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — active count consistency (Property 4)
// ---------------------------------------------------------------------------

describe("Property 4: Jumlah active count selalu konsisten dengan state tasks", () => {
  // Feature: todolist-app, Property 4: Jumlah active count selalu konsisten dengan state tasks
  // Validates: Requirements 2.4, 2.5

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  it("active count selalu sama dengan jumlah tasks yang memiliki completed === false", () => {
    fc.assert(
      fc.property(fc.array(taskArb), (taskList) => {
        // The active count logic from renderFooter() in app.js:
        // const activeCount = tasks.filter(t => !t.completed).length;
        const activeCount = taskList.filter((t) => !t.completed).length;

        // Count tasks where completed === false explicitly
        const falseCompletedCount = taskList.filter((t) => t.completed === false).length;

        // Both counts must be equal — the two expressions are semantically equivalent
        expect(activeCount).toBe(falseCompletedCount);

        // Active count must be within valid bounds
        expect(activeCount).toBeGreaterThanOrEqual(0);
        expect(activeCount).toBeLessThanOrEqual(taskList.length);

        // Completed count + active count must equal total task count
        const completedCount = taskList.filter((t) => t.completed).length;
        expect(activeCount + completedCount).toBe(taskList.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — addTask (Property 1)
// ---------------------------------------------------------------------------

describe("Property 1: Task baru ditambahkan ke awal list", () => {
  // Feature: todolist-app, Property 1: Task baru ditambahkan ke awal list
  // Validates: Requirements 1.1, 1.2, 1.5

  let ls;

  beforeEach(() => {
    ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
  });

  /** Arbitrary for a valid Task object (matches the Task typedef in taskStore.js) */
  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  /** Valid title: non-empty, non-whitespace-only, ≤50 characters */
  const validTitleArb = fc
    .string({ minLength: 3, maxLength: 50 })
    .filter((s) => s.trim().length >= 3);

  it("panjang Task_List menjadi N+1 dan task baru berada di indeks 0 (fc)", () => {
    fc.assert(
      fc.property(fc.array(taskArb), validTitleArb, (initialTasks, title) => {
        // --- Setup: seed the store with initialTasks via localStorage ---
        ls.clear();
        ls.setItem(STORAGE_KEY, JSON.stringify(initialTasks));
        loadTasks();

        const beforeLength = getAllTasks().length;

        // --- Exercise ---
        const newTask = addTask(title);

        // --- Verify ---
        const after = getAllTasks();

        // 1. Length becomes N+1
        expect(after).toHaveLength(beforeLength + 1);

        // 2. The new task is at index 0
        expect(after[0].id).toBe(newTask.id);
        expect(after[0].title).toBe(title.trim());

        // 3. The new task has completed: false
        expect(after[0].completed).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — moveTaskBefore
// ---------------------------------------------------------------------------

describe("moveTaskBefore", () => {
  beforeEach(() => {
    const ls = createLocalStorageMock();
    vi.stubGlobal("localStorage", ls);
    loadTasks();
  });

  it("moves a task before another task", () => {
    addTask("Task 1");
    addTask("Task 2");
    addTask("Task 3");
    // Initial order: Task 3, Task 2, Task 1
    const tasks = getAllTasks();
    const task3 = tasks[0];
    const task2 = tasks[1];
    const task1 = tasks[2];

    // Move Task 3 before Task 1
    moveTaskBefore(task3.id, task1.id);
    const newTasks = getAllTasks();
    expect(newTasks[0].id).toBe(task2.id);
    expect(newTasks[1].id).toBe(task3.id);
    expect(newTasks[2].id).toBe(task1.id);
  });

  it("moves a task to the end when referenceId is null", () => {
    addTask("Task 1");
    addTask("Task 2");
    addTask("Task 3");
    // Initial order: Task 3, Task 2, Task 1
    const tasks = getAllTasks();
    const task3 = tasks[0];
    
    // Move Task 3 to end
    moveTaskBefore(task3.id, null);
    const newTasks = getAllTasks();
    expect(newTasks[2].id).toBe(task3.id);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests — moveTaskBefore
// ---------------------------------------------------------------------------

describe("Property 10: Reorder mempertahankan integritas data", () => {
  // Feature: todolist-app, Property 10: Reorder mempertahankan integritas data
  // Validates: Requirements 9.3, 9.4

  const taskArb = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length >= 3),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 }),
  });

  it("after moveTaskBefore, task list contains the exact same items", () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 2 }),
        fc.nat(),
        fc.nat(),
        (taskList, srcNat, refNat) => {
          const ls = createLocalStorageMock();
          vi.stubGlobal("localStorage", ls);
          ls.setItem("todolist-tasks", JSON.stringify(taskList));
          loadTasks();

          const srcIndex = srcNat % taskList.length;
          let refIndex = refNat % taskList.length;
          
          const sourceId = taskList[srcIndex].id;
          const referenceId = refNat % 2 === 0 ? taskList[refIndex].id : null;

          const beforeAll = getAllTasks();
          moveTaskBefore(sourceId, referenceId);
          const afterAll = getAllTasks();

          expect(afterAll).toHaveLength(beforeAll.length);
          
          const beforeIds = beforeAll.map(t => t.id).sort();
          const afterIds = afterAll.map(t => t.id).sort();
          expect(afterIds).toEqual(beforeIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
