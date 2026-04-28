# Docs

Use the root [README](../README.md) for the release overview, marketplace links, published plugins, and the V2 to V4 migration story.
The repo-wide local runtime is Node `22.22.0` LTS from [`.nvmrc`](../.nvmrc).

The rest of the docs are split by purpose:

- `docs/COMMANDS.md`, `docs/INTERACTIONS.md`, `docs/KEYBINDINGS.md`, `docs/MCP.md`, `docs/PHILOSOPHY.md`, `docs/SETTINGS.md`, `docs/TIMELINE.md` - product and user-facing docs
- `docs/plans/` - active task plans and working notes
- `docs/plugin-api/` - plugin contract, lifecycle, and type reference
- `docs/quality/` - quality-tooling docs and commands
- `packages/codegraphy-mcp/README.md` - MCP package install, commands, prompts, and saved-view query notes
- `skills/codegraphy-mcp/SKILL.md` - reusable agent skill for using CodeGraphy first on repo-structure and impact questions
- `packages/plugin-*/README.md` and `packages/plugin-api/README.md` - release-facing package readmes for marketplace and npm
- `packages/extension/docs/` - current extension-package architecture, messages, lifecycle, and testing notes
- `docs/archive/` - historical plans, specs, and superseded guides

If a doc describes old refactor intent instead of current behavior, it belongs in `docs/archive/`.

Historical plans, specs, and superseded guides live under `docs/archive/`.

## Public Package Guide

| Package | Where To Start | Role |
|---|---|---|
| CodeGraphy core extension | [root README](../README.md) and [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy) | graph UI, indexing, repo-local cache, settings, exports |
| `@codegraphy-vscode/mcp` | [MCP setup](./MCP.md) and [package README](../packages/codegraphy-mcp/README.md) | `codegraphy` CLI and local MCP server for agents |
| `@codegraphy-vscode/plugin-api` | [plugin API README](../packages/plugin-api/README.md) and [plugin docs](./plugin-api/) | build external CodeGraphy plugins |
| language plugins | `packages/plugin-*/README.md` | optional language-specific graph enrichment |

The extension must be installed and index a repo before the MCP package can answer graph queries for that repo.
