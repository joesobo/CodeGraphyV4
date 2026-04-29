# CLAUDE.md

## Commands

```bash
pnpm install       # install dependencies
pnpm run build     # build all packages
pnpm run dev       # start dev mode
pnpm run test      # run all tests
pnpm run lint      # lint all packages
pnpm run typecheck # type-check all packages
pnpm run organize  # analyze directory structure
```

Targeted runs:

```bash
pnpm --filter @codegraphy/extension test
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
pnpm run organize -- quality-tools/
```

## Architecture

Never create `architecture.md` in this repo. The monorepo is too large for a durable file-by-file architecture map.

Package boundaries are the primary entry point.

- `packages/extension/src/extension/` — VS Code extension host
- `packages/extension/src/core/` — discovery, registry, views, colors
- `packages/extension/src/webview/` — React webview UI
- `packages/extension/src/shared/` — shared protocol/types
- `packages/plugin-api/src/` — plugin API contracts
- `packages/plugin-*/src/` — built-in language plugins

## Development Workflow

### Task Setup

1. **Discuss first** — review approach, risks, and open questions before implementation.
2. **Plan** — create an implementation plan once aligned.
3. **Branch + worktree isolation** — work in a dedicated branch/worktree. Split into parallel subagent tasks where safe.
4. **Commit frequently** — at minimum when subagent work is merged.
5. **Deliver via PR** — push and open a GitHub PR for human review.

## CodeGraphy MCP

- When CodeGraphy MCP is available, use it first for repo structure, dependency, relationship, and impact questions before broad file search.
- Use CodeGraphy to narrow the likely files and symbols first; then read source files for implementation details.
- Prefer simple repo selection like `codegraphy status .` and `codegraphy_select_repo` with `.` when working from the target repo root.
- File-oriented MCP tools accept absolute paths, repo-relative paths, and unique suffixes like `src/a.ts` or `a.ts`. If CodeGraphy returns `ambiguous-file-path`, retry with one of the candidate repo-relative paths.
- Check CodeGraphy freshness with `codegraphy status .` or `codegraphy_repo_status` before relying on graph results for large refactors. Normal saved file changes refresh the saved DB through the VS Code extension, so reindex only when status is stale/missing or the graph did not pick up expected changes.
- Use `codegraphy_view_graph` when the saved CodeGraphy view matters, including depth mode, folder nodes, package nodes, and structural edges from `.codegraphy/settings.json`.

### Worktree Safety

- The user's open worktree is **protected** — never run `git switch`, `git checkout <branch>`, or `git rebase` there.
- Create a separate agent worktree for all branch operations.
- If the protected worktree's branch is changed by mistake, restore it immediately and report what happened.

## Repo Organization

Organize by feature and behavior, not by technical layer.

Run `pnpm run organize` to check that directory structure follows these conventions.

### 1. Feature-first folder structure

Group code by what it does, not what type it is.

```
src/webview/settingsPanel/
src/webview/nodeSizeToggle/
src/core/registry/
src/core/discovery/
```

Avoid horizontal layers that scatter a single feature across many folders:

```
src/components/
src/hooks/
src/utils/
src/helpers/
```

### 2. Path carries context; filename carries role

Folder names communicate feature or business context. Filenames communicate the role within that context. Do not repeat the folder name in the filename.

```
webview/settingsPanel/model.ts    ✓
webview/settingsPanel/view.tsx    ✓
webview/settingsPanel/SettingsPanelModel.ts  ✗
```

### 3. Split by mutation site

A file should have one clear reason to change. If a file contains independently changing behaviors, extract them.

- Source file exceeds 50 mutation sites → split or refactor.
- Test file exceeds ~200–300 lines → split by source module or behavior.

### 4. File-to-test mapping

Every source module must have at least one matching test module. A single source file may be covered by multiple focused test files when the behaviors it contains are distinct enough to warrant separate test groupings.

```
settingsPanel/model.ts        → settingsPanel/model.test.ts
nodeSizeToggle/command.ts    → nodeSizeToggle/command.test.ts
cohesion/clusters.ts          → cohesion/clusters.prefix.test.ts
                                cohesion/clusters.import.test.ts
```

If a source file covers multiple distinct concepts, split it before creating a large test file. If a test file exceeds ~200–300 lines, split it by behavior group rather than keeping one monolithic file.

### 5. Prefer local code over premature abstraction

Keep code close to the feature that owns it. Duplicate small amounts first; extract only when the abstraction is proven.

Extract shared code only when:
- The shared behavior is real, not coincidental.
- The name is obvious.
- It is used in 3+ places or is clearly stable.
- Extraction improves clarity more than it adds indirection.

### 6. Naming

Ban junk-drawer names: `utils`, `helpers`, `common`, `misc`, `base`, `temp`, `new`.

Ban vague role names: `manager`, `processor`, `service`, `handler2`, `thing`.

Prefer a consistent, minimal vocabulary for file roles:

`model` · `view` · `command` · `registry` · `parser` · `serializer` · `protocol` · `types` · `test`

A reader should be able to guess what a file does from its path alone, before opening it.

## Quality Gates

### 1. TDD — Red → Green → Refactor

Write acceptance scenarios for every new or changed behavior. Ask before changing existing scenarios.

**Three Laws:**
1. No production code without a failing test.
2. No more test code than is sufficient to fail.
3. No more production code than is sufficient to pass.

Test locations: `packages/extension/tests/` (extension + webview), `packages/plugin-*/__tests__/` (plugins).

Use targeted test runs while iterating. Run `pnpm run test` before finishing.

### 2. Test Quality

1. **One concept per test** — if the name needs "and", split it.
2. **Arrange-Act-Assert** — if any section is long, the test is doing too much.
3. **File-per-module** — each source file gets at least one matching test file. Large test files may be split by behavior group (e.g., `clusters.prefix.test.ts`, `clusters.import.test.ts`).
4. **Descriptive names** — no abbreviations in test code.
5. **Test behavior, not implementation** — describe what the code does, not how.

### 3. CRAP ≤ 8

`CRAP = comp² × (1 - cov/100)³ + comp`. High complexity with low coverage produces a high score.

```bash
pnpm run crap                    # all packages
pnpm run crap -- plugin-godot    # specific package
```

If a function exceeds 8: add tests to raise coverage or refactor to reduce complexity.

### 4. Mutation Testing ≥ 90%

Stryker injects small faults and verifies tests catch them. Run one module at a time — kill all survivors before moving on.

```bash
pnpm run mutate                    # all packages
pnpm run mutate -- plugin-godot    # specific package
```

Thresholds: ≥90% required · ≥80% warning · <80% must fix. Report: `reports/mutation/mutation.html`.

### 5. Lint + Typecheck

Pre-commit hooks run automatically. Keep staged changes clean.

```bash
pnpm run lint
pnpm run typecheck
```

### 6. Changesets

Required for **user-facing changes** (features, fixes, behavior changes). Skip for refactors, tests, CI, and docs.

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

Levels: `patch` (bug fix) · `minor` (feature) · `major` (breaking change).

Write from the user's perspective, not implementation details.
