# Plugin Lifecycle

Plugins move through three broad phases:

1. registration
2. initialization and readiness replay
3. runtime message delivery

## Registration

External plugins are registered through the graph view provider and forwarded into the plugin registry. Registration may happen before the workspace is fully ready.

## Readiness

Readiness matters in two places:

- workspace readiness, which controls when plugins receive initial analysis state
- webview readiness, which controls when webview-side plugin APIs can safely receive messages

The provider keeps these states separate and uses a single `_webviewReadyNotified` seam across the host bridge so late-registered plugins can still replay the correct lifecycle events without hidden instance mutation.

## Runtime delivery

Once both sides are ready, the host can:

- send plugin statuses
- send context menu items
- send decorations
- send plugin webview injections

## What to preserve

- Keep readiness state explicit and testable.
- Keep plugin initialization replay-safe.
- Avoid hiding lifecycle transitions behind shared mutable globals.
