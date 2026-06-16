# Haskell Upgrade Handoff

Trello: https://trello.com/c/Vy7javlF

Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/287

## Manual Workstream State

This lane was started manually from `origin/main` on branch `codex/haskell-upgrade`. The setup commit is intentionally empty so the draft PR exists without changing product code or human-owned acceptance Markdown.

The current stop point is the acceptance gate. The Haskell example and this handoff document are agent-owned. The local acceptance spec at `packages/extension/tests/acceptance/specs/haskell-example.md` has been drafted but must remain uncommitted until human review.

## Source Truth Audit

The current Tree-sitter Haskell analyzer supports local module imports and calls to imported functions or data constructors. Calls are resolved by reading callable names from imported local modules, so explicit helper functions such as `makeUser`, `describeUser`, and `describeProfile` are reliable call targets.

The parser/analyzer currently emits Haskell symbols for:

- `newtype` declarations as `newtype`.
- `data` declarations as `data`.
- `class` declarations as `class`.
- Argument-taking function equations as `function`.

The analyzer uses top-level `bind` nodes as call-source context, but it does not currently emit them as Function symbols. That means `main = ...` can be a source for call relationships without being a visible Function node.

Record accessors and typeclass instance relationships are not reliable generic graph concepts today. Type synonyms also did not appear through the expected `type_synonym` path in the grammar version installed here, so the example avoids relying on them.

## Supported Contract For This Card

Use generic CodeGraphy concepts:

- Edge types: `Imports`, `Calls`, `Contains`.
- Node types: `Function`, `Type`, `Class`.

Map Haskell `data` and `newtype` symbols into the generic `Type` node type during the implementation slice. Do not add Haskell-specific Graph Scope rows for data declarations, newtypes, typeclasses, instances, deriving clauses, record fields, locals, or parameters in this card.

The upgraded example is one integrated scenario:

- `src/Main.hs` imports and calls into `App.Feature.Runner`, `App.Model.User`, and `App.Model.Profile`.
- `src/App/Feature/Runner.hs` imports and calls into both model modules.
- `Runner.hs` demonstrates `Greeting`, `RunnerId`, `Runner`, `Runnable`, `greet`, `boot`, and `renderGreeting`.
- The model modules demonstrate `User`, `Profile`, `makeUser`, `describeUser`, and `describeProfile`.

Expected file-level counts for the local acceptance draft:

- File-only: 7 nodes, 0 connections.
- Imports: 7 nodes, 5 connections.
- Calls: 7 nodes, 5 connections.
- Function slice: 13 nodes, 0 connections.
- Type slice: 12 nodes, 0 connections.
- Class slice: 8 nodes, 0 connections.
- File + Function + Type + Class: 19 nodes, 0 connections.
- Contains over that symbol slice: 19 nodes, 12 connections.

## Verification So Far

- `pnpm install`
- `pnpm --filter @codegraphy-dev/core exec vitest run tests/treeSitter/haskell/analyze.test.ts tests/treeSitter/haskell/symbols.test.ts`
- Parser probe from `packages/core` against the upgraded example source.

Do not continue into generated Playwright tests, focused failing unit tests, or implementation until the human has reviewed and committed the acceptance spec Markdown.
