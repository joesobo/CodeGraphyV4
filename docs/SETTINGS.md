# Settings

CodeGraphy now keeps repo-specific graph settings under `.codegraphy/settings.json`.

- The graph UI writes to that file for you.
- The file is mostly internal, but still human-editable.
- CodeGraphy watches it for changes and refreshes relevant graph state when it changes.
- Legacy VS Code settings can still be read for migration, but `.codegraphy/settings.json` is now the source of truth for repo-local behavior.
- These settings are no longer intended to be managed from VS Code's built-in Settings UI.

## Repo-local settings file

The repo-local settings file lives at:

```text
.codegraphy/settings.json
```

Common top-level sections include:

- `nodeVisibility`
- `nodeColors`
- `edgeVisibility`
- `edgeColors`
- `legend` (the stored legend rule list used by the Legends popup)
- `pluginOrder`
- `disabledPlugins`
- `physics`
- `timeline`

Example:

```json
{
  "version": 1,
  "nodeVisibility": {
    "file": true,
    "folder": false,
    "package": false
  },
  "edgeVisibility": {
    "codegraphy:nests": true,
    "import": true,
    "reference": true
  },
  "edgeColors": {
    "import": "#60A5FA",
    "reference": "#F97316"
  },
  "pluginOrder": [
    "codegraphy.markdown",
    "codegraphy.typescript"
  ],
  "disabledPlugins": [],
  "legend": [
    { "id": "tests", "pattern": "*/tests/**", "color": "#22C55E" }
  ]
}
```

## Core settings reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxFiles` | number | `500` | Maximum files to discover/analyze |
| `include` | string[] | `["**/*"]` | Glob patterns for files to include |
| `filterPatterns` | string[] | `[]` | Glob patterns for files to exclude |
| `respectGitignore` | boolean | `true` | Honor `.gitignore` patterns |
| `showOrphans` | boolean | `true` | Show files with no edges |
| `showLabels` | boolean | `true` | Show file name labels on nodes |
| `bidirectionalEdges` | string | `"separate"` | How to render bidirectional file edges |
| `directionMode` | string | `"arrows"` | Direction indicator mode |
| `directionColor` | string | `"#475569"` | Direction indicator color |
| `particleSpeed` | number | `0.005` | Particle direction speed |
| `particleSize` | number | `4` | Particle size in pixels |
| `favorites` | string[] | `[]` | Favorite file paths |
| `legend` | object[] | `[]` | Stored legend rules: `{ id, pattern, color, ... }` |
| `pluginOrder` | string[] | `[]` | Plugin processing order, bottom-to-top |
| `disabledPlugins` | string[] | `[]` | Disabled plugin IDs |
| `nodeVisibility` | object | generated | Node-type visibility by id |
| `nodeColors` | object | generated | Node-type colors by id |
| `edgeVisibility` | object | generated | Edge-kind visibility by id |
| `edgeColors` | object | generated | Edge-kind colors by id |
| `physics.*` | object | see file | Force simulation controls |
| `timeline.*` | object | see file | Timeline indexing/playback controls |

## Timeline settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `timeline.maxCommits` | number | `500` | Maximum commits to index (10-5000) |
| `timeline.playbackSpeed` | number | `1.0` | Playback speed multiplier (0.1-10.0) |

Timeline indexing also respects the repo-local filter and plugin settings. See [Timeline](./TIMELINE.md) for details.

## Settings Panel

Open by clicking the gear icon in the bottom-right corner of the graph view. This panel now focuses on physics and graph behavior, while node/edge visibility and legend coloring live in their own dedicated panels.

![Settings panel](./media/settings-panel.png)

### Forces

Adjusts the physics simulation in real time.

| Control | Range | Description |
|---------|-------|-------------|
| Repel Force | 0-20 | How strongly nodes push apart. Higher values spread nodes out more. |
| Center Force | 0-1 | Pull toward the viewport center. |
| Link Distance | 30-500 | Preferred distance between connected nodes in pixels. |
| Link Force | 0-1 | How strongly edges pull connected nodes together. |

### Legends

Legend rules now live in their own **Legends** popup, not inside the settings panel.
The popup label and persisted key are both **Legends** / `legend`.
Older `.codegraphy/settings.json` files that still use `groups` are read for compatibility and rewritten as `legend`.

Legend rules assign colors based on regex/glob-style matching and are applied in drag order:

- bottom rule applies first
- top rule applies last
- top rules can override lower rules

Legend rules can color files, folders, packages, and plugin-added node types through one shared priority system.

- Enter a glob pattern and pick a hex color, then click Add.
- Click the x button next to any legend rule to delete it.
- Lower rules apply first, higher rules apply last.
- Drag legend rules to reorder priority.
- Changes sync back to the extension immediately.

Group patterns match by basename or path suffix. Simple extension patterns like `*.ts` match files at any depth, `src/*` matches files directly inside any `src/` folder, and `src/**` matches files at any depth under any `src/` folder.

**Example legend rules:**
```
Pattern: src/**    Color: #3B82F6   (blue, all source files)
Pattern: *.test.*  Color: #10B981   (green, test files)
Pattern: *.md      Color: #6B7280   (grey, documentation)
Pattern: tests/*   Color: #F59E0B   (amber, files directly inside any tests folder)
```

To share legend rules across a team, commit `.codegraphy/settings.json`:
```json
{
  "legend": [
    { "id": "src", "pattern": "src/**", "color": "#3B82F6" },
    { "id": "tests", "pattern": "*.test.*", "color": "#10B981" }
  ]
}
```

### Filters

Controls which files appear in the graph. These are applied during file discovery, not as a visual filter.

- **Show Orphans** toggles files with no visible edges.
- **Max Files** limits how many files are analyzed.
- **Exclude patterns** are glob patterns for files to hide entirely. Patterns support `matchBase`, so `*.png` excludes PNG files at any depth.

Exclude patterns are appended to the built-in excludes (`node_modules`, `dist`, `build`, etc.).

**Common exclude patterns:**
```
*.png           all PNG images
*.svg           all SVG files
**/*.test.*     all test files
vendor/**       a vendor directory
```

To version-control filter patterns, add them to `settings.json`:
```json
{
  "filterPatterns": ["*.png", "*.svg", "**/*.test.*"]
}
```

### Display

- **Direction** switches between arrows, particles, and none.
- **Direction Color** controls directional indicator color (hex only, `#RRGGBB`).
- **Particle Speed** uses a normalized UI scale from `1` to `10` (mapped to internal `0.0005` to `0.005`).
- **Show Labels** toggles file name labels on nodes. Labels fade in smoothly as you zoom in.
- **Node / edge colors** now live in the **Legends** popup and are stored under `nodeColors` / `edgeColors`.

Node, edge, legend, and plugin controls are in dedicated toolbar popups. The graph no longer switches between separate built-in Connections, Depth, and Folder views.

## Unified graph controls

- **Nodes**: toggle file, folder, package, and plugin-added node types
- **Edges**: toggle `NESTS`, semantic edge kinds, and plugin-added edge kinds
- **Legends**: edit regex/group color rules and their priority
- **Plugins**: enable/disable plugins and reorder them
- **Depth mode**: optional toolbar mode that brings back the old focused depth behavior on top of the unified graph

## File discovery settings

### `maxFiles`

Limits the number of files analyzed to prevent performance issues in large repos.

```json
{ "maxFiles": 1000 }
```

When the limit is hit, a warning appears and only the first N files are processed. Use `include` and `filterPatterns` to narrow scope rather than raising this indefinitely.

### `include`

Glob patterns for which files to discover, relative to the workspace root.

```json
{
  "include": ["src/**/*", "lib/**/*"]
}
```

Common patterns:
- `**/*` all files (default)
- `src/**/*` only files in `src/`
- `**/*.ts` only TypeScript files
- `{src,lib}/**/*` multiple directories

### `filterPatterns`

Glob patterns for files to exclude, appended to built-in excludes. Supports `matchBase` so `*.png` matches at any depth.

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
  "filterPatterns": ["*.png", "*.svg", "**/__tests__/**", "vendor/**"]
}
```

Your patterns are merged with the built-ins, so you don't need to repeat them.

### `respectGitignore`

When `true`, reads `.gitignore` and excludes matching files automatically.

```json
{ "respectGitignore": true }
```

### `bidirectionalEdges`

Controls how mutual imports (A imports B and B imports A) are drawn.

```json
{ "bidirectionalEdges": "combined" }
```

- `separate` (default): two arrows, one in each direction (overlapping links are automatically curved apart)
- `combined`: a single line with arrowheads on both ends

This setting is also accessible from the Settings panel.

## Example configurations

### Small TypeScript project
```json
{
  "maxFiles": 50,
  "include": ["src/**/*"],
  "showOrphans": false
}
```

### Large monorepo (focus on one package)
```json
{
  "maxFiles": 1000,
  "include": ["packages/my-package/src/**/*"],
  "filterPatterns": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### Source files only, no assets
```json
{
  "include": ["**/*.{ts,tsx,js,jsx}"],
  "filterPatterns": ["**/*.d.ts"]
}
```

### Team-shared legend rules
```json
{
  "legend": [
    { "id": "features", "pattern": "src/features/**", "color": "#3B82F6" },
    { "id": "shared",   "pattern": "src/shared/**",   "color": "#8B5CF6" },
    { "id": "tests",    "pattern": "**/*.test.*",      "color": "#10B981" }
  ]
}
```

## Repo-local vs global settings

CodeGraphy’s graph/index behavior now lives with the repo under `.codegraphy/`. If you still use legacy VS Code settings, CodeGraphy can read them during migration, but the current setup should be committed under `.codegraphy/` instead of `.vscode/settings.json`.

Legacy note:
- older repos may still contain `disabledSources` from source-level rule toggles
- older repos may still contain `folderNodeColor` as a standalone key
- CodeGraphy can still read that during migration, but the current graph controls are `nodeVisibility`, `edgeVisibility`, `legend`, `disabledPlugins`, and `pluginOrder`
- current folder coloring should live under `nodeColors.folder`

## Troubleshooting

**Graph is empty**
1. Check that `include` patterns match your files
2. Verify files aren't excluded by `filterPatterns`, `.gitignore`, or the built-in excludes
3. Make sure `maxFiles` is high enough

**Nodes are all grey**

No legend rules are configured. Add them in the **Legends** popup or directly in `.codegraphy/settings.json`.

**Too many files**
1. Add exclusion patterns in the Filters section or `filterPatterns`
2. Narrow `include` to specific directories
3. Lower `maxFiles`

**Missing connections**
1. Make sure the file type has a supported plugin (TypeScript/JS, Python, C#, GDScript, Markdown)
2. Check that imported files are within the `include` patterns
3. `node_modules` imports are intentionally excluded
4. Check `.codegraphy/settings.json` for an unintended disabled plugin, node kind, or edge kind
