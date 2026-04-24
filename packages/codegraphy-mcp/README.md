# CodeGraphy MCP

`@codegraphy-vscode/mcp` installs the `codegraphy` CLI and local MCP server.

It gives agents read-only access to saved CodeGraphy data from:

- `.codegraphy/graph.lbug`
- `.codegraphy/settings.json`

## Quick Start

```bash
npm install -g @codegraphy-vscode/mcp
codegraphy setup
codegraphy status .
codex mcp list
```

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
| `codegraphy status .` | Checks and registers the current repo |
| `codegraphy status /path/to/repo` | Checks another repo from anywhere |
| `codegraphy mcp` | Starts the local stdio MCP server |

## MCP Tools

| Tool | What It Does |
|---|---|
| `codegraphy_list_repos` | Lists indexed repos |
| `codegraphy_select_repo` | Selects the repo for the session |
| `codegraphy_repo_status` | Checks DB availability and registration |
| `codegraphy_file_dependencies` | Lists outgoing file relationships |
| `codegraphy_file_dependents` | Lists incoming file relationships |
| `codegraphy_symbol_dependencies` | Lists outgoing symbol relationships |
| `codegraphy_symbol_dependents` | Lists incoming symbol relationships |
| `codegraphy_impact_set` | Returns bounded transitive impact |
| `codegraphy_explain_relationship` | Explains how files or symbols connect |
| `codegraphy_view_graph` | Projects the saved depth/folder/package graph view |
| `codegraphy_file_summary` | Summarizes symbols and relation counts for a file |

## Example Prompts

- `Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.`
- `Use CodeGraphy to show the saved graph view for this repo.`
- `Use CodeGraphy to update UserName in types.ts to a FullName object with first and last strings, then fix the affected code.`

## Optional Skill

This repo includes a reusable skill at [skills/codegraphy-mcp/SKILL.md](../../skills/codegraphy-mcp/SKILL.md).

For the full setup guide, step-by-step repo hookup, Codex config snippets, and verification flow, see [docs/MCP.md](../../docs/MCP.md).
