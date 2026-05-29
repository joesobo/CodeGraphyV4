# Organize

`organize` analyzes directory structure, file naming, and sibling cohesion to surface navigation and discoverability issues. It is a read-only tool — it reports problems but does not move files.

## Quick start

```bash
pnpm run organize -- .
pnpm run organize -- --raw extension/
pnpm run organize -- --raw packages/extension/src/webview/
pnpm run organize -- --raw some/arbitrary/dir/
```

The root command is a baseline-regression gate. It dogfoods the external
`@poleski/quality-tools` analyzer, extracts the current repo-wide findings, and
compares them to `quality-baselines/organize/repo.json`. A clean root run means
the branch has not introduced new organize findings. Use `--raw` when you want
the full advisory report for a package, directory, or repo.

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
Measures how much of a filename repeats information already in the folder path. Score 0–1.
Example: `scrap/scrapTypes.ts` scores 0.5 because "scrap" appears in both folder and filename.

### Low-information names
Files whose names carry near-zero navigability signal. Configurable banned and discouraged lists.

Banned (hard stop): utils, helpers, misc, common, shared, _shared, lib, index
Discouraged (warning): types, constants, config, base, core

### Barrel file detection
Flags files where ≥80% of statements are re-exports.

### Sibling cohesion
Clusters files in the same directory by shared prefix and import relationships. A cluster of 3+ files suggests extraction into a subfolder. Confidence levels: prefix+imports, prefix-only, imports-only.

## CLI flags

| Flag | Behavior |
|------|----------|
| (positional) | Target directory |
| --raw | Print the full advisory report from `@poleski/quality-tools` |
| --update-baseline | Refresh the tracked repo-wide baseline after intentional cleanup |
| --verbose | Show STABLE directories |
| --json | Output raw JSON |
| --write-baseline | Save to reports/quality-tools/organize/ |
| --compare PATH | Compare against baseline |

## Configuration

All thresholds are configurable in quality.config.json under the organize key.

## The analyze-fix-rerun cycle

1. Run `pnpm run organize -- --raw target/`
2. Read the report — focus on SPLIT and WARNING directories
3. Restructure: create subfolders for cohesion clusters, rename redundant files, remove barrel files
4. Run the same raw target again to verify improvements
5. Run `pnpm run organize -- .` to make sure the branch did not add repo-wide findings
6. After intentional cleanup removes existing findings, refresh the tracked gate with `pnpm run organize -- --update-baseline`
