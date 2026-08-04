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

## Deliver through pull requests

Authorization to implement a task includes authorization to use the complete repository workflow. Do not ask separately for permission to commit, push, create or update a pull request, interact with Trello or GitHub, or inspect CI. The user has already granted full development permissions for these actions.

Work on a branch or isolated worktree. Commit coherent checkpoints and push them frequently. Open or update a draft pull request early, link the Trello card or issue, and keep checking CI while useful work continues. Before ending a coding task, ensure the latest task changes are committed and pushed and that a draft pull request exists. Do not leave completed work only local, uncommitted, or unpushed unless the user explicitly asks you to.

## Keep feedback loops short

Use the smallest check that can disprove a change. Prefer focused unit tests while iterating. Run a focused Playwright scenario when the behavior needs a real browser or extension host; let CI run the complete Playwright suite in parallel. Push checkpoints and check the pull request periodically while useful work continues so failures appear before the branch drifts far from a green state.

Treat the quality tools as focused diagnostics, not a checklist to run after every change. Select the tool that fits the risk and scope it to the changed file or feature. Mutation testing is the most expensive: run it against one source file, use its survivors to improve the code or tests, then repeat that same scoped run until its output is clean.
