# CodeGraphy Architecture

This document describes the high-level architecture of CodeGraphy.

## Overview

CodeGraphy is a VSCode extension that visualizes file dependencies as an interactive graph. It consists of three main layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        VSCode Extension                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ GraphViewProvider│  │WorkspaceAnalyzer│  │  Configuration  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           │    ┌───────────────┴───────────────┐    │            │
│           │    │                               │    │            │
│           ▼    ▼                               ▼    │            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Core Layer                              ││
│  │  ┌─────────────────┐          ┌─────────────────┐           ││
│  │  │  FileDiscovery  │          │  PluginRegistry │           ││
│  │  └─────────────────┘          └────────┬────────┘           ││
│  │                                        │                     ││
│  │                               ┌────────┴────────┐           ││
│  │                               │     Plugins     │           ││
│  │                               │  ┌───────────┐  │           ││
│  │                               │  │TypeScript │  │           ││
│  │                               │  │  Plugin   │  │           ││
│  │                               │  └───────────┘  │           ││
│  │                               └─────────────────┘           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Messages
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Webview (React)                          │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │       App       │────────▶│      Graph      │               │
│  └─────────────────┘          └─────────────────┘               │
│                                       │                          │
│                                       ▼                          │
│                               ┌─────────────────┐               │
│                               │   Vis Network   │               │
│                               └─────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Extension Layer

#### GraphViewProvider
- Implements `WebviewViewProvider` for the sidebar panel
- Manages webview lifecycle and HTML content
- Handles bidirectional messaging with the webview
- Persists node positions in workspace state

#### WorkspaceAnalyzer
- Coordinates the analysis pipeline
- Manages file-level caching with mtime invalidation
- Builds graph data from discovered files and connections
- Responds to configuration changes

#### Configuration
- Type-safe wrapper around VSCode settings
- Provides reactive updates via `onDidChange`
- Validates and provides defaults for all settings

### Core Layer

#### FileDiscovery
- Recursively discovers files using glob patterns
- Respects `.gitignore` via the `ignore` package
- Enforces file limits with warnings
- Returns file metadata (path, extension, content)

#### PluginRegistry
- Registers and manages language plugins
- Maps file extensions to appropriate plugins
- Provides plugin lookup by file path
- Handles plugin initialization and disposal

#### Plugins
Language-specific plugins that implement the `ILanguagePlugin` interface:

- **TypeScript Plugin**: Analyzes `.ts`, `.tsx`, `.js`, `.jsx` files
  - `ImportDetector`: Parses imports using TypeScript compiler API
  - `PathResolver`: Resolves import paths to actual files

### Webview Layer

#### App
- React application entry point
- Manages loading states and data flow
- Handles messages from the extension

#### Graph
- Renders the dependency graph using Vis Network
- Implements physics-based force layout
- Handles user interactions (click, drag, zoom)
- Sends position updates back to extension

## Data Flow

### Initial Load
```
1. User opens CodeGraphy panel
2. GraphViewProvider creates webview with HTML
3. Webview mounts React app, sends WEBVIEW_READY
4. GraphViewProvider triggers WorkspaceAnalyzer
5. WorkspaceAnalyzer:
   a. FileDiscovery finds all files
   b. PluginRegistry analyzes each file
   c. Builds nodes (files) and edges (imports)
   d. Applies persisted positions
6. GraphViewProvider sends GRAPH_DATA_UPDATED
7. Graph component renders with Vis Network
8. Physics simulation runs until stable
9. Graph sends POSITIONS_UPDATED
10. GraphViewProvider persists positions
```

### File Change
```
1. VSCode file watcher detects change
2. WorkspaceAnalyzer invalidates cache for file
3. Re-analyzes affected file
4. Sends updated graph data to webview
5. Graph incrementally updates (preserves positions)
```

### User Interaction
```
Click node     → NODE_SELECTED     → Log to console
Double-click   → NODE_DOUBLE_CLICKED → Open file in editor
Drag node      → Physics resettles → POSITIONS_UPDATED → Save positions
Keyboard (0)   → Fit all nodes in view
Keyboard (+/-) → Zoom in/out
```

## File Structure

```
src/
├── core/                    # Core functionality
│   ├── discovery/           # File discovery system
│   │   ├── FileDiscovery.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── plugins/             # Plugin system
│       ├── PluginRegistry.ts
│       ├── types.ts
│       └── index.ts
├── extension/               # VSCode extension
│   ├── index.ts             # Extension entry point
│   ├── GraphViewProvider.ts # Webview provider
│   ├── WorkspaceAnalyzer.ts # Analysis coordinator
│   └── Configuration.ts     # Settings wrapper
├── plugins/                 # Language plugins
│   └── typescript/          # TypeScript/JavaScript
│       ├── index.ts         # Plugin definition
│       ├── ImportDetector.ts
│       └── PathResolver.ts
├── shared/                  # Shared types
│   ├── types.ts             # Graph data types
│   └── mockData.ts          # Test data
└── webview/                 # React webview
    ├── index.tsx            # Entry point
    ├── App.tsx              # Main component
    └── components/
        └── Graph.tsx        # Vis Network wrapper
```

## Key Design Decisions

### Plugin Architecture
Plugins are decoupled from core logic, enabling:
- Easy addition of new language support
- Community-contributed plugins (future)
- Independent testing of language-specific code

### TypeScript Compiler API
Using `ts.createSourceFile` instead of regex for parsing:
- Accurate handling of all import syntaxes
- Proper string literal parsing
- Support for dynamic imports

### Position Persistence
Node positions are saved after physics stabilization:
- Stored in VSCode workspace state
- Applied as initial positions on reload
- Physics verifies stability (minimal movement)

### Incremental Updates
Graph updates preserve existing positions:
- Only changed nodes are re-analyzed
- Cache invalidation based on file mtime
- Smooth visual transitions
