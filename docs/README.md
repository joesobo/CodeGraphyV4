# Docs

Use the root [README](../README.md) for the release overview, marketplace links, package map, and the V2 to V4 migration story.
Published packages support Node 20 and newer. The repo-wide local runtime is Node `22.22.0` LTS from [`.nvmrc`](../.nvmrc).

The rest of the docs are split by purpose:

- `docs/COMMANDS.md`, `docs/INTERACTIONS.md`, `docs/KEYBINDINGS.md`, `docs/MCP.md`, `docs/PHILOSOPHY.md`, `docs/SETTINGS.md` - product and user-facing docs
- `docs/plans/` - active task plans and working notes
- `docs/plugin-api/` - plugin contract, lifecycle, and type reference
- `docs/quality/` - quality-tooling docs and commands
- `packages/mcp/README.md` - MCP package install, commands, prompts, and saved-view query notes
- `packages/graph-renderer/README.md` - custom WebGPU renderer and WebAssembly physics package usage and support contract
- `skills/codegraphy-mcp/SKILL.md` - reusable agent skill for using CodeGraphy first on repo-structure and impact questions
- `packages/plugin-*/README.md` and `packages/plugin-api/README.md` - release-facing package readmes for npm plugin packages and the Plugin API
- `packages/extension/docs/` - current extension-package architecture, messages, lifecycle, and testing notes
- `docs/archive/` - historical plans, specs, and superseded guides

If a doc describes old refactor intent instead of current behavior, it belongs in `docs/archive/`.

## Public Package Guide

| Package | Path | Where To Start | Role |
|---|---|---|
| `@codegraphy-dev/core` | `packages/core` | [root README](../README.md) and [core package README](../packages/core/README.md) | shared engine package for Indexing, Graph Cache access, and Graph Query execution |
| CodeGraphy VS Code extension | `packages/extension` | [root README](../README.md), [extension docs](../packages/extension/docs/README.md), and [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy) | graph UI, VS Code lifecycle integration, commands, webviews, context menus, and editor integration |
| `@codegraphy-dev/graph-renderer` | `packages/graph-renderer` | [package README](../packages/graph-renderer/README.md) | custom WebGPU graph drawing and deterministic WebAssembly physics/layout |
| `@codegraphy-dev/mcp` | `packages/mcp` | [MCP setup](./MCP.md) and [package README](../packages/mcp/README.md) | Optional agent-agnostic local MCP server backed by core |
| `@codegraphy-dev/plugin-api` | `packages/plugin-api` | [plugin API README](../packages/plugin-api/README.md) and [plugin docs](./plugin-api/) | typed contracts for external CodeGraphy plugins |
| language plugins | `packages/plugin-*` | `packages/plugin-*/README.md` | optional headless npm plugins for language- and framework-specific graph enrichment on top of core analysis |
| quality tools | external `@poleski/quality-tools` package | [quality docs](./quality/README.md) | local architecture, coverage-risk, mutation, and SCRAP checks |

`@codegraphy-dev/core`, the VS Code extension, and `@codegraphy-dev/mcp` all read and write the same workspace-local Graph Cache. MCP can index/query a CodeGraphy Workspace without opening or focusing VS Code.

## Internal Package Orientation

The monorepo package boundary is the main way to navigate the project:

- `packages/core` owns Indexing, File Discovery, Tree-sitter Analysis, plugin analysis, Graph Cache storage, and Graph Query execution.
- `packages/extension` owns the VS Code host, React webview, editor lifecycle, commands, graph UI/settings/persistence, and product integration over core and the renderer.
- `packages/graph-renderer` owns custom WebGPU graph drawing and deterministic WebAssembly physics/layout; it does not own CodeGraphy UI, settings, persistence, or plugin orchestration.
- `packages/mcp` owns agent access and forwards path-first Indexing and Graph Query requests to `@codegraphy-dev/core`.
- `packages/plugin-api` owns the public TypeScript contracts for plugins.
- `packages/plugin-*` packages are optional headless npm language plugins.
- `@poleski/quality-tools` owns the reusable checks that keep modules deep, package boundaries visible, and high-risk code covered.
