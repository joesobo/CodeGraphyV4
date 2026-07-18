# Extension Docs

This folder documents the current `@codegraphy-dev/extension` package.

- `boundaries.md` - package boundaries and ownership
- `graph-cache-lifecycle.md` - Graph Cache startup, sync, plugin changes, and loading-state rules
- `messages.md` - extension/webview message flow
- `plugin-lifecycle.md` - plugin readiness and lifecycle
- `testing.md` - package testing strategy and commands

These docs describe current runtime seams. Task plans and superseded implementation notes do not belong in the repository.

Current extension behavior to keep in mind while reading the package docs:

- core owns the default file and folder icon/color theming through `material-icon-theme`
- Legend Layer precedence is `core defaults -> plugin defaults -> custom Legend Entries`
- Legend controls live in the graph rail's **Themes** panel, grouped as `Custom -> Plugin Defaults -> Material Icon Theme -> Defaults`
- CSS Snippets are built into the extension: workspace-local `.css` files listed in `.codegraphy/settings.json` under `cssSnippets` can style stable `data-codegraphy-*` hooks without rebuilding a VS Code theme
- the language plugins in `packages/plugin-*` are now mostly for ecosystem filters and optional semantic enrichment rather than baseline file coloring

The published CLI supports Node 20 through 22. Local tooling and CI use the repository-pinned Node runtime.

The source tree is split by runtime boundary:

- `src/extension/` - VS Code extension host
- `src/core/` - shared extension-side domain logic
- `src/webview/` - React webview UI and runtime helpers
- `src/shared/` - protocol and shared types used across the host/webview bridge
- `src/e2e/` - end-to-end harness
