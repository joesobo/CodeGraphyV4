# Quality Tools

Use a quality tool when its signal matches the risk in the change.

| Tool | Signal |
|---|---|
| `organize` | Directory structure, file naming, and cohesion |
| `boundaries` | Dependency layers and package boundaries |
| `reachability` | Dead surfaces and dead ends |
| `crap` | Complexity and coverage risk |
| `scrap` | Test structure and refactor opportunities |
| `mutate` | Whether tests detect injected faults |

## Run a scoped check

Pass the narrowest path that can answer the question:

```bash
pnpm run organize -- extension/src/webview/
pnpm run boundaries -- extension/src/webview/ --strict
pnpm run reachability -- extension/src/webview/ --strict
pnpm run crap -- extension/src/webview/
pnpm run scrap -- extension/tests/webview/
```

`organize` accepts a repository, package, or directory. `boundaries`, `reachability`, and `crap` also accept a file. `scrap` accepts a package, test directory, or test file.

Repository scans can interrupt the development loop. Use them when the change needs repository-wide context.

## Mutation

Mutation testing has the highest run cost. Use it when a changed source file needs stronger evidence that its tests detect faults. The command requires one source file:

```bash
pnpm run mutate -- extension/src/extension/repoSettings/freshness/model.ts
```

See the [mutation guide](./mutation.md) for the run loop.

## Reports and runtime

CRAP coverage and tool reports live under `reports/quality-tools/`.

Use Node.js 22.22.0 or newer. The external `@poleski/quality-tools` package owns the analyzers; CodeGraphy owns the monorepo commands and configuration.
