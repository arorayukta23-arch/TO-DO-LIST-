/* ============================================
   PORTFOLIO - Task 3 To-Do Application Logic
   Author: Yukta Arora
   Features: State Management, LocalStorage, Event Delegation,
   DOM Manipulation, WCAG Accessibility, ARIA Live Regions.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const STORAGE_KEY = 'thiranex_todo_tasks';

  // Single Source of Truth
  const state = {
    tasks: [], // Starts completely empty by default
    filter: 'all' // 'all' | 'active' | 'completed'
  };

  // DOM Element References
  const todoForm         = document.getElementById('todo-form');
  const todoInput        = document.getElementById('todo-input');
  const todoInputError   = document.getElementById('todo-input-error');
  const todoList         = document.getElementById('todo-list');
  const todoCounter      = document.getElementById('todo-counter');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const liveRegion       = document.getElementById('todo-live-region');
  const filterButtons    = document.querySelectorAll('.filter-btn');

  if (!todoForm || !todoInput || !todoList) {
    return; // Not on todo.html page
  }

  /**
   * Generates a genuinely unique identifier for tasks.
   * Uses crypto.randomUUID() when available, falling back to timestamp + random string.
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Safe LocalStorage loader with crash protection and fallback to empty array.
   */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Validate array items
          state.tasks = parsed.filter(t => 
            t && 
            typeof t === 'object' && 
            typeof t.id === 'string' && 
            typeof t.text === 'string' &&
            typeof t.completed === 'boolean'
          );
        } else {
          console.warn('LocalStorage data is not a valid array. Resetting state.');
          state.tasks = [];
        }
      } else {
        state.tasks = [];
      }
    } catch (err) {
      console.warn('Failed to parse tasks from LocalStorage. Recovering safely to empty list:', err);
      state.tasks = [];
    }
  }

  /**
   * Persists current state.tasks to LocalStorage.
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (err) {
      console.error('Failed to save state to LocalStorage:', err);
    }
  }

  /**
   * Screen reader live region announcer.
   * @param {string} message - Message to announce to assistive technologies
   */
  function announce(message) {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  /**
   * Returns tasks matching the currently active filter.
   */
  function getFilteredTasks() {
    if (state.filter === 'active') {
      return state.tasks.filter(t => !t.completed);
    }
    if (state.filter === 'completed') {
      return state.tasks.filter(t => t.completed);
    }
    return state.tasks;
  }

  /**
   * Escapes HTML strings to prevent XSS vulnerabilities.
   * @param {string} str - Raw input text
   */
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  /**
   * Updates task counter and bulk action button states.
   */
  function updateStats() {
    const activeCount = state.tasks.filter(t => !t.completed).length;
    const completedCount = state.tasks.filter(t => t.completed).length;

    if (todoCounter) {
      todoCounter.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} remaining`;
    }

    if (clearCompletedBtn) {
      clearCompletedBtn.disabled = completedCount === 0;
    }
  }

  /**
   * Main DOM Renderer - Re-renders task list from single source of truth (state).
   */
  function render() {
    const filteredTasks = getFilteredTasks();
    todoList.innerHTML = '';

    updateStats();

    if (filteredTasks.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'todo-empty';

      let emptyHeading = 'No tasks found';
      let emptySubtitle = 'Add a new task above to get started!';

      if (state.filter === 'active') {
        emptyHeading = 'No active tasks';
        emptySubtitle = 'All your tasks are currently completed!';
      } else if (state.filter === 'completed') {
        emptyHeading = 'No completed tasks';
        emptySubtitle = 'Complete tasks to see them listed here.';
      } else if (state.tasks.length === 0) {
        emptyHeading = 'Your task list is empty';
        emptySubtitle = 'Add your first task using the form above!';
      }

      emptyLi.innerHTML = `
        <div class="todo-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <h3>${escapeHTML(emptyHeading)}</h3>
        <p>${escapeHTML(emptySubtitle)}</p>
      `;
      todoList.appendChild(emptyLi);
      return;
    }

    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `todo-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;

      const escapedText = escapeHTML(task.text);

      li.innerHTML = `
        <!-- Main Display View -->
        <div class="todo-item-main">
          <input 
            type="checkbox" 
            class="todo-checkbox" 
            ${task.completed ? 'checked' : ''} 
            data-action="toggle" 
            aria-label="Mark task '${escapedText}' as ${task.completed ? 'incomplete' : 'completed'}"
          >
          <span class="todo-text">${escapedText}</span>
        </div>

        <!-- Inline Edit View -->
        <div class="todo-edit-form" role="group" aria-label="Edit task inline">
          <input 
            type="text" 
            class="todo-edit-input" 
            value="${escapedText}" 
            aria-label="Edit task description"
          >
          <button 
            type="button" 
            class="todo-btn-icon btn-save" 
            data-action="save" 
            aria-label="Save edited task"
            title="Save (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <button 
            type="button" 
            class="todo-btn-icon btn-cancel" 
            data-action="cancel" 
            aria-label="Cancel editing"
            title="Cancel (Escape)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Action Buttons -->
        <div class="todo-actions">
          <button 
            type="button" 
            class="todo-btn-icon btn-edit" 
            data-action="edit" 
            aria-label="Edit task: ${escapedText}"
            title="Edit Task"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button 
            type="button" 
            class="todo-btn-icon btn-delete" 
            data-action="delete" 
            aria-label="Delete task: ${escapedText}"
            title="Delete Task"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      `;

      todoList.appendChild(li);
    });
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Add a new task (CREATE)
   */
  function addTask(text) {
    const cleanText = text.trim();
    if (!cleanText) {
      if (todoInput) todoInput.classList.add('error');
      if (todoInputError) todoInputError.classList.add('visible');
      announce('Task text cannot be empty.');
      return false;
    }

    // Reset validation errors
    if (todoInput) todoInput.classList.remove('error');
    if (todoInputError) todoInputError.classList.remove('visible');

    const newTask = {
      id: generateId(),
      text: cleanText,
      completed: false,
      createdAt: Date.now()
    };

    state.tasks.push(newTask);
    saveState();
    render();
    announce(`Task added: "${cleanText}"`);
    return true;
  }

  /**
   * Toggle task completion status (UPDATE)
   */
  function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveState();
      render();
      announce(`Task "${task.text}" marked as ${task.completed ? 'completed' : 'active'}.`);
    }
  }

  /**
   * Delete a single task (DELETE)
   */
  function deleteTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      const taskText = task.text;
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveState();
      render();
      announce(`Task deleted: "${taskText}".`);
    }
  }

  /**
   * Enable inline edit mode for a task
   */
  function enableEditMode(id) {
    // Cancel any currently editing rows first
    const existingEditing = todoList.querySelectorAll('.todo-item.editing');
    existingEditing.forEach(el => el.classList.remove('editing'));

    const item = todoList.querySelector(`.todo-item[data-id="${id}"]`);
    if (!item) return;

    item.classList.add('editing');
    const editInput = item.querySelector('.todo-edit-input');
    if (editInput) {
      editInput.focus();
      // Position cursor at end of text
      editInput.selectionStart = editInput.selectionEnd = editInput.value.length;
    }
  }

  /**
   * Save an edited task text (UPDATE)
   */
  function saveEditTask(id) {
    const item = todoList.querySelector(`.todo-item[data-id="${id}"]`);
    if (!item) return;

    const editInput = item.querySelector('.todo-edit-input');
    if (!editInput) return;

    const newText = editInput.value.trim();
    if (!newText) {
      editInput.classList.add('error');
      announce('Task text cannot be empty.');
      return;
    }

    const task = state.tasks.find(t => t.id === id);
    if (task) {
      task.text = newText;
      saveState();
      render();
      announce(`Task updated to: "${newText}".`);
    }
  }

  /**
   * Cancel task inline editing
   */
  function cancelEditTask(id) {
    render(); // Simple re-render resets editing view
  }

  /**
   * Clear all completed tasks (BULK DELETE)
   */
  function clearCompleted() {
    const count = state.tasks.filter(t => t.completed).length;
    if (count > 0) {
      state.tasks = state.tasks.filter(t => !t.completed);
      saveState();
      render();
      announce(`Cleared ${count} completed ${count === 1 ? 'task' : 'tasks'}.`);
    }
  }

  // ============================================
  // EVENT LISTENERS & EVENT DELEGATION
  // ============================================

  // Form Submit Handler
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = addTask(todoInput.value);
    if (success) {
      todoInput.value = '';
      todoInput.focus();
    }
  });

  // Real-time input error reset
  todoInput.addEventListener('input', () => {
    if (todoInput.classList.contains('error')) {
      todoInput.classList.remove('error');
      if (todoInputError) todoInputError.classList.remove('visible');
    }
  });

  // Filter Buttons Handler
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedFilter = btn.dataset.filter;
      if (!selectedFilter) return;

      state.filter = selectedFilter;

      filterButtons.forEach(b => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      render();
      announce(`Filter changed to: ${selectedFilter}`);
    });
  });

  // Clear Completed Handler
  clearCompletedBtn?.addEventListener('click', clearCompleted);

  // EVENT DELEGATION: Single click listener on container
  todoList.addEventListener('click', (e) => {
    const target = e.target;
    const actionBtn = target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const item = actionBtn.closest('.todo-item');
    if (!item) return;

    const id = item.dataset.id;
    if (!id) return;

    if (action === 'toggle') {
      toggleTask(id);
    } else if (action === 'edit') {
      enableEditMode(id);
    } else if (action === 'save') {
      saveEditTask(id);
    } else if (action === 'cancel') {
      cancelEditTask(id);
    } else if (action === 'delete') {
      deleteTask(id);
    }
  });

  // EVENT DELEGATION: Keyboard shortcuts during edit mode (Enter & Escape)
  todoList.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!target.classList.contains('todo-edit-input')) return;

    const item = target.closest('.todo-item');
    if (!item) return;

    const id = item.dataset.id;

    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditTask(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditTask(id);
    }
  });

  // ============================================
  // INITIALIZATION
  // ============================================
  loadState();
  render();

  // Expose state and functions for debugging/testing
  window.__TODO_APP__ = {
    state,
    addTask,
    toggleTask,
    deleteTask,
    saveEditTask,
    clearCompleted,
    saveState,
    loadState,
    render
  };
});
