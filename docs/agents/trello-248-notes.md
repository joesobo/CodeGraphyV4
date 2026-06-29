# Trello 248 Running Notes

Card: https://trello.com/c/MX5Lkz6C
Title: Create file/folder flows should create nested paths and update the graph consistently

## Environment

- Host confirmed: `Poleskis-Mac-mini.local`
- Worktree confirmed: `/Users/poleski/.codex/worktrees/2914/CodeGraphyV4`
- Branch: `codex/trello-248-nested-create-flow`
- CodeGraphy MCP skill loaded, but MCP tools are not exposed in this session; using source/test discovery fallback.
- TDD skill loaded; using vertical red-green slices.

## Trello Source

Live Trello #248 read on 2026-06-29. Card is in `In Progress`.

Core product goal: supported create entry points should create nested workspace-relative file/folder paths and update the visible Relationship Graph without manual reload or reindex for basic filesystem reflection.

## Audit

Current source-backed behavior before implementation:

| Entry point | Current path |
| --- | --- |
| Background graph context menu -> New File | Webview background entry emits builtin `createFile`; context action posts `CREATE_FILE` with `directory: "."`; extension handles through node-file edit router; provider calls shared `createGraphViewFile`; undo manager executes `CreateFileAction`. |
| Background graph context menu -> New Folder | Same path as New File, but posts `CREATE_FOLDER`; provider executes `CreateFolderAction`. |
| Toolbar/sidebar `New...` create button | `CreateToolbarAction` posts root `CREATE_FILE` / `CREATE_FOLDER` with `directory: "."`; reaches the same extension action layer as graph context menus. |
| Folder-node context menu create file/folder | Folder node entry emits builtin create actions; context action posts selected folder id as `directory`; synthetic `(root)` maps to `"."`; provider normalizes and reaches same create action layer. |
| File-node sibling create | No source-backed file-node sibling create entry found. File-node context menus cover open/reveal/copy/favorite/filter/destructive actions, not sibling creation. |
| Traditional VS Code Explorer create while CodeGraphy is open | `workspace.onDidCreateFiles` calls `refreshWorkspaceFileOperation`, emits `workspace:fileCreated`, and schedules refresh after 500ms. |
| VS Code command palette/save-as/create path flow | Covered if VS Code emits `onDidCreateFiles` and/or filesystem watcher create/change events; save events are also handled by `onDidSaveTextDocument`. |
| External filesystem create while CodeGraphy is open | `createFileSystemWatcher("**/*")` handles create/delete/change and schedules refresh after 500ms. |

Observed contract gaps:

- `CreateFileAction` already creates missing parent directories and removes only those created parents on undo.
- `CreateFolderAction` only calls `workspace.fs.createDirectory` for the final URI; VS Code may create parents recursively, but the action does not track newly-created parent directories for undo and lacks deterministic nested-folder contract coverage.
- Graph-view prompt validation checks only the entered child path before prefixing the selected directory. A safer shared contract should validate the final workspace-relative path before filesystem mutation.
- Watcher coverage exists for VS Code and external creates; folder-only graph correctness depends on rediscovery carrying `directoryPaths` into graph data.
- Core graph construction already supports explicit folder nodes from discovered directories, including empty directories, and structural projection builds Folder nodes plus Nests edges from folder/file paths when Graph Scope enables them.

## Alignment

Checkpoint questions and recommended answers:

1. Should nested file/folder creation be fixed in each UI entry point or in one shared create contract?
   Recommended answer: one shared extension action contract. Background menu, toolbar, and folder-node menu already converge on the same provider/action path.

2. Should folder-only graph updates require a full Graph Cache reindex?
   Recommended answer: no as the default. Existing watcher/incremental refresh rediscovery can carry discovered directories; use full refresh only when incremental matching cannot reconcile a filesystem event.

3. Should this card expand into rename/move/delete consistency?
   Recommended answer: no. Keep scope to create and create-triggered graph refresh; track rename/move/delete separately unless a direct create-path defect requires touching shared watcher code.

Implementation plan:

1. Add a failing deterministic test for nested folder create/undo through `CreateFolderAction`.
2. Add a failing deterministic test for final workspace-relative path validation before create mutation.
3. Add focused routing tests proving graph UI create entry points continue to use the shared provider/action path.
4. Add or extend watcher/refresh tests for nested external create events and directory rediscovery behavior.
5. Implement minimal shared validation/recursive create behavior, then refactor only after tests are green.

## TDD Slices

- Slice 1 RED: `CreateFolderAction` did not remove recursively created parent folders on undo.
- Slice 1 GREEN: `CreateFolderAction` now records missing nested folders before create and removes the empty created chain deepest-first on undo while preserving existing leaf-folder undo behavior.
- Slice 1 targeted test: `npx -y pnpm@10.32.0 --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/actions/createFolder.test.ts`
- Slice 2 RED: create actions accepted unsafe final workspace-relative paths and graph-view prompt paths preserved accidental surrounding spaces.
- Slice 2 GREEN: `CreateFileAction` and `CreateFolderAction` now share `resolveWorkspaceCreatePath`; graph-view create prompts trim before dispatching to the shared create path.
- Slice 2 targeted test: `npx -y pnpm@10.32.0 --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/actions/createPath.test.ts tests/extension/actions/createFile.test.ts tests/extension/actions/createFolder.test.ts tests/extension/graphView/files/actions.test.ts`
- Slice 3 coverage: nested external/Explorer file and folder create paths are passed to `refreshChangedFiles`; newly created folder paths do not reuse stale discovery and therefore trigger rediscovery for directory graph state.
- Slice 3 targeted test: `npx -y pnpm@10.32.0 --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/workspaceFiles/refresh/operations.test.ts tests/extension/pipeline/service/refresh/discovery/changed.test.ts`
- Slice 4 RED from real Extension Development Host smoke: external creation of `src/core/` followed by `src/core/menuCreated.ts` could refresh the graph with only the folder node and miss the child file.
- Slice 4 GREEN: create file operation refreshes now schedule a follow-up changed-file refresh, catching descendants created just after a folder event without relying on a stale Graph Cache replay.
- Slice 4 targeted test: `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/workspaceFiles/refresh/operations.test.ts tests/extension/workspaceFiles/refresh/scheduler.test.ts tests/extension/workspaceFiles/refresh/watchers.test.ts`

## PR And Trello Updates

- Commit `454c05547` records the pre-implementation audit/alignment notes.
- Draft PR opened: https://github.com/joesobo/CodeGraphyV4/pull/298
- Trello progress comment posted: `6a42de49ce748dec0c8e251e`

## Verification

- `pnpm run lint` passed.
- `pnpm run typecheck` passed.
- `pnpm run test` passed, including 119/119 VS Code Playwright acceptance tests.
- `pnpm run build` passed.
- `pnpm --filter @codegraphy-dev/extension run build:vscode` passed after the watcher fix.
- Real Mac Mini Extension Development Host smoke ran against a fresh temp workspace with no starting Graph Cache:
  - Opened CodeGraphy graph view.
  - Verified initial `src/index.ts` graph node.
  - Created `src/core/menuCreated.ts` externally while CodeGraphy was open and verified the file node after watcher refresh.
  - Derived the visible graph with Folder nodes and Nests edges enabled; verified `src -> src/core -> src/core/menuCreated.ts`.
  - Created `src/features/generated` and verified folder nodes plus `src -> src/features -> src/features/generated` Nests edges.
  - Created `src/external/watcherCreated.ts` externally while CodeGraphy was open and verified the file node, folder node, and Nests edge.
  - PASS summary: `fileCreated=true`, `folderCreated=true`, `externalCreated=true`, raw graph `nodeCount=6`, visible graph `visibleNodeCount=10`, `visibleEdgeCount=9`.
  - Note: the temporary smoke wrapper printed PASS from inside the Extension Development Host, then required Ctrl+C to stop the `@vscode/test-electron` wrapper after the VS Code host had exited.
