# CodeGraphy for macOS

CodeGraphy for macOS is a focused local code navigator. It puts the File and Folder hierarchy, a CodeMirror editor, and the Core-owned Relationship Graph in one window.

There is no public download yet. The Apple Silicon app and DMG build locally, but the first public artifact still needs Developer ID signing, Apple notarization, and an installed-app acceptance check. Do not distribute an ad-hoc build as a release.

## Requirements

- Apple Silicon Mac
- macOS 26 or later
- WebGPU support in the system WKWebView

Intel is not a supported release target yet. The graph renderer has no non-WebGPU implementation, so macOS 25 and earlier are not supported.

## Current behavior

- Open any local folder as a CodeGraphy Workspace.
- Switch workspaces from the toolbar or the native `File > Open Recent` menu. Missing recent folders stay visible as unavailable until the user clears the menu.
- Browse a thin File and Folder hierarchy.
- Open UTF-8 text Files up to 5 MiB in CodeMirror.
- Save through an atomic replacement that preserves permissions and rejects an external edit conflict.
- Read or rebuild the workspace-owned `.codegraphy/graph.sqlite` Graph Cache through Core.
- Apply one-File incremental Indexing after a save.
- Show File and Folder Nodes with the extension's Material colors, icons, sizes, shapes, strokes, selection, labels, and Relationships through the existing WebGPU and WebAssembly graph renderer. The extension keeps its full Symbol support; the desktop Graph View is intentionally narrower for this release.
- Choose a File Node or drag any File or Folder Node, pan the Graph Stage, zoom at the pointer, and let the shared WebAssembly simulation settle after release.
- Tune Repel Force, Center Force, and Link Distance live from Graph Settings. Reset restores the extension defaults. The desktop record persists in the workspace without restarting Core or Indexing.

Source Files and the Graph Cache stay in the workspace. The app does not upload them.

## Architecture

The Tauri 2 Rust process owns the macOS window, folder picker, validated File reads and writes, and Core child-process lifecycle. The React webview owns the three-pane interface. A bundled Node 22.23.2 sidecar runs `@codegraphy-dev/core` over a JSON Lines request protocol.

Core still owns File Discovery, Tree-sitter Analysis, plugins, Indexing, Graph Cache storage, and graph queries. Rust does not reimplement graph behavior. `@codegraphy-dev/graph-visuals` owns the visual and force-setting meaning shared with the extension. The right pane uses `@codegraphy-dev/graph-renderer` for WebGPU drawing and WebAssembly physics; desktop pointer handling stays in the desktop interface.

See the [stack decision](../../docs/research/desktop-app-stack.md) for the comparison and release constraints.

## Development

Run setup from the repository root:

```bash
pnpm install --frozen-lockfile
```

Start the app with the desktop package as the working directory:

```bash
pnpm --filter @codegraphy-dev/desktop dev
```

`build:sidecar` downloads the pinned Node archive, checks its SHA-256 digest, deploys the built Core runtime, removes development-only files, signs the staged native code, and imports Core plus every native parser before Tauri starts.

Use the focused checks while changing the app:

```bash
pnpm --filter @codegraphy-dev/desktop test
pnpm --filter @codegraphy-dev/desktop typecheck
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib
```

## Local package check

Use Xcode 26. Xcode 27 beta currently produces malformed release proc-macro binaries with Rust 1.96 on this project.

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  pnpm --filter @codegraphy-dev/desktop build:bundle:ad-hoc
pnpm --filter @codegraphy-dev/desktop check:bundle
```

The ad-hoc configuration disables library validation because ad-hoc signatures have no shared Apple team. The production configuration does not have that entitlement. The verifier checks the app, the mounted DMG, the bundled Node and Core versions, all native modules, architecture, minimum macOS version, signatures, and a 220 MiB uncompressed runtime budget.

Follow the [desktop release procedure](../../docs/RELEASING.md#macos-desktop-release) for production signing, notarization, draft assets, and the installed-app gate.
