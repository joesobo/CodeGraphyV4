# CodeGraphy MCP

`@codegraphy-vscode/mcp` installs the `codegraphy` CLI and local MCP server.

It gives agents access to saved CodeGraphy data from:

- `.codegraphy/graph.lbug`
- `.codegraphy/settings.json`

It can also ask the running CodeGraphy VS Code extension to reindex a repo. The extension still owns indexing; the MCP only focuses/opens VS Code and sends a repo-scoped URI request.

## Quick Start

```bash
npm install -g @codegraphy-vscode/mcp
codegraphy setup
codegraphy status .
codegraphy reindex .
codex mcp list
```

`codegraphy status .` reports whether the saved index is `fresh`, `stale`, or `missing`. Use `codegraphy reindex .` when it is stale.

File-oriented MCP tools accept absolute paths, repo-relative paths, and unique suffixes or basenames. For example, `deep.ts` resolves to `example-typescript/packages/feature-depth/src/deep.ts` when it is the only indexed `deep.ts`. Ambiguous short names return candidate paths instead of guessing.

## Install

```bash
npm install -g @codegraphy-vscode/mcp
codegraphy setup
```

If automatic setup fails:

```bash
codex mcp add codegraphy -- codegraphy mcp
```

## Manual Codex Config

`~/.codex/config.toml`:

```toml
[mcp_servers.codegraphy]
command = "codegraphy"
args = ["mcp"]
```

## Commands

| Command | What It Does |
|---|---|
| `codegraphy setup` | Adds the CodeGraphy MCP entry to Codex when possible |
| `codegraphy list` | Lists locally known indexed repos |
| `codegraphy status .` | Checks, registers, and reports fresh/stale index status for the current repo |
| `codegraphy status /path/to/repo` | Checks another repo from anywhere and reports fresh/stale status |
| `codegraphy reindex .` | Focuses/opens VS Code for the repo, sends a CodeGraphy reindex URI, and waits for fresh status |
| `codegraphy reindex /path/to/repo` | Requests a VS Code extension reindex for another repo from anywhere |
| `codegraphy mcp` | Starts the local stdio MCP server |

## MCP Tools

| Tool | What It Does |
|---|---|
| `codegraphy_list_repos` | Lists indexed repos |
| `codegraphy_select_repo` | Selects the repo for the session |
| `codegraphy_repo_status` | Checks DB availability, registration, and fresh/stale status |
| `codegraphy_request_reindex` | Asks the running CodeGraphy VS Code extension to reindex a repo, optionally waiting for fresh status |
| `codegraphy_file_dependencies` | Lists outgoing file relationships |
| `codegraphy_file_dependents` | Lists incoming file relationships |
| `codegraphy_symbol_dependencies` | Lists outgoing symbol relationships |
| `codegraphy_symbol_dependents` | Lists incoming symbol relationships |
| `codegraphy_impact_set` | Returns bounded transitive impact with optional `direction` and `kinds` filters |
| `codegraphy_explain_relationship` | Explains how files or symbols connect |
| `codegraphy_view_graph` | Projects the saved depth/folder/package graph view |
| `codegraphy_file_summary` | Summarizes symbols and relation counts for a file |

File path inputs for file-oriented tools can use absolute paths, repo-relative paths, or unique suffixes. If a suffix is ambiguous, pass one of the returned candidate repo-relative paths.

## Example Prompts

- `Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.`
- `Using CodeGraphy only, explain the relationship between deep.ts and branch.ts.`
- `Use CodeGraphy to show the saved graph view for this repo.`
- `Use CodeGraphy to update UserName in types.ts to a FullName object with first and last strings, then fix the affected code.`
- For narrower impact slices, ask for incoming dependents only or filter to kinds like `type-import` or `call`.

If the repo status is `stale`, use `codegraphy_request_reindex` or `codegraphy reindex .` first. The MCP rereads the DB on each query, but it can only see what the extension has already persisted.

Stale indexes are still usable snapshots. CodeGraphy should load saved nodes and edges while showing a stale warning. If `.codegraphy/graph.lbug` is missing, the repo is treated as missing even when old metadata remains.

`codegraphy_request_reindex` runs `code <repo>`, sends `vscode://codegraphy.codegraphy/reindex?...`, and polls freshness until the DB reports fresh or the timeout is reached. The extension verifies the receiving VS Code window matches the requested repo before reindexing.

## Optional Skill

This repo includes a reusable skill at [skills/codegraphy-mcp/SKILL.md](../../skills/codegraphy-mcp/SKILL.md).

For the full setup guide, step-by-step repo hookup, Codex config snippets, and verification flow, see [docs/MCP.md](../../docs/MCP.md).
