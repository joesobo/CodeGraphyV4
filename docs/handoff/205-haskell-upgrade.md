# Haskell Upgrade Handoff

Trello: https://trello.com/c/Vy7javlF

Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/287

## Manual Workstream State

This lane was started manually from `origin/main` on branch `codex/haskell-upgrade`. The setup commit is intentionally empty so the draft PR exists without changing product code or human-owned acceptance specs.

The branch was merged with `origin/main` after PR #291 landed. Acceptance specs now live as Gherkin `.feature` files under `packages/extension/tests/acceptance/specs/**/*.feature`. Generated Playwright entrypoints, generated JSON IR, and DRY reports are ignored build artifacts and must not be committed.

The acceptance gate has been cleared: Joe reviewed and committed `packages/extension/tests/acceptance/specs/haskell-example.feature`. Implementation is now on the PR branch, and generated Playwright entrypoints, generated JSON IR, and DRY reports remain local build artifacts.

## Source Truth Audit

The current Tree-sitter Haskell analyzer supports local module imports, imported type references, calls to imported functions and data constructors, and generic symbol extraction for the supported node rows. Calls and references respect explicit import lists, including `Type(..)` constructor imports.

This follows the C# upgrade shape: support the generic CodeGraphy node and edge concepts that Tree-sitter plus local source indexing can reliably back, and keep Haskell-specific syntax concepts out of scope until there is a durable generic graph model for them.

The parser/analyzer currently emits Haskell symbols for:

- `newtype` declarations as `type`.
- `data` declarations as `type`.
- `class` declarations as `class`.
- Argument-taking function equations as `function`.
- Top-level `bind` nodes such as `main = ...` and `defaultRunnerId = ...`.
- Record `field` nodes.
- Function `patterns` that expose parameters.
- Local `bind` and pattern nodes under `local_binds`.

The analyzer maps `main = ...` to a Function symbol and other top-level binds such as `defaultRunnerId = ...` to Constant symbols.

Typeclass instance relationships are not a reliable generic graph concept today. Type synonyms remain out of the example contract for this card.

## Supported Contract For This Card

Use generic CodeGraphy concepts:

- Edge types: `Imports`, `References`, `Calls`, `Contains`.
- Node types: `Function`, `Type`, `Class`, `Constant`, `Field`, `Parameter`, `Local`.

Map Haskell `data` and `newtype` symbols into the generic `Type` node type during the implementation slice. Map Haskell record fields, function parameters, local let bindings, and top-level constant-like binds to the existing generic variable rows. Do not add Haskell-specific Graph Scope rows for data declarations, newtypes, typeclasses, instances, deriving clauses, or type synonyms in this card.

The upgraded example is one integrated scenario:

- `src/Main.hs` imports and calls into `App.Feature.Runner`, `App.Model.User`, and `App.Model.Profile`.
- `src/App/Feature/Runner.hs` imports and calls into both model modules.
- `Runner.hs` demonstrates `Greeting`, `RunnerId`, `Runner`, `Runnable`, `defaultRunnerId`, record fields, `greet`, `boot`, `renderGreeting`, parameters, and local bindings.
- The model modules demonstrate `User`, `Profile`, `makeUser`, `describeUser`, and `describeProfile`.

Expected counts for the committed acceptance scenario:

- File-only: 7 nodes, 0 connections.
- Imports: 7 nodes, 5 connections.
- References: 7 nodes, 2 connections.
- Calls: 7 nodes, 5 connections.
- Function slice with `Contains`: 14 nodes, 7 connections.
- Type slice with `Contains`: 12 nodes, 5 connections.
- Class slice with `Contains`: 8 nodes, 1 connection.
- Constant slice with `Contains`: 8 nodes, 1 connection.
- Field slice with `Contains`: 12 nodes, 5 connections.
- Parameter slice with `Contains`: 14 nodes, 7 connections.
- Local slice with `Contains`: 9 nodes, 2 connections.
- File + Function + Type + Class + Constant + Field + Parameter + Local with `Contains`: 35 nodes, 28 connections.

The acceptance scenario asserts the concrete `points to` relationships for each supported edge type, not only node presence. `Imports`, `References`, and `Calls` use file-level source-to-target assertions. `Contains` stays enabled through each node-type slice so every shown Haskell symbol category has visible ownership edges, followed by a full 28-edge symbol ownership check.

## Verification

- `pnpm install`
- `pnpm --filter @codegraphy-dev/core exec vitest run tests/treeSitter/haskell/analyze.test.ts tests/treeSitter/haskell/symbols.test.ts tests/treeSitter/capabilities.test.ts tests/graph/symbols.test.ts`
- Parser probe from `packages/core` against the upgraded example source.
- `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/examplesWorkspace.test.ts`
- `pnpm --filter @codegraphy-dev/core test`
- `pnpm --filter @codegraphy-dev/extension run generate:acceptance`
- Branch merged with `origin/main` at merge commit `946d65e4b692b67bd746d34b30d4c6d1c060f555` from PR #291.
