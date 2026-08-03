# Plugin Lifecycle

Plugins move through three broad phases:

1. registration
2. initialization and readiness replay
3. runtime message delivery

## Registration

The Graph View provider registers external plugins and forwards them to the plugin registry. Registration can happen before the workspace is ready.

## Readiness

Readiness matters in two places:

- workspace readiness, which controls when plugins receive initial analysis state
- webview readiness, which controls when webview-side plugin APIs can safely receive messages

The provider keeps these states separate and uses a single `_webviewReadyNotified` seam across the host bridge so late-registered plugins can still replay the correct lifecycle events without hidden instance mutation.

## Runtime delivery

Once both sides are ready, the host can:

- send plugin statuses
- send graph controls
- send context menu items
- send decorations
- send plugin webview injections

## Graph Cache impact

Plugin lifecycle changes update settings and projected state without implicitly processing workspace source files.

- Enabling a package plugin updates workspace settings, reloads workspace plugins, and refreshes plugin/control state. Plugin analysis runs on the next explicit Index or Re-index Workspace action.
- Disabling a package plugin updates workspace settings and reloads workspace plugins, but keeps plugin-owned data in the Graph Cache. Disabled or unregistered plugin contributions are filtered from the **Visible Graph** at projection time.
- Registering an external plugin after startup initializes the plugin and replays readiness when needed. It does not authorize background Indexing.
- None of these paths should clear the Graph Cache as their first step.

## What to preserve

- Keep readiness state explicit and testable.
- Keep plugin initialization replay-safe.
- Avoid hiding lifecycle transitions behind shared mutable globals.
- Keep source processing behind explicit Index or Re-index Workspace actions.
