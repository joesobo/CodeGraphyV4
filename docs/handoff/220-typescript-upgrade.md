# 220 TypeScript Upgrade Handoff

## Current State

- Trello: [TypeScript Upgrade](https://trello.com/c/2qyhC189/220-typescript-upgrade), card id `6a2b3d60fe43922b2d85e07e`
- Trello list at setup: `In Progress` (`69af003346ade5ee06fa328c`)
- Branch: `codex/220-typescript-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/220-typescript-upgrade/CodeGraphyV4`
- PR: [#278](https://github.com/joesobo/CodeGraphyV4/pull/278) draft
- Stage: setup and research dispatch before Specifier acceptance draft
- Human gate: do not advance to coding state until the user has reviewed and accepted the acceptance test/spec changes or made their own modifications.

## Source Request

Research current TypeScript support for edges, nodes, variables, and symbols; compare it with what Tree-sitter can support; create a believable TypeScript example that showcases supported features; then create an acceptance test/spec that cleanly shows each supported TypeScript feature. After human acceptance of the acceptance changes, continue to coding state where executable Playwright and unit tests are made to fail first, then minimal production code is written to pass.

## Context Read

- `AGENTS.md`
- `CONTEXT.md`
- `docs/agents/loops/orchestrator.md`
- `docs/agents/loops/specifier.md`
- `docs/agents/acceptance-specs.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `/Users/poleski/.codex/agents/specifier.toml`
- `/Users/poleski/.codex/memories/skills/codegraphy-loop-orchestration/SKILL.md`
- `/Users/poleski/.codex/memories/skills/codegraphy-acceptance-specs/SKILL.md`
- `/Users/poleski/.codex/memories/skills/codegraphy-examples-workflows/SKILL.md`

Missing or changed context:

- `docs/agents/codegraphy-loop.md` was referenced by older memory guidance but is not present in this checkout; `docs/agents/loops/orchestrator.md` is the current loop contract found in the repo.

## Protected Checkout

- Protected checkout: `/Users/poleski/Desktop/Projects/CodeGraphyV4`
- Protected branch at setup: `main`
- No branch switching or destructive operations were run in the protected checkout.

## Research Synthesis

Current support is split between Core Tree-sitter JS/TS analysis and the TypeScript plugin.

Core syntax-only TypeScript/TSX support:

- File relationships: `import`, `type-import`, `call`, `inherit`.
- Symbol node capabilities for TypeScript/TSX workspaces: `symbol:function`, `symbol:class`, `symbol:interface`, `symbol:type`, `symbol:enum`, `symbol:constant`.
- Current JS/TS variable extraction labels normal variable declarators as `constant`; it does not distinguish `let`, parameters, fields, or local variables for this language path.
- Core can parse `.ts`, `.mts`, `.cts`, and `.tsx`; TSX component usage, decorators, package export resolution, rich type-reference resolution, and semantic local call resolution are not safe acceptance targets for this slice without a TypeScript binding/project-analysis story.

TypeScript plugin support:

- The plugin contributes no node types and no symbol/variable nodes.
- The plugin contributes one project-aware edge type: `codegraphy.typescript:alias-import`, shown as `TypeScript Alias Import`.
- Alias import analysis is limited to TypeScript/TSX source files and `tsconfig` `compilerOptions.paths` resolution. This ownership matches `docs/adr/0001-typescript-project-resolution-belongs-to-plugin-analysis.md`.

Current acceptance and example gaps:

- Existing TypeScript acceptance covers baseline files, Imports, plugin Alias Import, Inherits, and Calls.
- It does not separately assert `type-import` edges.
- It does not assert symbol or variable node types, specific symbol/variable nodes, or file-to-symbol `contains` behavior.
- The current example demonstrates useful facts but reads like a graph scaffold (`depth`, `leaf`, `runner`) rather than a believable TypeScript project.

Preferred example direction:

- Replace the TypeScript source fixture with a small feature-flag rollout library/app.
- Keep the example compact and believable: account model, rollout config, evaluator base class/interface, concrete evaluator, formatting helper, optional audit sink, alias clock helper, and one orphan file.
- Preserve the plugin path alias shape with `@example/*` resolving to `src/alias/*`.
- Showcase high-confidence facts only: value imports, type imports, imported calls, class/interface inheritance, function/class/interface/type/enum/constant nodes, and the TypeScript Alias Import edge.
- Avoid TSX/decorator/package-resolution/broad type-reference acceptance in this card.

Acceptance draft shape:

- Scenario: TypeScript example renders file relationships without the plugin.
- Scenario: TypeScript example exposes type-only imports separately.
- Scenario: TypeScript plugin resolves tsconfig path aliases.
- Scenario: TypeScript example exposes symbols for functions, types, classes, interfaces, enums, and constants.
- Scenario: TypeScript example connects symbol-level calls and inheritance, only where analyzer behavior is verified.

Known binding or implementation risks:

- The current acceptance binding for `Imports` may also enable `Type imports`; the Type imports scenario should use explicit edge toggling.
- Product casing should be `TypeScript Alias Import`.
- Symbol-level caller labels need verification before hard-coding a top-level caller assertion.
- `Constant` is the currently advertised/observed TypeScript variable child, not generic `Variable`.

## Event Log

### 2026-06-15 Setup

- Created goal for Trello card 220.
- Confirmed protected checkout is on `main`.
- Created isolated worktree and branch `codex/220-typescript-upgrade`.
- Read Trello card through REST API; card was already in `In Progress` and had labels `Examples`, `Plugin`, and `TypeScript Plugin`.
- Started handoff before role dispatch.
- Pushed setup branch and opened draft PR #278.
- Added Trello comment linking the branch, PR, and handoff.

### 2026-06-15 Parallel Research Returns

- Current-support lane confirmed broader TypeScript behavior is Core JS/TS Tree-sitter support, while the TypeScript plugin is alias-import only.
- Tree-sitter capability lane separated high-confidence syntax-only support from project/type-checker-dependent ideas.
- Example lane proposed a feature-flag rollout app/library to replace the current scaffold-style example.
- Acceptance lane drafted a scenario split and identified step-binding gaps without editing human-owned acceptance Markdown.
- Orchestrator synthesized the lanes above and prepared Specifier dispatch.

### 2026-06-15 Specifier Return: Needs Human Acceptance

Result: `needs human acceptance`.

Specifier scope completed:

- Replaced the scaffold-style TypeScript fixture with a compact feature-flag rollout example.
- Preserved TypeScript alias coverage through `@example/* -> src/alias/*`, now demonstrated by `@example/clock` resolving to `src/alias/clock.ts`.
- Preserved an intentional disconnected source file with `src/orphan.ts`.
- Drafted the human-owned TypeScript acceptance contract in Markdown and stopped at the acceptance gate.

Example source changes:

- Updated `examples/example-typescript/README.md`.
- Replaced `src/alias/greeting.ts` with `src/alias/clock.ts`.
- Replaced scaffold files `src/baseRunner.ts`, `src/depth.ts`, `src/leaf.ts`, `src/runnableThing.ts`, `src/runner.ts`, and `src/utils.ts` with `src/baseEvaluator.ts`, `src/audit.ts`, `src/config.ts`, `src/evaluator.ts`, `src/rollout.ts`, and `src/format.ts`.
- Updated `src/index.ts`, `src/types.ts`, and `src/orphan.ts` for the rollout flow.

Acceptance contract/draft:

- Updated `packages/extension/tests/acceptance/specs/typescript-example.md` with five reviewable scenarios:
  - file relationships without the TypeScript plugin
  - separate `Type imports`
  - TypeScript plugin `TypeScript Alias Import`
  - supported TypeScript symbol and constant node types
  - symbol-level calls and inheritance
- Updated impacted existing human-owned specs so they reference the new fixture names:
  - `packages/extension/tests/acceptance/specs/graph-scope-edge-types.md`
  - `packages/extension/tests/acceptance/specs/graph-scope-node-types.md`
  - `packages/extension/tests/acceptance/specs/graph-rendering.md`
  - `packages/extension/tests/acceptance/specs/edge-context-menu.md`

Acceptance impact scan:

- Searched `packages/extension/tests/acceptance/specs`, `packages/extension/tests/acceptance`, generated acceptance output, docs, and `examples/example-typescript` for stale references to the old TypeScript fixture names and alias target.
- Remaining matches for old terms are in unrelated language examples or generic README wording, not the TypeScript fixture contract.

Validation run:

- `pnpm --filter @codegraphy-dev/extension exec quality-tools acceptance compile --spec "tests/acceptance/specs/**/*.md" --steps "tests/acceptance/steps.ts" --out "/tmp/codegraphy-220-acceptance.spec.ts"` passed.
- `pnpm exec tsc ...` and `pnpm -w exec tsc --version` could not run because the `tsc` binary is not currently linked in this worktree (`Command "tsc" not found`).
- No generated Playwright files, step bindings, unit tests, or production code were changed.

Human approval status:

- Pending. Human-owned acceptance Markdown was edited locally for review because the user request explicitly asked for the TypeScript acceptance contract for this card.
- Stop here until the human accepts or revises the Markdown contract. Do not dispatch Coder until the human gate is satisfied.

Open questions:

- Should the human keep the symbol-level call assertion from top-level `src/index.ts` to `evaluateCheckout`, or narrow the calls scenario to named function-to-function relationships only?
- Should the broader Graph Scope node type scenarios continue using the TypeScript example for Interface and Type coverage, or should those remain covered only inside `typescript-example.md`?

Safety note:

- A patch was initially applied from the protected checkout by mistake. The protected checkout was restored immediately and verified clean on `main`; the intended edits were reapplied using absolute paths in this worktree.
