# Node Engine Upper Bound Investigation

Trello: https://trello.com/c/qiauqiPA
PR: https://github.com/joesobo/CodeGraphyV4/pull/270

## Finding

Do not remove the Node `<23` engine upper bound as a metadata-only change yet.

The repo minimum should stay `>=20.20.0`. The quality-tooling docs already note
that `@poleski/quality-tools` uses `path.matchesGlob`, so older Node 20
versions are outside the supported local quality-tooling path.

CI should stay pinned to Node `22.22.0`. This card did not find a reason to
redesign the CI runtime or matrix.

## Evidence

All current `engines.node` declarations are consistently
`>=20.20.0 <23` in:

- `package.json`
- `apps/web/package.json`
- `packages/core/package.json`
- `packages/extension/package.json`
- `packages/mcp/package.json`
- `packages/plugin-api/package.json`
- `packages/plugin-csharp/package.json`
- `packages/plugin-godot/package.json`
- `packages/plugin-markdown/package.json`
- `packages/plugin-python/package.json`
- `packages/plugin-svelte/package.json`
- `packages/plugin-typescript/package.json`
- `packages/plugin-vue/package.json`

Local sanity checks on the laptop used Node `v22.22.0` and pnpm `10.32.0`:

- `pnpm install --frozen-lockfile` passed.
- The pre-commit hook ran `pnpm run typecheck` and passed.
- The pre-commit hook ran `pnpm run typecheck` again after adding this
  investigation note and passed.

Mac mini verification used an isolated worktree at
`/Users/poleski/.codex/worktrees/270-node-engine-upper-bound/CodeGraphyV4`.
The mini had Node `v26.0.0` available at
`/opt/homebrew/Cellar/node/26.0.0/bin/node`, and pnpm `10.32.0` ran with that
Node first in `PATH`.

Under Node `v26.0.0`, `pnpm install --frozen-lockfile` failed while building
`tree-sitter@0.25.0`:

```text
/Users/poleski/Library/Caches/node-gyp/26.0.0/include/node/v8config.h:13:2:
error: "C++20 or later required."
```

The failing command was:

```bash
ssh codegraphy-mini 'set -euo pipefail; export PATH="/opt/homebrew/Cellar/node/26.0.0/bin:/opt/homebrew/Cellar/node@22/22.22.2_2/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"; cd /Users/poleski/.codex/worktrees/270-node-engine-upper-bound/CodeGraphyV4; pnpm install --frozen-lockfile'
```

The same remote worktree was then checked under the currently supported Node 22
runtime:

- Host: `Poleskis-Mac-mini.local`
- Node: `v22.22.2`
- pnpm: `10.32.0`
- `pnpm install --frozen-lockfile` passed.
- `pnpm run typecheck` passed.
- `pnpm run lint` passed, with 32 existing generated-acceptance spacing
  warnings emitted from
  `packages/extension/tests/playwright-vscode/generated/acceptance.spec.ts`.
- `pnpm --filter @codegraphy-dev/mcp test` passed: 1 file, 13 tests.
- `pnpm run mutate -- packages/mcp/src/mcp/server.ts` passed: 5 mutants, 100%
  mutation score.

No focused VS Code Playwright slice was run after the Node 26 install failure
because the engine metadata change was rejected and no VS Code or Playwright
runtime behavior changed.

## Recommendation

Keep `engines.node` as `>=20.20.0 <23` until the native tree-sitter install path
is proven on newer Node runtimes or replaced with a dependency/tooling path that
supports those runtimes by default. Removing only `<23` would allow installs on
Node 26 that currently fail during dependency installation.
