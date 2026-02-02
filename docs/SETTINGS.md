# Extension Settings

CodeGraphy provides several settings to customize its behavior. Configure these in your VSCode settings (`settings.json`) or through the Settings UI.

## All Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `codegraphy.maxFiles` | number | `100` | Maximum files to analyze |
| `codegraphy.include` | string[] | `["**/*"]` | Glob patterns for files to include |
| `codegraphy.exclude` | string[] | *(see below)* | Glob patterns for files to exclude |
| `codegraphy.respectGitignore` | boolean | `true` | Honor .gitignore patterns |
| `codegraphy.showOrphans` | boolean | `true` | Show files with no connections |
| `codegraphy.favorites` | string[] | `[]` | Favorite file paths (highlighted with yellow border) |
| `codegraphy.plugins` | string[] | `[]` | Paths to external plugins |
| `codegraphy.fileColors` | object | `{}` | Custom colors for file extensions |

## Detailed Documentation

### `codegraphy.maxFiles`

Limits the number of files analyzed to prevent performance issues in large repositories.

```json
{
  "codegraphy.maxFiles": 100
}
```

When the limit is exceeded, a warning appears and only the first N files are processed. Consider:
- Increasing the limit for thorough analysis
- Using `include`/`exclude` patterns to focus on specific directories

### `codegraphy.include`

Glob patterns determining which files to discover. All patterns are relative to the workspace root.

```json
{
  "codegraphy.include": [
    "src/**/*",
    "lib/**/*"
  ]
}
```

**Common patterns:**
- `**/*` - All files (default)
- `src/**/*` - Only files in src/
- `**/*.ts` - Only TypeScript files
- `{src,lib}/**/*` - Multiple directories

### `codegraphy.exclude`

Glob patterns for files to exclude from analysis.

**Default value:**
```json
{
  "codegraphy.exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/coverage/**",
    "**/*.min.js",
    "**/*.bundle.js"
  ]
}
```

**Adding custom exclusions:**
```json
{
  "codegraphy.exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/coverage/**",
    "**/*.min.js",
    "**/*.bundle.js",
    "**/vendor/**",
    "**/__tests__/**"
  ]
}
```

> **Note:** When you override `exclude`, you replace the defaults entirely. Include the defaults if you still want them.

### `codegraphy.respectGitignore`

When enabled, CodeGraphy reads your `.gitignore` file and excludes matching files.

```json
{
  "codegraphy.respectGitignore": true
}
```

This is useful for automatically excluding:
- Build outputs
- Dependencies
- IDE files
- Any project-specific ignores

### `codegraphy.showOrphans`

Controls whether files with no import connections appear in the graph.

```json
{
  "codegraphy.showOrphans": true
}
```

**When `true` (default):**
- All discovered files appear as nodes
- Files with no imports/exports appear as disconnected nodes
- Useful for seeing your entire project structure

**When `false`:**
- Only files with at least one connection appear
- Cleaner graph focused on relationships
- Useful for large projects with many standalone files

### `codegraphy.favorites`

Mark important files as favorites to highlight them in the graph. Favorited files display with a yellow border, making them easy to spot.

```json
{
  "codegraphy.favorites": [
    "src/index.ts",
    "src/core/engine.ts",
    "src/utils/helpers.ts"
  ]
}
```

**Ways to add favorites:**
- Right-click a node → "Add to Favorites"
- Manually add paths to this setting
- Select multiple nodes → right-click → "Add All to Favorites"

Favorites persist across sessions and are useful for:
- Highlighting entry points
- Marking frequently-edited files
- Creating visual anchors in large graphs

### `codegraphy.plugins`

Paths to external plugin files (for future use).

```json
{
  "codegraphy.plugins": [
    "./my-plugins/python-plugin.js",
    "${workspaceFolder}/tools/custom-analyzer.js"
  ]
}
```

Currently, only built-in plugins are supported. External plugin loading is planned for a future release.

### `codegraphy.fileColors`

Customize the colors used for files in the graph.

```json
{
  "codegraphy.fileColors": {
    ".ts": "#3B82F6",
    ".gitignore": "#6B7280",
    "Makefile": "#F97316",
    "**/*.test.ts": "#10B981"
  }
}
```

**Supported patterns:**

| Pattern | Example | Matches |
|---------|---------|---------|
| Extension | `.ts`, `.md` | All files with that extension |
| Exact filename | `.gitignore`, `Makefile` | Files with that exact name |
| Glob pattern | `**/*.test.ts` | Files matching the glob |
| Scoped glob | `src/**/*.ts` | Files in specific directories |

**How colors work:**

CodeGraphy uses a dynamic color system with three priority levels:

1. **User settings** (highest) — Colors defined in `codegraphy.fileColors`
2. **Plugin defaults** — Colors declared by language plugins
3. **Auto-generated** (lowest) — Distinct colors generated automatically

**Auto-generation:**
- When your project has file types without predefined colors, CodeGraphy generates distinct colors automatically
- Colors are deterministic — the same file extensions always get the same colors
- Uses the [iwanthue](https://medialab.github.io/iwanthue/) algorithm for perceptually distinct colors

**Color format:**
- Use 6-digit hex colors: `#RRGGBB`
- Example: `"#FF5733"` (coral), `"#3B82F6"` (blue)

**Example — Matching your IDE theme:**
```json
{
  "codegraphy.fileColors": {
    ".ts": "#3178C6",
    ".js": "#F7DF1E",
    ".gitignore": "#6B7280",
    "Dockerfile": "#2496ED",
    "**/*.test.ts": "#10B981"
  }
}
```

## Example Configurations

### Small TypeScript Project
```json
{
  "codegraphy.maxFiles": 50,
  "codegraphy.include": ["src/**/*"],
  "codegraphy.showOrphans": false
}
```

### Large Monorepo
```json
{
  "codegraphy.maxFiles": 500,
  "codegraphy.include": ["packages/my-package/src/**/*"],
  "codegraphy.exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Full Project Overview
```json
{
  "codegraphy.maxFiles": 200,
  "codegraphy.include": ["**/*"],
  "codegraphy.showOrphans": true,
  "codegraphy.respectGitignore": true
}
```

### Source Files Only
```json
{
  "codegraphy.include": ["**/*.{ts,tsx,js,jsx}"],
  "codegraphy.exclude": [
    "**/node_modules/**",
    "**/*.d.ts",
    "**/*.test.*",
    "**/*.spec.*"
  ]
}
```

## Workspace vs User Settings

Settings can be configured at two levels:

1. **User Settings** (`~/.config/Code/User/settings.json`)
   - Apply to all projects
   - Good for general preferences

2. **Workspace Settings** (`.vscode/settings.json`)
   - Apply only to current project
   - Good for project-specific configuration
   - Can be committed to version control

We recommend using workspace settings for project-specific include/exclude patterns.

## Troubleshooting

### Graph is empty
1. Check if `codegraphy.include` patterns match your files
2. Verify files aren't excluded by `codegraphy.exclude` or `.gitignore`
3. Ensure `codegraphy.maxFiles` is high enough

### Too many files
1. Lower `codegraphy.maxFiles`
2. Add exclusion patterns for test files, generated code
3. Focus `codegraphy.include` on specific directories

### Missing connections
1. Ensure the file type has a supported plugin (currently: TS/JS)
2. Check that imported files are within the include patterns
3. node_modules imports are intentionally excluded

### Performance issues
1. Reduce `codegraphy.maxFiles`
2. Exclude large auto-generated files
3. Focus on specific directories with `include`
