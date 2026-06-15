# 201 C# Upgrade Handoff

## Current State

- State: routing back to Specifier
- Source: Trello card 201, C# Upgrade, https://trello.com/c/rSYGlC3d/201-c-upgrade
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/277
- Trello: `In Progress`
- Human gate: acceptance contract not approved; acceptance spec Markdown may be changed locally for human review, but must not be treated as accepted until the human approves it.
- Active role: Specifier return
- Next route: Specifier applies local reviewable acceptance-spec modifications/creations, then Orchestrator verifies and pauses for human review again.

## Setup Context

- Request: start a fresh orchestrator loop for Trello card 201, the C# upgrade.
- Protected checkout: `/Users/poleski/Desktop/Projects/CodeGraphyV4` remains on `main`; all branch work is isolated in the worktree above.
- Prior branch state: no active local or remote `codex/201-csharp-upgrade` branch found before setup; prior PRs on that head are closed.
- Card summary: upgrade `examples/example-csharp` into a believable small C# demo, audit current C# support, make the example demonstrate every supported visible C# graph feature, and add acceptance coverage after the example/support contract is clear.
- Card labels: `Examples`, `Plugin`, `C# Plugin`.
- Current implementation inventory from setup read:
  - Core Tree-sitter owns C# analysis.
  - `packages/plugin-csharp` currently contributes C# metadata, supported extension, default filters, and no supplemental analysis hooks.
  - C# Graph Scope capabilities currently declare edge types `Imports`, `References`, `Calls`, and `Inherits`.
  - C# node type capabilities currently declare `Function`, `Class`, `Interface`, `Struct`, and `Enum`.
- Current acceptance state:
  - `packages/extension/tests/acceptance/specs/csharp-example.md` covers file nodes and edge toggles only.
  - C and C++ specs include richer node-toggle coverage patterns to follow.
- CodeGraphy MCP status from protected checkout: Graph Cache exists but is stale because of pending changed files.

## Context Read

- `AGENTS.md`
- `CONTEXT.md`
- `docs/agents/acceptance-specs.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/loops/orchestrator.md`
- `docs/agents/loops/specifier.md`
- `docs/agents/loops/coder.md`
- `docs/agents/loops/refactorer.md`
- `docs/agents/loops/architect.md`
- `/Users/poleski/.codex/agents/orchestrator.toml`
- `docs/adr/0001-typescript-project-resolution-belongs-to-plugin-analysis.md`
- `packages/extension/tests/acceptance/specs/csharp-example.md`
- `packages/extension/tests/acceptance/specs/c-example.md`
- `packages/extension/tests/acceptance/specs/cpp-example.md`
- `packages/core/src/treeSitter/runtime/capabilities.ts`
- `packages/plugin-csharp/src/plugin.ts`
- `packages/plugin-csharp/tests/plugin.test.ts`
- `examples/example-csharp/**`

## Event History

### 2026-06-15 Orchestrator Setup

- Created isolated worktree on fresh `codex/201-csharp-upgrade` branch from `origin/main`.
- Fetched Trello card 201 and confirmed there are no card comments.
- Confirmed prior GitHub PRs for this head branch are closed and no active branch exists.
- Began setup before role dispatch, per the orchestrator loop.
- Opened draft PR 277: https://github.com/joesobo/CodeGraphyV4/pull/277.
- Moved Trello card 201 to `In Progress`.
- Added Trello breadcrumb comment with branch, worktree, PR, handoff, and current loop state.

### 2026-06-15 Grill-With-Docs Pause

- Moved Trello card 201 to `Review` while waiting on the first human alignment decision.
- Posted Trello pause breadcrumb.
- First question: should the C# acceptance contract stay limited to currently declared visible C# capabilities (`Function`, `Class`, `Interface`, `Struct`, `Enum`; `Imports`, `References`, `Calls`, `Inherits`), or should this loop include a planned C# variable-node capability expansion too?
- Orchestrator recommendation: keep this loop limited to currently declared visible C# capabilities, and create follow-up Plugin/Core cards for variable-node support if the support audit shows C# variable extraction is worth adding.

### 2026-06-15 Human Alignment Decision

- Human decision: start by upgrading `examples/example-csharp` into a strong C# project example, but only after auditing what C# Tree-sitter support can actually provide.
- The Specifier should frame the example around the supportable C# Tree-sitter surface, then identify whether current CodeGraphy support matches that supportable surface.
- If there are gaps between supportable Tree-sitter-backed C# constructs and current CodeGraphy capability declarations or extraction, this loop should include the required support upgrade before acceptance coverage is finalized.
- Acceptance spec Markdown comes after the example/support contract is clear and should be based on the upgraded C# example plus all supported C# capabilities.
- The Coder later owns implementing the approved acceptance support, generated tests, unit tests, and production changes needed to make the contract pass.

### 2026-06-15 Human Alignment Decision: Tree-Sitter Boundary

- Human decision: out-of-box C# support in this loop should cover everything CodeGraphy can reasonably support from Tree-sitter, not everything in the C# language.
- The support target explicitly includes Tree-sitter-derived symbols, variables, and edges.
- Full C# semantic/project support is out of scope for the built-in baseline unless it is already available through Tree-sitter-backed extraction.
- Future custom or user-provided C# plugins may add richer language or project semantics later.

### 2026-06-15 Human Alignment Decision: Example Shape

- Human decision: upgrade `examples/example-csharp` into one cohesive, believable C# project.
- The project should naturally cover all C# features CodeGraphy supports out of the box through Tree-sitter.
- The example should not become a syntax museum or a collection of isolated feature files; feature coverage should come from a real small project shape.

### 2026-06-15 Human Alignment Decision: Specifier Scope

- Human decision: the Specifier should not treat current CodeGraphy behavior as the support boundary.
- The Specifier researches what CodeGraphy should support for C# from Tree-sitter, then drafts the acceptance contract and tests around that target behavior.
- Current CodeGraphy behavior is input evidence for the gap audit, not a constraint on the desired C# support contract.
- Human-owned acceptance spec Markdown still requires explicit human approval before it is committed or treated as accepted.

### 2026-06-15 Human Alignment Decision: Specifier Research Artifact

- Human decision: the Specifier should produce a small support matrix before drafting the C# example and acceptance contract.
- The matrix should cover Tree-sitter-derived C# `symbols`, `variables`, and `edges`.
- Each row should be classified as `in acceptance`, `implementation gap`, or `follow-up`.
- The matrix should cite evidence from Tree-sitter C# grammar or official language docs, plus CodeGraphy current analyzer behavior when relevant.

### 2026-06-15 Human Alignment Decision: Specifier Example Ownership

- Human decision: the Specifier may update `examples/example-csharp` source and README files during its pass.
- The example is part of the acceptance contract foundation for this loop, so the Specifier owns shaping it around the researched C# Tree-sitter support surface.
- Human-owned acceptance spec Markdown remains gated: the Specifier may propose changes but must not commit `packages/extension/tests/acceptance/specs/**/*.md` without explicit human approval.

### 2026-06-15 Human Alignment Decision: Follow-Up Classification

- Human decision: the Specifier should include the Tree-sitter-backed C# constructs it is confident are useful CodeGraphy behavior.
- If a technically extractable construct is weird, low-value, noisy, or otherwise not worth forcing into the example, the Specifier may leave it out.
- Left-out constructs should be listed in the support matrix or handoff with the reason so the human can decide during example and acceptance review.

### 2026-06-15 Specifier Dispatch

- Human grill-with-docs alignment resolved.
- Moved Trello card 201 back to `In Progress` and posted dispatch breadcrumb.
- Worktree status before dispatch: clean on `codex/201-csharp-upgrade`.
- Specifier inputs include repo role contract `docs/agents/loops/specifier.md` and Codex role setup `/Users/poleski/.codex/agents/specifier.toml`.
- Bounded Specifier task: research Tree-sitter-backed C# symbols, variables, and edges; upgrade `examples/example-csharp` into one cohesive real C# project; produce support matrix; propose human-owned acceptance spec Markdown after the example/support contract is clear.
- Stopping condition: return to Orchestrator with support matrix, example changes, proposed acceptance contract or spec diff, acceptance impact scan, human approval status, and open questions. Do not commit `packages/extension/tests/acceptance/specs/**/*.md`.

### 2026-06-15 Specifier Handoff

- result: needs human acceptance.
- Plan/contract path: `docs/plans/201-csharp-upgrade-specifier-contract.md`.
- Human-owned acceptance spec Markdown status: not edited, not committed. `packages/extension/tests/acceptance/specs/csharp-example.md` is stale against the upgraded example and must be updated only after human approval.
- Public research sources used:
  - Tree-sitter C# grammar repo: https://github.com/tree-sitter/tree-sitter-c-sharp
  - Tree-sitter `grammar.js`: https://github.com/tree-sitter/tree-sitter-c-sharp/blob/master/grammar.js
  - Microsoft C# OOP overview/classes/structs/records: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/
  - Microsoft C# classes spec: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes
  - Microsoft C# types spec: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types
  - Microsoft C# identifier/naming docs: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names
- CodeGraphy evidence read:
  - `packages/core/src/treeSitter/runtime/capabilities.ts`
  - `packages/core/src/treeSitter/runtime/analyzeCSharp/**`
  - `packages/core/src/treeSitter/runtime/csharpIndex/**`
  - `packages/core/tests/treeSitter/csharp*/**`
  - `packages/plugin-csharp/src/plugin.ts`
  - `packages/plugin-csharp/tests/plugin.test.ts`
- Support matrix summary:
  - `in acceptance`: classes, interfaces, structs, enums, methods as Function nodes, namespace import edges from ordinary `using` directives to resolved local C# types, inherits edges from base classes/interfaces, reference edges from object creation/static member access, and call edges from object creation/static member invocation/simple inherited calls.
  - `implementation gap`: file-to-symbol `Contains` edges for C#, richer type-reference edges from declarations, and C# variable nodes for fields, constants, parameters, and ordinary locals. These are Tree-sitter-backed and useful enough to include in the target contract, but current C# capabilities/extraction do not yet support them.
  - `follow-up`: namespace nodes, records, delegates, properties, events, accessors, indexers, operators, constructors/destructors, extension declarations, instance member calls through local variables or fields, override edges, using aliases/static usings/extern aliases, partial type merging, and top-level statements. These are parseable or partially inferable, but they are noisy, low-value for this example, or need a separate product/semantic decision.
- Example source/README changes:
  - Replaced the old `MyApp` utility/service sample with a cohesive `BeaconDispatch` workflow.
  - New source shape:
    - `src/Program.cs`
    - `src/Contracts/IDispatchRunner.cs`
    - `src/Domain/DispatchPriority.cs`
    - `src/Domain/DispatchRequest.cs`
    - `src/Domain/DispatchTicket.cs`
    - `src/Presentation/DispatchReport.cs`
    - `src/Services/DispatchQueue.cs`
    - `src/Services/DispatchRunner.cs`
    - `src/Services/RunnerBase.cs`
  - Removed old source files:
    - `src/Config.cs`
    - `src/Orphan.cs`
    - `src/Contracts/IRunner.cs`
    - `src/Services/ApiService.cs`
    - `src/Services/BaseService.cs`
    - `src/Utils/Formatter.cs`
    - `src/Utils/Helpers.cs`
  - `examples/example-csharp/README.md` now documents the project shape, target graph surface, current support notes, and follow-up exclusions.
  - `examples/README.md` now describes the new C# example.
- Proposed acceptance contract:
  - Draft content lives in `docs/plans/201-csharp-upgrade-specifier-contract.md`.
  - Proposed edge capabilities: only `Imports`, `References`, `Calls`, `Inherits`, and `Contains`.
  - Proposed C# node capabilities: only `Function`, `Class`, `Interface`, `Struct`, `Enum`, `Field`, `Constant`, `Parameter`, and `Local`.
  - Proposed file-node baseline: `12` nodes and `0` connections with all edge types hidden, excluding CodeGraphy's own `.codegraphy/settings.json`.
  - Proposed all-symbol/variable target: `61` nodes and `49` `Contains` connections when File plus all C# symbol/variable node types and `Contains` are enabled.
  - The exact counts in the draft are part of the proposed contract; Coder should prove or adjust them through the failing acceptance test and graph output before final approval.
- Acceptance impact scan summary:
  - Directly affected: `packages/extension/tests/acceptance/specs/csharp-example.md` references old files, old counts, and the old limited C# capability list.
  - Intentionally unaffected: `packages/extension/tests/acceptance/specs/c-example.md` and `packages/extension/tests/acceptance/specs/cpp-example.md`; they remain pattern references.
  - Other acceptance specs using `examples/example-typescript` or other language examples are unaffected.
- Human approval status:
  - Pending. Human must approve replacing the C# acceptance spec Markdown before any agent commits changes under `packages/extension/tests/acceptance/specs/**/*.md`.
- Open questions:
  - Should `record_declaration` map to Class/Struct nodes in a later C# follow-up, or should CodeGraphy add a Record node type?
  - Should C# constructor declarations become Function nodes later, or remain hidden unless a constructor-specific node type is introduced?
  - Should instance member calls through local/field types become a separate shallow type-flow feature after this Tree-sitter baseline upgrade?
- Safety note:
  - During the Specifier pass, an initial absolute-path omission caused example edits to land briefly in the protected checkout. The Specifier immediately restored the tracked files with `git restore`, moved the untracked created files to Trash with `trash`, and verified the protected checkout returned to a clean status before continuing in the isolated worktree.

### 2026-06-15 Orchestrator Receipt Of Specifier Handoff

- Verified Specifier commit on branch and remote: `4bdd0f059 specifier: define csharp upgrade contract`.
- Verified worktree status: clean on `codex/201-csharp-upgrade`.
- Verified protected checkout status: clean on `main`.
- Verified no human-owned acceptance spec Markdown changed: `git diff --name-only origin/main...HEAD -- 'packages/extension/tests/acceptance/specs/**/*.md'` returned no paths.
- Reviewed proposed contract path: `docs/plans/201-csharp-upgrade-specifier-contract.md`.
- Reviewed changed example source/README shape under `examples/example-csharp`.
- Verification run by Orchestrator:
  - `pnpm run check:acceptance-specs` passed.
  - Temporary `.NET` build of `examples/example-csharp/src` passed with `0 Warning(s)` and `0 Error(s)`.
- Moved Trello card 201 to `Review` and posted verification breadcrumb.
- Current human gate: human must approve the example/support contract and proposed C# acceptance spec before the Coder lane may begin.

### 2026-06-15 Human Correction: Review Artifact Must Be Local Changes

- Human correction: the acceptance gate is not for approving a docs/plans-only proposal.
- The Specifier is expected to make reviewable local modifications or creations, then the human reviews those file changes.
- Route back to the existing Specifier lane to apply the C# acceptance-spec changes locally.
- Acceptance spec Markdown remains unaccepted until the human approves it, even though the Specifier may now modify it locally for review.
- Moved Trello card 201 back to `In Progress` and posted routing breadcrumb.
