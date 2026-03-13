# TypeScript Plugin Refactoring Design

## Goal

Refactor the TypeScript plugin to meet project quality gates: mutation score ≥ 80%, CRAP ≤ 8, file-per-module test structure, and ≤ 50 mutation sites per file. Follow the patterns established by the Godot (PR #138) and Markdown (PR #141) plugin refactorings.

## Current State

| Metric | Value | Target |
|--------|-------|--------|
| Mutation score | 39.65% | ≥ 80% |
| CRAP | All ≤ 8 | ≤ 8 |
| Tests | 30 across 3 files | File-per-module |
| Max mutation sites | 145 (PathResolver.ts) | ≤ 50 |

### Mutation site counts (must each be ≤ 50)

- `PathResolver.ts`: 145 — must split
- `index.ts`: 66 — must split
- `commonjs-require.ts`: 39 — ok
- `dynamic-import.ts`: 32 — ok
- `es6-import.ts`: 29 — ok
- `reexport.ts`: 29 — ok

### Key problems

1. `getScriptKind()` duplicated across all 4 rule files
2. No per-rule test files (rules tested indirectly via integration)
3. `PathResolver.ts` (230 lines, 145 mutation sites) does too much
4. `index.ts` (150 lines, 66 mutation sites) mixes orchestration with tsconfig parsing
5. 123 surviving mutants + 49 with no coverage

## Source Refactoring

### Extract `getScriptKind.ts`

Deduplicate the `getScriptKind()` helper from 4 rule files into one shared module.

```
src/getScriptKind.ts  (~15 lines)
  export function getScriptKind(filePath: string): ts.ScriptKind
```

### Extract `tsconfig.ts` from `index.ts`

Move tsconfig loading and parsing helpers out of the orchestrator:

```
src/tsconfig.ts  (~80 lines)
  export function loadTsConfig(workspaceRoot: string): object | null
  export function isRecord(value: unknown): value is Record<string, unknown>
  export function getCompilerOptions(tsConfig: object): Record<string, unknown> | null
  export function getBaseUrl(compilerOptions: Record<string, unknown>): string | undefined
  export function getPaths(compilerOptions: Record<string, unknown>): Record<string, string[]> | null
```

This reduces `index.ts` to a thin orchestrator (~50 lines, well under 50 mutation sites).

### Split `PathResolver.ts`

Extract focused modules to get each under 50 mutation sites:

**`src/builtins.ts`** (~40 lines)
- `BUILTIN_MODULES: ReadonlySet<string>` — the 32-entry Node.js builtins list
- `isBuiltIn(specifier: string): boolean`
- `isBareSpecifier(specifier: string): boolean`

**`src/fileResolver.ts`** (~60 lines)
- `resolveFile(basePath: string, extensions: string[]): string | null` — tries extensions and index files
- `fileExists(filePath: string): boolean` — fs.statSync wrapper

**`src/PathResolver.ts`** (~80 lines, trimmed)
- Core `resolve()` method and `_resolveWithPaths()` for tsconfig path aliases
- Imports helpers from `builtins.ts` and `fileResolver.ts`

### Rules (no source changes needed)

The 4 rule files are already well-structured and under 50 mutation sites each. Only change: replace local `getScriptKind()` with import from shared module.

## Test Refactoring

### Rename and consolidate

- `Integration.test.ts` → `index.test.ts` (match source module naming convention)
- Move manifest/metadata assertions from `ruleId.test.ts` into `index.test.ts`
- Delete `ruleId.test.ts`

### New per-module test files

Each extracted source module and each rule gets a dedicated test file:

| Source module | Test file | Focus |
|--------------|-----------|-------|
| `getScriptKind.ts` | `getScriptKind.test.ts` | Extension → ScriptKind mapping |
| `tsconfig.ts` | `tsconfig.test.ts` | tsconfig loading, parsing, edge cases |
| `builtins.ts` | `builtins.test.ts` | Built-in detection, bare specifier regex |
| `fileResolver.ts` | `fileResolver.test.ts` | Extension inference, index files, missing files |
| `rules/es6-import.ts` | `es6-import.test.ts` | Static import detection edge cases |
| `rules/dynamic-import.ts` | `dynamic-import.test.ts` | Dynamic import() detection |
| `rules/commonjs-require.ts` | `commonjs-require.test.ts` | require() detection |
| `rules/reexport.ts` | `reexport.test.ts` | Re-export detection |

### Existing test files (updated)

- `PathResolver.test.ts` — trimmed to test only core `resolve()` logic; helper tests move to `builtins.test.ts` and `fileResolver.test.ts`
- `index.test.ts` — lifecycle + manifest + integration tests

### Mutation survivor strategy

Work module-by-module: run mutation tests per file, write tests to kill survivors, repeat until ≥ 80% per file. Known survivors to target:

- `PathResolver.ts:228` — regex mutations in `_isBareSpecifier()` (3 survivors)
- Rule files — 32 uncovered mutations (no per-rule tests exist yet)
- `index.ts` — 13 survivors + 6 uncovered (tsconfig edge cases)

## Target File Structure

```
packages/plugin-typescript/
├── src/
│   ├── index.ts              (~50 lines, orchestrator only)
│   ├── tsconfig.ts           (~80 lines, config parsing)
│   ├── PathResolver.ts       (~80 lines, core resolve)
│   ├── builtins.ts           (~40 lines, built-in detection)
│   ├── fileResolver.ts       (~60 lines, file resolution)
│   ├── getScriptKind.ts      (~15 lines, shared utility)
│   └── rules/
│       ├── es6-import.ts     (unchanged except import)
│       ├── reexport.ts       (unchanged except import)
│       ├── dynamic-import.ts (unchanged except import)
│       └── commonjs-require.ts (unchanged except import)
├── __tests__/
│   ├── index.test.ts
│   ├── tsconfig.test.ts
│   ├── PathResolver.test.ts
│   ├── builtins.test.ts
│   ├── fileResolver.test.ts
│   ├── getScriptKind.test.ts
│   ├── es6-import.test.ts
│   ├── dynamic-import.test.ts
│   ├── commonjs-require.test.ts
│   └── reexport.test.ts
└── examples/  (unchanged)
```

## Quality Gates

All must pass before completion:

1. CRAP ≤ 8 for all functions
2. Mutation score ≥ 80% overall (≥ 90% preferred)
3. All mutation site counts ≤ 50 per file
4. All tests pass (`pnpm --filter @codegraphy/plugin-typescript test`)
5. Lint clean (`pnpm run lint`)
6. Typecheck clean (`pnpm run typecheck`)
7. File-per-module test structure enforced

## Out of Scope

- AST package migration (already using TypeScript compiler API)
- Functional changes to plugin behavior
- Changes to plugin-api contracts
- Pre-analysis hooks or caching (optimization, not refactoring)
