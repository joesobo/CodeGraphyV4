# Philosophy

A file tree shows storage locations. It does not show which files call, import, test, inherit from, contain, or reference one another.

CodeGraphy makes those connections visible. It gives users a useful map of workspace files and their Relationships. Symbols, plugins, and interfaces expand that map for different languages, files, tools, and ideas.

The workspace belongs to the user. CodeGraphy analyzes, stores, queries, and renders workspace data locally. Source code and graph data stay under the user's control.

CodeGraphy does not prescribe one correct view of a codebase. It provides an extensible foundation that users can adapt to their projects, systems, and ways of thinking.

## Principles

### Relationships carry the architecture

Folder structure records one organizational choice. The Relationship Graph exposes runtime, type, test, content, and framework connections that cross those folders.

### Start coarse and reveal detail

The first graph should remain readable. File Nodes show broad structure. Graph Scope can add folders, packages, Symbols, variables, and plugin-defined concepts without forcing all of that density into every view.

### Visual properties need meaning

- Position comes from deterministic relationship-driven physics.
- Size can represent Connection count or File Size.
- Color and shape come from Node Types, Edge Types, plugin defaults, and user Legend Entries.
- Edge direction and type explain how two Nodes relate.

The graph renderer draws Nodes with WebGPU. It provides shared WebAssembly force and collision physics for visual interfaces. Interfaces resolve CodeGraphy product meaning before calling it. The renderer does not own settings, persistence, plugins, indexing, or product decisions. This boundary keeps it reusable and extractable.

### Stable layouts build spatial memory

Deterministic physics, persistent settings, and user-controlled focus let a developer learn the rough geography of a codebase. The graph remains a working map rather than a disposable diagram.

### Core provides the baseline

Core is the headless engine. It owns File Discovery, Tree-sitter analysis, Graph Projection, SQLite Graph Cache storage, Graph Query, and the plugin host. It produces a useful Relationship Graph without an interface or optional plugin.

Interfaces consume Core. Each interface owns its presentation, interaction, and host integration. It sends host events and user intent through Core's API, then reacts to Core's results and lifecycle events.

The VS Code extension and tldraw package draw and interact with the graph. A terminal or agent interface can query Core without drawing anything. Optional plugins add project and ecosystem semantics, but the base product does not require them.

### One graph serves people and agents

The extension and CLI use the same Indexing, Graph Cache, Graph Scope, filters, and Relationships. A visual investigation and an agent query should not disagree because they came from separate indexers.

### CodeGraphy is local

Source files, settings, plugin data, and the Graph Cache remain under the user's control. Core workflows run on the user's machine.

The website explains and markets CodeGraphy. It does not participate in the workspace data path or Core engine. Its copy can use a marketing voice, but factual claims must match current behavior and technical documentation. The monorepo location is an organizational choice, not an architectural dependency.

Build for the local product that exists now. Local ownership is a product boundary.

### Extensibility lets the graph fit the user

Workspaces contain different languages, file types, frameworks, tools, and concepts. Core provides a useful baseline. Plugins add analysis and concepts. Interfaces present the same graph in different ways. Settings, filters, Graph Scope, styling, and workspace-owned data let users shape CodeGraphy around their work.

Extensibility must preserve a coherent Core pipeline and shared Relationship Graph. A customization should add meaning or adapt presentation without creating a second incompatible source of graph truth.

Core plugins extend analysis and graph meaning through the Core Plugin API. They can add language support, analyzers, Nodes, Edges, and Edge Types. Interface plugins use a separate host-owned Plugin API to add UI or behavior. Core still provides the baseline graph.

Core retains the source of each graph fact. Built-in analysis and plugin contributions have distinct provenance. Interfaces choose when to display that detail. Diagnostics and machine-readable queries identify the producer and expose available freshness evidence.

The focused workspaces in [`examples/`](../examples/README.md) keep language and plugin support concrete. Each example gives people and automated checks a small project whose expected files, Nodes, and Relationships can be inspected end to end.

## Useful Signals

The graph can expose:

- central files used by many callers
- isolated clusters that may form module boundaries
- circular Relationships
- bridge files between otherwise separate areas
- structural context through folders, packages, and `nests` Edges
- exact declarations behind a file-level Relationship

These are prompts for investigation, not automatic architecture judgments.

## Boundaries

CodeGraphy complements the file tree rather than replacing it. The graph must preserve concrete paths and editor navigation.

CodeGraphy is also more than a rendering package or plugin host. Core owns the graph data model and pipeline. The custom renderer draws the result. Plugins enrich it.
