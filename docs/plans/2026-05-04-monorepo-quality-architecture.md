# Monorepo Quality And Architecture Pass

## Setup

- Worktree: `/Users/poleski/Desktop/Projects/CodeGraphyV4-monorepo-quality-architecture`
- Branch: `codex/monorepo-quality-architecture`
- PR base branch: `main`
- Started from: `79f5f648` (`Merge pull request #199 from joesobo/codex/graph-context-menu-architecture`)
- Stop time: 2026-05-05 02:10 PDT
- Domain source: `CONTEXT.md`
- Quality source: `docs/quality/`

## Goal

Run the local quality tools across the CodeGraphy monorepo, fix issues that are actionable in this pass, and deepen architecture where the current package seams are shallow or hard to maintain.

The cleanup should keep the project readable for future maintainers and agents:

- package responsibilities are clear
- source modules are deep enough to provide leverage
- tests exercise stable interfaces instead of incidental implementation details
- docs explain the project and packages in current domain language

## Working Rules

- Commit and push frequently.
- Keep the branch isolated from the protected main worktree.
- Prefer scoped mutation runs over a full mutation suite.
- Re-run a failing quality tool after fixing the issue it found.
- Update docs after the large-scale cleanup so the package map and project purpose stay current.
- Add changesets for user-facing behavior changes. Skip changesets for docs, tests, and internal refactors.

## Baseline Gates

Run these broad gates before choosing cleanup targets:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`

Run package quality tools across monorepo packages:

- `pnpm run organize -- <package>`
- `pnpm run boundaries -- <package>`
- `pnpm run reachability -- <package> --strict`
- `pnpm run crap -- <package>`
- `pnpm run scrap -- <package>`

Use scoped mutation for changed packages or files:

- `pnpm run mutate -- <changed source file or source directory>`

## Architecture Review Notes

The architecture pass uses the `improve-codebase-architecture` vocabulary:

- **Module**: anything with an interface and implementation.
- **Interface**: everything callers must know to use the module.
- **Depth**: leverage behind the interface.
- **Seam**: where an interface lives.
- **Adapter**: a concrete thing satisfying an interface at a seam.
- **Locality**: change, bugs, and knowledge concentrated in one place.

Candidates should be accepted only when they improve locality or leverage enough to justify the churn.

## Status

- Setup: in progress.
- Baseline gates: pending.
- Architecture candidates: pending.
- Implementation: pending.
- Final CI: pending.
