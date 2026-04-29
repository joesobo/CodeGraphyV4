# Extension Docs

This folder documents the current `@codegraphy/extension` package.

- `boundaries.md` - package boundaries and ownership
- `messages.md` - extension/webview message flow
- `plugin-lifecycle.md` - plugin readiness and lifecycle
- `testing.md` - package testing strategy and commands

These docs describe the current runtime seams after the graph-view/provider refactor. Historical plans stay in `/docs/archive/`.

Current extension behavior to keep in mind while reading the package docs:

- core owns the default file and folder icon/color theming through `material-icon-theme`
- Legend Layer precedence is `core defaults -> plugin defaults -> custom Legend Entries`
- the node Legend popup is grouped as `Custom -> Plugin Defaults -> Material Icon Theme -> Defaults`
- the language plugins in `packages/plugin-*` are now mostly for ecosystem filters and optional semantic enrichment rather than baseline file coloring

Local tooling and CI are pinned to Node `22.22.0` LTS.

The source tree is split by runtime boundary:

- `src/extension/` - VS Code extension host
- `src/core/` - shared extension-side domain logic
- `src/webview/` - React webview UI and runtime helpers
- `src/shared/` - protocol and shared types used across the host/webview bridge
- `src/e2e/` - end-to-end harness

Older refactor plans and superseded docs live under `/docs/archive/`.
