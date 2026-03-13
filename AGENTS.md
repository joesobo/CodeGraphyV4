# AGENTS.md

This file provides guidance to coding agents (including Codex) for this repository.

## Core Commands

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm run test
pnpm run lint
pnpm run typecheck
```

Common targeted commands:

```bash
pnpm --filter @codegraphy/extension test
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/GraphViewProvider.test.ts
```

## Architecture Orientation

There is no dedicated architecture map file in this repo. Start from package boundaries and follow module-local docs/comments.

Primary locations:
- `packages/extension/src/extension/` (VS Code extension host)
- `packages/extension/src/core/` (discovery, registry, views, colors)
- `packages/extension/src/webview/` (React webview UI)
- `packages/extension/src/shared/` (shared protocol/types)
- `packages/plugin-api/src/` (plugin API contracts)
- `packages/plugin-*/src/` (built-in language plugins)
- `docs/plugin-api/` (plugin API docs + diagrams)

## Development Workflow (Mandatory)

When assigned a Trello card or any development task, follow this process end-to-end:

### Task Setup

1. **Discuss before implementation:** review the task with the user first, covering implementation approach, risks/concerns, and open questions.
2. **Plan after alignment:** create an implementation plan once details are clarified.
3. **Use branch + worktree isolation:** execute work in its own branch/worktree. Split into small, independent tasks that can be delegated to individual subagents where safe.
4. **Commit frequently:** commit often, at minimum whenever subagent work is merged into the main task branch.
5. **Deliver via PR:** push all commits and open a GitHub PR with a clear description for human review.

### Worktree Safety

- Treat the user's currently open worktree as **protected**.
- Never run `git switch`, `git checkout <branch>`, `git rebase`, or other branch-changing commands in the protected worktree.
- Before any branch/worktree operations, create and move into a separate agent worktree; do branch switches only there.
- If a branch was changed in the protected worktree by mistake, immediately restore it and report what happened.

### Quality Gates (for every new or changed behavior)

#### 1. Acceptance Scenarios + Red-Green-Refactor TDD

For every new or changed behavior, write acceptance scenarios. Ask the user before changing existing scenarios.

Follow Uncle Bob's Three Laws of TDD strictly:

1. You may not write production code until you have written a failing test.
2. You may not write more of a test than is sufficient to fail (including compile/type errors).
3. You may not write more production code than is sufficient to pass the currently failing test.

Apply the **Red-Green-Refactor** cycle in tight iterations:

- **Red:** Write one small failing test (or acceptance scenario). Run it — confirm it fails.
- **Green:** Write the minimum production code to make it pass. Nothing more.
- **Refactor:** Clean up the code and tests while keeping everything green. Remove duplication, improve names, simplify structure.
- Repeat until all acceptance scenarios pass.

Additional rules:
- Test locations: extension and webview tests in `packages/extension/tests/`, plugin tests in `packages/plugin-*/__tests__/`.
- Prefer targeted test runs while iterating, then run full `pnpm run test` before finishing.
- Never skip the Refactor step — it prevents the "just make it pass" code from accumulating into a mess.

#### 2. CRAP Score Check

For every changed module, run CRAP and refactor until CRAP is 8 or less.

CRAP (Change Risk Anti-Patterns) = `comp² × (1 - cov/100)³ + comp`. It combines cyclomatic complexity with code coverage — high-complexity, low-coverage functions score high.

```bash
# All packages
pnpm run crap

# Specific package (use folder name under packages/)
pnpm run crap -- extension
pnpm run crap -- plugin-typescript
```

- **Threshold:** CRAP ≤ 8 per function
- If a function exceeds 8, either add tests to increase coverage or refactor to reduce complexity

#### 3. Differential Mutation Testing

For every changed module, run differential mutation tests — one module at a time. Cover uncovered sites and kill survivors before running the next module.

Mutation testing (via Stryker) introduces small bugs ("mutants") into your code and verifies that tests catch them. Survivors indicate gaps in test assertions. Static initializers are ignored (`ignoreStatic: true`).

```bash
# All plugins then extension
pnpm run mutate

# Specific package (use folder name under packages/)
pnpm run mutate -- extension
pnpm run mutate -- plugin-typescript
```

- **Mutation score thresholds:** ≥80% (green), ≥60% (warning), <60% (needs work)
- **Mutation site threshold:** 50 per file. If a file exceeds 50 mutation sites, it should be split/refactored
- HTML report generated at `reports/mutation/mutation.html` after each run

#### 4. Lint + Typecheck

Before committing, ensure code passes lint and typecheck. Pre-commit hooks run lint-staged + typecheck automatically, so keep staged changes clean.

```bash
pnpm run lint
pnpm run typecheck
```

#### 5. Changeset

If the PR includes **user-facing changes** (new features, bug fixes, behavior changes, removed functionality), add a changeset. Skip for internal refactors, test-only changes, CI updates, or docs fixes.

Run `pnpm changeset` or create a file manually in `.changeset/`:

```md
---
"@codegraphy/extension": minor
---

Add node size toggle to the toolbar with four sizing modes
```

Bump types: `patch` (bug fixes), `minor` (new features), `major` (breaking changes).

- Write from the **user's perspective**, not implementation details.
- One clear sentence describing what changed and why it matters.
- If a PR is updated after the changeset was written, update the changeset to reflect the final state.
