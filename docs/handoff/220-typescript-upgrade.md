# 220 TypeScript Upgrade

Manual restart for Trello card `2qyhC189`, draft PR #289, branch `codex/220-typescript-upgrade`, worktree `/Users/poleski/.codex/worktrees/97d9/CodeGraphyV4`.

## Setup

- Old PR #278 was verified closed and unmerged.
- Stale local worktree `/Users/poleski/.codex/worktrees/220-typescript-upgrade/CodeGraphyV4`, local branch `codex/220-typescript-upgrade`, and remote branch `origin/codex/220-typescript-upgrade` were retired after explicit confirmation.
- Fresh branch `codex/220-typescript-upgrade` was created from `origin/main` at `e2e649527181710632e03c0bf0b8bc56e35c92d6`.
- Empty setup commit `eef730484b16f827f183cc843577a655022d773e` opened draft PR #289.
- Trello card #220 was moved to `In Progress` and commented with the restart/PR breadcrumb.

## Parser And Current Support Audit

Core Tree-sitter TypeScript currently routes `.ts`, `.mts`, `.cts`, and `.tsx` through `analyzeJavaScriptFamilyFile`. The parser/analyzer supports rendered Core edge types `Imports`, `Type imports`, `Calls`, and `Inherits` for this slice. Import support includes static `import`, `export ... from`, dynamic `import()`, and CommonJS `require()`. Call support resolves calls through named imports, default imports, and namespace/property imports when the imported binding resolves to a workspace file. It declares TypeScript node capabilities `Function`, `Class`, `Interface`, `Type`, `Enum`, and `Constant`; `method` symbols render under the generic Function toggle, and `constant` symbols render under Variable/Constant.

The TypeScript plugin should remain scoped to project-aware TypeScript semantics. For this card that means `compilerOptions.paths` alias resolution through the plugin-owned `TypeScript Alias Import` edge. Baseline JS/TS syntax relationships remain Core behavior.

Out of scope for this card: TSX behavior beyond existing parser support, decorators, package exports, richer type-reference resolution, TypeScript Reference edges, new TypeScript-specific node types, and moving `compilerOptions.paths` into Core.

## Example And Acceptance Draft

`examples/example-typescript` is now one integrated TypeScript upgrade workstream scenario. The local draft acceptance contract is `packages/extension/tests/acceptance/specs/typescript-example.md`; it is human-owned Markdown and must stay local until the human reviews and commits it.

Current source-backed graph projection for the example:

| Slice | Count | Notes |
| --- | ---: | --- |
| File nodes | 18 | `.gitignore`, `README.md`, `package.json`, `tsconfig.json`, and 14 TypeScript source files |
| Imports | 11 | Static imports, export-from imports, dynamic imports, and CommonJS `require()` |
| Type imports | 6 | Top-level type imports and inline type specifiers |
| Calls | 6 | Named import calls, default import calls, and rollout summary calls |
| Inherits | 2 | `UpgradeRunner` to `BaseRunner` and `RunnableThing` |
| TypeScript Alias Import | 1 | `src/index.ts` to `src/alias/notification.ts` |
| Symbol nodes | 17 | Function, Class, Interface, Type, and Enum symbols |
| Variable nodes | 6 | Constant symbols including `currentProject`, `StageLabels`, and `ORPHAN_NOTE` |

Stop here until the human accepts and commits the spec. After that, continue with generated Playwright tests, focused unit tests, and minimal implementation only where tests prove a gap.
