# Explorer parity checklist

This is the Phase 2 source of truth for VS Code Explorer parity. A row becomes
`done` only after its implementation and focused evidence are verified; human-owned
acceptance Gherkin is not changed without explicit owner authorization.

Legend: `done` · `partial` · `todo(P#)` · `verify(P2)` · `waived(reason)` ·
`deferred(follow-up)`.

## File context menu

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Open, including multi-file open | verify(P2) | 2.1 | Verify node multi-selection through the primary-action host path in the Dev Host. |
| Open to the Side / Open With… | todo(P2) | 2.4 | Not implemented. |
| Reveal in Finder / Explorer | verify(P2) | 2.1 | Verify the `reveal` built-in context action against a real file node. |
| Open in Integrated Terminal | todo(P2) | 2.4 | Not implemented. |
| Select for Compare / Compare with Selected | todo(P2) | 2.4 | Not implemented. |
| Open Timeline | waived(Graph Revision view) | — | Graph Revision is the graph-native timeline surface. |
| Cut / Copy / Paste | todo(P2) | 2.2 | Not implemented. |
| Copy Path / Copy Relative Path | verify(P2) | 2.1 | Verify both clipboard variants from a file node. |
| Rename | verify(P2) | 2.1 / 6.2 | Prompt flow exists; inline editing remains Phase 6. |
| Delete to trash | partial | 6.1 | Delete exists; `files.enableTrash` and Explorer confirmation parity remain. |
| Share vscode.dev link | waived(web-only) | — | Desktop extension does not expose Explorer's web sharing surface. |

## Folder context menu

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| New File / New Folder | verify(P2) | 2.1 | Verify file and folder nodes plus background creation in the Dev Host. |
| Nested-path create (`a/b/c.ts`) | verify(P2) | 2.1 | Prove the `createPath.ts` path-separator contract with focused tests and a real workspace. |
| Find in Folder… | todo(P2) | 2.5 | Not implemented. |
| Paste | todo(P2) | 2.2 | Not implemented. |
| Reveal / copy paths / rename / delete | verify(P2) | 2.1 | Verify folder actions and root mutation protection together. |

## Keyboard

| Binding | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Enter opens selection | verify(P2) | 2.1 | Verify graph convention in the Dev Host. |
| F2 rename | todo(P2) | 2.3 | Not implemented. |
| Delete / Cmd+Backspace | todo(P2) | 2.3 | Explicitly unbound in `keyboard/command/lookup.ts`. |
| Cmd/Ctrl+C, X, V | todo(P2) | 2.3 | Not implemented. |
| Cmd/Ctrl+Enter open to side | todo(P2) | 2.3 | Not implemented. |
| Cmd/Ctrl+A / Escape | verify(P2) | 2.1 / 2.3 | Verify select-all and panel-close behavior. |
| Cmd/Ctrl+Z / Shift+Z | todo(P2) | 2.3 | Host undo manager exists; graph bindings do not. |
| Type-ahead find | waived(search bar equivalent) | — | Search bar is the graph-native equivalent. |
| Arrow-key navigation | waived(owner) | — | Explicit owner decision. |
| Left / Right collapse-expand | waived(folder view click) | — | Folder View click is the graph-native equivalent. |

## Behaviors and display

| Explorer feature | Status | Plan task | Current evidence / next proof |
| --- | --- | --- | --- |
| Multi-select with modifiers | verify(P2) | 2.1 / 5.x | Verify current semantics; extended marquee/desktop behavior remains Phase 5. |
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
| V1 | Empty or whitespace-only rename/create is rejected | verify(P2) | 2.1 / 6.2 |
| V2 | Existing-name collision uses Explorer-equivalent error shape | todo(P2) | 2.2 / 6.2 |
| V3 | Path separators in New File create nested folders | verify(P2) | 2.1 |
| V4 | Paste collision uses ` copy`, ` copy 2`, … | todo(P2) | 2.2 |
| V5 | Delete follows `files.enableTrash` | todo(P6) | 6.1 |
| V6 | `explorer.confirmDelete` and persistent opt-out are honored | todo(P6) | 6.1 |
| V7 | Every filesystem mutation is undoable | verify(P2) | 2.1 / 2.3 |
| V8 | Multi-select destructive operations confirm once with count | todo(P2) | 2.2 |

## Phase 2-A accounting

- `todo` / `partial`: 24
- `verify`: 13
- `waived`: 6
- `deferred`: 1

The next Phase 2.1 step is to walk every `verify(P2)` row in the real Dev Host,
attach screenshot/test evidence, and promote or re-status each row. This file does
not claim those rows are already proven.
