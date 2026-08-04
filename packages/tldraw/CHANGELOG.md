# @codegraphy-dev/tldraw

## 0.2.2

### Patch Changes

- Updated dependencies [[`1b64e94`](https://github.com/joesobo/CodeGraphyV4/commit/1b64e94e5c85396525458ed9671b66140866d48e)]:
  - @codegraphy-dev/core@5.0.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`1fe4a26`](https://github.com/joesobo/CodeGraphyV4/commit/1fe4a269e7d60cd9ffc6d9004193e086062fe701)]:
  - @codegraphy-dev/core@5.0.1

## 0.2.0

### Minor Changes

- [#326](https://github.com/joesobo/CodeGraphyV4/pull/326) [`c468e11`](https://github.com/joesobo/CodeGraphyV4/commit/c468e117a06f66ae801edef867823ac9b92d005a) Thanks [@joesobo](https://github.com/joesobo)! - Node.js 20 is no longer supported. Upgrade to Node.js `^22.14.0 || >=23.6.0` before
  updating CodeGraphy Core, interfaces, APIs, or plugins. Newer Node.js releases
  remain supported because these packages do not set a maximum version.

  The VS Code extension now requires VS Code 1.101 or newer. Extension users do
  not need to install Node.js separately because VS Code supplies the Extension
  host runtime.

### Patch Changes

- [#326](https://github.com/joesobo/CodeGraphyV4/pull/326) [`7fe3eaa`](https://github.com/joesobo/CodeGraphyV4/commit/7fe3eaa19a856458873f31cfd9b26b3ed4e92dae) Thanks [@joesobo](https://github.com/joesobo)! - Use Tree-sitter's upstream prebuilt runtime on Node.js `^22.14.0 || >=23.6.0`.
  Language analysis is unchanged, and CodeGraphy no longer needs its temporary
  native-build patch.
- Updated dependencies [[`c468e11`](https://github.com/joesobo/CodeGraphyV4/commit/c468e117a06f66ae801edef867823ac9b92d005a), [`7fe3eaa`](https://github.com/joesobo/CodeGraphyV4/commit/7fe3eaa19a856458873f31cfd9b26b3ed4e92dae), [`bb228f1`](https://github.com/joesobo/CodeGraphyV4/commit/bb228f1115c76804330c58e7ab4f9ca18a983faa)]:
  - @codegraphy-dev/core@5.0.0

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
