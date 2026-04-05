# @codegraphy/extension

## 4.1.2

### Patch Changes

- [#165](https://github.com/joesobo/CodeGraphyV4/pull/165) [`e857a22`](https://github.com/joesobo/CodeGraphyV4/commit/e857a22622c8998217552ed96cdc309f9b264f82) Thanks [@joesobo](https://github.com/joesobo)! - Load installed CodeGraphy plugins before the first graph analysis so external plugins, sources, and timeline connections are available as soon as the sidebar opens.

## 4.1.1

### Patch Changes

- [#164](https://github.com/joesobo/CodeGraphyV4/pull/164) [`24bef90`](https://github.com/joesobo/CodeGraphyV4/commit/24bef90cdc5fb8a4b70254c0fa8b4423e7fc4545) Thanks [@joesobo](https://github.com/joesobo)! - Fix the published core extension package so the Graph and Timeline sidebar views ship the latest bundled UI instead of stale build output.

## 4.1.0

### Minor Changes

- [#161](https://github.com/joesobo/CodeGraphyV4/pull/161) [`83e6eaf`](https://github.com/joesobo/CodeGraphyV4/commit/83e6eafd80da1e38ddf1025f485ee2214072e395) Thanks [@joesobo](https://github.com/joesobo)! - Split the CodeGraphy sidebar into separate Graph and Timeline views, move the graph controls into a vertical toolbar so they stay usable in narrow sidebars, keep both views stable when the sidebar is collapsed or expanded, and turn the Timeline view into a richer playback panel with current commit details, transport controls, and a compact commit list.

### Patch Changes

- [#163](https://github.com/joesobo/CodeGraphyV4/pull/163) [`641db10`](https://github.com/joesobo/CodeGraphyV4/commit/641db106f062c014b95a86daf3a1fbf20931648c) Thanks [@joesobo](https://github.com/joesobo)! - Fix custom group editing in the sidebar so new groups, toggles, and edits update immediately instead of lagging behind VS Code settings.

## 4.0.2

### Patch Changes

- [#158](https://github.com/joesobo/CodeGraphyV4/pull/158) [`f17e398`](https://github.com/joesobo/CodeGraphyV4/commit/f17e398ddc85e73618cf6f82b0601c09d36b0535) Thanks [@joesobo](https://github.com/joesobo)! - Fix extra graph refreshes while editing custom groups in the settings panel.

- [#160](https://github.com/joesobo/CodeGraphyV4/pull/160) [`b28173f`](https://github.com/joesobo/CodeGraphyV4/commit/b28173fa310097d43e33f94e5a5fc2354217b649) Thanks [@joesobo](https://github.com/joesobo)! - Keep CodeGraphy settings, favorites, and custom groups in sync between VS Code settings and the sidebar UI.

- [#157](https://github.com/joesobo/CodeGraphyV4/pull/157) [`6065f4c`](https://github.com/joesobo/CodeGraphyV4/commit/6065f4c6a1e9d4be385e8cd1849f58ea307ff55a) Thanks [@joesobo](https://github.com/joesobo)! - Fix custom group glob patterns so nested folders like `DIR_NAME/*` and `DIR_NAME/**` are matched correctly.

- [#155](https://github.com/joesobo/CodeGraphyV4/pull/155) [`0fb7950`](https://github.com/joesobo/CodeGraphyV4/commit/0fb7950381c25001cedc822e10e0220683a59ba0) Thanks [@joesobo](https://github.com/joesobo)! - Keep custom group edits in sync between the sidebar and VS Code settings, including debounced updates from `codegraphy.groups`, and fix the activity bar manifest icon so the extension loads cleanly.

- [#156](https://github.com/joesobo/CodeGraphyV4/pull/156) [`dd936e8`](https://github.com/joesobo/CodeGraphyV4/commit/dd936e8916347dd1eaaebee5802e5d74d3652e02) Thanks [@joesobo](https://github.com/joesobo)! - Reduce random and duplicate graph refreshes caused by overlapping watcher, ready, group, and decoration update events.

- [#159](https://github.com/joesobo/CodeGraphyV4/pull/159) [`149d81c`](https://github.com/joesobo/CodeGraphyV4/commit/149d81c6499812c8cce14ad429860dbbff40654f) Thanks [@joesobo](https://github.com/joesobo)! - Keep CodeGraphy sidebar settings in sync with VS Code settings changes, including reopening the view after settings change while hidden, and apply updated graph settings before the next refresh.

- [#156](https://github.com/joesobo/CodeGraphyV4/pull/156) [`55146be`](https://github.com/joesobo/CodeGraphyV4/commit/55146be226c3b663eedab6249f9d08a348d339e0) Thanks [@joesobo](https://github.com/joesobo)! - Prevent duplicate graph refreshes caused by repeated webview startup handshakes.
