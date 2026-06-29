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

Pending first RED.

## PR And Trello Updates

Pending.

## Verification

Pending.
