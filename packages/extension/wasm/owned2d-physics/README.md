# Owned graph physics WASM

This AssemblyScript module owns the hot built-in graph-physics step used by the
WebGPU renderer:

1. link force;
2. Barnes–Hut many-body repulsion;
3. center force;
4. velocity integration and finite-position recovery;
5. collision projection through the uniform spatial grid.

The existing TypeScript `GraphLayoutEngine` remains the public boundary. It
continues to own the fixed-timestep clock, alpha/wake/sleep state, settlement,
pause/resume, graph identity, plugin-force scheduling, and drag/pin handling.
Each engine instance supplies one imported `WebAssembly.Memory`; graph arrays
are zero-copy views over that memory and the complete built-in physics sequence
uses one JavaScript-to-WASM call per simulation step.

Run `pnpm --filter @codegraphy-dev/extension build:wasm` to compile the module.
The generated binary is intentionally ignored and is rebuilt before webview
builds and tests. Vite emits it as `dist/webview/index.wasm`, which is packaged
with the extension. The webview mounts immediately so its extension-message
listener can receive bootstrap data while the shared WASM module compiles;
graph rendering remains in its loading state until that module is installed.
