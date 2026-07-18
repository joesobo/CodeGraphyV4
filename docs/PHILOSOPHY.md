# Philosophy

A file tree tells you where code is stored. It does not tell you which files call, import, test, inherit from, contain, or reference one another.

CodeGraphy makes those Relationships visible. Files provide the first useful map. Symbol Nodes and plugins add detail when a question needs it.

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

### Stable layouts build spatial memory

Deterministic physics, persistent settings, and user-controlled focus let a developer learn the rough geography of a codebase. The graph remains a working map rather than a disposable diagram.

### Core provides the baseline

Core owns File Discovery, parser-backed analysis, Graph Projection, Graph Cache storage, and Graph Query. The extension adds the VS Code experience. Optional plugins provide deeper project and ecosystem semantics without duplicating the Core pipeline.

### One graph serves people and agents

The extension and CLI use the same Indexing, Graph Cache, Graph Scope, filters, and Relationships. A visual investigation and an agent query should not disagree because they came from separate indexers.

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
