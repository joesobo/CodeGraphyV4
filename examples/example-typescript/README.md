# TypeScript Example

This example workspace is used by CodeGraphy's extension-host e2e tests and doubles as a small TypeScript project you can open in VS Code to try the Graph View.

The project models a tiny TypeScript upgrade workstream. `src/index.ts` starts the rollout summary, re-exports an audit helper, loads a lazy audit module, reads a CommonJS compatibility setting, calls a default import, and follows the TypeScript plugin alias. `src/utils.ts` formats the acceptance-stage summary, `src/summary.ts` reaches the checklist, and `src/runner.ts` demonstrates class and interface inheritance.

Suggested Depth Mode check:

1. Open this folder in VS Code.
2. Open `src/index.ts`.
3. Run `CodeGraphy: Open`.
4. Turn on Depth Mode.
5. Move the depth slider from `1` to `3`.

Expected behavior:

- Depth `1` shows `src/index.ts`, `src/utils.ts`, and `src/types.ts`.
- Depth `2` adds `src/summary.ts`.
- Depth `3` adds `src/checklist.ts`.
- `src/orphan.ts` stays out of the focused depth area because it is an Orphan Node.

## Graph Screenshot

![TypeScript example graph screenshot](../assets/graphs/typescript.png)

## Relationship Demo

Core Tree-sitter Analysis supports this example with 18 file nodes and these rendered edge counts when each edge type is shown by itself:

- **Imports**: 11 connections covering static imports, export-from imports, dynamic imports, and CommonJS `require()`.
- **Type imports**: 6 connections covering top-level type imports and inline type specifiers.
- **Calls**: 6 connections through named imports, a default import, and the rollout summary chain.
- **Inherits**: 2 connections from `UpgradeRunner` to `BaseRunner` and `RunnableThing`.
- **TypeScript Alias Import**: 1 plugin-owned connection from `src/index.ts` to `src/alias/notification.ts`.

## Symbol Node Demo

Suggested symbol check:

1. Open `src/index.ts`.
2. In Graph Scope, enable **Symbol** and **Variable**.
3. Search for `buildRolloutSummary`, `scheduleFollowUp`, `UpgradeRunner`, `BaseRunner`, `RunnableThing`, `ProjectName`, `UpgradeStage`, `currentProject`, and `StageLabels`.

Expected behavior:

- `buildRolloutSummary` appears as a Function symbol imported from `src/utils.ts`.
- `scheduleFollowUp` appears as a Function symbol from an arrow function assigned to a `const`.
- `UpgradeRunner` appears as a Class symbol and inherits from `BaseRunner` and `RunnableThing`.
- `RunnableThing` appears as an Interface symbol reached through a type-only import.
- `ProjectName` appears as a Type symbol and `UpgradeStage` appears as an Enum symbol in `src/types.ts`.
- `currentProject` and `StageLabels` appear as Variable nodes, giving the tiny app a file/function/type/value story.

## TypeScript Plugin Alias Demo

The example keeps relative imports for the built-in TypeScript graph behavior and includes a `compilerOptions.paths` alias for the TypeScript plugin:

```json
"paths": {
  "#example/*": ["src/alias/*"]
}
```

Suggested alias check:

1. Open this folder in VS Code.
2. Make sure the TypeScript plugin is enabled.
3. Open `src/index.ts`.
4. In Graph Scope, enable **TypeScript Alias Import**.

Expected behavior:

- `src/index.ts` imports `#example/notification`.
- The TypeScript plugin resolves that alias to `src/alias/notification.ts`.
- The original relative-import graph still works when the TypeScript plugin is not enabled.
