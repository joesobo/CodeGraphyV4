---
name: codegraphy
description: Use the CodeGraphy CLI to index a local workspace, configure its saved Graph Scope and filters, and query nodes, symbols, edges, dependencies, dependents, and bounded paths before broad source search. Trigger for codebase structure, symbol-location, connected-file, dependency, relationship, graph-configuration, and change-impact questions when shell access is available.
---

# CodeGraphy

Use CodeGraphy as structure memory, then read source for implementation details.

## CLI setup

Check for `codegraphy` with `command -v codegraphy`. If it is unavailable, install the current CLI:

```bash
npm install --global @codegraphy-dev/core@latest
codegraphy --help
```

If a global install is unavailable or inappropriate, use `npx --yes @codegraphy-dev/core@latest` as the command prefix instead. Do not add Core to the workspace's dependencies only to run graph queries. The CLI currently supports Node.js 20 through 22; prefer Node 22 LTS. If Node, npm, or a supported Node version is unavailable, report that prerequisite to the user.

## Workflow

1. Work from the target workspace root.
2. Run `codegraphy index` when opening an unknown workspace or after files, filters, Graph Scope, or plugins may have changed. Indexing reuses unchanged analysis; do not run `status` first unless the user asks for diagnostics.
3. Run the narrowest query that answers the structural question.
4. Read the returned source files and locations before editing or making detailed claims.

## Queries

Index, status, settings, and graph query commands emit compact JSON. Queries use bounded defaults and positional inputs; do not invent query flags.

```bash
codegraphy nodes
codegraphy search SettingsPanel
codegraphy edges
codegraphy dependencies packages/core/src/cli/command.ts
codegraphy dependents packages/core/src/workspace/settings.ts
codegraphy path packages/core/src/cli/command.ts packages/core/src/workspace/requestQuery.ts
```

- Use `nodes` to list the saved Graph Scope. Symbols are Node Types and appear here when their Node Types are enabled.
- Use `search` to find scoped nodes by text.
- Use `edges` for compact scoped relationships.
- Use `dependencies` for outgoing edges and `dependents` for incoming impact.
- Use `path` to explain how two exact nodes connect.

Inspect or change the same persisted workspace controls used by the extension:

```bash
codegraphy scope
codegraphy scope node symbol:function on
codegraphy scope edge call on
codegraphy filter
codegraphy filter add '**/generated/**'
codegraphy filter remove '**/generated/**'
codegraphy plugins list
```

Graph Scope and filter changes are written to `.codegraphy/settings.json`. Run `codegraphy index` after a setting or plugin change when cached analysis may need to change. Use `codegraphy doctor` for installation, settings, cache, or plugin diagnostics. All commands use the current directory by default; use the global `--workspace <path>` option only when operating elsewhere.

Treat an empty result as evidence only about the current index and query. Read source or rerun `index` when recent changes may not be represented.
