# codegraphy-godot

## 2.1.0

### Minor Changes

- [#183](https://github.com/joesobo/CodeGraphyV4/pull/183) [`8ce9a34`](https://github.com/joesobo/CodeGraphyV4/commit/8ce9a34ced0bedf5363cdc7a33a8da96424ca7fb) Thanks [@joesobo](https://github.com/joesobo)! - Analyze `.tscn` and `.tres` Godot text-resource files and add graph connections for their external resource references.

## 2.0.1

### Patch Changes

- Updated dependencies [[`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83)]:
  - @codegraphy-vscode/plugin-api@1.1.0

## 2.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

### Patch Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`0334085`](https://github.com/joesobo/CodeGraphyV4/commit/03340858e4365b953053b44493172cddb635fbf9) Thanks [@joesobo](https://github.com/joesobo)! - Fix nested example workspace indexing so Python, Go, Java, Rust, and Godot file connections resolve when opening the repo-level `examples` folder.

- Updated dependencies [[`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955), [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20), [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c)]:
  - @codegraphy-vscode/plugin-api@1.0.0

## 1.0.1

### Patch Changes

- Fix companion extension activation so the core graph refreshes when language plugins register and their connections appear reliably.

- Refresh the published extension and plugin package listings with updated README links, package icons, and marketplace metadata.

- Updated dependencies []:
  - @codegraphy-vscode/plugin-api@0.1.1
