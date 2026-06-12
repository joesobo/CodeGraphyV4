# Trello 201 C# Upgrade Handoff

## Current State

- State: Orchestrator setup is complete enough to open the draft PR, but the loop is still paused at the initial grill-with-docs alignment gate before Specifier dispatch.
- Trello card: https://trello.com/c/rSYGlC3d/201-c-upgrade
- Card title: C# Upgrade
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/271
- Heavy-check host: not prepared yet; prepare `codegraphy-mini` lazily when a role actually needs VS Code Playwright, mutation, or another long focus-stealing check.
- Next route: finish the initial alignment gate, then dispatch Specifier with a bounded C# support-audit and acceptance-contract task.

## Human Gates

- Grill before implementation: active. Current open question is whether this C# upgrade should follow the same `showcase now` / `reasonable Core upgrade` / `out of scope` support-matrix pattern as the C++ pilot.
- Human-owned acceptance spec Markdown remains a hard gate. Any edits to `packages/extension/tests/acceptance/specs/csharp-example.md` may be drafted locally for review, but must not be committed or pushed until the user explicitly approves them.
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
