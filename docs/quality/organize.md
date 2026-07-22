# Organize

`organize` analyzes directory structure, file names, and sibling cohesion for navigation and discovery problems. It reports problems without moving files.

## Quick start

```bash
pnpm run organize -- .
pnpm run organize -- extension/
pnpm run organize -- packages/extension/src/webview/
pnpm run organize -- some/arbitrary/dir/
```

The root command runs the external `@poleski/quality-tools` analyzer directly. No repository baseline suppresses existing findings: the command always reports the current directory structure so organization debt stays visible and can be fixed instead of accepted.

The repository-wide report is advisory. `quality-tools organize` exits successfully after producing a report, even when it contains `WARNING` or `SPLIT` verdicts, and deep package paths are measured relative to the repository root. Do not interpret exit code `0` as a clean organization gate.

Use strict scoped review for changed modules. Run the analyzer from the nearest stable package or feature boundary and inspect each changed directory in the report. Finish when those directories are `STABLE` and add no low-information names, barrel files, redundant paths, or unresolved cohesion clusters. This approach checks organization introduced by the change without hiding older repository findings in a tracked baseline.

## What it measures

### File fan-out
Number of files directly inside a directory.
- ≤7: STABLE
- 8–10: WARNING
- 10+: SPLIT

### Folder fan-out
Number of subdirectories directly inside a directory.
- ≤9: STABLE
- 10–12: WARNING
- 13+: SPLIT

### Directory depth
Path segments from the target root.
- ≤3: STABLE
- 4: WARNING
- 5+: DEEP

### Path redundancy
Measures how much of a filename repeats information already in the folder path. Score 0–1. Example: `scrap/scrapTypes.ts` scores 0.5 because "scrap" appears in both folder and filename.

### Low-information names
Files whose names carry near-zero navigability signal. Configurable banned and discouraged lists.

Banned (hard stop): utils, helpers, misc, common, shared, _shared, lib, index Discouraged (warning): types, constants, config, base, core

### Barrel file detection
Flags files where ≥80% of statements are re-exports.

### Sibling cohesion
Clusters files in the same directory by shared prefix and import relationships. A cluster of 3+ files suggests extraction into a subfolder. Confidence levels: prefix+imports, prefix-only, imports-only.

## CLI flags

| Flag | Behavior |
|------|----------|
| (positional) | Target directory |
| --verbose | Show STABLE directories |
| --json | Output raw JSON |

## Configuration

All thresholds are configurable in quality.config.json under the organize key.

## The analyze-fix-rerun cycle

1. Choose the nearest package or feature seam that contains the changed directories.
2. Run `pnpm run organize -- target/ --verbose` so `STABLE` directories remain visible.
3. Read the report for each changed directory; do not rely only on the process exit code.
4. Restructure changed `SPLIT`/`WARNING` directories, extract real sibling clusters, rename redundant or low-information files, and remove barrel files.
5. Run the same scoped command again and require the changed directories to be `STABLE`.
6. Run `pnpm run organize -- .` as an advisory final scan of the complete repository.

For example, after changing pipeline feature modules, analyze the pipeline seam rather than measuring those modules from the repository root:

```bash
pnpm run organize -- packages/extension/src/extension/pipeline --verbose
pnpm run organize -- packages/extension/tests/extension/pipeline --verbose
```
