# Trello 201 C# Upgrade Handoff

## Current State

- State: Waiting on human acceptance review of the locally drafted C# acceptance spec update before any commit or push can include that Markdown.
- Trello card: https://trello.com/c/rSYGlC3d/201-c-upgrade
- Card title: C# Upgrade
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/273
- Heavy-check host: `codegraphy-mini` is not prepared yet; prepare it lazily when a role needs VS Code Playwright, mutation, or another focus-stealing check.
- Next route: after human approval of the acceptance-spec direction, route forward to Coder.

## Human Gates

- Grill before implementation is active for this restart.
- Human-owned acceptance spec Markdown under `packages/extension/tests/acceptance/specs/` still requires explicit human approval before commit or push.
- Heavy VS Code Playwright and mutation checks must run in an isolated remote worktree on `codegraphy-mini` once a role needs them.

## Setup Verification

- `AGENTS.md`, `CONTEXT.md`, `docs/agents/codegraphy-loop.md`, the role loop contracts, `docs/agents/acceptance-specs.md`, and `docs/agents/issue-tracker.md` were read before setup.
- Trello API credentials are present.
- Trello card `rSYGlC3d` is open, titled `C# Upgrade`, started in `Todo`, and now sits in `In Progress` for the active loop.
- Protected checkout `/Users/poleski/Desktop/Projects/CodeGraphyV4` remained on `main` after the isolated worktree was created.
- No local `codex/201-csharp-upgrade` branch or `201-csharp-upgrade` handoff file existed before this restart.
- GitHub still has a closed draft PR from the discarded first attempt: PR #271 `Trello 201: C# Upgrade`.
- Current human-owned acceptance contract is still the older single-scenario `packages/extension/tests/acceptance/specs/csharp-example.md`, focused on file nodes plus Imports, References, Calls, and Inherits edge toggles for the small existing example workspace.

## Event Log

### 2026-06-12T18:31:53Z - Orchestrator Setup Verification

- Source: user request to restart the CodeGraphy Loop for Trello card 201 as the Orchestrator.
- Target: Orchestrator.
- Result: verified loop docs, Trello state, protected checkout safety, current C# acceptance baseline, and created the isolated branch/worktree plus this continuity record.
- Files changed: `docs/handoff/201-csharp-upgrade.md`
- Evidence:
  - Protected checkout stayed on `main`.
  - Isolated worktree was created at `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`.
  - Trello card is open and still in `Todo`.
  - The discarded first attempt left closed draft PR #271 in GitHub history.
- Open blocker:
  - The grill-before-implementation gate must resolve the acceptance direction, plan location, and human-owned acceptance spec approval boundary before Specifier dispatch.

### 2026-06-12T18:33:18Z - Orchestrator Draft PR And Trello Sync

- Source: Orchestrator.
- Target: GitHub and Trello setup for the restart.
- Result: pushed the restart branch, opened draft PR #273, moved the Trello card to `In Progress`, and added a tracker comment with the branch, worktree, handoff path, and active human gate.
- PR: https://github.com/joesobo/CodeGraphyV4/pull/273
- Trello update:
  - Card moved to `In Progress`.
  - Comment added with PR, branch, worktree, handoff path, and the current grill gate.
- Files changed: `docs/handoff/201-csharp-upgrade.md`
- Open blocker:
  - The grill-before-implementation gate is still active before Specifier dispatch or implementation work.

### 2026-06-12T18:36:30Z - Orchestrator Grill Decision 1

- Source: user answer to the first grill question.
- Target: acceptance contract shape for card 201.
- Result: keep the C# acceptance contract as one combined scenario rather than splitting file/edge behavior from symbol or Graph Scope capability behavior.
- User decision:
  - The accepted direction for this loop is one scenario.
  - Specifier should keep the acceptance contract concise, but it should remain a single end-to-end scenario instead of a split contract.
- Routing implication:
  - Specifier should concept and draft against one combined scenario unless a later human decision changes that direction.
- Remaining grill items:
  - confirm where any card-specific plan doc should live
  - confirm the human approval boundary for acceptance spec Markdown before commit or push

### 2026-06-12T18:41:32Z - Orchestrator Grill Decision 2

- Source: user answer to the second grill question.
- Target: local planning artifact expectations for card 201.
- Result: do not create a separate card-specific plan document for this loop.
- User decision:
  - Specifier should work from the handoff and acceptance notes rather than drafting a separate plan under `docs/plans/`.
- Routing implication:
  - Keep continuity and acceptance direction in the handoff file unless a later decision explicitly asks for a separate plan artifact.
- Remaining grill items:
  - confirm the human approval boundary for acceptance spec Markdown before commit or push

### 2026-06-12T18:42:30Z - Orchestrator Grill Decision 3

- Source: user clarification during the final grill gate.
- Target: acceptance-spec approval boundary.
- Result: use the existing loop-doc rule as written; human-owned acceptance spec Markdown requires explicit human approval before commit or push.
- User decision:
  - No extra restatement is needed beyond the documented loop contract.
- Routing implication:
  - Specifier may draft `packages/extension/tests/acceptance/specs/csharp-example.md` locally for review, but the Orchestrator must pause before any commit or push that includes that Markdown.
- Next route:
  - Dispatch Specifier for the first bounded pass.

### 2026-06-12T18:42:30Z - Orchestrator Dispatch

- Source: Orchestrator.
- Target: Specifier.
- Result: grill-before-implementation gate is complete; Specifier dispatched to define the upgraded C# example contract, impact scan related acceptance specs, and draft any human-owned acceptance Markdown locally for review.
- Dispatch scope:
  - keep the contract as one combined scenario
  - do not create a separate card-specific plan doc
  - keep any acceptance spec Markdown edits uncommitted and unpushed pending human approval

### 2026-06-12T18:42:30Z - Specifier Pass 1

- Source: Specifier.
- Target: acceptance contract for the C# upgrade loop.
- Result: needs human acceptance.
- Acceptance draft:
  - Replace the old synthetic `Config` / `ApiService` / `Helpers` scenario with one combined end-to-end scenario for a more believable C# release-notifier workspace.
  - Keep the file-level contract centered on Core C# capabilities already exposed in Graph Scope: `Imports`, `References`, `Calls`, and `Inherits`.
  - Keep the symbol-level contract inside the same scenario by turning on `Class`, `Interface`, `Struct`, `Enum`, and `Function` plus `Contains`, then asserting a small set of visible type and method nodes and a few symbol-to-symbol `Calls` and `Inherits` relationships.
  - Use a file-scoped-namespace workspace shape that a C# developer would recognize without requiring deeper project-aware or compiler-aware semantics.
  - Treat records, delegates, partial types, using aliases, properties, fields, locals, and project-system semantics as out of scope for this card unless a later role proves a smaller Core addition belongs here.
- Acceptance impact scan summary:
  - Human-owned spec directly affected: `packages/extension/tests/acceptance/specs/csharp-example.md`.
  - Generated acceptance output that will need recompilation after approval: `packages/extension/tests/playwright-vscode/generated/acceptance.spec.ts`.
  - Existing generic acceptance bindings appear reusable for the proposed scenario; no human-owned spec references to `example-csharp` were found outside `csharp-example.md`.
  - Reference patterns reviewed but intentionally unaffected: `packages/extension/tests/acceptance/specs/c-example.md` and `packages/extension/tests/acceptance/specs/cpp-example.md`.
- Example source changes, if examples define the contract:
  - Proposed workspace shape:
    - `src/Program.cs`
    - `src/Config/ReleaseOptions.cs`
    - `src/Contracts/INotifier.cs`
    - `src/Models/RetryWindow.cs`
    - `src/Models/PublishOutcome.cs`
    - `src/Services/NotifierBase.cs`
    - `src/Services/ReleaseNotifier.cs`
    - `src/Formatting/SummaryFormatter.cs`
  - Proposed behavior:
    - `Program` loads release options, creates a retry window, selects a publish outcome, and publishes through `ReleaseNotifier`.
    - `ReleaseNotifier` inherits from `NotifierBase`, implements `INotifier`, and calls `SummaryFormatter`.
    - The example naturally demonstrates class, interface, struct, enum, and method symbols without leaning on unsupported C#-specific constructs.
- Human approval status:
  - Pending.
  - Local draft updated in `packages/extension/tests/acceptance/specs/csharp-example.md`.
  - Per loop contract, this Markdown must remain uncommitted and unpushed until the user approves it.
- Open questions:
  - none beyond the required human approval gate
