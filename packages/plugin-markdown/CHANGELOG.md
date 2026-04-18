# @codegraphy/plugin-markdown

## 1.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`6178a4e`](https://github.com/joesobo/CodeGraphyV4/commit/6178a4ed7127c7e00ff760a43bd68c81f0006fd7) Thanks [@joesobo](https://github.com/joesobo)! - Improve graph filtering with inline filter edits and quick-add prompts from the node context menu.

  Change markdown wikilinks to resolve by workspace-root-relative paths like `[[notes/Guide.md]]` instead of bare note names.

### Patch Changes

- Updated dependencies [[`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955), [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20), [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c)]:
  - @codegraphy-vscode/plugin-api@1.0.0

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @codegraphy-vscode/plugin-api@0.1.1
