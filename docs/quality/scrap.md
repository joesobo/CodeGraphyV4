# SCRAP

SCRAP is the test-structure complement to CRAP and mutation testing.

It is intended to answer:

- should this test file stay as-is, be cleaned up locally, or be split?
- where are the structurally weak examples?
- are there low-assertion, branching, mock-heavy, or helper-hidden tests worth refactoring?

Current `SCRAP v5` metrics:

- per-test line count
- assertion count
- branch count
- mock/spy count
- describe nesting depth
- helper call count
- helper-hidden line count
- file-level helper-hidden example count
- setup line count before the first assertion
- setup nesting depth
- table-driven example detection
- temp-resource work count
- snapshot-heavy detection
- async wait pressure
- fake timer and env/global mutation signals
- concurrency signals
- type-only assertion awareness
- duplicate setup group size per example
- file-level duplicate setup example count
- setup duplication score
- assertion duplication score
- coverage-matrix candidate count
- harmful duplication score
- effective duplication score
- extraction-pressure score
- recommended extraction count
- subject repetition score
- distinct subject count
- subject overlap
- example/setup/assertion shape diversity
- average example/setup/assertion similarity
- block-level `describe` / `context` summaries
- structural validation and parse issue detection
- AI actionability classes
- baseline comparison deltas
- file-level `STABLE` / `LOCAL` / `SPLIT` remediation mode

Current scope:

- test examples are found from `test`, `it`, and related call forms
- `test.each(...)` and similar table-driven forms are recognized
- scores are additive and intentionally simple to keep the signal explainable
- helper-hidden complexity counts helper logic that runs outside the visible example body
- fuzzy normalized duplication compares example/setup/assertion shapes after normalizing identifiers and literal values
- duplication pressure now looks beyond setup into assertion and whole-example shape clusters
- subject cohesion highlights files that touch many unrelated production subjects with little overlap
- nested `describe` and `context` paths are summarized so hotspots can be localized inside a larger spec file
- malformed structure is reported when hooks, nested tests, or suite builders appear inside a test body
- output supports human-readable summaries, JSON, verbose detail, and baseline comparison for tooling
- recommendations currently include table-drive, extract-setup, strengthen-assertions, and structure-review guidance

Examples:

```bash
pnpm run scrap -- extension/
pnpm run scrap -- extension/tests/webview/
pnpm run scrap -- quality-tools/
pnpm run scrap -- quality-tools/tests/scrap/metrics.basics.test.ts --json
pnpm run scrap -- quality-tools/ --write-baseline
pnpm run scrap -- quality-tools/ --compare reports/scrap/quality-tools.json --verbose
```

Vitest / TypeScript-specific signals worth tracking:

- `test.each`, `it.each`, and similar table-driven forms
- `vi.fn`, `vi.spyOn`, and mock-heavy tests
- hooks or nested tests placed inside an example body
- temp filesystem helpers such as `mkdtemp`, `mkdir`, `writeFile`, and `tmpdir`
- branchy setup that hides behavior before the first assertion
- snapshot-heavy tests
- `waitFor`, `findBy*`, and similar async wait chains
- `vi.useFakeTimers`, `vi.setSystemTime`, `vi.stubEnv`, `vi.stubGlobal`
- `test.concurrent` / `describe.concurrent`
- `expectTypeOf` and `assertType` compile-time assertions

Good next additions for the Vitest/TypeScript stack:

- React Testing Library query/mutation balance for UI-heavy suites

Still planned:

- stronger coverage-matrix detection so repeated scalar variations do not over-report harmful duplication
- richer duplication channels beyond current setup/assertion/example clusters, especially fixture and literal-shape clustering
- clearer extraction recommendations that point at candidate helper groups and block paths
- optional stricter CLI gating once the signals stabilize on real package test suites
