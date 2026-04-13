# TypeScript Example

This example workspace is used by CodeGraphy's extension-host e2e tests and doubles
as a small multi-package project you can open in VS Code to try the graph views.

Suggested depth-view check:

1. Open this folder in VS Code.
2. Open `packages/app/src/index.ts`.
3. Run `CodeGraphy: Open`.
4. Switch to `Depth Graph`.
5. Move the depth slider from `1` to `3`.

Expected behavior:

- Depth `1` shows `packages/app/src/index.ts`, `packages/app/src/utils.ts`, and `packages/shared/src/types.ts`.
- Depth `2` adds `packages/feature-depth/src/deep.ts`.
- Depth `3` adds `packages/feature-depth/src/leaf.ts`.
- `packages/app/src/orphan.ts` stays out of the local depth graph because nothing points to it.
