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
- React Testing Library render/query/mutation signals
- duplicate setup group size per example
- file-level duplicate setup example count
- setup duplication score
- assertion duplication score
- fixture duplication score
- literal-shape duplication score
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
- literal-shape clustering helps separate scalar matrix repetition from harmful duplication
- fixture-heavy examples are tracked as a separate duplication channel so filesystem and temp-resource setup does not disappear into generic setup noise
- subject cohesion highlights files that touch many unrelated production subjects with little overlap
- nested `describe` and `context` paths are summarized so hotspots can be localized inside a larger spec file
- malformed structure is reported when hooks, nested tests, or suite builders appear inside a test body
- output supports human-readable summaries, JSON, verbose detail, policy presets (`advisory`, `review`, `split`, `strict`), and baseline comparison for tooling
- recommendations currently include table-drive, extract-setup, strengthen-assertions, and structure-review guidance with block and helper-group context

Examples:

```bash
pnpm run scrap -- extension/
pnpm run scrap -- extension/tests/webview/
pnpm run scrap -- quality-tools/
pnpm run scrap -- quality-tools/tests/scrap/metrics.basics.test.ts --json
pnpm run scrap -- quality-tools/ --write-baseline
pnpm run scrap -- quality-tools/ --compare reports/scrap/quality-tools.json --verbose
pnpm run scrap -- quality-tools/ --policy split
pnpm run scrap -- quality-tools/ --policy split
pnpm run scrap -- quality-tools/ --policy review
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
- filesystem fixture clustering through `mkdir`, `writeFile`, `mkdtemp`, and similar temp-resource calls
- React Testing Library render/query/mutation balance for UI-heavy suites

Policy presets:

- `advisory` leaves output informational only
- `split` fails when `SPLIT` files are present
- `review` fails when `REVIEW_FIRST` files are present
- `strict` fails on either condition
- `--strict` remains a shorthand alias for `--policy strict`
