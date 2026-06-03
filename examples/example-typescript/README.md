# TypeScript Example

This example workspace is used by CodeGraphy's extension-host e2e tests and doubles
as a small TypeScript project you can open in VS Code to try the Graph View.

It intentionally includes a top-level constant so the Graph Scope **Variable**
toggle has a concrete node to show when **Symbol** is also enabled.

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

## Graph Screenshot

![TypeScript example graph screenshot](../assets/graphs/typescript.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `src/index.ts`.
2. In Graph Scope, enable **Symbol** and **Variable**.
3. Search for `buildGreeting`, `UserName`, and `currentUser`.

Expected behavior:

- `buildGreeting` appears as a Function symbol imported from `src/utils.ts`.
- `UserName` appears as a Type symbol reached through a type-only import.
- `currentUser` appears as a Variable node, giving the tiny app a file/function/type/value story.

## TypeScript Plugin Alias Demo

The example still has relative imports for the built-in TypeScript graph behavior,
and now also includes a `compilerOptions.paths` alias for the TypeScript plugin:

```json
"paths": {
  "@example/*": ["src/alias/*"]
}
```

Suggested alias check:

1. Open this folder in VS Code.
2. Make sure the TypeScript plugin is enabled.
3. Open `src/index.ts`.
4. In Graph Scope, enable **TypeScript Alias Import**.

Expected behavior:

- `src/index.ts` imports `@example/greeting`.
- The TypeScript plugin resolves that alias to `src/alias/greeting.ts`.
- The original relative-import graph still works when the TypeScript plugin is not enabled.
