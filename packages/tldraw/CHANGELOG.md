# @codegraphy-dev/tldraw

## 0.1.1

### Patch Changes

- [#321](https://github.com/joesobo/CodeGraphyV4/pull/321) [`cd5c766`](https://github.com/joesobo/CodeGraphyV4/commit/cd5c7661a73f5b720bbbd54c5ede97152cb0da4a) Thanks [@joesobo](https://github.com/joesobo)! - Stop the tldraw launcher from printing Node's Lua grammar package deprecation warning while it indexes a workspace.

- Updated dependencies [[`6c72b74`](https://github.com/joesobo/CodeGraphyV4/commit/6c72b74692e653450a537d4a05fe856f99a73b26), [`cd5c766`](https://github.com/joesobo/CodeGraphyV4/commit/cd5c7661a73f5b720bbbd54c5ede97152cb0da4a)]:
  - @codegraphy-dev/core@4.0.1

## 0.1.0

### Minor Changes

- [#316](https://github.com/joesobo/CodeGraphyV4/pull/316) [`b4f0ae8`](https://github.com/joesobo/CodeGraphyV4/commit/b4f0ae8f65a45adb5223f0f244176e14fb9a3815) Thanks [@joesobo](https://github.com/joesobo)! - Add the macOS `codegraphy-tldraw` launcher. Run it in a workspace to index the
  project and open its file graph as native tldraw circles, connectors, icons, and
  labels. File types use a stable color palette, and highly connected files appear
  larger than files with few or no connections. Generated circles, connectors,
  and text use tldraw's Draw style.

  Running the launcher without a path creates or refreshes the workspace's
  `CodeGraphy.tldraw`. Pass a `.tldraw` path to create or refresh that document
  instead.

- [#316](https://github.com/joesobo/CodeGraphyV4/pull/316) [`32f16bf`](https://github.com/joesobo/CodeGraphyV4/commit/32f16bf4a6d0e3d06203bc2e50ec9ca3bb593f43) Thanks [@joesobo](https://github.com/joesobo)! - Double-click a generated node to inspect its file path, file type, connection
  counts, and incoming and outgoing relationships. The reusable inspector stays
  below tldraw's style controls, updates when another node is opened, and closes
  when the canvas is cleared.

- [#316](https://github.com/joesobo/CodeGraphyV4/pull/316) [`b0be906`](https://github.com/joesobo/CodeGraphyV4/commit/b0be906f58c265ccb66fb6b54998525429c90acb) Thanks [@joesobo](https://github.com/joesobo)! - Refresh an open tldraw graph in place after workspace changes. CodeGraphy keeps
  user notes, drawings, images, other media, surviving node positions, manual node
  sizes, and custom styles while it updates generated graph content.

  Reject unsupported tldraw documents before replacing them, so a refresh cannot
  silently discard an incompatible canvas.

- [#316](https://github.com/joesobo/CodeGraphyV4/pull/316) [`0020d45`](https://github.com/joesobo/CodeGraphyV4/commit/0020d45250001eb8de037342322f1c258d185e04) Thanks [@joesobo](https://github.com/joesobo)! - Search generated tldraw graphs by file path from a new canvas search bar.
  CodeGraphy shows matching nodes and their connections, runs force physics on
  the filtered graph, and fits the camera to the results. Search terms support
  `*` wildcards such as `*.ts`. Clear the search to restore the complete graph
  without changing the saved document.

- [#316](https://github.com/joesobo/CodeGraphyV4/pull/316) [`b0be906`](https://github.com/joesobo/CodeGraphyV4/commit/b0be906f58c265ccb66fb6b54998525429c90acb) Thanks [@joesobo](https://github.com/joesobo)! - Add an interactive force-directed layout to generated tldraw graphs. Dragging a
  node now pulls its connected neighbors through the graph, and the layout settles
  without overlapping nodes.

  Use the four canvas controls to adjust repel force, center force, link distance,
  and link force while the graph is open. Resizing a node also updates its
  collision spacing and repel strength, so manually sized nodes remain part of the
  same stable layout.

  Keep larger canvases responsive while they settle by sending tldraw only the
  node movement that is large enough to display and the connected shapes that
  must move with it.

### Patch Changes

- Updated dependencies [[`7ecf8fd`](https://github.com/joesobo/CodeGraphyV4/commit/7ecf8fd0488aa7dcf0dc84e512de19f83ab323f2), [`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa)]:
  - @codegraphy-dev/core@4.0.0
