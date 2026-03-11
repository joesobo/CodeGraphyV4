# Architecture

CodeGraphy is a VS Code extension that visualizes file dependencies as an interactive graph. It has two independent build targets that communicate via `postMessage`.

## Monorepo Tooling

**`turbo.json`** defines monorepo task orchestration for `build`, `lint`, `typecheck`, `test`, and local watch/dev tasks.

**`pnpm-workspace.yaml`** defines workspace package boundaries (`packages/*`) for monorepo installs and task execution.

**Root `package.json`** routes top-level scripts through Turborepo (`turbo run ...`) and uses `pnpm` filters for package-specific scripts.

**Root `.gitignore`** defines repository-level ignore rules, including local automation artifacts (`.playwright-cli/`, `.playwright-mcp/`, `.worktrees/`, `.turbo/`).

**Root `CLAUDE.md`** stores repository-specific operator guidance for Claude Code, including the persistent-profile Playwright workflow for GitHub PR attachment uploads.

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

**`GraphViewProvider.ts`** implements `WebviewViewProvider` for the sidebar panel. Manages webview HTML, bidirectional messaging, position persistence, undo/redo state, plugin/rule toggle state, view transformations, and latest-wins analysis cancellation. Rule/plugin toggle state is persisted to VS Code settings (`codegraphy.disabledRules`, `codegraphy.disabledPlugins`) with workspace-state fallback for migration. It deduplicates analyzer initialization races, emits `notifyWebviewReady()` once after Tier-2 injection dispatch and first workspace-ready completion (when a workspace exists), and supports deferred late-registration lifecycle replay ordering.

**`WorkspaceAnalyzer.ts`** orchestrates file discovery and plugin analysis. Builds `IGraphData` from discovered files and connections. Uses mtime-based caching to skip unchanged files. Supports instant graph rebuilds from cached data when toggling rules.

**`Configuration.ts`** is a type-safe wrapper around VS Code settings with reactive `onDidChange` updates.

**`UndoManager.ts`** maintains an undo/redo stack for graph actions (delete, rename, create, favorite, exclude).

**`actions/`** has one file per reversible action.

## Core layer (`src/core/`)

**`discovery/FileDiscovery.ts`** recursively discovers files using glob patterns, respects `.gitignore`, and enforces the max file limit.

**`plugins/PluginRegistry.ts`** maps file extensions to `IPlugin` instances and handles initialization/disposal. It provisions a scoped `CodeGraphyAPI`, runs lifecycle hooks (`onLoad`, `onPreAnalyze`, `onPostAnalyze`, etc.), and manages webview message delivery. Lifecycle readiness is replayed for late-registered plugins (`onWorkspaceReady`, `onWebviewReady`) with optional deferred replay control, and `initialize()` is guarded to run once per plugin.

**`colors/ColorPaletteManager.ts`** generates distinct colors for file types with a three-tier priority system: user settings > plugin defaults > auto-generated.

**`views/ViewRegistry.ts`** manages graph views. Three built-in views: Connections (pass-through), Depth Graph (BFS from focused file), and Subfolder View.

## Plugin layer (`packages/plugin-*/`)

Each plugin implements `IPlugin` from `@codegraphy/plugin-api`. Five built-in plugins:

- **plugin-typescript/** handles `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` using the TypeScript Compiler API for AST-based import detection
- **plugin-python/** handles `.py`, `.pyi` with regex-based detection of `import` and `from` statements
- **plugin-csharp/** handles `.cs` with `using` directive and type usage detection
- **plugin-godot/** handles `.gd` with `preload`, `load`, `extends`, and `class_name` detection
- **plugin-markdown/** handles `.md`, `.mdx` with `[[wikilink]]` detection

Each plugin declares detection rules in `codegraphy.json` and sets `ruleId` on every connection so users can toggle rules individually.

## Plugin API package (`packages/plugin-api/`)

**`src/events.ts`** is the canonical event contract (`EventName`/`EventPayloads`) shared by plugin authors and the extension runtime.

**`src/api.ts`** defines the host-side v2 API surface (`CodeGraphyAPI`) used by plugins.

**`src/plugin.ts`** defines plugin metadata and lifecycle contracts (`initialize`, `onLoad`, `onWorkspaceReady`, `onWebviewReady`, `onPreAnalyze`, `onPostAnalyze`, `onGraphRebuild`, `onUnload`), including Tier-2 webview contributions (`webviewContributions`, `webviewApiVersion`).

**`src/webview/*`** defines the webview-side plugin API types (renderers, helpers, message bridge types).

## Webview layer (`src/webview/`)

**`App.tsx`** listens for `ExtensionToWebviewMessage` events, manages all UI state, and renders the graph with panels. It also hosts the Tier-2 runtime (`WebviewPluginHost`), handles `PLUGIN_WEBVIEW_INJECT`, dynamically loads plugin scripts/styles, and routes plugin-scoped messages.

**`components/Graph.tsx`** wraps `react-force-graph-2d` and `react-force-graph-3d`. Handles physics simulation, node rendering (canvas callbacks for custom shapes, labels, favorites), user interactions, and context menus via Radix UI. In 2D mode, `drawShape()` from `lib/shapes2D.ts` renders six shape types (circle, square, diamond, triangle, hexagon, star); in 3D mode, `createNodeMesh()` from `lib/shapes3D.ts` builds corresponding Three.js geometries (sphere, cube, octahedron, cone, dodecahedron, icosahedron). Image overlays use `lib/imageCache.ts` for async-loaded 2D canvas images and `THREE.Sprite` billboards in 3D. Directional indicators (arrows/particles) are imperatively synced so they update immediately without manual refresh; force-graph radius math aligns with custom node radii so arrows terminate on node borders. Exposes plugin hooks for custom node renderers, overlay rendering, and tooltip section contributions.

**`components/SettingsPanel.tsx`** has four accordion sections for physics, groups, filters, and display settings (all collapsed by default). Built with shadcn/ui components. Groups combine three layers: user-defined entries, built-in defaults (common file types), and plugin-provided default `fileColors`. Each group can set color, 2D shape, 3D shape, and an optional image overlay. Plugin/built-in groups can be individually disabled via eye toggles; overriding a default group creates a user copy that takes priority via first-match-wins ordering. Display settings include direction mode, particle controls, and a direction color picker (hex).

**`components/ui/slider.tsx`** is the shared slider primitive wrapper for the webview. It centralizes slider affordances so enabled controls show a pointer cursor and disabled controls expose a non-interactive cursor state.

**`components/PluginsPanel.tsx`** shows all registered plugins with per-rule toggle switches and live connection counts.

**`components/SearchBar.tsx`** provides search with match case, whole word, and regex modes.

## Shared types (`src/shared/types.ts`)

Defines the message protocol and data types shared across both build targets:

- `IFileData` for raw plugin output (path, name, extension, imports)
- `IGraphNode` / `IGraphEdge` / `IGraphData` for graph rendering (nodes carry optional `shape2D`, `shape3D`, `imageUrl`)
- `IGroup` for color/shape/image groups with `NodeShape2D` and `NodeShape3D` enums
- `ExtensionToWebviewMessage` and `WebviewToExtensionMessage` union types for the message protocol

## Product docs (`docs/*.md`)

**`SETTINGS.md`** documents VS Code/user settings, including plugin/rule toggle persistence keys (`codegraphy.disabledPlugins`, `codegraphy.disabledRules`).

**`INTERACTIONS.md`** documents graph gestures, context menus, and panel behavior.

**`TIMELINE.md`** documents git-history indexing/playback behavior and cache invalidation conditions.

## Plugin API docs (`docs/plugin-api/`)

**`EVENTS.md`** documents canonical event names/payloads from `packages/plugin-api/src/events.ts`.

**`TYPES.md`** documents the exported type surface from `@codegraphy/plugin-api` and `@codegraphy/plugin-api/webview`.

**`diagrams/*.excalidraw`** contains editable Excalidraw sources for lifecycle, event system, and type-surface diagrams.

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
7. GraphViewProvider sends DECORATIONS_UPDATED + CONTEXT_MENU_ITEMS + PLUGIN_WEBVIEW_INJECT
8. App loads plugin Tier-2 assets and registers plugin render/message hooks
9. Graph component renders with react-force-graph
10. Physics simulation runs until stable
```

### Plugin Tier-2 messaging
```
1. Plugin webview script sends api.sendMessage({ type, data })
2. Webview posts GRAPH_INTERACTION with event "plugin:<pluginId>:<type>"
3. GraphViewProvider routes plugin-prefixed events to that plugin's API instance
4. Extension-side plugin handles onWebviewMessage callbacks
5. Extension plugin replies via api.sendWebviewMessage(...)
6. App receives "plugin:<pluginId>:<type>" and dispatches to pluginHost handlers
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
3. GraphViewProvider updates disabled rules set and persists it to VS Code settings
4. If the rule has connections: rebuild graph from cached data (no re-analysis)
5. Sends GRAPH_DATA_UPDATED + PLUGINS_UPDATED
```

## Key design decisions

**Plugin architecture.** Plugins are decoupled from the core, making it straightforward to add new languages, test them independently, and eventually support community-contributed plugins.

**TypeScript Compiler API.** The TypeScript plugin uses `ts.createSourceFile` instead of regex, giving accurate handling of all import syntaxes including dynamic imports and re-exports.

**Position persistence.** Node positions are saved in VS Code workspace state after physics stabilization, so the graph layout is consistent across sessions.

**Cached rebuilds.** Rule and plugin toggles rebuild the graph from cached connection data rather than re-analyzing files, making toggles feel instant.
