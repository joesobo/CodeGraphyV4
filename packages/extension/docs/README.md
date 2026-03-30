# Extension Docs

This folder documents the `@codegraphy/extension` package as it exists now.

- `boundaries.md` - package boundaries and ownership
- `messages.md` - extension/webview message flow
- `plugin-lifecycle.md` - plugin readiness and lifecycle
- `testing.md` - package testing strategy and commands

The source tree is split by runtime boundary:

- `src/extension/` - VS Code extension host
- `src/core/` - shared extension-side domain logic
- `src/webview/` - React webview UI and runtime helpers
- `src/shared/` - protocol and shared types
- `src/e2e/` - end-to-end harness
