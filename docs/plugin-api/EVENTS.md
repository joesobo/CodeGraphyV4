# Extension plugin events

Plugin events belong to the VS Code Extension host. They are not part of the
Core Plugin API.

Import the event types from the Extension Plugin API:

```ts
import type {
  EventName,
  EventPayloads,
} from '@codegraphy-dev/extension-plugin-api/events';
```

The canonical contracts are in
[`packages/extension-plugin-api/src/events.ts`](../../packages/extension-plugin-api/src/events.ts).

Core plugins receive analysis lifecycle hooks directly. They do not subscribe
to Extension or webview events.
