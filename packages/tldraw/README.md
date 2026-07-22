# `@codegraphy-dev/tldraw`

Render a CodeGraphy workspace as native shapes in tldraw offline.

Install Node.js 22.12 or newer, Core, this interface package, and the tldraw offline desktop app. Run the launcher from the workspace that you want to index:

```sh
npm install --global @codegraphy-dev/core @codegraphy-dev/tldraw
codegraphy-tldraw
```

Without a path, the launcher creates or refreshes `CodeGraphy.tldraw` in the current workspace and opens it.

Give a path to create or refresh a specific document:

```sh
codegraphy-tldraw architecture.tldraw
```

Each run indexes the current workspace through `@codegraphy-dev/core`. The document uses native tldraw circles and connectors. File nodes use a cool categorical theme and the same white Material Icon Theme file icons as the Extension. The icons are embedded in the document for offline use. The persistent document script runs the same WebAssembly force physics as the CodeGraphy Extension and uses each circle's rendered size for collision spacing.

The canvas includes Repel Force, Center Force, Link Distance, and Link Force sliders. Repel Force starts at `10`, Center Force at `0.10`, Link Distance at `80`, and Link Force at `1.00`. The controls use the same ranges and force mapping as the Extension, and velocity decay remains `0.4`. Changes apply to the active graph immediately and remain saved in the tldraw document.

When the requested file is already open, the launcher uses tldraw offline's authenticated local API to update that live canvas. A closed file is reconciled on disk before it opens. CodeGraphy-owned graph shapes use stable identities, so refresh preserves surviving node positions and leaves user-created notes and drawings unchanged.
