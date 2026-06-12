# Trello 201: C# Upgrade

## Source

- Trello: https://trello.com/c/rSYGlC3d
- Card: `201-c-upgrade` / `C# Upgrade`
- Labels: `Examples`, `Plugin`, `C# Plugin`

## Loop State

- Current state: Specifier pass complete; route to Coder
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- PR: https://github.com/joesobo/CodeGraphyV4/pull/275
- Heavy-check host: not prepared yet; prepare `codegraphy-mini` lazily when a role needs VS Code Playwright, mutation, or other focus-stealing checks.
- Human gates:
  - Human-owned acceptance spec Markdown under `packages/extension/tests/acceptance/specs/` must not be committed without explicit approval.
  - Any proposed update to `packages/extension/tests/acceptance/specs/csharp-example.md` needs review before final commit.

## Card Contract

Goal: upgrade `examples/example-csharp` so C# feels like a real, focused CodeGraphy demo project and has acceptance coverage that proves visible graph behavior.

Required shape:

- Treat this as a support audit before fixture polish.
- Review C# language docs plus current parser/plugin support.
- Inventory current CodeGraphy C# output: symbols, variables, and edges.
- Compare emitted capabilities to Graph Scope behavior for `examples/example-csharp`.
- Split gaps by generic Core Tree-sitter behavior, plugin-owned behavior, and out-of-scope language semantics.
- Prefer generic Tree-sitter-backed Core behavior only when the construct is generically discoverable.
- Make `examples/example-csharp` a believable small project, not a syntax museum.
- Demonstrate every supported visible C# node toggle and edge toggle.
- Keep README/settings honest about support and known limitations.
- Follow the C and C++ acceptance pattern.
- Validate Graph Scope toggles with expected nodes, relationships, stable counts, and code-checked numbers.
- Run focused analyzer/plugin tests, focused generated VS Code acceptance for `examples/example-csharp`, required mutation, organize/typecheck/lint before review.

Definition of done:

- `examples/example-csharp` demonstrates every supported visible C# graph feature.
- Acceptance coverage proves expected nodes, variables, edges, toggles, and counts.
- Unsupported or deferred language constructs are documented as explicit follow-up scope.

## Event Log

### 2026-06-12T20:25:25Z - Orchestrator Setup

- Read `AGENTS.md`, `CONTEXT.md`, `docs/agents/codegraphy-loop.md`, role loop contracts, issue tracker docs, triage labels, and acceptance spec ownership rules.
- Confirmed Trello card `rSYGlC3d` is already in `In Progress`.
- Confirmed labels resolve to `Examples`, `Plugin`, and `C# Plugin`.
- Created isolated worktree from fresh `origin/main` at `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`.
- Created branch `codex/201-csharp-upgrade`.
- Noted existing older branch/worktree `codex/193-c-upgrade`; left it untouched because card 201 has its own current Trello contract.
- Next route: finish setup by committing this handoff, pushing the branch, opening a draft PR, updating Trello/PR state, then dispatch Specifier.

### 2026-06-12T20:26:28Z - Orchestrator Public Setup

- Committed setup checkpoint `e0b15670` with the initial handoff file.
- Pushed branch `codex/201-csharp-upgrade` to GitHub.
- Opened draft PR #275: https://github.com/joesobo/CodeGraphyV4/pull/275
- Next route: update Trello with the active loop state, then dispatch Specifier.

### 2026-06-12T20:26:47Z - Orchestrator Trello Update

- Added Trello setup comment `6a2c6b833b985697d7a84cd1`.
- Trello card was already in `In Progress`, so no list move was needed.
- Next route: dispatch Specifier for support audit and acceptance contract planning.

### 2026-06-12T20:29:17Z - Specifier Handoff

- Result: acceptance contract ready with a human-owned spec gate.
- Plan path: `docs/plans/201-csharp-upgrade-specifier-plan.md`
- Support audit summary:
  - Core Tree-sitter Analysis owns C# parsing and baseline C# graph output.
  - `@codegraphy-dev/plugin-csharp` is metadata/default-filter support for this behavior; it does not provide supplemental analysis or Graph Scope capability declarations.
  - Current Core C# surfaces are imports, references, calls, inherits, and class/interface/struct/enum/method symbols.
  - C# cross-file resolution relies on the C# pre-analysis index.
- Acceptance draft summary:
  - Keep the existing file-edge scenario for Imports, References, Calls, and Inherits.
  - Add a C# symbol/Graph Scope scenario following the upgraded C and C++ pattern.
  - Proposed node-type assertions should cover File plus C#-appropriate Class, Interface, Struct, Enum, and Method only when the example proves those rows are available.
  - Proposed symbol relationships should prove Contains, Calls, and Inherits on representative C# symbols.
- Acceptance impact scan:
  - Affected: `packages/extension/tests/acceptance/specs/csharp-example.md`.
  - Pattern references only: C, C++, Graph Scope node-type, and Graph Scope edge-type specs.
  - Step-binding impact: the current available-node-types step is C++-specific, so Coder likely needs a generic or C#-specific step before generated acceptance can pass.
- Evidence:
  - `codegraphy status .` reported missing Graph Cache in this fresh worktree.
  - Static source/tests inspected: C# example, C# spec, C/C++ pattern specs, C# analyzer files, plugin C# metadata/tests, generated acceptance output, and Graph Scope step bindings.
  - Primary docs checked: Microsoft C# language docs/spec pages and `tree-sitter/tree-sitter-c-sharp`.
  - Focused executable analyzer inventory did not run because this worktree has no installed `node_modules`; `pnpm exec tsx` and focused `vitest` commands reported missing binaries.
- Human approval status: pending for any final committed edit to `packages/extension/tests/acceptance/specs/csharp-example.md`.
- Open questions:
  - Whether to add believable struct/enum source files now, or keep current example shape and omit struct/enum acceptance rows if Graph Scope hides irrelevant capabilities.
  - Whether Coder should reuse the older `codex/193-c-upgrade` findings manually, after inspecting them, or ignore that lane to avoid stale assumptions.
- Recommended next route: Coder.

### 2026-06-12T20:31:11Z - Orchestrator Public Specifier Update

- Pushed Specifier commit `5258170f`.
- Updated PR #275 body with current route, Specifier plan path, validation status, and human gate.
- Added PR comment: https://github.com/joesobo/CodeGraphyV4/pull/275#issuecomment-4695135501
- Added Trello comment `6a2c6c7c90e25905ba5b8f2b`.
- Current route remains: Coder.

### 2026-06-12T20:31:53Z - Orchestrator Thread Pin

- Confirmed current Orchestrator thread title: `🎻 Orchestrator - C# Upgrade`.
- Pinned thread `019ebd80-2229-7043-b702-26aa5ee3fa7d`.
- Current route remains: Coder.
