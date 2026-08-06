# macOS desktop app stack research

Research completed: 2026-08-06. Sources were checked on that date. This note records the stack decision for Trello #275; it does not redefine the product model in [`CONTEXT.md`](../../CONTEXT.md) or the principles in [`docs/PHILOSOPHY.md`](../PHILOSOPHY.md).

## Decision

Build the macOS MVP as a **Tauri 2 app with a Rust shell, the existing React/Vite web stack, CodeMirror 6, the existing WebGPU/WASM graph renderer, and a bundled Core service process**.

Set **macOS 26.0 as the minimum system version**. This is a product constraint, not a build default: Tauri uses the operating system's `WKWebView`, and WebKit shipped WebGPU in Safari 26 on macOS 26. CodeGraphy's graph renderer has no non-WebGPU implementation. Supporting macOS 25 or earlier would therefore require either a second renderer or a bundled Chromium runtime. Both conflict with the smallest long-term architecture for this MVP. Tauri exposes `bundle.macOS.minimumSystemVersion` for enforcing this requirement in the app bundle ([Tauri webview versions](https://v2.tauri.app/reference/webview-versions/), updated 2026; [WebKit, “News from WWDC25,” June 9, 2025](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/); [Tauri macOS app bundle](https://v2.tauri.app/distribute/macos-application-bundle/)).

Ship native Apple Silicon and Intel artifacts only after each architecture passes the same runtime probe. Apple Silicon is the first required artifact. Do not label an Intel artifact supported until `navigator.gpu`, adapter creation, the CodeGraphy render pipeline, the bundled native Core modules, signing, notarization, and an installed-app launch all pass on Intel hardware.

## Architecture

```text
CodeGraphy.app
├── Tauri 2 Rust shell
│   ├── macOS window, menu, open dialog, and lifecycle
│   ├── narrow, validated file read/save commands
│   └── owns and monitors the Core child process
├── WKWebView frontend
│   ├── thin File and Folder hierarchy
│   ├── CodeMirror 6 file viewer/editor
│   └── existing @codegraphy-dev/graph-renderer WebGPU/WASM Graph View
└── bundled Core service process
    ├── existing @codegraphy-dev/core and native dependencies
    ├── File Discovery, Tree-sitter Analysis, and Indexing
    ├── workspace-local .codegraphy/graph.sqlite Graph Cache
    └── request/response plus lifecycle events over JSON Lines stdio
```

The ownership rules are:

- **Core remains the only graph engine.** The desktop app must call Core for File Discovery, Indexing, Graph Cache reads and writes, Nodes, Symbols, Relationships, Graph Scope, Filters, and plugin analysis. Rust must not recreate these systems.
- **Rust owns host integration, not product analysis.** It opens native dialogs, validates workspace-relative paths, performs safe file reads and writes, supervises the child process, and translates a small typed command/event protocol for the webview.
- **The webview owns presentation.** It renders the hierarchy, editor, and Graph View. It does not get unrestricted filesystem or shell access.
- **Use one long-running Core process for the active CodeGraphy Workspace.** Communicate through newline-delimited JSON on stdin/stdout with request IDs and explicit lifecycle events. Stderr is diagnostic output. This avoids a localhost port, an authentication scheme, duplicate CLI launches, and repeated loading of Tree-sitter and SQLite native modules.
- **Bundle a matching Node runtime and the built Core package as a Tauri sidecar resource for each CPU architecture.** Tauri explicitly supports external binaries with target-triple names and process control ([Tauri external binaries](https://v2.tauri.app/develop/sidecar/)). Do not require a user's Node or pnpm installation. Do not make Node's single-executable application feature the release foundation yet: Node 26 still marks it as active development and its current CI statement only tests macOS arm64 ([Node.js single executable applications, v26.5.0](https://nodejs.org/api/single-executable-applications.html)). A conventional bundled runtime is larger but is the reliable path for Core's native Tree-sitter and `libsql` dependencies.
- **Keep workspace state user-owned.** The Graph Cache and workspace settings remain in `.codegraphy/`; app-global UI state uses the normal macOS Application Support location. Do not copy source files or graph data into an account or cloud service.

The existing repository supports this split. `@codegraphy-dev/core` already exports a headless API and the `codegraphy` CLI, owns `.codegraphy/graph.sqlite`, and depends on native Tree-sitter grammars and `libsql`. `@codegraphy-dev/graph-renderer` already owns WebGPU drawing and WASM physics. React and Vite are already used by CodeGraphy interfaces. The desktop package should compose these boundaries instead of moving their behavior into Rust.

## Why Tauri 2

Tauri 2 has the exact responsibilities needed here: a Rust application process, the system webview, scoped frontend-to-Rust commands, sidecar bundling, macOS bundles, DMGs, signing, notarization, an updater, and a maintained GitHub release action. Its documented process model uses `WKWebView` on macOS ([Tauri process model](https://v2.tauri.app/concept/process-model/)). Its sidecar mechanism accepts executables written in any language and bundles per-target binaries ([Tauri external binaries](https://v2.tauri.app/develop/sidecar/)).

The realistic alternatives are worse for this product now:

| Option | Benefit | Reason not selected |
|---|---|---|
| Electron | Bundled Chromium gives a controlled WebGPU version on older macOS releases, and its Node main/utility processes could load Core directly. | It does not meet the Rust-shell direction and bundles Chromium and Node into a larger multi-process runtime. Electron's own documentation says it embeds both Chromium and Node.js ([Electron introduction](https://www.electronjs.org/docs/latest/)); its process model adds a Node main process and Chromium renderer processes ([Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)). Choose it only if supporting pre-macOS-26 systems becomes more important than the thin Rust shell. |
| Raw `wry`/`tao` | Maximum control with the same Rust and `WKWebView` foundation. | `wry` is the webview library underneath this class of app, not the complete security, command, bundling, updater, and release system ([wry README](https://github.com/tauri-apps/wry)). Rebuilding those layers adds product risk without solving the WebGPU OS floor. |
| SwiftUI/AppKit plus `WKWebView` | Best access to native macOS controls. | It still inherits the same `WKWebView` WebGPU constraint while adding a second UI language and manual Rust/Swift integration. It does not improve reuse of the existing React Graph View. |
| GPUI, Floem, or another native Rust UI | Native GPU rendering and very low overhead are possible. | This path requires replacing both the web UI and the editor integration. Zed's GPUI is custom, pre-1.0, and uses Metal on macOS ([GPUI README](https://github.com/zed-industries/zed/blob/main/crates/gpui/README.md)). Floem says it is still maturing and can make breaking changes ([Floem README](https://github.com/lapce/floem)). Adopting either would turn the MVP into an editor and renderer rewrite. |

## Why CodeMirror 6

Use **CodeMirror 6**, loaded with only the language and editor extensions required for the open file. The MVP needs fast viewing, basic syntax highlighting, editing, undo/redo, search, and safe save. It does not need to reproduce an IDE language-service host.

CodeMirror is an extensible web editor with a minimal setup and separately installed language packages ([CodeMirror](https://codemirror.net/); [CodeMirror core extensions](https://codemirror.com/docs/extensions/)). Its current changelog shows active maintenance through June 2026, including accessibility and large-document fixes ([CodeMirror changelog](https://codemirror.com/docs/changelog/)). This fits a focused code navigator where Core, not the editor, already performs Tree-sitter analysis.

Monaco is a strong engine, but it is the wrong default here. Microsoft describes Monaco as the fully featured VS Code editor, generated from VS Code source with service shims. Smart features run in web workers; models need durable URIs and disposal; VS Code extensions do not run in Monaco ([Monaco README and FAQ](https://github.com/microsoft/monaco-editor)). Those systems are valuable for an IDE, but they duplicate complexity before CodeGraphy needs it. Monaco should be reconsidered only if the product explicitly adds IDE-grade language services that CodeMirror extensions and an LSP client cannot satisfy.

Obsidian is useful evidence for this choice: its official changelog exposes its CodeMirror 6 extension API and records Electron and CodeMirror upgrades ([Obsidian 0.13.7, December 3, 2021](https://obsidian.md/changelog/page/17/); [Obsidian 1.8.3, January 28, 2025](https://obsidian.md/changelog/page/7/)). CodeGraphy should copy the product lesson—local files, a metadata cache, a focused editor, and a graph—not Obsidian's Electron shell.

## Lessons from comparable tools

- **Obsidian: keep Files authoritative and the cache rebuildable.** Obsidian says a vault is a local filesystem folder of plain-text files, external tools can edit them, and its local metadata cache powers Graph and Outline views ([Obsidian storage help](https://obsidian.md/help/Files%2Band%2Bfolders/How%2BObsidian%2Bstores%2Bdata)). This closely matches CodeGraphy's workspace-owned Files and rebuildable Graph Cache.
- **Zed: native performance is real, but owning the whole stack is a different product investment.** Zed says it built a custom Rust GPU UI framework and organized the app around shaders; GPUI uses Metal on macOS ([Zed 1.0, April 29, 2026](https://zed.dev/blog/zed-1-0); [GPUI README](https://github.com/zed-industries/zed/blob/main/crates/gpui/README.md)). CodeGraphy already has a specialized WebGPU renderer, so it should reuse that advantage without also building a native editor and UI toolkit.
- **Lapce: a Rust-native editor requires dedicated editor architecture.** Lapce is pure Rust, uses Floem, Rope Science, and `wgpu`, and includes LSP and remote-development systems ([Lapce README](https://github.com/lapce/lapce)). That validates the ceiling of native Rust, but also shows the scope that CodeGraphy avoids by adopting CodeMirror.
- **Fleet: keep the product sharply differentiated.** Fleet separated frontend editor behavior, workspace state, and a Rust system daemon in a distributed architecture ([Fleet architecture overview, January 2022](https://blog.jetbrains.com/fleet/2022/01/fleet-below-deck-part-i-architecture-overview/)). JetBrains later ended Fleet distribution because a second general-purpose IDE family overlapped existing products and lacked a clear reason to switch ([The Future of Fleet, December 2025, updated May 2026](https://blog.jetbrains.com/fleet/2025/12/the-future-of-fleet/)). CodeGraphy should remain a fast Relationship Graph navigator with lightweight editing, not expand the MVP into another general-purpose IDE.

## macOS packaging and release

The direct-download release path is:

1. Build architecture-specific app bundles and DMGs on macOS runners. Tauri calls DMG the common direct-download format and produces it with `tauri build --bundles dmg` ([Tauri DMG guide](https://v2.tauri.app/distribute/dmg/)).
2. Sign the app, bundled Node executable, native `.node` modules, and other nested executable code with a **Developer ID Application** certificate and Hardened Runtime. Apple requires distribution signing before direct distribution; its guidance requires a valid signature, secure timestamp, and Hardened Runtime for notarization ([Apple distribution signing](https://developer.apple.com/documentation/xcode/creating-distribution-signed-code-for-the-mac); [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)).
3. Notarize the final deliverable with `notarytool` through Tauri's supported App Store Connect API-key or Apple-ID environment variables, staple the ticket, and inspect the notary log. Tauri documents these credential hooks and states that notarization is required with Developer ID Application signing ([Tauri macOS signing, updated May 17, 2026](https://v2.tauri.app/distribute/sign/macos/)).
4. Verify the installed artifact, not only the build directory: mount the DMG, copy the app to `/Applications`, launch it, run `codesign --verify --deep --strict --verbose=2`, run `spctl --assess --type execute --verbose=4`, confirm the stapled ticket, open a real workspace, save a File, index it, and render its Relationship Graph.
5. Upload only verified artifacts to a draft GitHub Release. Tauri's maintained action builds targets, can create a draft release, and uploads artifacts; its documented matrix includes separate Apple Silicon and Intel builds ([Tauri GitHub pipeline](https://v2.tauri.app/distribute/pipelines/github/); [tauri-action](https://github.com/tauri-apps/tauri-action)). The repository's release workflow should own the final trigger and version source.
6. Enable the Tauri updater only after the first signed release path works. The updater requires cryptographic signatures and does not allow signature verification to be disabled. It can consume `latest.json` from GitHub Releases, and `tauri-action` can generate that file ([Tauri updater](https://v2.tauri.app/plugin/updater/)). Keep the updater private key separate from the Apple signing identity and store both only in protected release secrets.

An unsigned or ad-hoc-signed DMG is a development artifact, not a production download. Apple tightened Gatekeeper behavior in macOS Sequoia, and Apple recommends notarization for software distributed outside the Mac App Store ([Apple developer news, August 6, 2024](https://developer.apple.com/news/?id=saqachfa)). The website download control must remain visibly gated until a signed, notarized, stapled, installed, and runtime-tested GitHub Release asset exists.

## Required proof before release

- A startup probe records the macOS and WebKit versions, `navigator.gpu` availability, adapter/device creation, and the first successful renderer frame.
- The bundled Core process reports its Core and Node versions and successfully loads every native Tree-sitter grammar plus `libsql` on the release architecture.
- Killing the window or changing workspaces terminates the old Core process. A crash produces a visible recoverable error and diagnostic output rather than an orphan process.
- File save uses a workspace-relative validated path and detects an external modification before overwrite. A successful save triggers bounded Core Indexing and the same Core-owned Relationship Graph appears again.
- Signing verification covers nested binaries. Notarization, stapling, Gatekeeper assessment, DMG install, updater signature metadata, and the complete three-pane runtime path all run against the final release artifact.

## Reconsideration triggers

Revisit this decision only when a product requirement changes:

- If CodeGraphy must support macOS 25 or earlier while retaining the current WebGPU-only renderer, switch the shell decision to Electron or fund a separately scoped embedded-Chromium/native-renderer investigation.
- If CodeGraphy becomes a general-purpose IDE with deep language-service behavior, reevaluate Monaco or a native editor architecture.
- If Core gains a stable native executable that fully owns current Node/Core behavior, replace the bundled Node service without changing the stdio protocol or UI ownership boundaries.
