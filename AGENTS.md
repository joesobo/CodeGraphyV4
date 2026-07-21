# AGENTS.md

## Intent Over Literal Words

My requests are APPROXIMATE. I am not the one coding; you are. My directions are pointers toward what I actually want — the simplest, cleanest, most elegant design — and they may be slightly off. That goal ALWAYS outranks my literal words.

When you hit a wall — a case that doesn't fit, a spec that breaks, an assumption that fails — the wall is information: the design is wrong somewhere. STOP. Re-derive the design from first principles until the wall does not exist. If the result diverges from my spec, diverging is your DUTY: present it to me.

NEVER patch around the wall to comply with my words: a flag, a special case, a conversion shim, a parallel path, a test rewritten to dodge a broken rule. The patch IS the failure and will be rejected regardless of cost sunk. A blocker honestly reported is a good outcome; a jury-rigged "working" deliverable is the worst one.

## Commands

```bash
pnpm install / build / dev / test / lint / typecheck
pnpm --filter @codegraphy-dev/extension test                  # one package
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
```

## Architecture

Never create `architecture.md`. Package boundaries are the map:

- `packages/extension/src/extension/` — VS Code extension host
- `packages/extension/src/core/` — discovery, registry, views, colors
- `packages/extension/src/webview/` — React webview UI
- `packages/extension/src/shared/` — shared protocol/types
- `packages/graph-renderer/src/` — custom WebGPU rendering and WebAssembly physics/layout
- `packages/plugin-api/src/` — plugin API contracts
- `packages/plugin-*/src/` — built-in language plugins

## Workflow

Discuss and plan before implementing. Work in a dedicated branch/worktree, commit frequently, deliver via GitHub PR.

- Issues/PRDs live on the CodeGraphy Trello board (`docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`).
- Keep implementation plans, investigation notes, and handoffs in the task, Trello card, or PR. Do not commit plan or handoff documents. Record durable technical decisions as ADRs and current behavior in the relevant reference doc.
- Read root `CONTEXT.md` and `docs/adr/` when present.
- The user's open worktree is **protected**: never `git switch`, `git checkout <branch>`, or `git rebase` there — do branch work in a separate agent worktree.
- Refactors that change a contract: move fully to the new contract — update callers, tests, docs, changesets. One forward path, no legacy shims.

## Code Organization

- Feature-first folders (`src/webview/settingsPanel/`), never layer folders (`src/components/`, `src/hooks/`, `src/utils/`).
- Path carries context, filename carries role: `webview/settingsPanel/model.ts`, not `SettingsPanelModel.ts`. Role vocabulary: `model` · `view` · `command` · `registry` · `parser` · `serializer` · `protocol` · `types`.
- No junk-drawer or vague names: `utils`, `helpers`, `common`, `misc`, `manager`, `service`, `handler`.
- One reason to change per file. Split source files over 50 mutation sites; split test files over ~300 lines.
- Every source module gets a matching test file (`model.ts` → `model.test.ts`).
- Duplicate small code before abstracting; extract only when shared behavior is real, well-named, and used in 3+ places.
- Dependencies live in the package that imports them; root manifest only for shared deps and workspace tooling.

## Quality Gates

- **Acceptance specs are human-owned**: never create, edit, rename, or delete `packages/extension/tests/acceptance/specs/**/*.feature` unless explicitly asked. See `docs/agents/acceptance-specs.md`.
- **TDD**: no production code without a failing test first. Tests live in `packages/extension/tests/` and `packages/plugin-*/__tests__/`. Test behavior, not implementation; one concept per test. Run `pnpm run test` before finishing.
- **CRAP ≤ 8** per function (`pnpm run crap -- <package>`): add tests or reduce complexity.
- **Mutation score ≥ 90%** (`pnpm run mutate -- <package|file>`, one module at a time; bare `pnpm run mutate` is invalid). Report: `reports/quality-tools/mutation/mutation.html`.
- **Changeset** for user-facing changes only (`pnpm changeset`; skip for refactors/tests/CI/docs). Write it from the user's perspective.
