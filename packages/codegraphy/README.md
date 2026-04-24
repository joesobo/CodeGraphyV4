# CodeGraphy CLI

CodeGraphy CLI provides:

- a local repo registry at `~/.codegraphy/registry.json`
- `codegraphy setup` for Codex MCP registration
- `codegraphy list` and `codegraphy status`
- `codegraphy mcp` for DB-backed CodeGraphy queries

The MCP server reads CodeGraphy `.codegraphy/graph.lbug` files created by the VS Code extension. It does not index repos itself.

## Install

```bash
npm install -g @codegraphy-vscode/cli
codegraphy setup
```

If `codegraphy setup` cannot update Codex automatically, add the MCP manually:

```bash
codex mcp add codegraphy -- codegraphy mcp
```

## Commands

```bash
codegraphy setup
codegraphy list
codegraphy status .
codegraphy status /absolute/path/to/repo
codegraphy mcp
```

## Before You Query

1. Open the repo in VS Code with the CodeGraphy extension installed.
2. Run CodeGraphy indexing until `.codegraphy/graph.lbug` exists in that repo.
3. Run `codegraphy status .` from that repo, or `codegraphy status /absolute/path/to/repo` from anywhere.
4. Start Codex from anywhere and ask it to use the CodeGraphy MCP.

The first successful `codegraphy status` call also registers that repo in `~/.codegraphy/registry.json`, so later MCP sessions can select it without `cd`-ing into the repo first.

## Example Codex Prompts

- `Use CodeGraphy MCP to list indexed repos, then select .`
- `Use CodeGraphy MCP to list indexed repos, then select /absolute/path/to/repo.`
- `Use CodeGraphy MCP to tell me what files depend on src/a.ts before reading source files.`
- `Use CodeGraphy MCP to explain the relationship between src/a.ts and src/b.ts.`
- `Use CodeGraphy MCP to list dependents of symbol:src/a.ts:exportAsJson.`
- `Before editing anything, use CodeGraphy MCP to identify the impacted files for this change.`

## Notes

- If a repo has no `.codegraphy/graph.lbug`, the MCP returns setup guidance pointing to the core CodeGraphy extension.
- Queries reread the DB from disk on each call so saved graph changes are visible immediately.
- The MCP is read-only in this MVP. Indexing still happens through the VS Code extension.
- Repo arguments accept relative paths. If you start Codex from the repo root, `codegraphy status .` and `codegraphy_select_repo` with `.` are the shortest setup flow.
