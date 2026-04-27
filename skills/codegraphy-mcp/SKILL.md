---
name: codegraphy-mcp
description: Use CodeGraphy MCP for repo structure, dependency, relationship, impact, and saved graph-view questions before broad file search. Trigger when Codex should answer what files or symbols are connected, what may be impacted by a change, how two files relate, or what the saved CodeGraphy depth/folder/package view looks like from `.codegraphy/graph.lbug` and `.codegraphy/settings.json`.
---

# CodeGraphy MCP

Use CodeGraphy first when the question is about repo structure.

## Workflow

1. Resolve the repo.
   Prefer `codegraphy_select_repo` if the repo is not already selected.
   Use `.` when the current terminal is already in the target repo.

2. Check the saved index if setup is unclear.
   Use `codegraphy_repo_status` before assuming the repo is indexed.
   If freshness is `stale`, ask for a reindex in VS Code before trusting broad graph impact.

3. Choose the narrowest graph tool that answers the question.
   Use file tools for file impact.
   Use symbol tools for symbol impact.
   Use `codegraphy_explain_relationship` for direct or bounded path questions.
   Use `codegraphy_view_graph` when saved depth mode, folder nodes, package nodes, or structural edges matter.

4. Read source files only after CodeGraphy narrows the likely files or symbols.

## Tool Choice

- `codegraphy_list_repos`
  Use when the target repo is unclear.
- `codegraphy_select_repo`
  Use to set the repo for the session.
- `codegraphy_repo_status`
  Use to confirm the repo has `.codegraphy/graph.lbug` and to check whether the saved index is fresh or stale.
- `codegraphy_file_dependencies`
  Use for outgoing file relationships.
- `codegraphy_file_dependents`
  Use for incoming file impact.
- `codegraphy_symbol_dependencies`
  Use to trace a symbol outward.
- `codegraphy_symbol_dependents`
  Use for symbol-level blast radius.
- `codegraphy_impact_set`
  Use for bounded transitive impact.
  Prefer `direction: incoming` for change blast radius, `direction: outgoing` for dependency tracing, and `kinds` like `type-import` or `call` to reduce noise.
- `codegraphy_explain_relationship`
  Use to explain how two files or symbols connect.
- `codegraphy_view_graph`
  Use to project the saved CodeGraphy graph view from the DB and saved settings.
- `codegraphy_file_summary`
  Use after CodeGraphy has narrowed a file and you want its declared symbols and relation counts.

## Guidance

- Prefer symbol-level queries when a named export, function, class, or type is the real change target.
- Prefer file-level queries when the user asks about files, folders, modules, or broad refactors.
- When impact results are noisy, narrow them with `kinds` and `direction` before switching to broader source-file reads.
- Treat CodeGraphy as structure memory, not as a replacement for reading implementation details.
- If CodeGraphy reports a stale index, prefer reindexing before major graph-driven refactors. After you edit files, the DB can lag behind source until VS Code refreshes it.
- If the repo is missing `.codegraphy/graph.lbug`, tell the user to open the repo in VS Code with CodeGraphy installed and run indexing.

## Example Prompts

- `Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.`
- `Use CodeGraphy to show the saved graph view for this repo.`
- `Use CodeGraphy to update UserName in types.ts to a FullName object with first and last strings, then fix the affected code.`
