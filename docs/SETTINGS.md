# Settings

CodeGraphy is configured through two complementary mechanisms:

- **Settings Panel** — the gear icon inside the graph view. Changes apply immediately and are stored in workspace state. Use this for day-to-day adjustments.
- **`settings.json`** — standard VS Code settings for file discovery and advanced configuration. When `codegraphy.groups` or `codegraphy.filterPatterns` are explicitly set here, they take priority over the Settings Panel values.

## VS Code Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `codegraphy.maxFiles` | number | `100` | Maximum files to analyze |
| `codegraphy.include` | string[] | `["**/*"]` | Glob patterns for files to include |
| `codegraphy.filterPatterns` | string[] | `[]` | Glob patterns for files to exclude (appended to built-in excludes) |
| `codegraphy.respectGitignore` | boolean | `true` | Honor `.gitignore` patterns |
| `codegraphy.showOrphans` | boolean | `true` | Show files with no connections |
| `codegraphy.bidirectionalEdges` | string | `"separate"` | How to display bidirectional connections |
| `codegraphy.favorites` | string[] | `[]` | Favorite file paths (highlighted with yellow border) |
| `codegraphy.groups` | object[] | `[]` | Color groups: `{ id, pattern, color }` — takes priority over Settings Panel groups |
| `codegraphy.plugins` | string[] | `[]` | Paths to external plugin files |
| `codegraphy.physics.gravitationalConstant` | number | `-50` | Gravity strength |
| `codegraphy.physics.springLength` | number | `100` | Preferred distance between connected nodes |
| `codegraphy.physics.springConstant` | number | `0.08` | Spring stiffness |
| `codegraphy.physics.damping` | number | `0.4` | Motion settling speed |
| `codegraphy.physics.centralGravity` | number | `0.01` | Pull toward viewport center |

## Settings Panel

Open by clicking the gear icon in the bottom-right corner of the graph view. It has four collapsible sections.

### Forces

Adjusts the physics simulation in real time.

| Control | Range | Description |
|---------|-------|-------------|
| Gravity | -500 to 0 | How strongly nodes repel each other. More negative = more spread out. |
| Link Distance | 10 to 500 | Preferred distance between connected nodes. |
| Link Strength | 0.01 to 1 | How strongly edges pull connected nodes together. |
| Center Pull | 0 to 1 | Pull toward the viewport center. |
| Damping | 0 to 1 | How quickly motion settles. Higher = faster stabilization. |

**Reset to Defaults** restores all physics values to the defaults above.

Physics values can also be set in `settings.json` via the `codegraphy.physics.*` keys. Settings Panel values override `settings.json` physics after the first manual adjustment.

### Groups

Assigns colors to files based on glob patterns. All nodes are grey (`#A1A1AA`) by default — groups are how you add color.

- **Add a group**: enter a glob pattern and pick a hex color, then click Add.
- **Delete a group**: click the × button next to any group.
- Groups are matched in order; the first matching group wins.
- Changes sync back to the extension immediately.

Patterns use the same glob syntax as `codegraphy.include`. Both simple extension patterns (`*.ts`) and full path patterns (`src/components/**`) are supported.

**Example groups:**
```
Pattern: src/**    Color: #3B82F6   (blue — all source files)
Pattern: *.test.*  Color: #10B981   (green — test files)
Pattern: *.md      Color: #6B7280   (grey — documentation)
```

To share groups across a team, add them to `settings.json` instead:
```json
{
  "codegraphy.groups": [
    { "id": "src", "pattern": "src/**", "color": "#3B82F6" },
    { "id": "tests", "pattern": "*.test.*", "color": "#10B981" }
  ]
}
```

### Filters

Controls which files appear in the graph. These are applied during file discovery (extension-side), not as a visual filter.

- **Show Orphans** — toggle to show/hide files with no import connections. Equivalent to `codegraphy.showOrphans`.
- **File Blacklist** — glob patterns for files to exclude entirely. Patterns support `matchBase`, so `*.png` excludes PNG files at any directory depth.

Blacklist patterns are the same as `codegraphy.filterPatterns`. They are appended to the built-in excludes (`node_modules`, `dist`, `build`, etc.).

**Common blacklist patterns:**
```
*.png        — all PNG images
*.svg        — all SVG files
**/*.test.*  — all test files
vendor/**    — a vendor directory
```

To version-control filter patterns, add them to `settings.json`:
```json
{
  "codegraphy.filterPatterns": ["*.png", "*.svg", "**/*.test.*"]
}
```

### Display

- **Node Size** — what determines node size in the graph:
  - `connections` (default) — more connections = larger node
  - `file-size` — larger file = larger node (logarithmic scale)
  - `access-count` — frequently opened files = larger node
  - `uniform` — all nodes the same size
- **View** — switch between available graph views (see below).
- **Depth** — when Depth Graph view is active, controls how many hops from the focused file to display (1–5).

## Graph Views

| View | Description |
|------|-------------|
| Connections | Default. Shows all files and their import connections. |
| Depth Graph | Shows only files within N hops of the currently focused file in the editor. Requires an open editor tab. |
| Subfolder View | Shows only files within the right-clicked folder. Activated via Explorer context menu. |

## File Discovery Settings

### `codegraphy.maxFiles`

Limits the number of files analyzed to prevent performance issues in large repositories.

```json
{ "codegraphy.maxFiles": 200 }
```

When the limit is exceeded, a warning appears and only the first N files are processed. Use `include` and `filterPatterns` to narrow scope rather than raising this limit indefinitely.

### `codegraphy.include`

Glob patterns determining which files to discover. All patterns are relative to the workspace root.

```json
{
  "codegraphy.include": ["src/**/*", "lib/**/*"]
}
```

Common patterns:
- `**/*` — all files (default)
- `src/**/*` — only files in `src/`
- `**/*.ts` — only TypeScript files
- `{src,lib}/**/*` — multiple directories

### `codegraphy.filterPatterns`

Glob patterns for files to exclude, appended to built-in excludes. Supports `matchBase` so simple patterns like `*.png` match files at any depth.

**Built-in excludes (always applied):**
```
**/node_modules/**
**/dist/**
**/build/**
**/.git/**
**/coverage/**
**/*.min.js
**/*.bundle.js
```

**Adding custom exclusions:**
```json
{
  "codegraphy.filterPatterns": ["*.png", "*.svg", "**/__tests__/**", "vendor/**"]
}
```

Unlike the old `codegraphy.exclude`, you do not need to repeat the built-in excludes — your patterns are merged with them.

### `codegraphy.respectGitignore`

When `true`, reads `.gitignore` and excludes matching files automatically.

```json
{ "codegraphy.respectGitignore": true }
```

### `codegraphy.bidirectionalEdges`

Controls how mutual imports (A imports B and B imports A) are drawn.

```json
{ "codegraphy.bidirectionalEdges": "combined" }
```

- `separate` (default) — two arrows, one in each direction
- `combined` — a single line with arrowheads on both ends

## Example Configurations

### Small TypeScript project
```json
{
  "codegraphy.maxFiles": 50,
  "codegraphy.include": ["src/**/*"],
  "codegraphy.showOrphans": false
}
```

### Large monorepo (focus on one package)
```json
{
  "codegraphy.maxFiles": 500,
  "codegraphy.include": ["packages/my-package/src/**/*"],
  "codegraphy.filterPatterns": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### Source files only, no assets
```json
{
  "codegraphy.include": ["**/*.{ts,tsx,js,jsx}"],
  "codegraphy.filterPatterns": ["**/*.d.ts"]
}
```

### Team-shared color groups
```json
{
  "codegraphy.groups": [
    { "id": "features", "pattern": "src/features/**", "color": "#3B82F6" },
    { "id": "shared",   "pattern": "src/shared/**",   "color": "#8B5CF6" },
    { "id": "tests",    "pattern": "**/*.test.*",      "color": "#10B981" }
  ]
}
```

## Workspace vs User Settings

| Level | File | Use for |
|-------|------|---------|
| User | `~/.config/Code/User/settings.json` | Personal defaults across all projects |
| Workspace | `.vscode/settings.json` | Project-specific config; can be committed to version control |

Workspace settings override user settings. We recommend committing `include`, `filterPatterns`, and `groups` to `.vscode/settings.json` so the whole team sees the same graph.

## Troubleshooting

**Graph is empty**
1. Check `codegraphy.include` patterns match your files
2. Verify files aren't excluded by `filterPatterns`, `.gitignore`, or the built-in excludes
3. Ensure `codegraphy.maxFiles` is high enough

**Nodes are all grey**
- No groups are configured. Add groups in the Settings Panel (Groups section) or via `codegraphy.groups` in `settings.json`.

**`*.png` filter not working**
- Patterns support `matchBase`, so `*.png` should match files at any depth. If using `settings.json`, ensure `codegraphy.filterPatterns` contains the pattern (not the old `codegraphy.exclude`).

**Too many files**
1. Add exclusion patterns to the Filters section of the Settings Panel or to `codegraphy.filterPatterns`
2. Narrow `codegraphy.include` to specific directories
3. Lower `codegraphy.maxFiles`

**Missing connections**
1. Ensure the file type has a supported plugin (TypeScript/JS, Godot)
2. Check that imported files are within the `include` patterns
3. `node_modules` imports are intentionally excluded
