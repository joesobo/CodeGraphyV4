# 220 TypeScript Upgrade Handoff

## Current State

- Trello: [TypeScript Upgrade](https://trello.com/c/2qyhC189/220-typescript-upgrade), card id `6a2b3d60fe43922b2d85e07e`
- Trello list at setup: `In Progress` (`69af003346ade5ee06fa328c`)
- Branch: `codex/220-typescript-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/220-typescript-upgrade/CodeGraphyV4`
- PR: pending setup
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

## Research Lanes

Pending parallel dispatch:

- Current support lane: identify current TypeScript plugin/core support for file/package/symbol/variable nodes and edge types.
- Tree-sitter potential lane: identify TypeScript grammar constructs that can support believable graph facts without project-wide type checking.
- Example lane: inspect `examples/example-typescript` and propose a cohesive showcase example.
- Acceptance lane: inspect existing TypeScript acceptance spec shape and propose human-owned Markdown changes without applying them prematurely.

## Event Log

### 2026-06-15 Setup

- Created goal for Trello card 220.
- Confirmed protected checkout is on `main`.
- Created isolated worktree and branch `codex/220-typescript-upgrade`.
- Read Trello card through REST API; card was already in `In Progress` and had labels `Examples`, `Plugin`, and `TypeScript Plugin`.
- Started handoff before role dispatch.
