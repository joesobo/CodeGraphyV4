# @codegraphy/plugin-api

## 2.0.0

### Major Changes

- [#199](https://github.com/joesobo/CodeGraphyV4/pull/199) [`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1) Thanks [@joesobo](https://github.com/joesobo)! - Replace editor-visit access-count sizing with Git history churn sizing. Size by Churn appears after Git history is indexed, graph exports include churn, and graph node metadata no longer exposes accessCount.

## 1.2.0

### Minor Changes

- [#188](https://github.com/joesobo/CodeGraphyV4/pull/188) [`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f) Thanks [@joesobo](https://github.com/joesobo)! - Apply graph scope, structural projection, filters, search, and orphan visibility through one shared visible graph derivation pipeline.

  Core structural nesting edges now use the `nests` edge kind. Namespaced edge kinds remain reserved for plugin-owned relationships.

## 1.1.0

### Minor Changes

- [#176](https://github.com/joesobo/CodeGraphyV4/pull/176) [`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83) Thanks [@joesobo](https://github.com/joesobo)! - Add optional Type imports graph edges for TypeScript type-only imports.

## 1.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20) Thanks [@joesobo](https://github.com/joesobo)! - Remove the legacy `detectConnections(...)` plugin hook and require plugin-contributed analysis to use `analyzeFile(...)` with the shared per-file analysis result shape.

- [#173](https://github.com/joesobo/CodeGraphyV4/pull/173) [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c) Thanks [@joesobo](https://github.com/joesobo)! - Broaden the plugin graph API with shared per-file analysis results, canonical `kind`/`sources` graph contracts, repo-backed graph queries, toolbar action registration, named graph slots, tooltip actions, and scoped custom-view recompute dependencies.

## 0.1.1

### Patch Changes

- Refresh the published extension and plugin package listings with updated README links, package icons, and marketplace metadata.
