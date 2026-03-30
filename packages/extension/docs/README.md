# Extension Docs

This folder documents the current `@codegraphy/extension` package.

- `boundaries.md` - package boundaries and ownership
- `messages.md` - extension/webview message flow
- `plugin-lifecycle.md` - plugin readiness and lifecycle
- `testing.md` - package testing strategy and commands

The source tree is split by runtime boundary:

- `src/extension/` - VS Code extension host
- `src/core/` - shared extension-side domain logic
- `src/webview/` - React webview UI and runtime helpers
- `src/shared/` - protocol and shared types used across the host/webview bridge
- `src/e2e/` - end-to-end harness

Older refactor plans and superseded docs live under `/docs/archive/`.
