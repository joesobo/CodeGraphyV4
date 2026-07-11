# Plugin activation

CodeGraphy decides whether to import a plugin from its static `codegraphy.json` metadata. This keeps package code out of extension startup and avoids importing language runtimes that cannot contribute to the current workspace.

- A plugin with one or more `supportedExtensions` activates on the first graph event only when the workspace contains a matching file.
- `supportedExtensions: ["*"]` activates on a graph event for every workspace.
- An empty `supportedExtensions` array declares a graph-event plugin whose contributions are not tied to a file type.
- Disabled, incompatible, conflicting, and irrelevant packages are rejected before their entry module is imported.

Every imported package emits `pluginActivationMs` with its plugin ID as the metric dimension. `pnpm perf` retains these values in `metrics.pluginActivationMs`; first-party plugins have a 50 ms activation budget.

Heavy parsers and compilers should live behind a dynamic import in `analyzeFile`. The Svelte, TypeScript, and Vue plugins use ESM code splitting so their lightweight manifest/contribution entry activates immediately and their compiler runtime loads only when analysis begins.
