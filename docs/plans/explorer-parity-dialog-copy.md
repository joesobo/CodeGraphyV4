# Explorer parity dialog and toast copy audit

Captured 2026-07-11 from the English strings bundled with the repository's VS Code **1.128.0** desktop test runtime at `.vscode-test/vscode-darwin-arm64-1.128.0/Visual Studio Code.app/Contents/Resources/app/out/nls.metadata.json`. The canonical Explorer entries are under `vs/workbench/contrib/files/browser/fileActions`.

| Surface | Explorer 1.128 copy | CodeGraphy result |
| --- | --- | --- |
| Delete one file | `Are you sure you want to delete '{0}'?` | Exact; path fills `{0}`. |
| Delete one directory | `Are you sure you want to delete '{0}' and its contents?` | Exact after target-kind stat. |
| Permanently delete one file/directory | Same two forms with `permanently` before `delete` | Exact when `files.enableTrash` is off. |
| Delete multiple files | `Are you sure you want to delete the following {0} files?` | Exact. |
| Delete multiple directories | `Are you sure you want to delete the following {0} directories and their contents?` | Exact. |
| Delete mixed targets | `Are you sure you want to delete the following {0} files/directories and their contents?` | Exact. |
| Trash detail | `You can restore this file from the Trash.` / `You can restore these files from the Trash.` | Exact on macOS/Linux; Windows selects the corresponding `Recycle Bin` copy. |
| Permanent-delete detail | `This action is irreversible!` | Exact. |
| Delete actions | `Move to Trash`, `Move to Recycle Bin`, `Delete Permanently`, `Do not ask me again` | Exact platform action and persistence behavior. |
| Empty new/rename input | `A file or folder name must be provided.` | Exact inline and legacy host validation. |
| Leading slash | `A file or folder name cannot start with a slash.` | Exact inline and legacy host validation. |
| Surrounding whitespace | `Leading or trailing whitespace detected in file or folder name.` | Exact; whitespace is rejected rather than silently trimmed. |
| Invalid name | `The name **{0}** is not valid as a file or folder name. Please choose a different name.` | Exact. |
| Existing name | `A file or folder **{0}** already exists at this location. Please choose a different name.` | Exact for inline rename/create and clipboard collision failures. |
| Mutation error toast | Explorer surfaces the operation error without an extra product prefix. | Raw host message only; the former `File operation failed:` prefix was removed. |

The following messages are CodeGraphy product surfaces with no Explorer analogue, so exact parity is not applicable: Graph Revision indexing status/errors, 3D-unavailable fallback, mock-fixture navigation notices, and undo/redo descriptions. The multi-cut move confirmation is an intentional V8 safety addition (`Move {count} items to "{directory}"?`) rather than an Explorer-copy claim.

Evidence is locked by the graph file action, rename model/action, clipboard collision/action, inline editor, file-mutation toast, and provider tests. The audit found and fixed the previously unexplained delete punctuation/count/type/action mismatches, collision suffix omission, whitespace trimming, and toast prefix.
