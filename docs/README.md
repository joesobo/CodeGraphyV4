# Docs

Use the root [README](../README.md) for the release overview, marketplace links, published plugins, and the V2 to V4 migration story.
The repo-wide local runtime is Node `22.22.0` LTS from [`.nvmrc`](../.nvmrc).

The rest of the docs are split by purpose:

- `docs/COMMANDS.md`, `docs/INTERACTIONS.md`, `docs/KEYBINDINGS.md`, `docs/PHILOSOPHY.md`, `docs/SETTINGS.md`, `docs/TIMELINE.md` - product and user-facing docs
- `docs/plans/` - active task plans and working notes
- `docs/plugin-api/` - plugin contract, lifecycle, and type reference
- `docs/quality/` - quality-tooling docs and commands
- `packages/codegraphy/README.md` - CLI and MCP setup, including `codegraphy status .` and Codex examples
- `packages/plugin-*/README.md` and `packages/plugin-api/README.md` - release-facing package readmes for marketplace and npm
- `packages/extension/docs/` - current extension-package architecture, messages, lifecycle, and testing notes
- `docs/archive/` - historical plans, specs, and superseded guides

If a doc describes old refactor intent instead of current behavior, it belongs in `docs/archive/`.

Historical plans, specs, and superseded guides live under `docs/archive/`.
