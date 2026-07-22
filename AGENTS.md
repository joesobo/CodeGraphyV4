# AGENTS.md

## Intent over literal wording

Treat my requests as direction toward the simplest, cleanest design. I may describe the implementation imprecisely because you are the one writing the code. Prefer the design goal when my wording conflicts with it.

If a case does not fit, a specification breaks, or an assumption fails, stop and re-derive the design from first principles. Present any required departure from my request before you implement it.

Do not add a flag, special case, conversion shim, parallel path, or weakened test to preserve a broken design. Report a blocker instead of shipping a workaround.

## Commands

```bash
pnpm install / build / dev / test / lint / typecheck
pnpm --filter @codegraphy-dev/extension test                  # one package
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
```

## Architecture

Never create `architecture.md`. Package boundaries are the map:

- `packages/extension/src/extension/`: VS Code extension host
- `packages/extension/src/core/`: discovery, registry, views, and colors
- `packages/extension/src/webview/`: React webview UI
- `packages/extension/src/shared/`: shared protocols and types
- `packages/graph-renderer/src/`: custom WebGPU rendering and WebAssembly physics and layout
- `packages/plugin-api/src/`: plugin API contracts
- `packages/plugin-*/src/`: built-in language plugins

## Workflow

Discuss and plan before implementing. Work in a dedicated branch/worktree, commit frequently, deliver via GitHub PR.

- Issues/PRDs live on the CodeGraphy Trello board (`docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`).
- Keep implementation plans, investigation notes, and handoffs in the task, Trello card, or PR. Do not commit plan or handoff documents. Record durable technical decisions as ADRs and current behavior in the relevant reference doc.
- Read root `CONTEXT.md` and `docs/adr/` when present.
- The user's open worktree is **protected**. Do not run `git switch`, `git checkout <branch>`, or `git rebase` there. Use a separate agent worktree for branch work.
- Refactors that change a contract must update callers, tests, docs, and changesets in one move. Keep one forward path without legacy shims.

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
