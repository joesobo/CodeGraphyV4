# CodeGraphy MCP Setup

This is the shortest end-to-end setup for connecting an agent to a repo's saved CodeGraphy index.

## What You Install

- the VS Code [CodeGraphy extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- the npm package `@codegraphy-vscode/mcp`
- the `codegraphy` CLI binary that package installs

The agent does not build the index itself in this MVP. It reads the repo's saved `.codegraphy` data.

## Step By Step

1. Open VS Code.
2. Install the [CodeGraphy extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
3. Open the repo you want to use.
4. Open the CodeGraphy graph.
5. Run CodeGraphy indexing until the repo has:
   - `.codegraphy/graph.lbug`
   - optionally `.codegraphy/settings.json` if you changed graph settings
6. Open a terminal in that repo.
7. Install the MCP package globally:

```bash
npm install -g @codegraphy-vscode/mcp
```

8. Set up the local CodeGraphy MCP entry for Codex:

```bash
codegraphy setup
```

9. Register the current repo with CodeGraphy:

```bash
codegraphy status .
```

10. Verify the repo is known:

```bash
codegraphy list
```

11. Verify Codex sees the MCP:

```bash
codex mcp list
codex mcp get codegraphy --json
```

12. Start a fresh Codex session:

```bash
codex
```

## If Automatic Setup Fails

If `codegraphy setup` cannot add the MCP entry automatically, add it yourself:

```bash
codex mcp add codegraphy -- codegraphy mcp
```

Then rerun:

```bash
codex mcp list
codex mcp get codegraphy --json
```

## Relative Paths

You do not need an absolute repo path when your terminal is already in the repo:

```bash
codegraphy status .
```

Inside the MCP session, the agent can also select `.` with `codegraphy_select_repo`.

## Quick Verification

Use one simple structure question first:

```text
Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.
```

If you want to verify saved CodeGraphy view settings like depth mode, folder nodes, or package nodes:

```text
Use CodeGraphy to show the saved graph view for this repo.
```

If you want to verify the MCP helps with a real change:

```text
Use CodeGraphy to update UserName in types.ts to a FullName object with first and last strings, then fix the affected code.
```

## What The Agent Can Read

The MCP reads:

- file-level and symbol-level relations from `.codegraphy/graph.lbug`
- saved graph settings from `.codegraphy/settings.json`

That means the agent can query:

- file dependencies and dependents
- symbol dependencies and dependents
- impact sets
- direct or bounded relationships
- saved depth/folder/package graph projections through `codegraphy_view_graph`

## What To Expect

- `codegraphy status .` both checks the repo and registers it in `~/.codegraphy/registry.json`
- later Codex sessions can select that repo even if you start from a different directory
- every MCP query rereads the DB and settings from disk, so saved graph changes show up on the next query
- if the repo has no `.codegraphy/graph.lbug`, the MCP returns setup guidance pointing back to the extension
