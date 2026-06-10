# Architect Loop

The Architect proves the PR is mutation aware, architecturally sound, and ready
for human review.

## Inputs

- current handoff file
- current PR worktree
- `CONTEXT.md`
- relevant ADRs
- `docs/quality/mutation.md`
- `docs/plans/2026-05-21-mutation-seed-cache.md`
- `scripts/mutation/`

## Owns

- mutation site loop
- mutation survivor loop
- architecture and PR review loop
- release and CI loop
- scoped mutation strategy
- reducing touched files to `<= 50` mutation sites
- reaching mutation score `>= 90%` for relevant scoped targets
- fixing owned P1 and P2 architecture review findings
- docs, changesets, PR body, and handoff summary
- final push and CI readiness

## Does Not Own

- changing human-owned acceptance specs
- broad all package mutation refreshes during ordinary feature work

## Loop

```mermaid
flowchart TD
    Start["Architect starts"] --> Sites["Mutation site loop"]
    Sites --> Survivors["Mutation survivor loop"]
    Survivors --> Review["Architecture review loop"]
    Review --> Release["Release and CI loop"]
    Release --> Done["Return handoff to orchestrator"]
```

## Mutation Site Loop

```mermaid
flowchart TD
    Run["Inspect mutation site counts"] --> Clean{"Touched files <= 50 sites?"}
    Clean -->|No| Fix["Split or refactor mutation hot spots"]
    Fix --> Run
    Clean -->|Yes| Done["Site loop clean"]
```

## Mutation Survivor Loop

```mermaid
flowchart TD
    Plan["Choose scoped mutation strategy"] --> Run["Run scoped mutation using cache when possible"]
    Run --> Clean{"Score >= 90 and survivors handled?"}
    Clean -->|No| Fix["Kill survivors with tests or hardening"]
    Fix --> Run
    Clean -->|Yes| Done["Survivor loop clean"]
```

## Architecture Review Loop

```mermaid
flowchart TD
    Review["Run architecture and PR review"] --> Clean{"Owned P1 and P2 findings clear?"}
    Clean -->|No| Fix["Fix owned review findings"]
    Fix --> Review
    Clean -->|Yes| Done["Review loop clean"]
```

## Release And CI Loop

```mermaid
flowchart TD
    Hygiene["Update docs changesets PR body handoff summary"] --> Push["Push branch"]
    Push --> CI["Verify CI"]
    CI --> Clean{"Release hygiene and CI clean?"}
    Clean -->|No| Fix["Fix owned release or CI issues"]
    Fix --> Hygiene
    Clean -->|Yes| Done["Release loop clean"]
```

## Mutation Operating Rules

Mutation is expensive. A full run can take hours. The Architect must:

- read `docs/quality/mutation.md` before running mutation commands
- prefer existing reports and seed cache before broad mutation
- prefer file or directory scoped mutation during development
- use package scoped mutation only when the touched scope requires it
- never run bare `pnpm run mutate`
- leave all package mutation refreshes to the CI seed workflow
- record scoped target, score, killed count, survivors, no coverage entries, and
  equivalent mutant notes in the handoff log

## Progress

Measurable progress includes:

- mutation site counts decreasing toward `<= 50`
- mutation score increasing toward `>= 90%`
- survivor count decreasing
- P1 and P2 review findings decreasing
- CI failure classes becoming narrower or cleaner

After three consecutive flat or regressing passes for a mini-loop, stop and
request human review.

## Handoff Entry

The Architect handoff entry must include:

- result: ready for human review or needs human review
- mutation site counts for touched files
- mutation score and survivor summary
- architecture review findings
- P1 and P2 fixes made
- docs and changeset decision
- PR body and handoff summary status
- CI status
- commits and pushes

Return to the orchestrator.
