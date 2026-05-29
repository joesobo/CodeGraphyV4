# Issue 160: Move Indexing Behind A Deeper Core Module

## Trello

- https://trello.com/c/2JjIwzcM/160-architecture-move-indexing-behind-a-deeper-core-package-module

## Draft PR

- https://github.com/joesobo/CodeGraphyV4/pull/223

## Current Task Frame

Move Indexing behind a deeper `@codegraphy-dev/core` module so the VS Code extension adapter owns VS Code progress, warnings, and Graph View messages only.

Core should own:

- Indexing orchestration
- Graph Cache persistence
- plugin lifecycle during indexing
- graph generation semantics
- runtime state needed to rebuild or refresh indexed graph data

The VS Code extension should own:

- VS Code workspace integration
- progress and warning presentation
- Graph View message flow
- editor-specific refresh triggers

## Existing Tension To Resolve

`docs/plans/2026-04-07-code-index-rearchitecture.md` said indexing work should stay inside `packages/extension`, while `docs/plans/2026-05-13-extract-core-from-extension-package.md` later settled that `@codegraphy-dev/core` owns the full Indexing pipeline.

This task follows the later Core Package decision, but the implementation boundary still needs to be pinned down before code changes.
