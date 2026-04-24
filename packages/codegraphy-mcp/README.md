# CodeGraphy MCP

`@codegraphy-vscode/mcp` installs the `codegraphy` CLI.

It gives agents a local MCP server that reads saved CodeGraphy data from:

- `.codegraphy/graph.lbug`
- `.codegraphy/settings.json`

The MCP is read-only in this MVP. The VS Code extension still creates and updates the index.

## Install

```bash
npm install -g @codegraphy-vscode/mcp
codegraphy setup
```

If `codegraphy setup` cannot add the MCP automatically, add it manually:

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

## Setup A Repo

1. Open VS Code.
2. Install the [CodeGraphy extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
3. Open the repo you want to use with the MCP.
4. Run CodeGraphy indexing until the repo has `.codegraphy/graph.lbug`.
5. Open a terminal in that repo.
6. Install the npm package globally:

```bash
npm install -g @codegraphy-vscode/mcp
```

7. Run:

```bash
codegraphy setup
codegraphy status .
```

8. Verify Codex sees the MCP:

```bash
codex mcp list
codex mcp get codegraphy --json
```

9. Start a fresh Codex session and ask a short CodeGraphy question.

The first successful `codegraphy status` call also registers that repo in `~/.codegraphy/registry.json`, so later MCP sessions can select it without `cd`-ing into the repo first.

## Example Prompts

- `Use CodeGraphy to explain the relationship between src/a.ts and src/b.ts.`
- `Use CodeGraphy to show the saved graph view for this repo.`
- `Use CodeGraphy to update UserName in types.ts to a FullName object with first and last strings, then fix the affected code.`

## View-Aware Queries

`codegraphy_view_graph` projects a CodeGraphy-style view from the saved index plus `.codegraphy/settings.json`.

Use it when the agent needs the saved:

- depth mode slice
- folder nodes
- package nodes
- structural `codegraphy:nests` edges

## Notes

- Relative repo paths work. From a repo root, `codegraphy status .` is the shortest setup flow.
- If a repo has no `.codegraphy/graph.lbug`, the MCP returns setup guidance pointing back to the core extension.
- Queries reread the DB and saved settings from disk on each call, so later saved graph changes show up on the next query.
- The full step-by-step setup guide lives in [docs/MCP.md](../../docs/MCP.md).
