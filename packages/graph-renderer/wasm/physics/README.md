# Owned graph physics WASM

This AssemblyScript module owns the hot built-in graph-physics step used by the
WebGPU renderer:

1. link force;
2. Barnes–Hut many-body repulsion;
3. center force;
4. velocity integration and finite-position recovery;
5. collision projection through the uniform spatial grid.

The TypeScript `GraphLayoutEngine` is the public physics boundary. It owns
alpha/wake/sleep state, settlement, pause/resume, graph identity, and pinning.
Each engine instance supplies one imported `WebAssembly.Memory`; graph arrays
are zero-copy views over that memory and the complete built-in physics sequence
uses one JavaScript-to-WASM call per simulation step. Collision projection
visits every node in the surrounding spatial-grid cells; it never trades
separation correctness for an arbitrary candidate limit in dense regions.

Run `pnpm --filter @codegraphy-dev/graph-renderer build:wasm` to compile the
module. The renderer package rebuilds it before tests, and the extension
rebuilds it before webview builds. Vite emits the binary with the webview.
