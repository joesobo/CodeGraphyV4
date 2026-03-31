# @codegraphy/extension

## 0.1.1

### Patch Changes

- [#158](https://github.com/joesobo/CodeGraphyV4/pull/158) [`f17e398`](https://github.com/joesobo/CodeGraphyV4/commit/f17e398ddc85e73618cf6f82b0601c09d36b0535) Thanks [@joesobo](https://github.com/joesobo)! - Fix extra graph refreshes while editing custom groups in the settings panel.

- [#160](https://github.com/joesobo/CodeGraphyV4/pull/160) [`b28173f`](https://github.com/joesobo/CodeGraphyV4/commit/b28173fa310097d43e33f94e5a5fc2354217b649) Thanks [@joesobo](https://github.com/joesobo)! - Keep CodeGraphy settings, favorites, and custom groups in sync between VS Code settings and the sidebar UI.

- [#157](https://github.com/joesobo/CodeGraphyV4/pull/157) [`6065f4c`](https://github.com/joesobo/CodeGraphyV4/commit/6065f4c6a1e9d4be385e8cd1849f58ea307ff55a) Thanks [@joesobo](https://github.com/joesobo)! - Fix custom group glob patterns so nested folders like `DIR_NAME/*` and `DIR_NAME/**` are matched correctly.

- [#155](https://github.com/joesobo/CodeGraphyV4/pull/155) [`0fb7950`](https://github.com/joesobo/CodeGraphyV4/commit/0fb7950381c25001cedc822e10e0220683a59ba0) Thanks [@joesobo](https://github.com/joesobo)! - Keep custom group edits in sync between the sidebar and VS Code settings, including debounced updates from `codegraphy.groups`, and fix the activity bar manifest icon so the extension loads cleanly.

- [#156](https://github.com/joesobo/CodeGraphyV4/pull/156) [`dd936e8`](https://github.com/joesobo/CodeGraphyV4/commit/dd936e8916347dd1eaaebee5802e5d74d3652e02) Thanks [@joesobo](https://github.com/joesobo)! - Reduce random and duplicate graph refreshes caused by overlapping watcher, ready, group, and decoration update events.

- [#159](https://github.com/joesobo/CodeGraphyV4/pull/159) [`149d81c`](https://github.com/joesobo/CodeGraphyV4/commit/149d81c6499812c8cce14ad429860dbbff40654f) Thanks [@joesobo](https://github.com/joesobo)! - Keep CodeGraphy sidebar settings in sync with VS Code settings changes, including reopening the view after settings change while hidden, and apply updated graph settings before the next refresh.

- [#156](https://github.com/joesobo/CodeGraphyV4/pull/156) [`55146be`](https://github.com/joesobo/CodeGraphyV4/commit/55146be226c3b663eedab6249f9d08a348d339e0) Thanks [@joesobo](https://github.com/joesobo)! - Prevent duplicate graph refreshes caused by repeated webview startup handshakes.
