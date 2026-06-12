# Trello 201: C# Upgrade

## Current State

- State: dispatching Coder for example/source and red-first Core gap work.
- Trello: [C# Upgrade](https://trello.com/c/rSYGlC3d), moved to In Progress on 2026-06-12.
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- PR: [#276](https://github.com/joesobo/CodeGraphyV4/pull/276) draft.
- Next route: Coder.

## Human Gates

- Human-owned acceptance spec Markdown under `packages/extension/tests/acceptance/specs/` must not be edited, created, renamed, deleted, or committed without explicit approval.
- This card asks to add or update the C# example acceptance spec only after the support contract is clear, so Specifier should prepare the acceptance shape and pause for approval before any spec Markdown change.
- VS Code Playwright acceptance and mutation work should run on `codegraphy-mini` unless the human explicitly approves local focus-stealing runs.

## Request

Start Trello card `https://trello.com/c/rSYGlC3d/201-c-upgrade`, then follow `docs/agents/codegraphy-loop.md`.

## Trello Card Summary

Goal: upgrade `examples/example-csharp` so C# feels like a real, focused CodeGraphy demo project and has acceptance coverage that proves visible graph behavior.

Important card requirements:

- Treat this as a support audit before fixture polish.
- Review official C# docs and the C# parser/plugin surface currently in use.
- Inventory current C# symbols, variables, and edges emitted by CodeGraphy.
- Compare that inventory to Graph Scope when opening `examples/example-csharp`.
- Separate capability gaps by generic Core Tree-sitter behavior, plugin-owned behavior, and out-of-scope language-specific semantics.
- Make `examples/example-csharp` a believable small project that intentionally demonstrates every visible supported C# node and edge toggle.
- Keep README/settings honest about current support and known limitations.
- Follow the C and C++ acceptance pattern, including toggle behavior and stable node/connection counts.
- Run focused analyzer/plugin tests, focused generated VS Code acceptance for `examples/example-csharp`, mutation for touched production files when required, and organize/typecheck/lint gates before review.

## Setup Context Read

- `AGENTS.md`
- `CONTEXT.md`
- `docs/agents/codegraphy-loop.md`
- `docs/agents/loops/orchestrator.md`
- `docs/agents/loops/specifier.md`
- `docs/agents/loops/coder.md`
- `docs/agents/loops/refactorer.md`
- `docs/agents/loops/architect.md`
- `docs/agents/acceptance-specs.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`
- `packages/extension/tests/acceptance/README.md`
- `packages/extension/tests/acceptance/specs/csharp-example.md`
- `packages/extension/tests/acceptance/specs/c-example.md`
- `packages/extension/tests/acceptance/specs/cpp-example.md`
- `examples/example-csharp/README.md`
- `examples/example-csharp/src/**/*.cs`
- `packages/plugin-csharp/src/plugin.ts`
- `packages/plugin-csharp/tests/plugin.test.ts`
- `packages/plugin-csharp/codegraphy.json`
- `packages/plugin-csharp/README.md`
- repo search for C# analyzer and acceptance references

## Initial Observations

- The C# plugin is currently metadata-only: it contributes supported extensions, C# ecosystem default filters, and empty file colors. Core Tree-sitter Analysis owns baseline C# analysis.
- Core C# analysis lives under `packages/core/src/treeSitter/runtime/analyzeCSharp` with a C# workspace index under `packages/core/src/treeSitter/runtime/csharpIndex`.
- Existing C# acceptance coverage checks file nodes and file-level Imports, References, Inherits, and Calls edge toggles.
- The newer C and C++ acceptance specs include deeper Graph Scope coverage for language node types, Contains edges, symbol nodes, and stable counts. The current C# spec does not yet follow that richer shape.
- The current C# example README describes a small namespace/type-usage workspace and a symbol node demo, but the acceptance spec does not yet prove the symbol-node behavior described there.
- The protected main checkout had an existing modified generated acceptance file before this worktree was created. It was not touched by this loop setup.

## Event Log

### 2026-06-12T20:51:39Z - Orchestrator Setup

- Read loop, tracker, role, acceptance, domain, example, plugin, and nearby acceptance context.
- Fetched the Trello card and confirmed it had no comments.
- Moved the Trello card from Todo to In Progress.
- Created isolated worktree `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4` on branch `codex/201-csharp-upgrade` from `origin/main`.
- Recorded setup context and human gates.
- Current blocker before first role dispatch: pre-role alignment is required because the card is language-support, acceptance-spec, and support-audit sensitive.

### 2026-06-12T20:55:00Z - Draft PR Published

- Pushed branch `codex/201-csharp-upgrade`.
- Opened draft PR [#276](https://github.com/joesobo/CodeGraphyV4/pull/276).
- Next action remains the pre-role alignment gate before dispatching Specifier.

### 2026-06-12T21:02:00Z - Alignment Scope Clarified

- Human decision: keep all C# upgrade work in this loop rather than spinning off the main C# support upgrades immediately.
- Ordered scope: first make `examples/example-csharp` look like expected C# support, matching expected Tree-sitter-supported nodes and edges; then make acceptance tests match that expected example.
- Implication for first route: Specifier should inventory the expected C# Tree-sitter node and edge capabilities, compare those to the current example, and draft the acceptance contract around the upgraded example shape before any human-owned spec Markdown is edited.

### 2026-06-12T21:08:00Z - Specifier Dispatch

- Dispatching Specifier with the clarified scope.
- Relevant current C# Core surface: `packages/core/src/treeSitter/runtime/analyzeCSharp` emits `class`, `interface`, `enum`, and `method` symbols plus Imports, References, Calls, and Inherits relations. The C# plugin is metadata-only.
- Specifier stopping condition: return an acceptance contract and example-shape plan, including whether human-owned `packages/extension/tests/acceptance/specs/csharp-example.md` needs an approved edit before Coder runs.

### 2026-06-12T21:40:00Z - Specifier Inventory And Contract

- Result: needs human acceptance before spec Markdown edits.
- Plan path: `docs/plans/201-csharp-upgrade-specifier-plan.md`.
- Inventory result:
  - Core Tree-sitter C# owns C# analysis; `packages/plugin-csharp` is metadata-only and contributes supported extension/default-filter settings only.
  - Current C# edge capability metadata advertises `Imports`, `References`, `Calls`, and `Inherits`.
  - Current C# symbol node capability metadata advertises `Function`, `Class`, `Interface`, `Struct`, and `Enum`.
  - C# method declarations are emitted with symbol kind `method`, but the product Graph Scope row for C# is `Function` because `symbol:function` matches both `function` and `method`. C# does not currently advertise the narrower `Method` node type.
  - Analyzer tests prove C# can emit class/interface/struct/enum/method symbols, resolved namespace `Imports`, uppercase type `References`, object/static/inherited `Calls`, and base-list `Inherits`.
- Example-shape plan:
  - Keep all C# upgrade work in this loop.
  - Reshape `examples/example-csharp` into a small file-scoped-namespace task-runner/service demo.
  - Add explicit struct and enum source files, likely `src/Models/RunRequest.cs` and `src/Models/RunStatus.cs`, so every advertised C# symbol node type is visible.
  - Keep representative classes/interfaces/methods: `Program`, `Config`, `ApiService`, `BaseService`, `IRunner`, `Helpers`, `Formatter`, and one intentional orphan class.
  - Keep file relationships deliberate: Program resolves/calls Config, ApiService, RunRequest/RunStatus, and Helpers; ApiService inherits BaseService and implements IRunner; Helpers calls Formatter; ApiService calls an inherited BaseService method.
  - Update README/settings honestly around Core Tree-sitter C# support and the metadata-only C# plugin.
- Acceptance contract:
  - Update `packages/extension/tests/acceptance/specs/csharp-example.md` only after human approval.
  - Follow the C/C++ pattern with one file-relationship scenario and one symbol-node scenario.
  - File scenario should assert available C# edge types, stable no-edge and per-edge counts, and representative file edges for Imports, References, Inherits, and Calls.
  - Symbol scenario should assert available C# node types are only Function, Class, Interface, Struct, and Enum; Method and Type should not be available for this C# example.
  - Symbol scenario should prove each supported C# symbol node type with visible graph assertions and use `Contains` to prove file-to-symbol projection.
  - Red-first gap to verify: if `Contains` is unavailable for the upgraded C# symbol scenario, Coder should add the smallest Core capability test/fix that exposes `Contains` consistently with C# symbol nodes.
- Acceptance impact scan:
  - Directly affected human-owned spec: `packages/extension/tests/acceptance/specs/csharp-example.md`.
  - Likely generated/tooling after approval: `packages/extension/tests/playwright-vscode/generated/acceptance.spec.ts`.
  - Potential fixture/docs edits: `examples/example-csharp/README.md`, `examples/example-csharp/src/**/*.cs`, `examples/example-csharp/.codegraphy/settings.json`, and `examples/README.md`.
  - Intentionally unaffected specs: `c-example.md`, `cpp-example.md`, and generic Graph Scope specs unless Coder changes shared Graph Scope capability behavior for `Contains`.
- Human approval status: required before editing human-owned acceptance spec Markdown.
- Open questions:
  - Should Orchestrator treat the approval already given in this thread ("then we make sure the acceptance tests match the expected example") as permission to edit `packages/extension/tests/acceptance/specs/csharp-example.md`, or pause for an explicit spec-Markdown approval because the loop docs require it?
  - Should Coder make the example source update first and return measured counts before the spec Markdown is edited, or should the approved spec draft lead with expected names and allow Coder to fill counts after the example is implemented?
- Exact files inspected are listed in `docs/plans/201-csharp-upgrade-specifier-plan.md`.

### 2026-06-12T21:55:00Z - Orchestrator Receives Specifier

- Verified Specifier commit `53c72492` on `origin/codex/201-csharp-upgrade`.
- Closed completed Specifier subagent.
- Routing to Coder for the first implementation slice:
  - update `examples/example-csharp` source/README/settings so the example visibly demonstrates expected current C# Tree-sitter-supported nodes and edges;
  - verify the red-first `Contains` capability gap and add the smallest Core test/fix if needed;
  - measure expected node/edge counts for the upgraded example.
- Human-owned acceptance spec Markdown remains gated until the upgraded example is measured and the proposed spec update is concrete.
