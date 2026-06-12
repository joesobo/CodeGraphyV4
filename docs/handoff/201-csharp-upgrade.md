# Trello 201 C# Upgrade Handoff

## Current State

- State: Specifier completed the support audit. The loop is paused for human acceptance review before any C# acceptance spec Markdown change or Coder implementation pass.
- Trello card: https://trello.com/c/rSYGlC3d/201-c-upgrade
- Card title: C# Upgrade
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/271
- Heavy-check host: not prepared yet; prepare `codegraphy-mini` lazily when a role actually needs VS Code Playwright, mutation, or another long focus-stealing check.
- Next route: wait for human decisions on the C# acceptance direction, then route into Coder with the approved contract.

## Human Gates

- Grill before implementation: complete. The accepted working shape is the same `showcase now` / `reasonable Core upgrade` / `out of scope` support-matrix pattern used in the C++ pilot.
- Human-owned acceptance spec Markdown remains a hard gate. Any edits to `packages/extension/tests/acceptance/specs/csharp-example.md` may be drafted locally for review, but must not be committed or pushed until the user explicitly approves them.
- Human review is now required on the Specifier contract before Coder work starts. The open decisions are whether this card should include the small Core `Method` capability fix and whether the upgraded example should stay source-only or include a `.csproj` for realism.
- If a separate local plan is needed after concept alignment, it should live under `docs/plans/`, with a path like `docs/plans/2026-06-12-trello-201-csharp-upgrade.md`.

## Setup Verification

- `AGENTS.md`, `CONTEXT.md`, `docs/agents/codegraphy-loop.md`, the role loop contracts, `docs/agents/acceptance-specs.md`, and `docs/agents/issue-tracker.md` were read before setup.
- Trello card `rSYGlC3d` is open, titled `C# Upgrade`, currently in `Todo`, and already frames this work as a support audit first, then example/acceptance work.
- Protected checkout `/Users/poleski/Desktop/Projects/CodeGraphyV4` remained on `main` while the isolated worktree was created.
- No existing `codex/201-csharp-upgrade` branch or `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4` worktree existed before setup.
- The isolated worktree was created from `origin/main` at `9f1e73ce`.
- Local `codegraphy status .` reports the Graph Cache is present but stale because of `pending-changed-files`.
- The current C# acceptance contract is still the older single-scenario file-edge flow in `packages/extension/tests/acceptance/specs/csharp-example.md`, not the newer C/C++ split pattern.
- The current `examples/example-csharp` workspace is functional but still reads like a synthetic demo rather than a believable small C# project.
- The source-thread history shows this orchestrator thread already exists as `🎻 Orchestrator - C# Upgrade` and was created/pinned before delegation into this run.

## Event Log

### 2026-06-12T18:07:04Z - Orchestrator Context And Setup Scan

- Source: delegated request to run the CodeGraphy Loop for Trello card 201 as the next manual loop after the C++ pilot.
- Target: Orchestrator.
- Result: verified loop docs, prior pilot conventions, Trello card scope, protected checkout state, and the current C# example/acceptance baseline.
- Files changed: none.
- Evidence:
  - Trello card scope explicitly calls for a support audit, believable example upgrade, Graph Scope toggle proof, and acceptance coverage.
  - The current C# example exposes file-level Imports, References, Calls, and Inherits coverage, but its example shape still looks like a hand-authored demo fixture.
  - The current acceptance spec is human-owned Markdown and therefore requires explicit user approval before any commit or push that includes spec edits.
- Open blocker:
  - Initial grill-with-docs alignment is still active before Specifier dispatch.

### 2026-06-12T18:07:04Z - Orchestrator Branch And Worktree Setup

- Source: Orchestrator.
- Target: git worktree setup.
- Result: isolated worktree and branch created successfully from `origin/main`.
- Files changed: this handoff file.
- Commands run:
  - `git fetch origin main`
  - `git worktree add -b codex/201-csharp-upgrade /Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4 origin/main`
- Evidence:
  - Protected checkout stayed on `main`.
  - New worktree path is `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`.
  - New branch is `codex/201-csharp-upgrade`.
- Open blocker:
  - Draft PR and Trello sync are still pending the initial setup commit.

### 2026-06-12T18:07:04Z - Orchestrator Draft PR Setup

- Source: Orchestrator.
- Target: GitHub draft PR setup.
- Result: draft PR opened successfully.
- PR: https://github.com/joesobo/CodeGraphyV4/pull/271
- Files changed: this handoff file.
- Commands run:
  - `git add docs/handoff/201-csharp-upgrade.md`
  - `git commit -m "orchestrator: start C# upgrade loop"`
  - `git push -u origin codex/201-csharp-upgrade`
  - `gh pr create --draft --base main --head codex/201-csharp-upgrade --title "Trello 201: C# Upgrade" ...`
- Evidence:
  - Setup commit `ab1711d4` created the branch-visible handoff checkpoint.
  - Draft PR #271 now tracks the isolated worktree branch.
- Open blocker:
  - Trello sync and the initial grill-with-docs alignment are still pending.

### 2026-06-12T18:07:04Z - Orchestrator Trello Sync

- Source: Orchestrator.
- Target: Trello card state and visible loop status.
- Result: Trello card moved to `In Progress` and annotated with PR/worktree/handoff details.
- Trello update:
  - Card moved to `In Progress`.
  - Comment added with PR `#271`, branch, worktree path, handoff path, and the active grill/acceptance gate.
- Files changed: this handoff file.
- Commands run:
  - `curl -s -X PUT "https://api.trello.com/1/cards/6a2b3d5a761a154a15731865?..."`
  - `curl -s -X POST "https://api.trello.com/1/cards/6a2b3d5a761a154a15731865/actions/comments?..."`
- Evidence:
  - Card `rSYGlC3d` now matches the loop's running state.
  - Review-sensitive acceptance spec work is visible to the user from the card comment before any spec edits are proposed.
- Open blocker:
  - Initial grill-with-docs alignment is still active before Specifier dispatch.

### 2026-06-12T18:09:41Z - Orchestrator Dispatch To Specifier

- Source: Orchestrator.
- Target: `🪶 Specifier - C# Upgrade` (`019ebd06-5643-7d50-b6fc-655f68a43e23`).
- Reason for dispatch: the loop setup is complete and the next default-route need is a bounded support audit plus acceptance-contract direction for the C# upgrade.
- Input scope:
  - work only in `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
  - read loop docs, acceptance ownership rules, current C# example files, and current C# acceptance spec
  - produce a `showcase now` / `reasonable Core upgrade` / `out of scope` support matrix
  - propose 2-3 believable C# project concepts mapped to visible Graph Scope toggles
  - recommend one concept and the smallest acceptance-contract direction to match the newer C/C++ pattern
- Expected role output:
  - Specifier handoff entry in this file with result, acceptance direction, example recommendation, files changed, human approval status, and open questions
- Human gates that apply:
  - any acceptance spec Markdown edits must stay local for review and must not be committed or pushed without explicit user approval
  - the loop should pause if the Specifier concludes the contract cannot move forward without a human concept or scope choice

### 2026-06-12T18:11:05Z - Specifier Support Audit And Acceptance Direction

- Source: Specifier.
- Target: C# support audit and acceptance-contract direction.
- Result: needs human acceptance for spec Markdown; support direction is ready for Orchestrator review.
- Files changed: this handoff file only.
- Evidence reviewed:
  - `examples/example-csharp/**`
  - `packages/extension/tests/acceptance/specs/csharp-example.md`
  - `packages/extension/tests/acceptance/specs/c-example.md`
  - `packages/extension/tests/acceptance/specs/cpp-example.md`
  - `packages/core/src/treeSitter/runtime/analyzeCSharp/**`
  - `packages/core/src/treeSitter/runtime/csharpIndex/**`
  - `packages/core/src/treeSitter/runtime/capabilities.ts`
  - `packages/plugin-csharp/src/plugin.ts`
  - `packages/plugin-csharp/codegraphy.json`
  - `packages/plugin-csharp/README.md`
  - Existing C# unit/integration coverage under `packages/core/tests/treeSitter/csharp*` and nearby pipeline tests.
  - Official C# docs: Microsoft Learn `using` directive, `namespace`, C# classes/specification, structs, interfaces, and namespaces/file-scoped namespace guidance.
- Support matrix:
  - Showcase now:
    - File nodes for a small `.cs` workspace plus structural project files.
    - Core C# edge capabilities: `Imports`, `References`, `Calls`, and `Inherits`.
    - `Imports` from local `using` namespaces when a referenced type resolves inside that namespace.
    - `References` for resolvable uppercase type/member-access and object-creation targets such as `Config`, `ApiService`, `Helpers`, and `Formatter`.
    - `Calls` for resolvable object creation, static member calls, and single-base inherited method calls.
    - `Inherits` from base-list entries, including implemented interfaces in file-level graph output.
    - Type symbols for `Class`, `Interface`, `Struct`, and `Enum`, plus `Contains` edges when symbol scope is enabled.
  - Reasonable Core upgrade:
    - Align C# method support with Graph Scope: Core currently emits C# method symbols but advertises `symbol:function`, not `symbol:method`, so a C# Method row/acceptance proof needs a red test and a capability fix.
    - Add a first-class C# `Namespace` symbol node if we want modern file-scoped namespaces to be visible like the C++ pilot.
    - Improve using support for `using static`, `using Alias = Type`, global using, and fully qualified or alias-qualified names.
    - Improve type support for records, delegates, events, properties/fields, nested types, partial declarations, generic type/member names, and nullable/generic normalization beyond the current first-name heuristic.
    - Add override/interface-implementation semantics only after Core can reliably resolve member declarations across class/interface inheritance.
  - Out of scope for this card:
    - Roslyn-grade semantic resolution, MSBuild or `.csproj` compilation context, NuGet/package graph resolution, analyzer diagnostics, generated-source analysis, async/LINQ dataflow, attribute semantics, and complete overload/generic binding.
    - Marketing or docs claims that C# support is project-aware beyond the audited Core Tree-sitter baseline.
- Believable C# project concepts:
  - Job Queue Runner:
    - `Program` wires a queue, `JobRunner` calls a worker, `ConsoleWorker : Worker, IWorker`, `JobConfig.Load`, `JobFormatter.Format`.
    - Naturally demonstrates `Imports`, `References`, `Calls`, `Inherits`, `Contains`, `Class`, `Interface`, and optionally `Struct`/`Enum`.
  - Invoice Console App:
    - `Program` loads `InvoiceConfig`, constructs `InvoiceService`, formats invoice lines through `MoneyFormatter`, and implements `IInvoiceExporter`.
    - Naturally demonstrates `Imports`, `References`, `Calls`, `Inherits`, `Contains`, `Class`, `Interface`, `Struct` for `Money`, and `Enum` for invoice status.
  - Health Check Dashboard:
    - `Program` composes `HealthCheckRunner`, service checks inherit from `BaseHealthCheck` and implement `IHealthCheck`, output goes through `ReportFormatter`.
    - Naturally demonstrates `Imports`, `References`, `Calls`, `Inherits`, `Contains`, `Class`, `Interface`, and `Enum`.
- Recommendation:
  - Use the Job Queue Runner concept. It is the closest C# analogue to the accepted C++ Task Queue Runner pilot, but smaller and credible as a console-style `.NET` example without needing `.csproj` or NuGet semantics.
  - Keep the first acceptance-contract direction modest: split the C# spec into the newer C/C++ pattern with one file-level edge scenario and one symbol-scope scenario.
  - File-level scenario should assert available edge types are only `Imports`, `References`, `Calls`, `Inherits`; keep `Contains` for the symbol scenario, not the edge capability list.
  - Symbol scenario should prove `Class`, `Interface`, `Struct`, and `Enum` rows plus `Contains` relationships. Do not promise `Method` until the Core capability mismatch is fixed.
  - If Coder chooses to fix the method capability mismatch in this card, the red test should start at `packages/core/src/treeSitter/runtime/capabilities.ts`/Graph Scope visibility before adding a `Method` acceptance assertion.
- Acceptance draft / contract direction:
  - Human-owned Markdown change needed: yes, `packages/extension/tests/acceptance/specs/csharp-example.md` should change after human approval.
  - Draft direction, not applied:
    - Scenario 1: `C# example covers Job Queue Runner file graph scope`.
      - Open `examples/example-csharp`, index, show no edge types, assert file count for the upgraded example.
      - Assert available edge types are only `Imports`, `References`, `Calls`, `Inherits`.
      - Toggle each of those edge types one at a time and assert only the representative, locally resolvable relationships.
    - Scenario 2: `C# example exposes supported type symbols when symbol scope is enabled`.
      - Show only File plus each supported type node row: `Class`, `Interface`, `Struct`, `Enum`.
      - Assert one recognizable symbol per row from the Job Queue Runner.
      - Enable `Contains` and assert file-to-symbol relationships.
      - Leave `Method`, `Namespace`, `Field`, `Property`, `Parameter`, `Local`, `Overrides`, and generic/partial semantics out of this acceptance contract unless Core work is explicitly approved.
- Acceptance impact scan:
  - Directly affected: `packages/extension/tests/acceptance/specs/csharp-example.md`, generated acceptance output, and any step bindings/count fixtures touched by new C# node assertions.
  - Pattern references reviewed: `c-example.md` and `cpp-example.md`.
  - No unrelated spec appears to reference current C# file names beyond the generated acceptance file and C# example-specific workspace handling.
- Human approval status:
  - Pending. Do not commit or push acceptance spec Markdown changes until the human explicitly approves the C# acceptance draft.
- Open questions:
  - Should this card include the small Core capability fix for C# `Method` node visibility, or should the first pass intentionally stop at supported type symbols?
  - Should the example include a `.csproj` for realism while keeping `.csproj` semantics out of the graph contract, or stay as a source-only workspace like the current example?
