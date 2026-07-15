/**
 * app.js — Controller + View Layer
 *
 * Depends on taskStore.js being loaded first (all taskStore functions are
 * available on window in the browser).
 */

// ---------------------------------------------------------------------------
// UI State
// ---------------------------------------------------------------------------

/** @type {"all"|"active"|"completed"} */
let currentFilter = "all";

/** @type {string|null} ID of the task currently in edit mode, or null */
let editingTaskId = null;

/** @type {string|null} ID of the task currently being dragged, or null */
let draggingTaskId = null;

// ---------------------------------------------------------------------------
// Notification System
// ---------------------------------------------------------------------------

let activeNotifications = [];

/**
 * Shows a stacked toast notification (iOS style).
 * @param {string} message 
 * @param {string} type (e.g. "error")
 */
function showNotification(message, type = "error") {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  
  // Force a reflow so the transition will trigger from the initial CSS state
  toast.offsetHeight;

  activeNotifications.unshift(toast);
  updateNotificationStack();

  // Remove after 3 seconds
  setTimeout(() => {
    // Start exit transition
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-30px) scale(0.9)';
    
    // Remove from array and DOM after transition completes
    setTimeout(() => {
      toast.remove();
      const index = activeNotifications.indexOf(toast);
      if (index > -1) {
        activeNotifications.splice(index, 1);
        updateNotificationStack();
      }
    }, 400); // match CSS transition duration
  }, 3000);
}

/**
 * Re-calculates and applies transforms to all active notifications to create a 3D stack.
 */
function updateNotificationStack() {
  activeNotifications.forEach((toast, index) => {
    // Only show top 4 notifications visually
    if (index > 3) {
      toast.style.opacity = '0';
      toast.style.pointerEvents = 'none';
      return;
    }
    
    // scale shrinks 5% per layer
    const scale = 1 - (index * 0.05);
    // Move down 12px per layer
    const translateY = index * 14; 
    
    toast.style.transform = `translateY(${translateY}px) scale(${scale})`;
    toast.style.zIndex = 100 - index;
    // Base opacity fades out slightly for older items
    toast.style.opacity = (1 - (index * 0.2)).toString();
    toast.style.pointerEvents = index === 0 ? 'auto' : 'none';
  });
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Returns tasks filtered by the current filter setting.
 *
 * @returns {Task[]}
 */
function getFilteredTasks() {
  const tasks = getAllTasks();
  if (currentFilter === "active") return tasks.filter((t) => !t.completed);
  if (currentFilter === "completed") return tasks.filter((t) => t.completed);
  return tasks;
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

/**
 * Builds a DOM element for a single task.
 *
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function renderTaskItem(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " completed" : "");
  li.dataset.id = task.id;
  li.draggable = true;

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Tandai selesai: ${task.title}`);

  // Label
  const label = document.createElement("span");
  label.className = "task-label";
  label.textContent = task.title;

  // Edit input (hidden unless in edit mode)
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "task-edit-input";
  editInput.value = task.title;
  editInput.maxLength = 50;
  editInput.setAttribute("aria-label", `Edit tugas: ${task.title}`);

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "task-delete-btn";
  deleteBtn.textContent = "Hapus";
  deleteBtn.setAttribute("aria-label", `Hapus tugas: ${task.title}`);

  if (task.id === editingTaskId) {
    li.classList.add("editing");
    label.style.display = "none";
    editInput.style.display = "";
  } else {
    editInput.style.display = "none";
    label.style.display = "";
  }

  li.appendChild(checkbox);
  li.appendChild(label);
  li.appendChild(editInput);
  li.appendChild(deleteBtn);

  return li;
}

/**
 * Updates the footer: active count text and clear-completed button state.
 * Requirements: 2.4, 2.5, 4.4
 */
function renderFooter() {
  const tasks = getAllTasks();
  const activeCount = tasks.filter((t) => !t.completed).length;
  const hasCompleted = tasks.some((t) => t.completed);

  document.getElementById("active-count").textContent =
    `${activeCount} tugas tersisa`;

  const clearBtn = document.getElementById("clear-completed-btn");
  clearBtn.disabled = !hasCompleted;
}

/**
 * Updates the mark-all checkbox: checked and disabled state.
 * Requirements: 8.1, 8.3, 8.5
 */
function renderMarkAllControl() {
  const tasks = getAllTasks();
  const checkbox = document.getElementById("mark-all-checkbox");

  if (tasks.length === 0) {
    checkbox.disabled = true;
    checkbox.checked = false;
  } else {
    checkbox.disabled = false;
    checkbox.checked = tasks.every((t) => t.completed);
  }
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

/**
 * Re-renders the entire task list and all UI controls.
 */
function render() {
  const filtered = getFilteredTasks();
  const allTasks = getAllTasks();

  const taskList = document.getElementById("task-list");
  const emptyMsg = document.getElementById("empty-msg");

  // Rebuild task list
  taskList.innerHTML = "";
  filtered.forEach((task) => {
    taskList.appendChild(renderTaskItem(task));
  });

  // Empty state message
  if (filtered.length === 0) {
    if (allTasks.length === 0) {
      emptyMsg.textContent = "Belum ada tugas. Tambahkan tugas baru di atas!";
    } else {
      emptyMsg.textContent = "Tidak ada tugas yang sesuai dengan filter ini.";
    }
    emptyMsg.style.display = "";
  } else {
    emptyMsg.textContent = "";
    emptyMsg.style.display = "none";
  }

  // Footer and mark-all control
  renderFooter();
  renderMarkAllControl();
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  render();

  // -------------------------------------------------------------------------
  // handleAddTask — Requirements 1.2, 1.3, 1.4
  // -------------------------------------------------------------------------

  /**
   * Reads the value from #task-input, attempts to add a new task, and
   * updates the UI accordingly.
   *
   * @param {Event} e
   */
  function handleAddTask(e) {
    // For keydown events, only act on Enter
    if (e.type === "keydown" && e.key !== "Enter") return;

    const input = document.getElementById("task-input");
    const title = input.value.trim();

    try {
      addTask(title);

      // Success: clear input, refocus
      input.value = "";
      input.focus();

      render();
    } catch (err) {
      if (err instanceof ValidationError || err instanceof StorageError) {
        showNotification(err.message, "error");
      } else {
        throw err;
      }
    }
  }

  document.getElementById("add-btn").addEventListener("click", handleAddTask);
  document.getElementById("task-input").addEventListener("keydown", handleAddTask);

  // -------------------------------------------------------------------------
  // setFilter — Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  // -------------------------------------------------------------------------

  /**
   * Updates the active filter, syncs the active class on filter buttons,
   * and re-renders the task list.
   *
   * @param {"all"|"active"|"completed"} filter
   */
  function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      if (btn.dataset.filter === filter) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    render();
  }

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  // -------------------------------------------------------------------------
  // Tasks 5.7 & 5.8: Event Handlers and Event Delegation
  // -------------------------------------------------------------------------

  function handleToggleTask(id) {
    try {
      toggleTask(id);
      render();
    } catch (err) {
      if (err instanceof StorageError) showNotification(err.message, "error");
      else throw err;
    }
  }

  function handleDeleteTask(id) {
    try {
      deleteTask(id);
      render();
    } catch (err) {
      if (err instanceof StorageError) showNotification(err.message, "error");
      else throw err;
    }
  }

  function handleDeleteCompleted() {
    try {
      deleteCompletedTasks();
      render();
    } catch (err) {
      if (err instanceof StorageError) showNotification(err.message, "error");
      else throw err;
    }
  }

  function handleToggleAll() {
    try {
      toggleAllTasks();
      render();
    } catch (err) {
      if (err instanceof StorageError) showNotification(err.message, "error");
      else throw err;
    }
  }

  document.getElementById("clear-completed-btn").addEventListener("click", handleDeleteCompleted);
  document.getElementById("mark-all-checkbox").addEventListener("change", handleToggleAll);

  function handleSaveEdit(id, newTitle) {
    try {
      updateTaskTitle(id, newTitle);
      editingTaskId = null;
      render();
    } catch (err) {
      if (err instanceof ValidationError || err instanceof StorageError) {
        showNotification(err.message, "error");
      } else {
        throw err;
      }
    }
  }

  function handleStartEdit(id) {
    if (editingTaskId) {
      const currentEditingInput = document.querySelector(`li[data-id="${editingTaskId}"] .task-edit-input`);
      if (currentEditingInput) {
        try {
          updateTaskTitle(editingTaskId, currentEditingInput.value);
        } catch (err) {
          if (err instanceof ValidationError || err instanceof StorageError) {
            showNotification(err.message, "error");
            return;
          } else {
            throw err;
          }
        }
      }
    }
    
    editingTaskId = id;
    render();

    const input = document.querySelector(`li[data-id="${id}"] .task-edit-input`);
    if (input) {
      input.focus();
      input.selectionStart = input.selectionEnd = input.value.length;
    }
  }

  function handleCancelEdit() {
    editingTaskId = null;
    render();
  }

  const taskList = document.getElementById("task-list");

  taskList.addEventListener("click", (e) => {
    const li = e.target.closest("li.task-item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("task-checkbox")) {
      handleToggleTask(id);
    } else if (e.target.classList.contains("task-delete-btn")) {
      handleDeleteTask(id);
    }
  });

  taskList.addEventListener("dblclick", (e) => {
    const li = e.target.closest("li.task-item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("task-label")) {
      handleStartEdit(id);
    }
  });

  taskList.addEventListener("keydown", (e) => {
    const li = e.target.closest("li.task-item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("task-edit-input")) {
      if (e.key === "Enter") {
        handleSaveEdit(id, e.target.value);
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    }
  });

  taskList.addEventListener("focusout", (e) => {
    const li = e.target.closest("li.task-item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("task-edit-input")) {
      if (editingTaskId === id) {
        handleSaveEdit(id, e.target.value);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Drag and Drop (Requirement 9)
  // -------------------------------------------------------------------------

  taskList.addEventListener("dragstart", (e) => {
    const li = e.target.closest("li.task-item");
    if (!li) return;
    draggingTaskId = li.dataset.id;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => li.classList.add("dragging"), 0);
  });

  taskList.addEventListener("dragend", (e) => {
    const li = e.target.closest("li.task-item");
    if (li) li.classList.remove("dragging");
    draggingTaskId = null;
  });

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault(); // Necessary to allow dropping
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const draggingEl = document.querySelector(".dragging");
    if (draggingEl) {
      if (afterElement == null) {
        taskList.appendChild(draggingEl);
      } else {
        taskList.insertBefore(draggingEl, afterElement);
      }
    }
  });

  taskList.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    const afterElement = getDragAfterElement(taskList, e.clientY);
    let referenceId = null;
    if (afterElement) {
      referenceId = afterElement.dataset.id;
    }

    if (draggingTaskId === referenceId) return;

    try {
      moveTaskBefore(draggingTaskId, referenceId);
      render();
    } catch (err) {
      console.error(err);
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".task-item:not(.dragging)")];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }
});
