# CodeGraphy Test Fixture

A simple TypeScript project with predictable import patterns for testing CodeGraphy.

## Expected Graph Structure

```
index.ts ──────┬──▶ components/App.tsx ──┬──▶ components/Button.tsx ──▶ utils/styles.ts
               │                         │
               │                         └──▶ components/Header.tsx ──▶ utils/styles.ts
               │
               ├──▶ services/api.ts ────┬──▶ utils/helpers.ts ──▶ utils/format.ts
               │                        │
               │                        └──▶ config.ts
               │
               └──▶ config.ts

orphan.ts (no connections - only visible with showOrphans=true)
```

## Files (10 total)

| File | Imports From | Imported By |
|------|--------------|-------------|
| `src/index.ts` | App, api, config | — |
| `src/config.ts` | — | index, api |
| `src/orphan.ts` | — | — |
| `src/components/App.tsx` | Button, Header | index |
| `src/components/Button.tsx` | styles | App |
| `src/components/Header.tsx` | styles | App |
| `src/utils/styles.ts` | — | Button, Header |
| `src/utils/helpers.ts` | format | api |
| `src/utils/format.ts` | — | helpers |
| `src/services/api.ts` | helpers, config | index |

## Expected Node Count

- **With showOrphans=true**: 10 nodes
- **With showOrphans=false**: 9 nodes (orphan.ts hidden)

## Expected Edge Count

- 11 edges total

## How to Test

1. Open this folder in a new VSCode window
2. Press F5 to launch Extension Development Host
3. In the new window, open the `test-fixture` folder
4. Open CodeGraphy sidebar
5. Compare the graph to the expected structure above
