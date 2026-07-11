# Build your first CodeGraphy plugin

This five-step path builds the repository sample, links it without publishing, and shows its custom node in the VS Code Extension Development Host.

## 1. Install and build

From the repository root, install the workspace and build the sample once:

```bash
pnpm install
pnpm --filter @codegraphy-dev/core build
pnpm --filter @codegraphy-dev/sample-plugin build
```

## 2. Link the local package

Record the checkout in CodeGraphy's user-level Plugin Registry. Linking validates `package.json#codegraphy`, `codegraphy.json`, API compatibility, and `minCoreVersion` before runtime code can load.

```bash
pnpm --filter @codegraphy-dev/core exec codegraphy plugins link "$PWD/examples/sample-plugin"
```

## 3. Enable it for the sample workspace

Enable the static Plugin ID—not the npm package name—for the folder you will open:

```bash
pnpm --filter @codegraphy-dev/core exec codegraphy plugins enable sample.marker "$PWD/examples/sample-plugin"
```

## 4. Watch while you edit

Keep the bundled runtime current in a second terminal:

```bash
pnpm --filter @codegraphy-dev/sample-plugin watch
```

The plugin handles `.sample` files and contributes a `sample:marker` Node Type. Its `analyzeFile` hook adds one child marker beneath each matching file.

## 5. See the node in the Dev Host

Press `F5` from the repository's VS Code window, open `examples/sample-plugin` in the Extension Development Host, run **CodeGraphy: Open**, and choose **Index Workspace**. The graph shows `demo.sample` with a child labeled **Hello from Sample Plugin**. After changing plugin code, reload the Dev Host window and index again.

When you are done, disable it for this workspace with `pnpm --filter @codegraphy-dev/core exec codegraphy plugins disable sample.marker "$PWD/examples/sample-plugin"`.
