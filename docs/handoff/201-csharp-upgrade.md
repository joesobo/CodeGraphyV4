# 201 C# Upgrade Handoff

## Current State

- State: paused for grill-with-docs alignment
- Source: Trello card 201, C# Upgrade, https://trello.com/c/rSYGlC3d/201-c-upgrade
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/277
- Trello: `Review`
- Human gate: grill-with-docs alignment in progress; acceptance contract not approved; no role may commit human-owned acceptance spec Markdown without explicit human approval.
- Next route: finish grill-with-docs alignment, then dispatch Specifier.

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
