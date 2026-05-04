# Issue 128: Create New Folder from Folder Node Context

Trello: https://trello.com/c/GOvvj15w/128-create-new-folder-when-folder-nodes-active-in-context-window

## Setup

- Worktree: `/Users/poleski/Desktop/Projects/CodeGraphyV4-issue-128-context-window`
- Branch: `codex/issue-128-context-window-folder-create`
- Base: `origin/main` at `b5da9f2c release`
- Trello state: `Core` label, In Progress list, no card description, comments, or checklist.
- Domain docs: `CONTEXT.md` defines `Folder Node`, `Context Selection`, `Graph Context Menu`, `Graph View`, `Graph Scope`, `Graph Cache`, and `Graph Query`.
- Term decision: `Graph Context Menu` is the right-click menu opened from a `Context Selection`; avoid `Context Window` unless the product adds a persistent panel or window.
- CodeGraphy MCP note: the new worktree has no Graph Cache yet, so setup research used source inspection after checking MCP repo status.

## Accepted Decisions

- Use `Graph Context Menu` for the user-facing right-click menu.
- Use `Context Selection` for the underlying graph target or targets that opened the menu.
- Avoid `Context Window` for this behavior because there is not a persistent panel or window.
- When exactly one Folder Node opens the Graph Context Menu, show both `New File...` and `New Folder...`.
- Folder Node child creation actions target the selected folder, while the background `New File...` action remains root-level creation.
- A newly created empty folder should become visible as a Folder Node after refresh or reindex when Folder Nodes are active.
- File Node menus should not offer child creation actions for this card.
- Use an explicit Graph Context Menu decision model for menu action availability only; do not move right-click selection mechanics into that model.
- Mutation actions such as `New File...` and `New Folder...` should stay enabled for the default Graph Revision, including current `HEAD` plus working tree state.
- Mutation actions should be disabled, not hidden, when the Graph Context Menu is opened from a historical Timeline Snapshot.
- Undo for `New Folder...` should move the created folder to trash only while the folder is still empty.

## Current Behavior

- The background context menu includes `New File...` in the live Graph View.
- The node context menu does not include file or folder creation actions.
- `createFile` context effects always send `CREATE_FILE` with `directory: "."`.
- The webview context menu model passes raw target ids, not node type or target classification.
- File-oriented node menu labels are built from ids alone: `Open File`, `Rename...`, and `Delete File`.
- Package nodes are suppressed in some webview menu paths by checking the `pkg:` prefix; Folder Nodes are not classified there.
- Extension-side primary actions defensively block opening Folder Nodes and Package nodes.
- Folder Nodes are structural projections from file paths. Empty filesystem folders do not appear to be represented as Folder Nodes unless another path creates a file node under them.

## Source Surface

- Webview context menu contracts: `packages/extension/src/webview/components/graph/contextMenu/contracts.ts`
- Context menu entry builders: `packages/extension/src/webview/components/graph/contextMenu/build/`
- Node menu entries: `packages/extension/src/webview/components/graph/contextMenu/node/`
- Context action effects: `packages/extension/src/webview/components/graph/contextActions/`
- Context menu runtime: `packages/extension/src/webview/components/graph/contextMenuRuntime/`
- Interaction bridge: `packages/extension/src/webview/components/graph/runtime/use/interaction.ts`
- Webview protocol: `packages/extension/src/shared/protocol/webviewToExtension.ts`
- Extension message routing: `packages/extension/src/extension/graphView/webview/nodeFile/edit.ts`
- Graph View primary actions: `packages/extension/src/extension/graphView/webview/providerMessages/primaryActions.ts`
- File creation action path: `packages/extension/src/extension/graphView/files/actions.ts`
- Existing create-file primitive: `packages/extension/src/extension/actions/createFile.ts`
- Folder node projection: `packages/extension/src/shared/graphControls/nests/folders.ts`
- Visible graph structural projection: `packages/extension/src/shared/visibleGraph/structure.ts`

## Architecture Deepening Candidates

1. Deepen the context target model.

   Problem: `GraphContextSelection` only carries `kind`, `targets`, and optional `edgeId`. It does not carry target node type, target role, parent directory, or action affordances.

   Why it matters: Folder-specific behavior currently has to be inferred later from raw ids or guarded after the user has already seen an action. That keeps the Module shallow and makes Context Selection less useful as a product concept.

   Direction to explore: make Context Selection own enough meaning to answer "what is this target?" before menu entries and effects are built.

2. Make built-in context actions target-aware.

   Problem: built-in actions receive raw target paths, and `createFile` ignores them by hardcoding root directory creation.

   Why it matters: `New File...`, `New Folder...`, rename, delete, and plugin actions all need slightly different target resolution rules. The current Interface has low Leverage because every new action must rediscover context rules.

   Direction to explore: route actions through a resolved action context rather than a list of ids.

3. Move action availability into the webview context menu model.

   Problem: the webview can present file-oriented labels for non-file nodes, while extension handlers later block unsafe actions.

   Why it matters: defensive extension guards are still useful, but the product behavior should be decided close to the menu the user sees. That improves Locality for labels, disabled/hidden actions, and test scenarios.

   Direction to explore: classify File Node, Folder Node, Package, edge, and background targets before building entries.

4. Decide whether empty directories are graph concepts.

   Problem: Folder Nodes are currently derived from existing file paths. A newly created empty directory may exist on disk but not appear as a Folder Node after refresh or reindex.

   Why it matters: if this card means "create a visible new Folder Node", then filesystem creation alone is not enough. If it means "create a directory from a Folder Node context action", the Relationship Graph may reasonably stay file-derived.

   Direction to explore: define the product contract for empty folders before selecting the implementation path.

5. Introduce a Graph Context Menu decision model.

   Problem: multi-selection turns into a Context Selection when right-clicking an already-selected node, but the menu builder only sees `kind: node` plus raw ids. It cannot distinguish single file, single folder, all folders, all files, mixed file/folder, package, or plugin node selections.

   Why it matters: without a central decision model, each new action adds another local condition. That makes the Graph Context Menu harder to reason about and increases the chance that file-only actions appear for Folder Nodes or mixed selections.

   Direction to explore: keep selection mechanics separate from menu action decisions. The selection mechanics decide which graph targets are in the Context Selection; the menu decision model classifies that Context Selection into explicit menu states and only owns which actions appear.

   Candidate states:

   - Background
   - Edge
   - Single File Node
   - Single Folder Node
   - Single Package Node
   - Multi File Node
   - Multi Folder Node
   - Mixed Node Selection
   - Mutable default Graph Revision
   - Historical Timeline Snapshot where mutation actions are disabled

6. Replace timeline-only menu filtering with graph-revision mutability.

   Problem: the current menu model receives `timelineActive` and hides mutation actions when it is true. That is too shallow for the accepted behavior because the current/default Graph Revision should still allow mutation, while historical Timeline Snapshots should not.

   Why it matters: the Graph Context Menu should not decide mutability from the view alone. It needs to know whether the Context Selection belongs to a mutable Graph Revision.

   Direction to explore: pass an explicit menu mutability state into the Graph Context Menu decision model, such as mutable default revision vs historical snapshot.

## Initial Behavior Slice

Candidate behavior for the first implementation slice:

- When exactly one Folder Node is targeted in the live Graph View context menu, show `New Folder...`.
- Also show `New File...` for that Folder Node.
- Prompt for a file or folder name based on the chosen action.
- Create the file or folder under the selected Folder Node's directory.
- A created empty folder should become visible as a Folder Node after refresh or reindex.
- Refresh the Graph View after creation.
- Disable mutation actions when the Graph Context Menu targets a historical Timeline Snapshot.
- Keep mutation actions enabled when the Graph Context Menu targets the default Graph Revision.
- Support undo for `New Folder...` by trashing only the still-empty created folder.
- Do not show the action for File Nodes, Package nodes, edge context, multi-select, or background until those cases are explicitly chosen.

This slice is intentionally narrow until the product questions below are answered.

## Current Selection Mechanics

- Right-clicking an unselected node replaces the current selection with that node.
- Right-clicking an already-selected node opens the Graph Context Menu for the full current selection.
- Right-clicking the background opens a background Context Selection.
- Right-clicking an edge opens an edge Context Selection.
- Today, the Context Selection records target ids but not target node types.
- A Graph Context Menu decision model would classify those targets before entries are built.

## Test Surface

- Webview menu model tests for Folder Node action visibility.
- Webview context action tests for the new create-folder effect.
- Protocol/message routing tests for a folder creation request.
- Extension file action tests for creating a directory, duplicate handling, invalid names, refresh, and undo behavior if undo is supported.
- Undo tests proving a created empty folder can be trashed, and a non-empty folder is not recursively removed.
- Folder discovery/projection tests proving empty directories can become Folder Nodes when Folder Nodes are active.
- Regression tests proving file-oriented actions are not shown for Folder Nodes unless explicitly desired.

## Grill Questions

1. [x] What should the canonical product term be: `Context Menu`, `Context Selection`, or `Context Window`?
2. [x] Should the action be `New Folder...`, `New File...`, or both when right-clicking a Folder Node?
3. [x] Should a newly created empty folder become visible as a Folder Node immediately, or is it acceptable for Folder Nodes to remain derived from files?
4. [x] Should File Nodes offer child creation in their parent directory, or should creation stay folder-only?
5. [x] Should the Graph Context Menu use an explicit decision model/state machine before deciding multi-selection actions?
6. [x] Should this behavior be hidden, disabled, or available in Timeline View?
7. [x] Should undo delete the newly created folder, and should that use trash semantics like file deletion?

## Implementation Plan

1. Add failing tests for the Graph Context Menu decision model.
   - Classify Context Selection targets by node type.
   - Keep right-click selection mechanics unchanged.
   - Show `New File...` and `New Folder...` only for exactly one Folder Node in a mutable Graph Revision.
   - Disable mutation actions for historical Timeline Snapshots.

2. Add target-aware context action effects.
   - Make `New File...` use the selected Folder Node path when invoked from a Folder Node.
   - Add a `New Folder...` built-in action and message payload that includes the parent directory.

3. Add extension-side folder creation.
   - Prompt for a folder name.
   - Create the directory under the selected folder.
   - Refresh graph state after creation.
   - Support conservative undo through trash only when the created folder is still empty.

4. Extend folder discovery/projection.
   - Include empty directories as Folder Nodes when Folder Nodes are active.
   - Keep Folder Nodes structural and connected through `nests` relationships.

5. Verify with targeted tests first, then broader extension checks.
