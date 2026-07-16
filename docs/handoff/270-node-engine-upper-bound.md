# Node Engine Upper Bound Investigation

> Superseded for the published Core CLI on 2026-07-16: pnpm patches are not
> propagated to npm consumers, so `@codegraphy-dev/core` now declares
> `>=20 <23` until Tree-sitter publishes the upstream C++20 build fix. The
> investigation below remains as historical evidence for workspace installs.

Trello: https://trello.com/c/qiauqiPA
PR: https://github.com/joesobo/CodeGraphyV4/pull/270

## Current Decision

Remove the Node `<23` engine upper bound from package manifests and keep the
published Node minimum at `>=20`.

The original Node 26 install failure is fixed in this PR by patching the
`tree-sitter@0.25.0` native binding build to use C++20.
The patch is documented in `patches/README.md` and should be removed once
`tree-sitter` publishes the upstream Node 23+ build fix:
https://github.com/tree-sitter/node-tree-sitter/issues/276
Follow-up Trello card:
https://trello.com/c/Myxab48H

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
- `packages/plugin-godot/package.json`
- `packages/plugin-markdown/package.json`
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

1. `npm view tree-sitter version versions --json` showed `0.25.0` is still the
   latest published `tree-sitter` runtime, so there was no newer runtime package
   to upgrade to for this failure.
2. A local pnpm patch now changes the `tree-sitter@0.25.0` native binding build
   from C++17 to C++20 in `binding.gyp`.
   This is a temporary backport of the upstream fix while
   https://github.com/tree-sitter/node-tree-sitter/issues/276 blocks a published
   npm release with the fix.

The patch fixed the original Node 26 install blocker on `codegraphy-mini`:

- Host: `Poleskis-Mac-mini.local`
- Node: `v26.0.0`
- pnpm: `10.32.0`
- `pnpm install --frozen-lockfile` passed.
- `pnpm --filter @codegraphy-dev/core typecheck` passed.
- `pnpm --filter @codegraphy-dev/mcp test` passed: 1 file, 13 tests.

GitHub CI passed on the latest PR commit, including lint, typecheck, unit
tests, build, release tests, VSIX artifacts, Playwright slices, and extension
native-runtime jobs.
