# Trello 201: C# Upgrade

## Current State

- State: setup complete, pre-role alignment pending.
- Trello: [C# Upgrade](https://trello.com/c/rSYGlC3d), moved to In Progress on 2026-06-12.
- Branch: `codex/201-csharp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/201-csharp-upgrade/CodeGraphyV4`
- PR: [#276](https://github.com/joesobo/CodeGraphyV4/pull/276) draft.
- Next route: alignment gate, then likely Specifier.

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
