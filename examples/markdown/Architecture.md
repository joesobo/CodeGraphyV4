# Architecture

CodeGraphy has two independent build targets that communicate via `postMessage`.

## Extension Host

- Written in [[TypeScript]]
- Compiled by esbuild as a CommonJS Node.js bundle
- Runs plugin analysis and sends graph data to the webview

## Webview

- A [[React]] app compiled by Vite
- Renders the force graph using vis-network / react-force-graph
- Sends user actions back to the extension host

## Plugin System

Plugins implement a common interface to detect connections in files.
[[JavaScript]] and [[TypeScript]] files use an AST-based detector.
Markdown files use [[wikilink]] detection (this very vault is an example).

## See Also

- [[Tooling]] — the build tools used
- [[Home]] — back to the index
