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
               ├──▶ services/api.ts ────┬──▶ utils/helpers.ts ◀──▶ utils/format.ts
               │                        │       (bidirectional)
               │                        └──▶ config.ts
               │
               └──▶ config.ts

orphan.ts (no connections - only visible with showOrphans=true)
```

## Bidirectional Edges Demo

This example includes a **circular dependency** between `helpers.ts` and `format.ts` to demonstrate the `bidirectionalEdges` setting.

### The Setting

```jsonc
// .vscode/settings.json
{
  "codegraphy.bidirectionalEdges": "separate"  // or "combined"
}
```

### Visual Difference

| Mode | Description | Visualization |
|------|-------------|---------------|
| `separate` | Two distinct arrows | `helpers.ts ──▶ format.ts` + `format.ts ──▶ helpers.ts` |
| `combined` | One double-headed arrow | `helpers.ts ◀──▶ format.ts` |

### When to Use Each Mode

- **`separate`** (default): Best for debugging circular dependencies. Shows the exact import direction for each edge.
- **`combined`**: Cleaner visualization when you have many bidirectional relationships. Reduces visual clutter.

### Try It

1. Open this project in CodeGraphy
2. Find the `helpers.ts ↔ format.ts` connection
3. Toggle `codegraphy.bidirectionalEdges` between `"separate"` and `"combined"`
4. Observe how the edge rendering changes

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
| `src/utils/helpers.ts` | format | api, **format** | — |
| `src/utils/format.ts` | **helpers** | helpers | — |
| `src/services/api.ts` | helpers, config | index | — |

> **Note:** `helpers.ts ↔ format.ts` form a bidirectional edge (circular dependency) to demo the `bidirectionalEdges` setting.

## Expected Counts

| Setting | Nodes | Edges | Notes |
|---------|-------|-------|-------|
| `showOrphans=true` | 14 | 12 | Includes README.md, package.json, tsconfig.json, .gitignore |
| `showOrphans=false` | 9 | 12 | Only files with connections |

> With `bidirectionalEdges: "combined"`, the helpers↔format edge displays as 1 combined edge instead of 2 separate edges.

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
- [ ] **Bidirectional edges:** `helpers.ts ↔ format.ts` shows as two arrows with `bidirectionalEdges: "separate"`
- [ ] **Bidirectional edges:** `helpers.ts ↔ format.ts` shows as one combined arrow with `bidirectionalEdges: "combined"`
