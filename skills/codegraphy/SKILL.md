---
name: codegraphy
description: Use the CodeGraphy CLI to index a local workspace and query its files, symbols, relationships, dependencies, impact, and bounded paths before broad source search. Trigger for codebase structure, connected-file, symbol-location, dependency, relationship, and change-impact questions when shell access is available.
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
2. Run `codegraphy index .` when opening an unknown workspace or after files, settings, or plugins may have changed. Indexing reuses unchanged analysis; do not run `status` first unless the user asks for diagnostics.
3. Run the narrowest query that answers the structural question.
4. Read the returned source files and locations before editing or making detailed claims.

## Queries

Index, status, and graph report commands emit compact JSON. List queries return at most 100 items by default; narrow with selectors before raising `--limit`.

```bash
codegraphy nodes . --search settings --limit 25
codegraphy edges . --from src/app.ts --type import
codegraphy relationships . --to src/config.ts --limit 50
codegraphy symbols . --file src/app.ts
codegraphy symbols . --from src/app.ts --type call
codegraphy paths . --from src/app.ts --to src/config.ts --depth 6 --limit 3
```

- Use `nodes` to find indexed paths and node types.
- Use `edges` for compact file-to-file connections and impact candidates.
- Use `relationships` when provenance, relationship kinds, or symbol evidence matters.
- Use `symbols` for declarations, signatures, ranges, and symbol-level evidence.
- Use `paths` to explain how two exact nodes connect. Keep depth and path counts small.

Treat an empty result as evidence only about the current index and query. Read source or rerun `index` when recent changes may not be represented.
