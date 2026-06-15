# TypeScript Example

This example workspace is used by CodeGraphy's extension-host e2e tests and
doubles as a small TypeScript project you can open in VS Code to try the Graph
View.

The source models a compact feature-flag rollout flow: an app entrypoint builds a
request, evaluates a checkout flag, writes an audit string, and formats the
decision. It intentionally keeps one disconnected file so the Graph View still
has an Orphan Node to show.

Suggested Depth Mode check:

1. Open this folder in VS Code.
2. Open `src/index.ts`.
3. Run `CodeGraphy: Open`.
4. Turn on Depth Mode.
5. Move the depth slider from `1` to `3`.

Expected behavior:

- Depth `1` shows `src/index.ts`, `src/format.ts`, `src/rollout.ts`, and
  `src/types.ts`.
- Depth `2` adds `src/audit.ts`, `src/config.ts`, and `src/evaluator.ts`.
- Depth `3` adds `src/baseEvaluator.ts` and `src/contract.ts`.
- `src/orphan.ts` stays out of the focused depth area because it is an Orphan Node.

## Graph Screenshot

![TypeScript example graph screenshot](../assets/graphs/typescript.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `src/index.ts`.
2. In Graph Scope, enable **Symbol** and **Variable**.
3. Search for `evaluateCheckout`, `RolloutDecision`,
   `PercentageEvaluator`, `BaseEvaluator`, `FlagEvaluator`, `RolloutStage`,
   and `demoRequest`.

Expected behavior:

- `evaluateCheckout` appears as a Function symbol imported from `src/rollout.ts`.
- `RolloutDecision` appears as a Type symbol reached through type-only imports.
- `PercentageEvaluator` extends `BaseEvaluator` and implements
  `FlagEvaluator`, giving the TypeScript example an inheritance edge pair.
- `RolloutStage` appears as an Enum symbol and `demoRequest` appears as a
  Constant node, giving the tiny app a file/function/type/value story.

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

- `src/index.ts` imports `@example/clock`.
- The TypeScript plugin resolves that alias to `src/alias/clock.ts`.
- The original relative-import graph still works when the TypeScript plugin is not enabled.
