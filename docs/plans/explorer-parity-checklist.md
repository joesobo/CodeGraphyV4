# Explorer parity checklist

This is the Phase 2 source of truth for VS Code Explorer parity. A row becomes
`done` only after its implementation and focused evidence are verified; human-owned
acceptance Gherkin is not changed without explicit owner authorization.

Legend: `done(unit)` · `partial` · `todo(P#)` · `verify(P2)` · `waived(reason)` ·
`deferred(follow-up)`.

## File context menu

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Open, including multi-file open | done(unit) | 2.1 | Entry builder covers `Open File` / `Open N Files`; provider action tests cover the host open path. |
| Open to the Side / Open With… | todo(P2) | 2.4 | Not implemented. |
| Reveal in Finder / Explorer | done(unit) | 2.1 | Entry, navigation, and provider action tests cover the built-in reveal path. |
| Open in Integrated Terminal | todo(P2) | 2.4 | Not implemented. |
| Select for Compare / Compare with Selected | todo(P2) | 2.4 | Not implemented. |
| Open Timeline | waived(Graph Revision view) | — | Graph Revision is the graph-native timeline surface. |
| Cut / Copy / Paste | done(unit) | 2.2 | Runtime-validated host clipboard, transactional undoable paste, timeline gating, and decision-aware menus pass focused tests; Dev Host walk remains in 2-G. |
| Copy Path / Copy Relative Path | done(unit) | 2.1 | Single/multi relative-path and single absolute-path entry contracts plus clipboard host action pass. |
| Rename | done(unit) | 2.1 / 6.2 | Prompt-based provider action is covered; inline editing remains Phase 6. |
| Delete to trash | partial | 6.1 | Delete exists; `files.enableTrash` and Explorer confirmation parity remain. |
| Share vscode.dev link | waived(web-only) | — | Desktop extension does not expose Explorer's web sharing surface. |

## Folder context menu

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| New File / New Folder | done(unit) | 2.1 | Folder entry and provider host-action tests cover enabled, disabled, hidden, root, and nested contexts. |
| Nested-path create (`a/b/c.ts`) | done(unit) | 2.1 | 120 focused tests pass across `createPath.test.ts`, graph-view `files/actions.test.ts`, and `createFile.test.ts`; real Dev Host screenshot remains part of the Phase 2.1 walkthrough. |
| Find in Folder… | todo(P2) | 2.5 | Not implemented. |
| Paste | done(unit) | 2.2 | Folder, root, and background Paste routes through the undo manager; copied items retain clipboard state and cut items clear only after success. |
| Reveal / copy paths / rename / delete | done(unit) | 2.1 | Folder entries enforce mutation availability and synthetic-root protection; provider actions cover host dispatch. |

## Keyboard

| Binding | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Enter opens selection | done(unit) | 2.1 | Keyboard resolver/effect/listener tests open all selected non-synthetic nodes. |
| F2 rename | done(unit) | 2.3 | Single workspace selection posts the existing rename action; multi-select and immutable revisions are rejected. |
| Delete / Cmd+Backspace | done(unit) | 2.3 | Both bindings post the existing count-confirmed delete action and dynamically respect mutation availability. |
| Cmd/Ctrl+C, X, V | todo(P2) | 2.3 | Not implemented. |
| Cmd/Ctrl+Enter open to side | todo(P2) | 2.3 | Not implemented. |
| Cmd/Ctrl+A | done(unit) | 2.1 | Keyboard resolver, listener, and effect tests select every visible node. |
| Escape clears selection | done(unit) | 2.1 | Keyboard resolver/listener/effect tests clear the graph selection. |
| Escape closes panels | todo(P2) | 2.3 | Existing Escape handling does not prove the panel-close bug is fixed. |
| Cmd/Ctrl+Z / Shift+Z | done(unit) | 2.3 | Keyboard effect and listener tests post UNDO/REDO through the host undo manager route. |
| Type-ahead find | waived(search bar equivalent) | — | Search bar is the graph-native equivalent. |
| Arrow-key navigation | waived(owner) | — | Explicit owner decision. |
| Left / Right collapse-expand | waived(folder view click) | — | Folder View click is the graph-native equivalent. |

## Behaviors and display

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Multi-select with modifiers | done(unit) | 2.1 / 5.x | Modifier-click, selection-model, and marquee-view tests pass; extended desktop behavior remains Phase 5. |
| Auto-reveal active file | todo(P2) | 2.6 | Not implemented. |
| Git status decorations | todo(P2) | 2.7 | Not implemented. |
| Problems decorations | todo(P2) | 2.7 | Not implemented. |
| `files.exclude` respected | todo(P2) | 2.5 | Not implemented. |
| File nesting / Open Editors / sort order | waived(tree-list concepts) | — | Not applicable to the graph surface. |
| Canvas select / move / pan | todo(P5) | 5.x | Desktop interaction phase. |
| Drag-to-move files / external OS drop | deferred(future epic) | 8.4 | Follow-up card required during publication. |
| Inline input for new / rename | todo(P6) | 6.2 | Prompt flow remains until Phase 6. |
| Delete confirmation and trash settings | todo(P6) | 6.1 | Explorer settings/copy parity remains. |

## Validation gates

| Gate | Contract | Status | Owning task |
| --- | --- | --- | --- |
| V1 | Empty or whitespace-only rename/create is rejected | done(unit) | 123 focused tests pass across `createPath`, graph file validation, rename, and create-action modules; inline-error presentation remains Phase 6. |
| V2 | Existing-name collision uses Explorer-equivalent error shape | done(unit) | 2.2 / 6.2 | Redo rejects an occupied planned destination with the exact named error. |
| V3 | Path separators in New File create nested folders | done(unit) | 2.1 |
| V4 | Paste collision uses ` copy`, ` copy 2`, … | done(unit) | 2.2 | Files, folders, multi-dot names, dotfiles, and sequential batch collisions covered. |
| V5 | Delete follows `files.enableTrash` | todo(P6) | 6.1 |
| V6 | `explorer.confirmDelete` and persistent opt-out are honored | todo(P6) | 6.1 |
| V7 | Every filesystem mutation is undoable | done(unit) | 124 focused create-file, create-folder, rename, delete, undo-manager, and chained file-action tests pass; keyboard bindings remain Task 2.3. |
| V8 | Multi-select destructive operations confirm once with count | done(unit) | 2.2 | Multi-item cut-paste presents one modal count confirmation; cancellation preserves the staged clipboard. |

## Phase 2-A accounting

- `todo` / `partial`: 25
- `verify`: 0
- `done(unit)`: 14
- `waived`: 6
- `deferred`: 1

The next Phase 2.1 step is to walk every `verify(P2)` row in the real Dev Host,
attach screenshot/test evidence, and promote or re-status each row. This file does
not claim those rows are already proven.
