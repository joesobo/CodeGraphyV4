# CodeGraphy Philosophy

## The Problem

File systems are a legacy metaphor. They were designed for physical paper organization — file cabinets, folders, labels. We brought that structure into computing not because it's the best way to understand code, but because it's what we knew.

As codebases grow, this metaphor breaks down. Folder names become arbitrary. File locations reflect organizational decisions made years ago by people who may not even work on the project anymore. New developers onboarding to a repo see a tree of folders, but the tree tells them nothing about how the code actually works.

**The file system shows you where things are stored. It doesn't show you how things connect.**

## The Insight

Code has a hidden structure that the file system obscures: the dependency graph. Files import from other files. Components render other components. Modules call into other modules. This web of connections is the *real* architecture of a codebase — but it's invisible unless you trace imports manually.

CodeGraphy makes this structure visible.

## The Vision

A 2D force-directed graph where:
- **Nodes are files** (or directories, or modules)
- **Edges are connections** (imports, dependencies, references)
- **Physics creates meaning** — files that work together cluster together

This isn't just visualization for its own sake. It's building on a fundamental truth about human cognition: **we have an innate sense of place**.

Humans are spatial creatures. We remember where things are — "the coffee shop on the corner," "the blue icon in the top-right of the screen." Maps work because they map to our natural sense of geography.

A stable graph layout becomes a **place you can learn**. Instead of memorizing folder paths, you build spatial intuition: "that green cluster in the upper-right is the auth system." Over time, navigating the graph becomes as natural as navigating a city you know well.

## Core Principles

### 1. Connections Over Containers

The file system groups files by folder. CodeGraphy groups files by relationship. A utility file in `src/utils/` that's imported by 30 components will appear at the center of those components in the graph — not hidden away in a "utils" folder.

### 2. Visual Information Density

Every visual property carries meaning:
- **Position**: Clusters emerge from force physics. Related files pull together.
- **Size**: Configurable — could represent import count, file size, centrality.
- **Color**: Encodes file type, module origin, or user-defined categories.
- **Edges**: Show direction of dependency (A→B means A imports B).

### 3. Stability Creates Memory

The graph must produce consistent layouts. If nodes shuffle randomly each time, the spatial memory benefit disappears. Layout is seeded deterministically, and user adjustments are persisted.

### 4. Language Agnostic Core, Language-Specific Plugins

What constitutes a "connection" varies by language and ecosystem:
- JavaScript/TypeScript: `import`, `require`, dynamic imports
- Python: `import`, `from x import y`
- Go: package imports
- Rust: `use`, `mod`

The core graph engine doesn't know or care about language specifics. Plugins analyze the codebase and report connections in a standard format. This keeps the core simple and makes CodeGraphy extensible to any language.

### 5. Insights Through Visualization

The graph reveals patterns that are invisible in the file tree:
- **Central nodes**: Files imported by everything — potential bottlenecks or core utilities
- **Isolated clusters**: Groups of files that only talk to each other — natural module boundaries
- **Circular dependencies**: A→B→C→A loops that might indicate design issues
- **Bridge files**: Files that connect otherwise separate clusters

## What CodeGraphy Is Not

- **Not a replacement for the file system.** You still need folders. CodeGraphy is an additional lens, not the only one.
- **Not just a pretty picture.** Every visual element should convey meaningful information.
- **Not language-specific.** The plugin system enables any language to be visualized.

## Inspiration

- **Obsidian.md**: Graph view for markdown notes, demonstrating the power of visualizing connections
- **Dependency graphs in package managers**: npm, cargo, etc. — but at the file level, not package level
- **City planning metaphors**: Codebases as cities, with neighborhoods, highways, and landmarks

---

*This document describes the philosophy behind CodeGraphy. For technical details, see the README and documentation.*
