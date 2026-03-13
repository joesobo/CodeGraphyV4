# AGENTS.md

## Commands

```bash
pnpm install          # install dependencies
pnpm run build        # build all packages
pnpm run dev          # start dev mode
pnpm run test         # run all tests
pnpm run lint         # lint all packages
pnpm run typecheck    # type-check all packages
```

Targeted:

```bash
pnpm --filter @codegraphy/extension test
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
```

## Architecture

No dedicated architecture doc. Start from package boundaries:

- `packages/extension/src/extension/` — VS Code extension host
- `packages/extension/src/core/` — discovery, registry, views, colors
- `packages/extension/src/webview/` — React webview UI
- `packages/extension/src/shared/` — shared protocol/types
- `packages/plugin-api/src/` — plugin API contracts
- `packages/plugin-*/src/` — built-in language plugins

## Development Workflow

### Task Setup

1. **Discuss first** — review approach, risks, open questions before implementation.
2. **Plan** — create an implementation plan once aligned.
3. **Branch + worktree isolation** — work in its own branch/worktree. Split into small tasks for subagents where safe.
4. **Commit frequently** — at minimum when subagent work merges in.
5. **Deliver via PR** — push and open a GitHub PR for human review.

### Worktree Safety

- The user's open worktree is **protected** — never run `git switch`, `git checkout <branch>`, or `git rebase` there.
- Create a separate agent worktree for branch operations.
- If the protected worktree's branch was changed by mistake, restore immediately and report it.

### Quality Gates

#### 1. Red-Green-Refactor TDD

Write acceptance scenarios for every new/changed behavior. Ask before changing existing scenarios.

Three Laws of TDD:
1. No production code without a failing test.
2. No more test code than is sufficient to fail.
3. No more production code than is sufficient to pass.

Cycle: **Red** (failing test) → **Green** (minimum code to pass) → **Refactor** (clean up, keep green) → repeat.

- Tests: `packages/extension/tests/` (extension/webview), `packages/plugin-*/__tests__/` (plugins).
- Prefer targeted test runs while iterating; run full `pnpm run test` before finishing.

#### 2. Test Quality

1. **One concept per test** — if the name has "and", split it. Each test fails for exactly one reason.
2. **Arrange-Act-Assert** — if any section gets long, the test is doing too much.
3. **File-per-module** — `preload.ts` → `preload.test.ts`. Split test files past ~200-300 lines.
4. **Descriptive names** — `conn` not `cn`, `connection` not `c`.
5. **Test behavior, not implementation** — "should resolve class_name to file path" not "should call registerClassName then check map".
6. **Code review** — the main mechanism for catching untested edge cases and unclear naming.

#### 3. CRAP ≤ 8

CRAP = `comp² × (1 - cov/100)³ + comp`. High complexity + low coverage = high score.

```bash
pnpm run crap                    # all packages
pnpm run crap -- plugin-godot    # specific package
```

If a function exceeds 8: add tests to increase coverage or refactor to reduce complexity.

#### 4. Mutation Testing ≥ 80%

Stryker introduces small bugs and verifies tests catch them. Run one module at a time — kill survivors before moving on.

```bash
pnpm run mutate                    # all packages
pnpm run mutate -- plugin-godot    # specific package
```

- ≥90% green, ≥80% warning, <80% needs work
- If a file exceeds 50 mutation sites, split/refactor it
- Report: `reports/mutation/mutation.html`

#### 5. Lint + Typecheck

Pre-commit hooks run automatically. Keep staged changes clean.

```bash
pnpm run lint
pnpm run typecheck
```

#### 6. Changeset

Add for **user-facing changes** only (features, fixes, behavior changes). Skip for refactors, tests, CI, docs.

```bash
pnpm changeset
```

Or create manually in `.changeset/`:

```md
---
"@codegraphy/extension": minor
---

Add node size toggle to the toolbar with four sizing modes
```

- `patch` (bug fix), `minor` (feature), `major` (breaking)
- Write from the user's perspective, not implementation details.
