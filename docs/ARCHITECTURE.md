# Architecture

CodeGraphy is a VS Code extension that visualizes file dependencies as an interactive graph. It has two independent build targets that communicate via `postMessage`.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│                     VS Code Extension                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐   │
│  │GraphViewProvider │  │WorkspaceAnalyzer │  │  Config   │   │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘   │
│           │                     │                   │        │
│           ▼                     ▼                   │        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                       Core Layer                         ││
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐   ││
│  │  │FileDiscovery │  │PluginRegistry │  │ ViewRegistry │   ││
│  │  └──────────────┘  └───────┬───────┘  └──────────────┘   ││
│  │                            │                             ││
│  │                    ┌───────┴───────┐                     ││
│  │                    │   Plugins     │                     ││
│  │                    └───────────────┘                     ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                           │
                           │ postMessage
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     Webview (React)                          │
│  ┌──────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ App  │──│     Graph      │  │ Settings / Plugins Panel │  │
│  └──────┘  └────────┬───────┘  └──────────────────────────┘  │
│                     │                                        │
│             react-force-graph                                │
│             (2D canvas / 3D WebGL)                           │
└──────────────────────────────────────────────────────────────┘
```

## Extension layer (`src/extension/`)

**`index.ts`** registers commands, file watchers, and the webview provider on activation.

**`GraphViewProvider.ts`** implements `WebviewViewProvider` for the sidebar panel. Manages webview HTML, bidirectional messaging, position persistence, undo/redo state, plugin/rule toggle state, view transformations, and latest-wins analysis cancellation.

**`WorkspaceAnalyzer.ts`** orchestrates file discovery and plugin analysis. Builds `IGraphData` from discovered files and connections. Uses mtime-based caching to skip unchanged files. Supports instant graph rebuilds from cached data when toggling rules.

**`Configuration.ts`** is a type-safe wrapper around VS Code settings with reactive `onDidChange` updates.

**`UndoManager.ts`** maintains an undo/redo stack for graph actions (delete, rename, create, favorite, exclude).

**`actions/`** has one file per reversible action.

## Core layer (`src/core/`)

**`discovery/FileDiscovery.ts`** recursively discovers files using glob patterns, respects `.gitignore`, and enforces the max file limit.

**`plugins/PluginRegistry.ts`** maps file extensions to `IPlugin` instances and handles initialization/disposal.

**`colors/ColorPaletteManager.ts`** generates distinct colors for file types with a three-tier priority system: user settings > plugin defaults > auto-generated.

**`views/ViewRegistry.ts`** manages graph views. Three built-in views: Connections (pass-through), Depth Graph (BFS from focused file), and Subfolder View.

## Plugin layer (`src/plugins/`)

Each plugin implements `IPlugin` from `src/core/plugins/types.ts`. Five built-in plugins:

- **typescript/** handles `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` using the TypeScript Compiler API for AST-based import detection
- **python/** handles `.py`, `.pyi` with regex-based detection of `import` and `from` statements
- **csharp/** handles `.cs` with `using` directive and type usage detection
- **godot/** handles `.gd` with `preload`, `load`, `extends`, and `class_name` detection
- **markdown/** handles `.md`, `.mdx` with `[[wikilink]]` detection

Each plugin declares detection rules in a `manifest.json` and sets `ruleId` on every connection so users can toggle rules individually.

## Webview layer (`src/webview/`)

**`App.tsx`** listens for `ExtensionToWebviewMessage` events, manages all UI state, and renders the graph with panels.

**`components/Graph.tsx`** wraps `react-force-graph-2d` and `react-force-graph-3d`. Handles physics simulation, node rendering (canvas callbacks for custom shapes, labels, favorites), user interactions, and context menus via Radix UI.

**`components/SettingsPanel.tsx`** has four accordion sections for physics, groups, filters, and display settings. Built with shadcn/ui components. Group colors combine user-defined entries with plugin-provided default `fileColors`.

**`components/PluginsPanel.tsx`** shows all registered plugins with per-rule toggle switches and live connection counts.

**`components/SearchBar.tsx`** provides search with match case, whole word, and regex modes.

## Shared types (`src/shared/types.ts`)

Defines the message protocol and data types shared across both build targets:

- `IFileData` for raw plugin output (path, name, extension, imports)
- `IGraphNode` / `IGraphEdge` / `IGraphData` for graph rendering
- `ExtensionToWebviewMessage` and `WebviewToExtensionMessage` union types for the message protocol

## Data flow

### Initial load
```
1. User opens CodeGraphy panel
2. GraphViewProvider creates webview
3. Webview mounts React app, sends WEBVIEW_READY
4. GraphViewProvider triggers WorkspaceAnalyzer
5. WorkspaceAnalyzer:
   a. FileDiscovery finds files
   b. PluginRegistry analyzes each file
   c. Builds nodes (files) and edges (imports)
   d. Applies persisted positions
6. GraphViewProvider sends GRAPH_DATA_UPDATED + PLUGINS_UPDATED
7. Graph component renders with react-force-graph
8. Physics simulation runs until stable
```

### File change
```
1. VS Code file watcher detects change
2. GraphViewProvider cancels any in-flight analysis and starts a new one
3. WorkspaceAnalyzer re-runs discovery/analysis with cache reuse
4. Sends updated graph data to webview
5. Graph updates incrementally, preserving positions
```

### Rule toggle
```
1. User toggles a rule in the Plugins panel
2. Webview sends TOGGLE_RULE message
3. GraphViewProvider updates disabled rules set
4. If the rule has connections: rebuild graph from cached data (no re-analysis)
5. Sends GRAPH_DATA_UPDATED + PLUGINS_UPDATED
```

## Key design decisions

**Plugin architecture.** Plugins are decoupled from the core, making it straightforward to add new languages, test them independently, and eventually support community-contributed plugins.

**TypeScript Compiler API.** The TypeScript plugin uses `ts.createSourceFile` instead of regex, giving accurate handling of all import syntaxes including dynamic imports and re-exports.

**Position persistence.** Node positions are saved in VS Code workspace state after physics stabilization, so the graph layout is consistent across sessions.

**Cached rebuilds.** Rule and plugin toggles rebuild the graph from cached connection data rather than re-analyzing files, making toggles feel instant.
