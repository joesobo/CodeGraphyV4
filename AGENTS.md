# AGENTS.md

We build CodeGraphy for people and agents who need to understand the files in a workspace and the connections between them.

Use the product language and current system model in `CONTEXT.md`. Use the detailed principles in `docs/PHILOSOPHY.md`. Do not create another glossary, philosophy, or architecture document.

## Connections are the product

Start with workspace files and make their Relationships visible, inspectable, and useful. Add Symbols and plugin concepts when they help. Keep the graph honest: each Node and Edge needs explainable evidence and provenance.

## The workspace belongs to the user

CodeGraphy runs locally. Source files, settings, plugin data, and the Graph Cache stay under the user's control. Let users adapt the graph to their languages, files, tools, and ways of thinking.

## Core owns the graph

Core handles discovery, Tree-sitter analysis, SQLite storage, graph state, queries, and optional Core plugins. Interfaces own presentation and host integration; they communicate through Core instead of recreating its work. Interface plugins use a separate API for interface behavior. All interfaces consume the same Relationship Graph.

## Keep the renderer small

The graph renderer draws Nodes with WebGPU and runs force and collision physics in WebAssembly. Keep CodeGraphy settings, persistence, plugins, indexing, and product decisions outside it so it remains reusable.

## Examples prove support

Use the focused workspaces in `examples/` to inspect and validate language and plugin behavior end to end. Keep each example small enough that a person can understand the expected files, Nodes, and Relationships.
