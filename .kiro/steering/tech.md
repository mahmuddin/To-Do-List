# Tech Stack

## Core

- **Vanilla HTML, CSS, JavaScript** — no frameworks, no build step for runtime
- **Zero runtime dependencies** — the app runs directly in the browser

## Dev Dependencies

- **Vitest** — unit and property-based test runner
- **fast-check** — property-based testing library
- **jsdom** — DOM environment for tests (configured via `vitest.config.js`)

## Project Init

```bash
npm init -y
npm install --save-dev vitest fast-check
```

`vitest.config.js` must set `environment: "jsdom"`.

## Common Commands

| Command | Description |
|---|---|
| `npm test` | Run all tests once (non-watch) |
| `vitest --run` | Equivalent single-run via vitest CLI |

No compile or build step — open `index.html` directly in a browser.

## Testing Conventions

- Test file: `taskStore.test.js`
- Property-based tests use **fast-check** (`fc.*`) with a minimum of 100 iterations
- `localStorage` is mocked with a plain `Map` object during tests
- Each property test must include a comment tag:
  ```js
  // Feature: todolist-app, Property N: <property description>
  ```
- Unit tests cover concrete edge cases; property tests cover invariants across arbitrary inputs
