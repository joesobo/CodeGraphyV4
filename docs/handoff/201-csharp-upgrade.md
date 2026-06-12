# Trello 201: C# Upgrade

## Source

- Trello: https://trello.com/c/rSYGlC3d
- Card: `201-c-upgrade` / `C# Upgrade`
- Labels: `Examples`, `Plugin`, `C# Plugin`

## Loop State

- Current state: Orchestrator setup in progress
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
