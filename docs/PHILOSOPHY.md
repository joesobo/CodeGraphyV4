# Philosophy

## The problem

File systems are a legacy metaphor. They were designed for physical paper organization: file cabinets, folders, labels. We brought that structure into computing not because it's ideal, but because it's what we knew.

As codebases grow, the metaphor breaks down. Folder names become arbitrary. File locations reflect organizational decisions made years ago by people who may not even work on the project anymore. New developers see a tree of folders that tells them nothing about how the code actually works.

**The file system shows you where things are stored. It doesn't show you how things connect.**

## The insight

Code has a hidden structure that the file system obscures: the relationship graph. Files import other files. Functions call other functions. Types inherit from other types. Markdown notes link to other files. This web of connections is the real architecture of a codebase, but it's invisible unless you trace it manually.

CodeGraphy makes that structure visible.

## The vision

A force-directed graph where:
- **Nodes start as files** and can expand to folders, packages, or plugin-defined node kinds
- **Edges are relationships** projected from indexed code facts
- **Physics creates meaning**: related code pulls together into stable shapes

This isn't visualization for its own sake. It builds on a fundamental truth about human cognition: we have an innate sense of place.

Humans are spatial creatures. We remember where things are. Maps work because they tap into our natural sense of geography. A stable graph layout becomes a place you can learn. Instead of memorizing folder paths, you build spatial intuition: "that green cluster in the upper-right is the auth system." Over time, navigating the graph becomes as natural as navigating a city you know well.

## Core principles

### Connections over containers

The file system groups files by folder. CodeGraphy groups files by relationship. A utility file in `src/utils/` that's imported by 30 components will appear at the center of those components in the graph, not hidden away in a utils folder.

### Visual information density

Every visual property carries meaning:
- **Position**: Clusters emerge from force physics. Related files pull together.
- **Size**: Configurable by connection count, file size, or access frequency.
- **Color**: Encodes node kinds, edge kinds, or user-defined legend rules.
- **Edges**: Show structural and semantic relationships between rendered nodes.

### Stability creates memory

The graph must produce consistent layouts. If nodes shuffle randomly each time, the spatial memory benefit disappears. Layouts are deterministic, and user adjustments are persisted across sessions.

### Core pipeline first, plugins for enrichment

CodeGraphy now has a built-in analysis pipeline:
- core discovers files once
- core reads each file once
- core uses Tree-sitter where it has coverage
- built-in and external plugins run after core on the same in-memory file data
- later plugin output can override or extend lower-priority results

That means the core is no longer "empty" until a language plugin shows up. You still get useful graph edges out of the box where Tree-sitter coverage exists, and plugins stay valuable for language- or framework-specific semantics.

Today that built-in baseline covers JavaScript, TypeScript, TSX, Python, Go, Java, Rust, and C#.

Examples:
- JavaScript/TypeScript: built-in Tree-sitter plugin finds baseline syntax and relations, plugins can add path alias or framework-aware semantics
- Python, Go, Java, Rust, and C#: built-in Tree-sitter plugin finds baseline imports, symbols, and low-noise structural relations, plugins can add richer project-aware semantics
- GDScript: plugin fills the gap where built-in Tree-sitter coverage is missing or weak
- Markdown wikilinks: built-in wildcard plugin scans for Obsidian-style links across files

### Insights through visualization

The graph reveals patterns that are invisible in the file tree:
- **Central nodes**: Files imported by everything, potential bottlenecks or core utilities
- **Isolated clusters**: Groups of files that only talk to each other, natural module boundaries
- **Circular dependencies**: Loops that might indicate design issues
- **Bridge files**: Files that connect otherwise separate clusters
- **Structural context**: Folders and packages can be shown as nodes with `NESTS` edges
- **Focused traversal**: Depth mode filters the same graph surface instead of switching to a separate built-in view

## What CodeGraphy is not

- **Not a replacement for the file system.** You still need folders. CodeGraphy is an additional lens.
- **Not just a pretty picture.** Every visual element conveys meaningful information.
- **Not only a plugin host.** The core owns discovery, indexing, projection, and repo-local state.
- **Not plugin-first anymore.** The core owns baseline analysis, and plugins extend or correct it.

## Inspiration

- **Obsidian.md**: Graph view for markdown notes, showing the power of visualizing connections
- **Dependency graphs in package managers**: npm, cargo, etc., but at the file level instead of the package level
- **City planning metaphors**: Codebases as cities, with neighborhoods, highways, and landmarks
