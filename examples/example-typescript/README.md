# TypeScript Example

This example workspace is used by CodeGraphy's extension-host e2e tests and doubles
as a small TypeScript project you can open in VS Code to try the Graph View.

It intentionally includes a top-level constant so the Graph Scope **Variables**
toggle has a concrete node to show when **Symbols** is also enabled.

Suggested Depth Mode check:

1. Open this folder in VS Code.
2. Open `src/index.ts`.
3. Run `CodeGraphy: Open`.
4. Turn on Depth Mode.
5. Move the depth slider from `1` to `3`.

Expected behavior:

- Depth `1` shows `src/index.ts`, `src/utils.ts`, and `src/types.ts`.
- Depth `2` adds `src/depth.ts`.
- Depth `3` adds `src/leaf.ts`.
- `src/orphan.ts` stays out of the focused depth area because it is an Orphan Node.
