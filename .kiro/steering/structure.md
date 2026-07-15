# Project Structure

```
To Do List/
├── index.html          # App entry point and markup skeleton
├── style.css           # All styling, including state variants
├── taskStore.js        # Model: task state, CRUD, localStorage persistence
├── app.js              # Controller + View: event handling and DOM rendering
├── taskStore.test.js   # Unit and property-based tests for taskStore.js
├── vitest.config.js    # Vitest config (environment: jsdom)
├── package.json        # Dev dependencies and npm scripts
└── .kiro/
    ├── specs/
    │   └── todolist-app/   # Feature spec (requirements, design, tasks)
    └── steering/           # AI assistant guidance files
```

## Layer Responsibilities

| File | Role |
|---|---|
| `taskStore.js` | Single source of truth for task state; all mutations go through here; handles localStorage read/write |
| `app.js` | Reads from `taskStore.js`, renders DOM, registers event listeners; never directly accesses localStorage |
| `index.html` | Static markup skeleton only; no inline scripts or styles |
| `style.css` | All visual states: `.completed` (strikethrough), `.filter-btn.active`, `.error-msg`, disabled states, edit mode |

## Architecture Pattern

Light MVC — no framework:
- **Model**: `taskStore.js` (state + persistence)
- **Controller + View**: `app.js` (events + DOM rendering)
- Data flows one way: user event → `app.js` → `taskStore.js` → `app.js` calls `render()`

## Key Conventions

- `taskStore.js` exports pure/near-pure functions; side effects limited to `localStorage`
- `app.js` uses **event delegation** on `#task-list` for task-level interactions
- Only one task can be in edit mode at a time (`editingTaskId` state in `app.js`)
- `render()` is the single re-render entry point — always call it after any state mutation
- Scripts loaded at end of `<body>`: `taskStore.js` first, then `app.js`
