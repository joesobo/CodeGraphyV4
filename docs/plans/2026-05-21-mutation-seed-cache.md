# Mutation Seed Cache Plan

## Status

Implemented on PR #210.

Decision captured: CodeGraphy is a monorepo of package-level Stryker projects. Mutation seed caching should follow that boundary. The main branch seed is a `reports/quality-tools/mutation/` tree containing package-scoped Stryker incremental reports, not one root monorepo incremental report.

This plan belongs to the test-suite cleanup work because it changes the local mutation loop, not the normal CI test lanes.

## Goal

Make package and file-scoped mutation runs fast enough for normal branch work by seeding each worktree with the latest successful mutation results from `main`.

The command shape should stay boring:

```bash
pnpm run mutate -- extension/
pnpm run mutate -- packages/extension/src/webview/vscodeApi.ts
pnpm run mutate -- plugin-godot/
```

The user should not need to manually find changed files, manually copy cache files, or remember separate seed commands.

Decision: no-arg `pnpm run mutate` is invalid. Mutation requires an explicit package, directory, or file target. All-package mutation refresh belongs to the CI seed workflow.

## Terms

- **Package Stryker Project**: one workspace package plus the Stryker config, Vitest config, mutate globs, test includes, thresholds, and runner environment needed to mutation-test that package.
- **Stryker Incremental Report**: the JSON file Stryker reads and writes through `--incrementalFile`. Stryker owns this format and decides which mutant results can be reused.
- **Package Mutation Seed**: a CI-published Stryker Incremental Report for one Package Stryker Project.
- **Main Mutation Seed**: the full CI-published `reports/quality-tools/mutation/` seed tree produced from `main`.
- **Local Main Seed Cache**: the local main checkout's copy of the latest Main Mutation Seed under `reports/quality-tools/mutation/`.
- **Local Mutation Cache**: the current worktree's package-scoped Stryker Incremental Report under `reports/quality-tools/mutation/<package>/`.
- **Seed Hydration**: the quality-tool step that copies a Package Mutation Seed into a worktree before Stryker starts.

Avoid calling this a custom mutation cache. The speedup should come from Stryker incremental mode, with CodeGraphy only supplying the first package-level incremental report file.

## Current Repo Shape

- Root `pnpm run mutate` calls the CodeGraphy-specific wrapper at `scripts/mutate.ts`.
- The wrapper handles package seed hydration, then delegates to the generic quality-tools mutation CLI.
- With no target argument, the generic CLI fails fast and asks for an explicit package, directory, or file target.
- A targeted command resolves to one package, directory, or file, then runs Stryker once for that package scope.
- The mutation runner currently passes package-level `--incrementalFile` paths such as `reports/quality-tools/mutation/extension/stryker-incremental-extension.json`.
- The shared root Stryker config extends the reusable `@poleski/quality-tools` Stryker defaults.
- CodeGraphy owns only the monorepo wrapper, seed hydration, and project-specific Stryker overrides.
- Mutation reports are ignored in git under `reports/`.
- Existing local reports are copied after a run, but new worktrees do not yet hydrate a seed before the first Stryker run.

That means the root script is the common entrypoint, but the mutation project is selected by the target argument.

## Stryker Behavior To Lean On

Stryker incremental mode stores previous mutation results in an incremental report file and attempts to reuse them on the next run. It compares mutated files and test files against the prior report, then only reruns what it believes changed.

Important consequences:

- A warm package seed can let a new worktree skip most unchanged mutants in that package.
- Stryker still performs the initial dry run. The seed does not remove startup, instrumentation, or test discovery cost.
- `--force` should continue to bypass reuse for the requested scope.
- Vitest reports tests per file, not exact test locations, so changing one test file may invalidate more mutants than a runner with exact test-location reporting.
- Stryker does not detect every environment change, dependency change, or config change. When those change, a force refresh or new seed may be needed.

References:

- Stryker incremental mode: <https://stryker-mutator.io/docs/stryker-js/incremental/>
- Stryker `incrementalFile`, `coverageAnalysis`, and `force` config: <https://stryker-mutator.io/docs/stryker-js/configuration/>

## Expected Workflow

### Main

1. CI runs the normal fast checks as it does today.
2. A separate mutation-seed job starts on every push to `main`.
3. The job restores the latest CI seed if available.
4. The job runs the full package mutation seed refresh.
5. Each package runs through its own Stryker config and package-scoped `--incrementalFile`.
6. Stryker reruns only what changed inside each package scope and updates that package's incremental report.
7. CI writes `reports/quality-tools/mutation/seed-sha.txt` with the `main` commit SHA.
8. CI uploads the seedable `reports/quality-tools/mutation/` tree as the Main Mutation Seed.

Seed artifact shape:

```text
reports/quality-tools/mutation/
  seed-sha.txt
  extension/
    stryker-incremental-extension.json
  plugin-godot/
    stryker-incremental-plugin-godot.json
```

The first successful seed may take hours. Later `main` seed refreshes should mostly reuse the previous package seeds and rerun changed mutants.

### Local Worktree

1. User runs a normal mutate command with a package, directory, or file target.
2. The CodeGraphy wrapper resolves the target to its Package Stryker Project.
3. If the package Local Mutation Cache already exists in the current worktree, use it.
4. Otherwise find the local checkout that is currently on the `main` branch.
5. Read `<local-main-checkout>/reports/quality-tools/mutation/seed-sha.txt` and compare it to the commit SHA attached to the latest CI seed artifact.
6. If the Local Main Seed Cache is missing or stale, update `<local-main-checkout>/reports/quality-tools/mutation/` from the CI seed artifact.
7. If hydration is unavailable or the package is missing from the seed, fail clearly and tell the user to run the mutation seed workflow on `main`.
8. Copy the needed package report from the Local Main Seed Cache into the current worktree's `reports/quality-tools/mutation/<package>/` directory.
9. The wrapper invokes the normal generic mutate runner for that package or file target.
10. Stryker runs normally with that package's `--incrementalFile`.
11. Stryker writes back only to the current worktree's package Local Mutation Cache.

The local worktree never writes directly to the shared Main Mutation Seed or the Local Main Seed Cache. It only copies from them. Only the seed-refresh path updates the Local Main Seed Cache from CI.

## Cache Size Estimate

Measured local data:

- `reports/quality-tools/mutation/extension/stryker-incremental-extension.json`: `242 KB`
- Contents: `208` mutants, `4` mutated files, `10` test files
- Rough density: about `1.2 KB` per mutant in this small sample

Earlier extension-wide mutation discovery found about `22,525` extension mutants.

Estimated extension seed:

- `22,525 * 1.2 KB = ~27 MB`
- Safe planning range: `25-60 MB`

Estimated full monorepo seed tree:

- Safe planning range: `30-100 MB`
- Validate after the first full seed, because full size depends on package count, test metadata, surviving mutant data, and source/test text stored in the reports.

Copy/download expectation:

- Local copy on SSD: usually under a second for a small package, a few seconds for a large package like extension.
- GitHub artifact download: likely a few seconds to around 30 seconds for `25-100 MB`; allow up to a minute on a weak connection.

That is still tiny compared with rerunning thousands of mutants.

Publish package incremental JSON files plus `reports/quality-tools/mutation/seed-sha.txt`, but exclude non-seed artifacts such as HTML reports, videos, `node_modules`, and `.stryker-tmp`.

## Is This Common?

Using Stryker incremental mode is common and first-class Stryker behavior.

Using CI to publish reusable seeds for local worktrees is not a special built-in Stryker workflow. It is orchestration around Stryker's documented `incrementalFile`. The pattern is still reasonable as long as the wrapper keeps Stryker responsible for deciding reuse.

Prior art found online:

- Stryker's official docs explicitly call out CI scenarios, the `--incrementalFile` option, the required dry run, and the fact that `--incremental` plus scoped `--mutate` preserves out-of-scope mutants in the full report.
- A Qiita article shows GitHub Actions caching `reports/stryker-incremental.json` with `actions/cache` before running `npx stryker run --incremental`.
- A Medium article shows a two-tier GitLab cache strategy: pull-only cache from the development branch plus pull-push branch cache.
- QASkills describes storing `reports/stryker-incremental.json` as a CI cache artifact for large codebases.

The CodeGraphy plan is a monorepo package version of the same idea: CI maintains the `main` seed tree, local `main` stores a copy under `reports/quality-tools/mutation/`, and feature worktrees hydrate package caches from that local seed before Stryker starts.

## Proposed Implementation

### Implementation Slices

1. Keep `quality-tools mutate` generic and seed-policy-free.
2. Add a CodeGraphy mutation wrapper as the root `mutate` script.
3. Move CodeGraphy-specific target requirements and seed hydration into that wrapper.
4. Add a CI helper that lists CodeGraphy's mutation projects for the GitHub Actions matrix.
5. Add the mutation-seed workflow:
   - discover mutation projects
   - run one package seed job per project
   - upload package seed artifacts
   - assemble the Main Mutation Seed artifact
6. Add local hydration:
   - find the local main checkout
   - compare `reports/quality-tools/mutation/seed-sha.txt`
   - refresh the Local Main Seed Cache from CI if stale
   - copy the target package seed into the current worktree
7. Update docs after the workflow proves itself.

Status: implemented on PR #210 and adapted during the `@poleski/quality-tools` extraction. The root CodeGraphy wrapper lives in `scripts/mutate.ts` and `scripts/mutation/`, while the generic mutation runner lives in the external package.

### CI

Add a separate GitHub Actions workflow or job for mutation seed refresh.

Recommended shape:

- trigger on every `push` to `main`
- support `workflow_dispatch`
- use a workflow-level concurrency group so only the latest seed refresh for `main` keeps running
- restore the previous CI seed cache before mutation
- run package mutation seed refreshes in a GitHub Actions matrix
- each matrix job runs one package-scoped command, such as `pnpm run mutate -- extension/`
- each matrix job uploads that package's updated incremental report as a package seed artifact
- a final assembly job downloads package seed artifacts, writes `reports/quality-tools/mutation/seed-sha.txt`, and uploads the combined Main Mutation Seed artifact
- keep artifact retention long enough for active branch work; the first implementation uses `14` days to avoid storing stale large seed artifacts indefinitely

This should be separate from the required PR CI checks. Mutation seed refresh is a developer-speed accelerator, not a merge gate.

Stryker does not save CI state by itself. It writes the incremental JSON file into the runner workspace path passed by `--incrementalFile`. GitHub-hosted runners are ephemeral, so the workflow must explicitly preserve those files. This plan uses two GitHub Actions mechanisms:

- **Actions cache** for CI-to-CI speed: package matrix jobs restore the previous package seed cache before running Stryker, then save the updated package seed cache after the run.
- **Actions artifact** for local machines: the assemble job uploads a combined Main Mutation Seed artifact that local worktrees can download with `gh`.

For this plan:

- Each package job restores that package's previous `reports/quality-tools/mutation/<package>/` cache.
- Each package job runs Stryker, which updates that package's incremental JSON on disk.
- Each package job uploads its updated package report.
- The assemble job combines package reports into one Main Mutation Seed artifact.
- Local hydration later downloads that assembled artifact when local `main` is missing or stale.

Do not use no-arg `pnpm run mutate` for CI seed refresh. That command is intentionally invalid. A package matrix lets CI run independent package Stryker projects on separate runners, so wall-clock time trends toward the slowest package plus artifact assembly instead of the sum of all packages.

The CI seed workflow should own all-package orchestration at the GitHub Actions matrix level. Parallelizing packages inside one runner would compete for the same CPU and memory; matrix jobs give each package its own runner while Stryker still manages mutant-level concurrency inside that package.

### CodeGraphy Wrapper

Add seed hydration before invoking the generic quality-tools mutate runner.

Implementation lives in:

- `scripts/mutate.ts`
- `scripts/mutation/codegraphyMutate.ts`
- `scripts/mutation/seedCache.ts`
- `scripts/mutation/seedJobs.ts`

Suggested responsibilities:

- resolve the target package and package incremental path in one module
- check for an existing package Local Mutation Cache first
- find the Local Main Seed Cache if present
- determine whether the Local Main Seed Cache is current with the latest CI seed artifact
- download the latest CI seed artifact with `gh` when authenticated and the Local Main Seed Cache is missing or stale
- update the Local Main Seed Cache from the downloaded artifact
- copy the target package's incremental report and `seed-sha.txt` from the Local Main Seed Cache into the worktree's `reports/quality-tools/mutation/` tree
- print a concise status line:
  - local package cache hit
  - hydrated package cache from Local Main Seed Cache
  - refreshed Local Main Seed Cache from CI artifact
  - cold run because no seed was available for this package

The wrapper should never let branch worktrees write mutation results back into the Local Main Seed Cache. Branch worktrees update only their own package Local Mutation Cache.

The generic quality-tools mutate runner should stay seed-policy-free so it can later be extracted for normal single-project repos.

## Edge Cases To Design

- No `gh` auth or offline local run.
- First-ever seed has not been generated: fail clearly and tell the user to run the mutation seed workflow on `main`.
- The latest seed is stale because the seed workflow failed on `main`.
- Two local mutation runs target the same package cache at once.
- A package is renamed, added, or removed.
- A package changes Stryker config, Vitest config, dependencies, or environment.
- Large test-file changes cause broad invalidation because Vitest incremental support is file-level, not test-location-level.
- Seed artifact retention expires.
- CI full mutation seed refresh is too expensive to run on every push to `main`.

## Validation Plan

### Unit Tests

- Wrapper target parsing:
  - no-arg CodeGraphy wrapper fails clearly
  - package target resolves to the expected package seed path
  - file target resolves to the owning package seed path
  - `--force` still hydrates first and passes force through to Stryker
- Local main checkout discovery:
  - current checkout on `main`
  - separate worktree on `refs/heads/main`
  - no main worktree found
- Seed staleness:
  - matching `seed-sha.txt` skips download
  - mismatched `seed-sha.txt` refreshes the Local Main Seed Cache
  - missing local seed checks CI
  - missing local and CI seed fails clearly
- Seed copying:
  - copies only the target package incremental report into the worktree
  - never writes branch results back into the Local Main Seed Cache

### Local Integration Checks

- `pnpm run mutate` fails with an explicit target-required message.
- `pnpm run mutate -- packages/extension/src/webview/vscodeApi.ts` succeeds with a pre-seeded extension cache.
- Remove the worktree extension cache, seed local main with a copied CI-like artifact, rerun the same file target, and verify Stryker reports reused mutants.
- Run the same file target a second time and verify it uses the worktree-local cache without rehydrating.
- Run `pnpm run mutate -- --force packages/extension/src/webview/vscodeApi.ts` and verify Stryker reruns the scoped mutants while leaving the hydrated cache in place for later runs.

### Pre-Merge Package Validation

Before merging PR #210, each discovered mutation package was run locally through the root command with a five-minute cap:

```bash
GITHUB_REF_NAME=main pnpm run mutate -- <package>/
```

`GITHUB_REF_NAME=main` was used only for this pre-merge validation because the new mutation-seed workflow does not exist on `main` until the PR lands. That forces the wrapper through the same cold-run path the `main` seed workflow will use, without requiring a seed artifact that cannot exist yet.

Results from the repeat validation after fixing the quality-tools dry-run failure:

| Package | Result |
| --- | --- |
| `core` | reached 5-minute cap after successful package dry run |
| `mcp` | completed, reused `492` of `516` mutants |
| `plugin-godot` | reached 5-minute cap after successful package dry run |
| `plugin-markdown` | completed, reused `109` of `117` mutants |
| `plugin-typescript` | completed, reused `2` of `2` mutants |
| `quality-tools` | reached 5-minute cap after successful `1,560` test dry run |
| `extension` | reached 5-minute cap after successful `5,436` test dry run |

The first validation found a real `quality-tools` issue: seed-cache tests were affected by CI's `GITHUB_REF_NAME=main` environment while they were mocking branch detection. The fix made the seed hydration environment injectable so production still uses `process.env`, while tests can remain deterministic under Stryker.

### CI Checks

- Run the mutation-seed workflow manually on the PR branch against a small package first if possible.
- Verify package matrix jobs run in parallel.
- Verify each package job uploads exactly its package incremental report.
- Verify the assemble job creates a Main Mutation Seed artifact shaped like:

  ```text
  reports/quality-tools/mutation/
    seed-sha.txt
    <package>/
      stryker-incremental-<package>.json
  ```

- Verify a second workflow run restores the previous seed and reuses results instead of cold-running every mutant.
- Verify normal PR CI is unaffected and does not wait on mutation seed refresh.

### Timing Acceptance

- First full `main` seed may take hours.
- Warm package seed jobs should trend toward dry-run/setup time plus changed mutants.
- Warm local file-scoped mutation should stay close to the current single-file warm loop.
- Warm all-package seed refresh wall time should trend toward the slowest package job, not the sum of all packages.

## Decisions

- Accepted: every push to `main` starts a mutation-seed refresh that restores the previous CI seed, refreshes package-level Stryker incremental reports, and republishes the updated seed tree.
- Accepted: the CI seed refresh should run package mutation jobs in parallel with a GitHub Actions matrix, then assemble the combined seed artifact.
- Accepted: local targeted `pnpm run mutate` commands first use the worktree-local package cache, then hydrate a missing package cache from the CI seed before Stryker starts.
- Accepted: local hydration uses the local main checkout's `reports/quality-tools/mutation/` seed tree first and downloads the CI seed artifact only when that local copy is missing or stale.
- Accepted: local seed staleness is decided by comparing the Local Main Seed Cache's stored commit SHA to the latest CI seed artifact's commit SHA.
- Accepted: the Local Main Seed Cache is the local main checkout's `reports/quality-tools/mutation/` tree, with `seed-sha.txt` at the root and package incremental reports under package directories.
- Accepted: no-arg `pnpm run mutate` is invalid; users must run `pnpm run mutate -- <package-or-path>`.
- Accepted: locating the local main checkout means finding the worktree currently on `main` so the wrapper can read/write `<local-main-checkout>/reports/quality-tools/mutation/seed-sha.txt` and package seed files.
- Accepted: the CI seed workflow chooses its matrix with CodeGraphy's host-specific `scripts/mutation/seedJobs.ts` discovery, while the extracted quality-tools package only runs the scoped mutation target it is given.
