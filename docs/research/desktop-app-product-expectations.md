# Desktop app product expectations

Research checked: 2026-08-06. This note applies current macOS, Tauri 2, and first-party editor guidance to the desktop app in `apps/desktop`. It supplements the existing [stack decision](./desktop-app-stack.md). It does not change the product model in [`CONTEXT.md`](../../CONTEXT.md).

## Recommendation

Keep CodeGraphy Desktop a fast, local Relationship Graph navigator with lightweight editing. Do not turn it into a general-purpose IDE. The public MVP should feel like a complete Mac app in the smaller job it chooses to do: open and switch workspaces, find a File, inspect Relationships, make a safe edit, recover from interruption, and explain failures.

The current branch already has the right base:

- Tauri owns the window, folder picker, validated File access, and Core child process.
- Core owns Indexing and the Graph Cache.
- The webview owns the File hierarchy, CodeMirror editor, and Relationship Graph.
- Saves use atomic replacement, preserve permissions, reject external-change conflicts, and trigger bounded one-File Indexing.
- The bundle has a narrow content security policy, a fixed sidecar, a macOS 26 floor, and a detailed signed-release acceptance gate.

The largest missing product systems are recent workspace navigation, native menus, persistent recovery and session state, keyboard-first find and commands, local diagnostics, updates, and a complete accessibility path. Those belong in the host and app shell, not in Core or the renderer.

## Must-have MVP polish

### Workspace switching and Mac conventions

Ship one active workspace per window first. Put the workspace name in a toolbar pop-up that contains recent workspaces, `Open Workspace...`, and `Clear Recent Workspaces`. Switching replaces the current workspace in place. The welcome view should show the same recent list. Missing or moved folders should be removed after one failed open, with a plain error and a new folder picker.

Mirror these actions in the native menu bar:

- `File > Open Workspace...` with `Command-O`
- `File > Open Recent` with recent folders and `Clear Menu`
- `File > Close Workspace`
- standard `Save`, `Undo`, `Redo`, `Cut`, `Copy`, `Paste`, `Find`, `Window`, and `Help` items

macOS users expect New and Open actions in the File menu, and Apple recommends familiar menu commands and shortcuts for files. AppKit also has a system recent-document model with add, list, maximum-count, and clear operations. A custom toolbar control should therefore supplement the menu, not replace it ([Apple file management](https://developer.apple.com/design/human-interface-guidelines/file-management), [Apple `recentDocumentURLs`](https://developer.apple.com/documentation/appkit/nsdocumentcontroller/recentdocumenturls)). Zed makes `File > Open`, `File > Open Recent`, project-local context, and explicit new-window behavior part of its project model ([Zed windows and projects](https://zed.dev/docs/windows-and-projects)).

Store recent paths and the last active path as app-global UI state under the normal Application Support location. Keep `.codegraphy/graph.sqlite` and workspace settings in the workspace. Do not create a second graph or settings model in app-global storage.

Before any workspace switch, resolve a dirty editor with `Save`, `Don't Save`, or `Cancel`. `Cancel` must leave the current workspace untouched. Stop the old workspace engine and ignore all late responses before showing the next workspace. This prevents a rapid switch from painting an old File or graph into the new workspace.

### Fast navigation and search

Add a small command registry that drives both native menu items and a command palette. The minimum commands are open or switch workspace, open recent workspace, quick-open File, search workspace text, save, close File, reveal File in Finder, re-index, focus each pane, show settings, show logs, and check for updates.

Use the conventions people already know:

- `Command-P`: fuzzy File finder, ordered by match quality and recency
- `Shift-Command-P`: command palette
- `Command-F`: search in the open File
- `Shift-Command-F`: search text across the workspace
- `Command-S`: save
- `Command-,`: settings
- `Control-Tab`: move through recent Files

VS Code and Zed both treat quick File open, workspace search, recent-file navigation, and a command palette as primary navigation, not advanced features ([VS Code user interface](https://code.visualstudio.com/docs/editing/userinterface), [Zed finding and navigating](https://zed.dev/docs/finding-navigating)). Obsidian reaches the same result for local folders: its quick switcher is keyboard-only, shows recent Files when the query is empty, and changes its search algorithm above 10,000 items to keep it responsive ([Obsidian quick switcher](https://obsidian.md/help/plugins/quick-switcher)).

The File hierarchy must support arrow-key navigation, left and right to collapse or expand folders, Return to open, type-ahead selection, and automatic reveal of the active File. Zed documents the same project-tree behavior and also provides reveal in Finder and directory-scoped search ([Zed project panel](https://zed.dev/docs/project-panel)).

Do not make the first command palette a plugin platform. A typed list of shell-owned commands is enough. It should use fuzzy matching, display shortcuts, keep the last few commands near the top, and remain fully usable with the keyboard. Obsidian and Zed both expose all commands this way ([Obsidian command palette](https://obsidian.md/help/plugins/command-palette), [Zed command palette](https://zed.dev/docs/command-palette)).

### Safe editing, recovery, and conflicts

Keep explicit source saves as the default for the first release. Code editors often need a deliberate save boundary because saving can run watchers, builds, and CodeGraphy incremental Indexing. Zed also defaults autosave to off while offering focus-change and window-change modes ([Zed settings](https://zed.dev/docs/reference/all-settings#autosave)).

Explicit save must not mean data loss. Persist a local recovery snapshot of each dirty buffer after a short idle interval and before workspace switch, window close, update relaunch, or app quit. Recovery data belongs in Application Support, outside the workspace. Key it by canonical workspace path, relative File path, and base revision. On relaunch, restore the unsaved buffer and label it as recovered. Delete its recovery entry only after a successful save or an explicit discard.

This follows the useful part of VS Code Hot Exit, which restores unsaved changes after quit, and Obsidian File Recovery, which keeps local snapshots outside the workspace ([VS Code Hot Exit](https://code.visualstudio.com/docs/editing/codebasics#_hot-exit), [Obsidian File Recovery](https://obsidian.md/help/plugins/file-recovery)). Apple recommends periodic preservation while editing and when a file closes or the app loses focus ([Apple file management](https://developer.apple.com/design/human-interface-guidelines/file-management#Saving-work)).

Keep the existing revision check and atomic replacement. Improve the conflict UI so a rejected save keeps the user's draft and offers:

- `Compare` against the current disk contents
- `Reload From Disk`, with confirmation because it discards the draft
- `Keep Editing`, with copy-to-clipboard available

Never turn an external-change conflict into a status-bar-only error. If autosave is added later, suspend it while a conflict is unresolved. AppKit's document model treats conflict resolution as a first-class document event rather than an overwrite fallback ([Apple `NSDocument`](https://developer.apple.com/documentation/appkit/nsdocument)).

### Session and window restore

Restore the last workspace, selected File, sidebar expansion, pane widths, graph camera, and window position after a normal quit. Restore only identifiers and view state, never a copied source File or graph. If the workspace no longer exists, open the recent-workspace welcome view. If recovery data exists, restore the dirty editor from that data.

Use Tauri's maintained window-state plugin for size and position, and keep the remaining session record in app-global storage ([Tauri window state](https://v2.tauri.app/plugin/window-state/), [Tauri store](https://v2.tauri.app/plugin/store/)). Apple's AppKit example restores window geometry, selection, tabs, and in-progress editor state to preserve continuity ([Apple AppKit state restoration](https://developer.apple.com/documentation/appkit/restoring-your-app-s-state-with-appkit)). Zed also restores workspaces on startup and persists tabs, panes, scroll positions, and recent projects in local app data ([Zed settings](https://zed.dev/docs/reference/all-settings#restore-on-startup), [Zed troubleshooting](https://zed.dev/docs/troubleshooting#startup-and-workspace-issues)).

### Settings and appearance

Add a small searchable settings view opened with `Command-,`. For MVP, include appearance, editor font and size, tab size, line wrapping, autosave choice, restore-on-startup choice, reduced graph motion, and update preference. Continue to use `.codegraphy/settings.json` for shared workspace behavior. Store Mac UI preferences globally. Show clearly which level owns each setting.

Support system light and dark appearance by default, plus CodeGraphy's own theme and File icon theme. Reuse the extension's Material-style File and Folder colors and icons so the same Node means the same thing in both interfaces. Do not encode File type or selection with color alone. VS Code separates user and workspace settings and gives settings a searchable editor; Zed exposes theme, icon theme, UI font, and editor font controls ([VS Code user interface](https://code.visualstudio.com/docs/editing/userinterface#_settings), [Zed appearance](https://zed.dev/docs/appearance)).

### Accessibility

Treat accessibility as a release gate:

- Give every control an accessible name and visible keyboard focus.
- Implement the File hierarchy as a semantic tree, not a list of clickable text.
- Expose selected, expanded, busy, dirty, error, and disabled states to assistive technology.
- Provide a keyboard-accessible list or inspector for graph Nodes and Relationships. An `aria-label` on the canvas alone does not expose its content.
- Keep text and essential icons at WCAG AA contrast in light and dark themes. Use shape, outline, or text in addition to color.
- Respect Reduce Motion. Stop continuous decorative graph motion when requested, and provide a pause control in all modes.
- Verify VoiceOver, Full Keyboard Access, zoom, increased contrast, and reduced motion in the packaged app.

Apple asks apps to support keyboard-only use, VoiceOver labels, sufficient contrast, and reduced automatic motion. Its guidance uses 4.5:1 as the minimum contrast for normal text and 3:1 for large or bold text ([Apple keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards), [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). VS Code also treats zoom, high-contrast colors, keyboard-only navigation, and screen-reader behavior as one accessibility system ([VS Code accessibility](https://code.visualstudio.com/docs/configure/accessibility/accessibility)).

### Local diagnostics and failure recovery

Add structured local logs for app startup, workspace open and close, Core spawn and exit, Graph Cache state, Indexing duration and counts, File read and save outcomes, renderer initialization, first frame, and update checks. Capture sidecar stderr in the same session log. Rotate logs by size and retain a small bounded history under `~/Library/Logs/dev.codegraphy.desktop`; Tauri's log plugin uses the platform log directory and supports file rotation ([Tauri logging](https://v2.tauri.app/plugin/logging/)).

Never log source contents. Treat absolute paths as private by default. Prefer workspace-relative paths, counts, durations, versions, error categories, and a per-session identifier. Apple explicitly warns against privacy-sensitive log data and recommends keeping symbol information and release archives so crash reports can be symbolicated ([Apple logging](https://developer.apple.com/documentation/os/generating-log-messages-from-your-code), [Apple crash reports](https://developer.apple.com/documentation/xcode/diagnosing-issues-using-crash-reports-and-device-logs)).

Add `Help > Show Logs in Finder` and `Help > Copy Diagnostic Summary`. The summary should contain app, macOS, WebKit, Core, and bundled Node versions; architecture; renderer capability; Graph Cache status; last Core exit; and log location. It must not contain source text. A Core crash should keep the window alive, explain what stopped, and offer `Restart Core` and `Re-index` rather than leaving an orphan process or a frozen busy state.

### Security

Keep the webview untrusted and the host API narrow:

- Continue to canonicalize the chosen root and reject absolute paths, traversal, and symlinks that leave it.
- Keep File access in typed Rust commands scoped to the active workspace. Do not add broad frontend filesystem permissions.
- Keep the sidecar executable and arguments fixed. Do not expose arbitrary shell execution.
- Grant Tauri capabilities per window and command. Avoid overlapping capability files because Tauri merges their permissions.
- Keep a restrictive content security policy. Do not load remote scripts or give remote content IPC access.
- If workspace or interface plugins can execute code, add a workspace trust decision before activation. Browsing Files and a cached graph should remain available in restricted mode.
- Audit every Hardened Runtime exception. Keep only exceptions proven necessary by the packaged renderer and sidecar.

Tauri's capabilities bind permissions to specific windows and webviews, while command scopes narrow allowed resources. Broad capabilities increase the effect of a frontend compromise ([Tauri capabilities](https://v2.tauri.app/security/capabilities/), [Tauri permissions](https://v2.tauri.app/security/permissions/)). Tauri's filesystem guidance also rejects traversal and gives deny scopes precedence over allow scopes ([Tauri filesystem security](https://v2.tauri.app/plugin/file-system/#security)). VS Code uses restricted mode because workspace configuration and extensions can execute code; CodeGraphy needs the same boundary once opening a workspace can activate executable plugins ([VS Code Workspace Trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust)).

### Performance contract

Make responsiveness measurable in the release app. Record these proposed product budgets on supported Apple Silicon hardware, then adjust them only from measurements:

- show the restored window shell within 500 ms of process launch
- show a cached File hierarchy and graph within 1 second of workspace selection
- show a recently opened File within 100 ms and an uncached small text File within 200 ms
- keep typing and graph interaction at the display refresh rate with no long main-thread task above 50 ms
- change workspaces without a stale File, graph, status, or Core response appearing

Use request generations or cancellation for File and workspace loads, an in-memory most-recently-used buffer cache, a virtualized File tree for large workspaces, and progressive graph presentation from the Graph Cache. Keep full Indexing off the critical open path. Show progress and allow cancellation when explicit re-indexing takes longer than a brief interaction.

The numbers above are CodeGraphy budgets, not claims from the cited peers. The peer pattern is clear: keyboard File finders, cached per-project state, and bounded behavior for large workspaces. Obsidian changes its quick-switch algorithm above 10,000 items, and Zed stores project state locally for fast restoration ([Obsidian quick switcher](https://obsidian.md/help/plugins/quick-switcher), [Zed troubleshooting](https://zed.dev/docs/troubleshooting#startup-and-workspace-issues)). Add macOS signposts around startup, workspace switch, File open, Core requests, and first graph frame so Instruments can verify the budgets; Apple's logging system supports time-based signposts for performance analysis ([Apple logging](https://developer.apple.com/documentation/os/logging)).

### Updates, packaging, and distribution

Do not enable in-app updates until the first Developer ID signed, notarized, stapled, installed, and runtime-tested release exists. After that gate passes:

- check in the background after launch and through `CodeGraphy > Check for Updates...`
- show version, notes, download progress, and a clear relaunch action
- save or recover every dirty buffer before relaunch
- use HTTPS endpoints and Tauri's separate updater signing key
- keep the updater private key separate from Apple signing credentials
- provide a preference for automatic checks, not a hidden mandatory update

Tauri requires cryptographic update signatures and does not allow verification to be disabled. Its static JSON format supports platform-specific URLs and signatures, including GitHub Release assets ([Tauri updater](https://v2.tauri.app/plugin/updater/)).

Keep the existing Apple Silicon DMG path and installed-app acceptance test. Direct distribution requires Developer ID signing, Hardened Runtime, notarization, and a stapled ticket. Apple also requires all nested executable code to have valid signatures and warns against `get-task-allow` in distribution builds ([Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution), [Apple notarization issues](https://developer.apple.com/documentation/security/resolving-common-notarization-issues)). Tauri supports direct-download DMGs and states that direct macOS distribution requires signing and notarization ([Tauri distribution](https://v2.tauri.app/distribute/), [Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/)).

The release artifact should also include a standard About panel with version and copyright, an application icon at all required sizes, release notes, a privacy statement that explains local data and diagnostics, and a support path. Preserve dSYMs and exact release archives for every published version.

## Follow-up features

These are useful, but they should follow a solid single-workspace MVP:

- multiple windows and explicit `Open in New Window`
- Finder `Open With`, folder drag-and-drop, and single-instance routing to the existing window
- multi-root workspaces
- configurable autosave on focus or window change
- recovered-buffer history and a visual diff beyond the latest conflict
- editable keyboard shortcuts and user-defined command aliases
- saved searches, replace across Files, and search history
- Graph Scope, Filters, plugin controls, and Symbol navigation after the File and Folder-only path is polished
- extension or plugin marketplace behavior
- Intel builds, only after the same renderer, Core, signing, and installed-app probes pass on Intel hardware
- opt-in crash upload or analytics, with payload preview and source-content exclusion
- Mac App Store distribution and App Sandbox bookmarks, only if store distribution becomes a product requirement

Fleet is the caution here. JetBrains separated editor, workspace, and system-service responsibilities, but later stopped Fleet distribution after it overlapped its established IDEs without a strong enough reason to switch ([Fleet architecture](https://blog.jetbrains.com/fleet/2022/01/fleet-below-deck-part-i-architecture-overview/), [The future of Fleet](https://blog.jetbrains.com/fleet/2025/12/the-future-of-fleet/)). CodeGraphy's reason to exist is the fast, explainable Relationship Graph. Every follow-up feature should make that navigation loop safer or faster.

Lapce shows the other edge of the scope decision. Its official project includes a native Rust and `wgpu` editor, LSP, remote development, plugins, and a terminal ([Lapce repository](https://github.com/lapce/lapce)). Those are credible editor features, but adopting them would move CodeGraphy away from its focused navigation job.

## Suggested delivery order

1. Recent-workspace state, toolbar switcher, native File menu, and safe dirty-workspace transition.
2. Stale-request protection, quick File open, keyboard tree navigation, and workspace text search.
3. Recovery snapshots, conflict actions, and normal-quit session restoration.
4. Material File and Folder icons, shared extension colors, light and dark themes, and searchable MVP settings.
5. Accessibility pass, reduced motion, and a semantic graph inspector.
6. Structured local logs, Core restart, diagnostic summary, and measured performance budgets.
7. Signed first release. Add the signed updater only after that release path passes on a clean Mac.

This order keeps each layer usable before the next one arrives and keeps Core and the renderer free of desktop product state.
