# Documentation

Start with the root [README](../README.md) for installation, the product overview, CLI access, and the package map.

## Product Reference

| Document | Covers |
|---|---|
| [Settings](./SETTINGS.md) | `.codegraphy/settings.json`, Graph Scope, Display, Forces, Performance, CSS Snippets, and workspace state. |
| [Interactions](./INTERACTIONS.md) | Node, Graph Stage, minimap, context menu, tool rail, panel, and export behavior. |
| [Commands](./COMMANDS.md) | VS Code Command Palette commands and IDs. |
| [Keyboard Shortcuts](./KEYBINDINGS.md) | Default shortcuts and `when` contexts. |
| [Verbose Diagnostics](./DIAGNOSTICS.md) | Extension and CLI support logging. |
| [Plugin Guide](./PLUGINS.md) | Plugin packaging, registration, enablement, analysis, and Graph View contributions. |
| [Philosophy](./PHILOSOPHY.md) | The product idea and design principles. |

The root [domain glossary](../CONTEXT.md) defines shared CodeGraphy language. The ADRs under [`docs/adr/`](./adr/) record durable technical decisions.

## Developer Reference

| Area | Where to start |
|---|---|
| Core engine and CLI | [`packages/core/README.md`](../packages/core/README.md) |
| VS Code extension | [`packages/extension/docs/README.md`](../packages/extension/docs/README.md) |
| Graph renderer | [`packages/graph-renderer/README.md`](../packages/graph-renderer/README.md) |
| Plugin APIs | [`packages/plugin-api/README.md`](../packages/plugin-api/README.md), [`packages/extension-plugin-api/README.md`](../packages/extension-plugin-api/README.md), and [`docs/plugin-api/`](./plugin-api/) |
| Language and feature plugins | `packages/plugin-*/README.md` |
| Example workspaces | [`examples/README.md`](../examples/README.md) |
| Quality tools | [`docs/quality/README.md`](./quality/README.md) |
| Releases | [`docs/RELEASING.md`](./RELEASING.md) |
| Contribution workflow | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |

## Documentation Policy

- Describe current behavior in the closest product, package, or developer reference.
- Record a durable technical decision as an ADR.
- Keep implementation plans, investigation notes, and handoffs in the task, Trello card, or PR. Do not commit plan documents.
- Use package changelogs for shipped release history. Do not keep a second documentation archive.
- Remove superseded guidance instead of labeling it historical and leaving it in the main navigation.
