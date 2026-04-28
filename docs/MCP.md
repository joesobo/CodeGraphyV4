# CodeGraphy MCP Setup

CodeGraphy MCP gives an agent access to a repo's saved CodeGraphy index and can ask the CodeGraphy VS Code extension to reindex that repo.

It reads:

- `.codegraphy/graph.lbug`
- `.codegraphy/settings.json`

It does not contain indexing logic. The VS Code extension still owns indexing; the MCP only sends a repo-scoped request to the extension.

## Package Roles

| Piece | Installed From | Role |
|---|---|---|
| CodeGraphy core extension | VS Code Marketplace | indexes the repo, renders the graph, and writes `.codegraphy/graph.lbug` |
| `@codegraphy-vscode/mcp` | npm | installs the `codegraphy` CLI and local stdio MCP server |
| Codex MCP entry | `codegraphy setup` or manual config | lets Codex launch `codegraphy mcp` |
| optional Codex skill | `skills/codegraphy-mcp/` | teaches agents when to use CodeGraphy first |

The MCP package is not a replacement for the VS Code extension. It is a local bridge between an agent and the saved CodeGraphy DB.

## Prerequisites

- Node `22.22.0` or newer within the supported Node 22 range.
- VS Code with the CodeGraphy core extension installed.
- The VS Code `code` shell command available in your terminal.
- A repo that has been opened in VS Code and indexed at least once, producing `.codegraphy/graph.lbug`.
- Codex or another MCP-capable agent.

## Quick Start

```bash
# 1. Install the MCP package
npm install -g @codegraphy-vscode/mcp

# 2. Configure Codex
codegraphy setup

# 3. Register the current indexed repo
codegraphy status .

# 4. Ask VS Code to refresh the repo if status is stale
codegraphy reindex .

# 5. Verify Codex sees it
codex mcp list
codex mcp get codegraphy --json
```

Then start a fresh Codex session and ask:

```text
Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.
```

If `codegraphy status .` reports `freshness: stale`, run `codegraphy reindex .` or ask the agent to use `codegraphy_request_reindex` before relying on the graph for a large refactor.

## File Path Inputs

File-oriented MCP tools accept:

- absolute paths
- repo-relative paths, such as `example-typescript/packages/feature-depth/src/deep.ts`
- unique suffixes or basenames, such as `feature-depth/src/deep.ts` or `deep.ts`

If a short name matches more than one indexed file, the MCP returns an `ambiguous-file-path` result with candidate paths instead of guessing.

## Step By Step

1. Open VS Code.
2. Install the [CodeGraphy extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
3. Open the repo you want to use.
4. Open the CodeGraphy graph.
5. Run CodeGraphy indexing until the repo has `.codegraphy/graph.lbug`.
6. Make sure the VS Code `code` shell command is installed and available in your terminal.
   On macOS, use VS Code's command palette action `Shell Command: Install 'code' command in PATH` if needed.
7. Open a terminal in that repo.
8. Install the npm package globally:

```bash
npm install -g @codegraphy-vscode/mcp
```

9. Set up the Codex MCP entry:

```bash
codegraphy setup
```

10. Register the repo:

```bash
codegraphy status .
```

That command also reports whether the saved index is `fresh`, `stale`, or `missing`.

11. If the repo is stale, ask VS Code to reindex it:

```bash
codegraphy reindex .
```

This runs `code <repo>`, sends `vscode://codegraphy.codegraphy/reindex?...`, and waits until the saved DB reports `fresh` or the timeout is reached.

12. Verify the repo and MCP:

```bash
codegraphy list
codex mcp list
codex mcp get codegraphy --json
```

13. Start a fresh Codex session:

```bash
codex
```

## Codex Manual Setup

If `codegraphy setup` cannot add the MCP entry automatically, use one of these.

One-off command:

```bash
codex mcp add codegraphy -- codegraphy mcp
```

Global Codex config in `~/.codex/config.toml`:

```toml
[mcp_servers.codegraphy]
command = "codegraphy"
args = ["mcp"]
```

Project-local Codex config in `.codex/config.toml`:

```toml
[mcp_servers.codegraphy]
command = "codegraphy"
args = ["mcp"]
```

## CLI Commands

| Command | What It Does | Typical Use |
|---|---|---|
| `codegraphy setup` | Configures the local CodeGraphy MCP entry for Codex | one-time machine setup |
| `codegraphy list` | Lists locally known indexed repos from `~/.codegraphy/registry.json` | verify repo discovery |
| `codegraphy status .` | Checks the current repo, registers it if indexed, and reports fresh/stale status | shortest repo setup flow |
| `codegraphy status /path/to/repo` | Checks another repo from anywhere and reports fresh/stale status | multi-repo use |
| `codegraphy reindex .` | Focuses/opens VS Code for the repo, sends a CodeGraphy reindex URI, and waits for fresh status | refresh stale graph data |
| `codegraphy reindex /path/to/repo` | Requests a VS Code extension reindex for another repo from anywhere | multi-repo refresh |
| `codegraphy mcp` | Starts the local stdio MCP server | manual MCP runtime |

## MCP Tools

| Tool | What It Does | Typical Use |
|---|---|---|
| `codegraphy_list_repos` | Lists indexed repos | find the right repo first |
| `codegraphy_select_repo` | Selects the repo for this MCP session | session setup |
| `codegraphy_repo_status` | Checks DB availability, registration, and fresh/stale status | verify setup |
| `codegraphy_request_reindex` | Asks the running CodeGraphy VS Code extension to reindex a repo, optionally waiting for fresh status | refresh stale graph data |
| `codegraphy_file_dependencies` | Lists outgoing file relationships | plan a change |
| `codegraphy_file_dependents` | Lists incoming file relationships | blast radius |
| `codegraphy_symbol_dependencies` | Lists outgoing symbol relationships | trace a symbol outward |
| `codegraphy_symbol_dependents` | Lists incoming symbol relationships | symbol-level impact |
| `codegraphy_impact_set` | Returns bounded transitive impact with optional `direction` and `kinds` filters | scoped change planning |
| `codegraphy_explain_relationship` | Explains how two files or symbols connect | dependency questions |
| `codegraphy_view_graph` | Projects the saved CodeGraphy depth/folder/package graph view | graph-aware context |
| `codegraphy_file_summary` | Summarizes symbols and relation counts for a file | targeted inspection |

File path inputs for `codegraphy_file_dependencies`, `codegraphy_file_dependents`, `codegraphy_impact_set`, `codegraphy_explain_relationship`, `codegraphy_view_graph`, and `codegraphy_file_summary` can use absolute paths, repo-relative paths, or unique suffixes.

## Optional Skill

This repo also ships a reusable skill at [skills/codegraphy-mcp/SKILL.md](../skills/codegraphy-mcp/SKILL.md).

MCP tool descriptions are enough for basic tool calls, but the skill improves behavior from short prompts because it tells the agent to check freshness, prefer symbol-level impact for named exports, use filters to reduce noise, and read source only after CodeGraphy narrows the likely files.

If you want Codex to use CodeGraphy more consistently from short prompts, copy `skills/codegraphy-mcp/` into your Codex skills directory, such as:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/codegraphy-mcp "${CODEX_HOME:-$HOME/.codex}/skills/"
```

## Quick Verification

Try one simple structure prompt:

```text
Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.
```

If the filenames are unique in the indexed repo, short prompts also work:

```text
Using CodeGraphy only, explain the relationship between deep.ts and branch.ts.
```

Try one saved-view prompt:

```text
Use CodeGraphy to show the saved graph view for this repo.
```

Try one real code-change prompt:

```text
Use CodeGraphy to update UserName in types.ts to a FullName object with first and last strings, then fix the affected code.
```

## Notes

- `codegraphy status .` both checks the repo and registers it in `~/.codegraphy/registry.json`.
- `codegraphy status .` also reports `lastIndexedCommit`, `currentCommit`, and stale reasons when the saved index is behind the repo.
- Freshness compares saved CodeGraphy metadata against the current repo state, including the last indexed commit, current `HEAD`, and pending file changes recorded by the extension.
- A stale saved index is still loadable. CodeGraphy should show its saved nodes and edges with a stale warning until reindex completes.
- If `.codegraphy/graph.lbug` is deleted or missing, CodeGraphy treats the index as missing even if old metadata still exists.
- `codegraphy reindex .` and `codegraphy_request_reindex` do not index directly. They focus/open VS Code with `code <repo>`, send a repo-scoped URI to the CodeGraphy extension, then poll `codegraphy_repo_status`-equivalent freshness.
- The extension verifies the URI target matches the workspace in the receiving VS Code window before reindexing. If the wrong window receives the URI, it warns instead of indexing the wrong repo.
- Later Codex sessions can select that repo even if they start from another directory.
- Every MCP query rereads the DB and saved settings from disk, so saved graph changes show up on the next query.
- Short file names are resolved against the saved index on each query. If the name is ambiguous, pass one of the returned candidate repo-relative paths.
- If the repo has no `.codegraphy/graph.lbug`, the MCP returns setup guidance pointing back to the extension.
- If the repo is stale, the VS Code toolbar shows **Reindex Repo** with a warning dot and the button forces a refresh rebuild. A successful full reindex clears pending changed-file markers.
- For noisy refactors, prefer `codegraphy_impact_set` with `kinds` like `["type-import"]` or `["call"]`, and use `direction` to choose incoming dependents, outgoing dependencies, or both.
