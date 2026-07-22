# `@codegraphy-dev/tldraw`

Render a CodeGraphy Workspace as native shapes in tldraw offline.

## Requirements

- macOS
- Node.js 22.12 or newer
- [tldraw offline](https://www.tldraw.com/) installed as a desktop app

## Install

Install Core and the tldraw interface globally:

```sh
npm install --global @codegraphy-dev/core @codegraphy-dev/tldraw
```

## Create or refresh a canvas

Run the launcher from the workspace that you want to index:

```sh
cd /path/to/workspace
codegraphy-tldraw
```

The command indexes the current workspace, creates or refreshes
`CodeGraphy.tldraw` in that workspace, and opens the canvas in tldraw offline.

Pass a relative or absolute `.tldraw` path to use a named canvas:

```sh
codegraphy-tldraw docs/architecture.tldraw
codegraphy-tldraw /path/to/canvases/project.tldraw
```

The document path does not select the indexed workspace. The launcher always
indexes the current working directory.

Run the same command after workspace files change. If the requested document
is open, the launcher updates that canvas in place. If it is closed, the
launcher updates the saved document and opens it. Refresh preserves
user-created notes, drawings, images, and other media. It also preserves
surviving nodes' positions, sizes, and styles.

## Canvas behavior

The document uses native tldraw circles and connectors. File nodes use a stable
cool categorical theme and embedded white Material Icon Theme icons. Orphan
nodes use an 80-unit diameter. Connected nodes grow on a bounded square-root
scale from 110 to 300 units, so ordinary nodes and hubs remain visibly
different without allowing one hub to dominate the canvas.

The persistent document script runs the same WebAssembly force physics as the
CodeGraphy Extension. It derives collision spacing and repel strength from each
circle's visible size. Resizing a node updates both values and restarts the
layout around the new size.

The canvas includes these controls:

| Control | Default | Range |
|---|---:|---:|
| Repel Force | `10` | `0–20` |
| Center Force | `0.10` | `0–1` |
| Link Distance | `80` | `5–100` |
| Link Force | `1.00` | `0–2` |

The controls use the Extension defaults, velocity decay, and force mapping.
Link Distance uses the tldraw canvas's focused `5–100` range. Changes apply to
the active graph immediately and remain saved in the document.
