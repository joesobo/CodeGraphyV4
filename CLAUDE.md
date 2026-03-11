# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run build         # Build both extension and webview (runs esbuild + vite)
pnpm run dev           # Watch mode (concurrently watches extension and webview)
pnpm test              # Run tests once with Vitest
pnpm run test:watch    # Run tests in watch mode
pnpm run lint          # ESLint on src/
pnpm run typecheck     # TypeScript type checking (no emit)
```

To run a single test file:
```bash
pnpm exec vitest run tests/path/to/specific.test.ts
```

Press `F5` in VS Code to launch the Extension Development Host for manual testing.

Pre-commit hook runs lint-staged (lint + typecheck on staged files).

## Architecture

CodeGraphy is a VS Code extension that visualizes file dependencies as an interactive force graph. It has two independent build targets that communicate via `postMessage`:

**Extension host** (`src/extension/`) — compiled by esbuild as a CommonJS Node.js bundle (`dist/extension.js`). Runs in the VS Code extension process.

**Webview** (`src/webview/`) — compiled by Vite as a React app. Runs in an isolated browser-like context inside a VS Code sidebar panel.

### Extension Layer (`src/extension/`)
- `index.ts` — activation, registers all commands, file watchers, and the webview provider
- `GraphViewProvider.ts` — implements `WebviewViewProvider`; manages webview HTML, bidirectional messaging, position persistence in workspace state, undo/redo
- `WorkspaceAnalyzer.ts` — orchestrates file discovery + plugin analysis; builds `IGraphData`; mtime-based file cache
- `Configuration.ts` — type-safe wrapper around VS Code settings with `onDidChange`
- `UndoManager.ts` — undo/redo stack for graph actions
- `actions/` — one file per reversible action (rename, delete, create, toggle favorite, add to exclude)

### Core Layer (`src/core/`)
- `discovery/FileDiscovery.ts` — glob-based file discovery; respects `.gitignore` via `ignore` package; enforces `maxFiles`
- `plugins/PluginRegistry.ts` — maps file extensions to `IPlugin` instances
- `colors/ColorPaletteManager.ts` — generates distinct colors for file types; layered priority: user settings > plugin defaults > auto-generated
- `views/ViewRegistry.ts` — manages `IView` instances; `CHANGE_VIEW` messages trigger re-transformation of base graph data
- `views/coreViews.ts` — three built-in views: Connections (default, pass-through), Depth Graph (BFS from focused file), Subfolder View

### Plugin Layer (`src/plugins/`)
Each plugin implements `IPlugin` (`src/core/plugins/types.ts`) with `detectConnections(filePath, content, workspaceRoot)`. Built-in plugins: `typescript/`, `python/`, `csharp/`, `godot/`. Each plugin has an `ImportDetector` (parses the source) and a `PathResolver` (resolves specifiers to absolute paths).

The TypeScript plugin uses `ts.createSourceFile` for accurate AST-based import detection.

### Webview Layer (`src/webview/`)
- `App.tsx` — listens for `ExtensionToWebviewMessage`, manages state, renders Graph + UI chrome
- `components/Graph.tsx` — wraps Vis Network; handles physics simulation, user interactions, sends `WebviewToExtensionMessage`
- `components/PhysicsSettings.tsx`, `SearchBar.tsx`, `ViewSwitcher.tsx`, `DepthSlider.tsx` — UI panels

### Shared Types (`src/shared/types.ts`)
Defines the message protocol and data types shared across both build targets:
- `IFileData` — raw plugin output (path, name, extension, imports)
- `IGraphNode` / `IGraphEdge` / `IGraphData` — Vis Network rendering types
- `ExtensionToWebviewMessage` — union type of all messages going to webview
- `WebviewToExtensionMessage` — union type of all messages coming from webview

### Test Structure
Tests mirror `src/` under `tests/`. Mocks for `vscode`, `vis-network`, and `vis-data` are in `tests/__mocks__/`. Use Vitest with jsdom. Integration test for the webview↔extension flow is in `tests/integration/`.

### Commit Convention
Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`, `chore:`, `style:`.
