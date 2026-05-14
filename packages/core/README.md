# `@codegraphy/core`

Shared CodeGraphy engine package for workspace indexing, Graph Cache access, and Graph Query behavior.

This package is the headless core that the VS Code extension, MCP server, and CLI will share as the core extraction runbook moves behavior out of the extension package.

## Current Entry Points

- CodeGraphy Workspace paths: resolve `.codegraphy/settings.json` and `.codegraphy/graph.lbug` for any folder path.
- File Discovery: discover analyzable files and directories in any CodeGraphy Workspace without VS Code APIs.
- Tree-sitter Analysis: parse supported languages and produce file, symbol, import, call, inherit, reference, and type-import relationships.
- File Analysis: run cache-aware per-file plugin analysis and project file relationships without VS Code APIs.
- Workspace Analysis: orchestrate discovery, pre-analysis hooks, file analysis, cache updates, and graph rebuilds through headless dependencies.
- Graph Projection: build file, package, folder, and symbol Relationship Graph nodes and edges from analysis results.
- Graph Cache status: report whether a workspace-local Graph Cache exists without using VS Code APIs.
- Graph Cache storage: load, save, clear, and inspect the LadybugDB-backed Graph Cache at `<workspace-root>/.codegraphy/graph.lbug`.
- Graph Query: run node, edge, relationship, symbol, and path reports over Relationship Graph data plus persisted analysis metadata.

Indexing is still being extracted from the extension in later runbook steps. The core package owns the cache/query contracts first so extension, MCP, and CLI adapters can converge on one headless API.
