# Plugin Lifecycle

Plugins move through three broad phases:

1. registration
2. initialization and readiness replay
3. runtime message delivery

## Registration

External plugins are registered through the Graph View provider and forwarded into the plugin registry. Registration may happen before the workspace is fully ready.

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

Plugin lifecycle changes should sync graph data without hiding the current **Visible Graph**.

- Enabling a package plugin updates workspace settings, reloads workspace plugins, refreshes plugin/control state, and reprocesses files owned by that plugin.
- Disabling a package plugin updates workspace settings and reloads workspace plugins, but keeps plugin-owned data in the Graph Cache. Disabled or unregistered plugin contributions are filtered from the **Visible Graph** at projection time.
- Registering an external plugin after startup initializes the plugin, replays readiness when needed, and reprocesses plugin-owned files.
- None of these paths should clear the Graph Cache as their first step.

## What to preserve

- Keep readiness state explicit and testable.
- Keep plugin initialization replay-safe.
- Avoid hiding lifecycle transitions behind shared mutable globals.
- Keep plugin changes as Graph Cache Sync work after a graph has already rendered.
