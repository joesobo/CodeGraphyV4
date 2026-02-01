# CodeGraphy Test Fixture

A mini TypeScript project with predictable import patterns for testing CodeGraphy.

## Setup

This is a standalone TypeScript project with:
- `package.json` - Project config
- `tsconfig.json` - TypeScript config with path aliases
- `.gitignore` - Standard ignores

### Path Aliases (tsconfig.json)

```json
{
  "paths": {
    "@/*": ["src/*"],
    "@components/*": ["src/components/*"],
    "@utils/*": ["src/utils/*"],
    "@services/*": ["src/services/*"]
  }
}
```

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

| File | Imports From | Imported By | Uses Alias |
|------|--------------|-------------|------------|
| `src/index.ts` | App, api, config | — | ✅ @components, @services |
| `src/config.ts` | — | index, api | — |
| `src/orphan.ts` | — | — | — |
| `src/components/App.tsx` | Button, Header | index | — |
| `src/components/Button.tsx` | styles | App | — |
| `src/components/Header.tsx` | styles | App | — |
| `src/utils/styles.ts` | — | Button, Header | — |
| `src/utils/helpers.ts` | format | api | — |
| `src/utils/format.ts` | — | helpers | — |
| `src/services/api.ts` | helpers, config | index | — |

## Expected Counts

| Setting | Nodes | Edges | Notes |
|---------|-------|-------|-------|
| `showOrphans=true` | 14 | 11 | Includes README.md, package.json, tsconfig.json, .gitignore |
| `showOrphans=false` | 9 | 11 | Only files with connections |

Non-code files (README.md, package.json, etc.) appear as orphans since they have no import connections.

## How to Test

1. Open CodeGraphy repo in VSCode
2. Press F5 to launch Extension Development Host
3. In the new window: **File → Open Folder → examples/ts-plugin**
4. Click the CodeGraphy icon in the activity bar
5. Compare the graph to the expected structure above

## Tests to Perform

- [ ] Graph shows all 10 nodes with `showOrphans=true`
- [ ] Graph shows 9 nodes with `showOrphans=false` (orphan.ts hidden)
- [ ] Double-click a node → opens the file
- [ ] Drag nodes → positions saved
- [ ] Keyboard shortcuts work (0=fit, +/-=zoom)
- [ ] Path aliases resolve correctly (@components → src/components)
