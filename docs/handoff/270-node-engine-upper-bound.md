# Node Engine Upper Bound Investigation

Trello: https://trello.com/c/qiauqiPA
PR: https://github.com/joesobo/CodeGraphyV4/pull/270

## Current Decision

Remove the Node `<23` engine upper bound from package manifests and keep the
published Node minimum at `>=20`.

This intentionally leaves a known Node 26 install failure to fix in this PR
rather than hiding it behind package metadata.

CI should stay pinned to Node `22.22.0`. This card did not find a reason to
redesign the CI runtime or matrix.

## Evidence

Updated `engines.node` declarations are consistently `>=20` in:

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
because the next blocker is dependency installation, before VS Code or
Playwright runtime behavior can be exercised.

## Native Build Fix Options

`tree-sitter@0.25.0` fails to build against Node 26 because Node 26's V8
headers require C++20. C++20 is a newer version of the C++ language standard;
native Node addons compile C++ code during install, and the compiler must be
told which language standard to use.

Next things to test:

1. Check whether a newer `tree-sitter` runtime release sets C++20-compatible
   build flags or otherwise supports Node 26.
2. If the package has no newer compatible release, test a local package patch
   that adds the C++20 build flag to the `tree-sitter` native binding build.
3. Only after dependency installation works on Node 26, rerun the Node 26
   install/typecheck/lint/unit smoke path.
