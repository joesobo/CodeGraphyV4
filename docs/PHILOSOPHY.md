# Philosophy

## The problem

File systems are a legacy metaphor. They were designed for physical paper organization: file cabinets, folders, labels. We brought that structure into computing not because it's ideal, but because it's what we knew.

As codebases grow, the metaphor breaks down. Folder names become arbitrary. File locations reflect organizational decisions made years ago by people who may not even work on the project anymore. New developers see a tree of folders that tells them nothing about how the code actually works.

**The file system shows you where things are stored. It doesn't show you how things connect.**

## The insight

Code has a hidden structure that the file system obscures: the dependency graph. Files import other files. Components render other components. Modules call into other modules. This web of connections is the real architecture of a codebase, but it's invisible unless you trace imports manually.

CodeGraphy makes this structure visible.

## The vision

A force-directed graph where:
- **Nodes are files** (or directories, or modules)
- **Edges are connections** (imports, dependencies, references)
- **Physics creates meaning**: files that work together cluster together

This isn't visualization for its own sake. It builds on a fundamental truth about human cognition: we have an innate sense of place.

Humans are spatial creatures. We remember where things are. Maps work because they tap into our natural sense of geography. A stable graph layout becomes a place you can learn. Instead of memorizing folder paths, you build spatial intuition: "that green cluster in the upper-right is the auth system." Over time, navigating the graph becomes as natural as navigating a city you know well.

## Core principles

### Connections over containers

The file system groups files by folder. CodeGraphy groups files by relationship. A utility file in `src/utils/` that's imported by 30 components will appear at the center of those components in the graph, not hidden away in a utils folder.

### Visual information density

Every visual property carries meaning:
- **Position**: Clusters emerge from force physics. Related files pull together.
- **Size**: Configurable by connection count, file size, or access frequency.
- **Color**: Encodes file type or user-defined categories via groups.
- **Edges**: Show direction of dependency (A -> B means A imports B).

### Stability creates memory

The graph must produce consistent layouts. If nodes shuffle randomly each time, the spatial memory benefit disappears. Layouts are deterministic, and user adjustments are persisted across sessions.

### Language agnostic core, language-specific plugins

What counts as a "connection" varies by language:
- JavaScript/TypeScript: `import`, `require`, dynamic imports
- Python: `import`, `from x import y`
- C#: `using` directives, type references
- GDScript: `preload`, `load`, `extends`
- Markdown: `[[wikilinks]]`

The core graph engine doesn't know about language specifics. Plugins analyze files and report connections in a standard format. This keeps the core simple and makes CodeGraphy extensible to any language.

### Insights through visualization

The graph reveals patterns that are invisible in the file tree:
- **Central nodes**: Files imported by everything, potential bottlenecks or core utilities
- **Isolated clusters**: Groups of files that only talk to each other, natural module boundaries
- **Circular dependencies**: Loops that might indicate design issues
- **Bridge files**: Files that connect otherwise separate clusters

## What CodeGraphy is not

- **Not a replacement for the file system.** You still need folders. CodeGraphy is an additional lens.
- **Not just a pretty picture.** Every visual element conveys meaningful information.
- **Not language-specific.** The plugin system makes any language possible.

## Inspiration

- **Obsidian.md**: Graph view for markdown notes, showing the power of visualizing connections
- **Dependency graphs in package managers**: npm, cargo, etc., but at the file level instead of the package level
- **City planning metaphors**: Codebases as cities, with neighborhoods, highways, and landmarks
