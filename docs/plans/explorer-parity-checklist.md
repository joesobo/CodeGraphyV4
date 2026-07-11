# Explorer parity checklist

This is the Phase 2 source of truth for VS Code Explorer parity. A row becomes
`done` only after its implementation and focused evidence are verified; human-owned
acceptance Gherkin is not changed without explicit owner authorization.

Legend: `done(unit)` · `done(devhost)` · `done(visual)` · `partial` ·
`todo(P#)` · `verify(P2)` · `waived(reason)` · `deferred(follow-up)`.

## File context menu

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Open, including multi-file open | done(unit) | 2.1 | Entry builder covers `Open File` / `Open N Files`; provider action tests cover the host open path. |
| Open to the Side / Open With… | done(unit) | 2.4 | Open beside uses `ViewColumn.Beside`; Open With opens the target then invokes VS Code's native editor picker. |
| Close Editor | done(unit) | 2.4 | Single-file context menus close every matching text tab through the stable tab-groups API while preserving focus. |
| Reveal in Finder / Explorer | done(unit) | 2.1 | Entry, navigation, and provider action tests cover the built-in reveal path. |
| Open in Integrated Terminal | done(unit) | 2.4 | Concrete folders create and show a terminal with the folder URI as `cwd`; synthetic root remains protected. |
| Select for Compare / Compare with Selected | done(unit) | 2.4 | A single live File Node can arm comparison state; a different File Node switches the action label and opens the pair through VS Code's native diff editor. |
| Open Timeline | waived(Graph Revision view) | — | Graph Revision is the graph-native timeline surface. |
| Cut / Copy / Paste | done(devhost) | 2.2 | Runtime-validated host clipboard, transactional undoable paste, timeline gating, and decision-aware menus pass focused tests. Real VS Code keyboard walkthrough covers copy, repeated-paste collision, and cut move. |
| Copy Path / Copy Relative Path | done(unit) | 2.1 | Single/multi relative-path and single absolute-path entry contracts plus clipboard host action pass. |
| Rename | done(unit) | 2.1 / 6.2 | F2 and node menus open the projected canvas input; basename selection, Enter/Escape/blur, named host routing, and inline failure recovery are covered. |
| Delete to trash | done(unit) | 6.1 | The invocation-time `files.enableTrash` and `explorer.confirmDelete` matrix passes for single and multi-delete. |
| Share vscode.dev link | waived(web-only) | — | Desktop extension does not expose Explorer's web sharing surface. |

## Folder context menu

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| New File / New Folder | done(devhost) | 2.1 | Folder entry and provider host-action tests cover enabled, disabled, hidden, root, and nested contexts. Real VS Code verifies toolbar New File. |
| Nested-path create (`a/b/c.ts`) | done(devhost) | 2.1 | 120 focused tests pass across `createPath.test.ts`, graph-view `files/actions.test.ts`, and `createFile.test.ts`; real VS Code creates `nested/deep/example.ts` and shows it in the graph. |
| Find in Folder… | done(unit) | 2.5 | Concrete folder entries route to `workbench.action.findInFiles` with `filesToInclude`; synthetic root omits the action. |
| Paste | done(devhost) | 2.2 | Folder, root, and background Paste routes through the undo manager; copied items retain clipboard state and cut items clear only after success. Real VS Code verifies a folder destination and collision suffix. |
| Reveal / copy paths / rename / delete | done(unit) | 2.1 | Folder entries enforce mutation availability and synthetic-root protection; provider actions cover host dispatch. |

## Keyboard

| Binding | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Enter opens selection | done(unit) | 2.1 | Keyboard resolver/effect/listener tests open all selected non-synthetic nodes. |
| F2 rename | done(unit) | 2.3 | Single workspace selection posts the existing rename action; multi-select and immutable revisions are rejected. |
| Delete / Cmd+Backspace | done(unit) | 2.3 | Both bindings post the existing count-confirmed delete action and dynamically respect mutation availability. |
| Cmd/Ctrl+C, X, V | done(unit) | 2.3 | Clipboard shortcuts post runtime-validated host actions, respect mutation availability, and paste into a selected folder or workspace root. |
| Cmd/Ctrl+Enter open to side | done(unit) | 2.3 / 2.4 | Selected workspace files post a dedicated open-beside message and use `ViewColumn.Beside`; synthetic packages are filtered. |
| Cmd/Ctrl+A | done(unit) | 2.1 | Keyboard resolver, listener, and effect tests select every visible node. |
| Escape clears selection | done(unit) | 2.1 | Keyboard resolver/listener/effect tests clear the graph selection. |
| Escape closes panels | done(unit) | 2.3 | Escape now clears selection and closes the active graph panel through the live store; effect/listener/runtime wiring tests pass. |
| Cmd/Ctrl+Z / Shift+Z | done(unit) | 2.3 | Keyboard effect and listener tests post UNDO/REDO through the host undo manager route. |
| Type-ahead find | waived(search bar equivalent) | — | Search bar is the graph-native equivalent. |
| Arrow-key navigation | waived(owner) | — | Explicit owner decision. |
| Left / Right collapse-expand | waived(folder view click) | — | Folder View click is the graph-native equivalent. |

## Behaviors and display

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Multi-select with modifiers | done(unit) | 2.1 / 5.x | Modifier-click, selection-model, and marquee-view tests pass; extended desktop behavior remains Phase 5. |
| Auto-reveal active file | done(unit) | 2.6 | Active editor updates select the visible graph node; repo-local `autoReveal` supports pan-without-zoom, `focusNoScroll`, and disabled modes in 2D/3D. |
| Git status decorations | done(visual) | 2.7 | Native `vscode.git` status rings update in place; porcelain fallback and Playwright pixel evidence included. |
| Problems decorations | done(visual) | 2.7 | Error/warning badges update from diagnostics without refreshing graph data; Playwright pixel evidence included. |
| `files.exclude` respected | done(unit) | 2.5 | Resource-scoped VS Code rules, including conditional sibling rules, feed discovery and cache signatures; a default-on Filters source reports pre-graph exclusions and can be disabled per repo. |
| File nesting / Open Editors / sort order | waived(tree-list concepts) | — | Not applicable to the graph surface. |
| Canvas select / move / pan | todo(P5) | 5.x | Desktop interaction phase. |
| Drag-to-move files / external OS drop | deferred(future epic) | 8.4 | Follow-up filed: [Graph file drag-to-folder + external OS drop](https://trello.com/c/z907ZEa2/259-graph-file-drag-to-folder-external-os-drop). |
| Inline input for new / rename | done(devhost) | 6.2 | Node/background menus and the toolbar use a projected HTML input plus temporary ghost node; real VS Code verifies the New File editor and host commit. Rename focus retention remains gate 6-B. |
| Delete confirmation and trash settings | done(unit) | 6.1 | All eight setting × target-count cases pass with Explorer copy and persistent Do not ask me again. |

## Validation gates

| Gate | Contract | Status | Owning task | Current evidence / next proof |
| --- | --- | --- | --- | --- |
| V1 | Empty or whitespace-only rename/create is rejected | done(unit) | 2.1 / 6.2 | Canvas validation keeps the editor open and renders the error beneath the input. |
| V2 | Existing-name collision uses Explorer-equivalent error shape | done(unit) | 2.2 / 6.2 | Host mutation failures, including occupied destinations, are routed back into the pending canvas editor. |
| V3 | Path separators in New File create nested folders | done(devhost) | 2.1 | Deep nested creation, parent creation, normalization, rollback, and undo have focused coverage; real VS Code verifies the full toolbar-to-graph path. |
| V4 | Paste collision uses ` copy`, ` copy 2`, … | done(devhost) | 2.2 | Files, folders, multi-dot names, dotfiles, and sequential batch collisions are covered; real VS Code verifies the first repeated-paste suffix. |
| V5 | Delete follows `files.enableTrash` | done(unit) | 6.1 | Invocation-time configuration is threaded through optimistic and undoable file/folder deletion. |
| V6 | `explorer.confirmDelete` and persistent opt-out are honored | done(unit) | 6.1 | The eight-case settings matrix covers confirmation on/off, single/multi targets, Trash on/off, and persistent `Do not ask me again`. |
| V7 | Every filesystem mutation is undoable | done(unit) | 2.1 / 2.2 / 2.3 | Create, rename, delete, clipboard transactions, undo-manager chaining, and keyboard undo/redo routes have focused coverage; acceptance proof remains. |
| V8 | Multi-select destructive operations confirm once with count | done(unit) | 2.2 | Multi-item cut-paste presents one modal count confirmation; cancellation preserves the staged clipboard. |

## Phase 2-A accounting

- `todo` / `partial`: 1
- `verify`: 0
- `done(unit)`: 30
- `done(devhost)`: 7
- `done(visual)`: 2
- `waived`: 6
- `deferred`: 1

Phase 2.1 still requires the broad all-done-row Dev Host walkthrough. Targeted
real-window proof already covers nested create, clipboard actions, inline create,
and decoration rendering. The only remaining feature-status `todo` belongs to
Phase 5; there are no unresolved `todo(P2)`, `todo(P6)`, or `verify(P2)` rows.
