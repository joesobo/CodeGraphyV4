# Acceptance Tests

This directory contains the human-readable acceptance specs and the executable
bindings that turn those specs into VS Code Playwright E2E tests.

## Pipeline

```txt
specs/*.feature
  -> quality-tools acceptance compile
  -> generated JSON IR
  -> generated advisory DRY reports
  -> generated thin Playwright entrypoints
  -> generated shared Playwright runtime
  -> VS Code Playwright
```

The generated Playwright files live under
`packages/extension/tests/playwright-vscode/generated/`. They are build
artifacts checked in for review visibility, but they should not be edited by
hand.

The generated JSON IR lives under
`packages/extension/tests/playwright-vscode/generated-ir/`. Advisory DRY
reports are written under `packages/extension/reports/acceptance-dry/`, which is
ignored by git. The generated Playwright entrypoints load JSON IR through a
shared generated runtime, so the checked-in spec files stay thin while preserving
source line metadata and Playwright `test.step` reporting. The DRY reports
surface repeated step patterns and scenario shapes for review; they do not
rewrite specs or change test behavior.

## Ownership

- Humans own `specs/**/*.feature`.
- Agents own step bindings, fixtures, helpers, generated Playwright files, and
  tooling.
- Agents must not create, edit, rename, or delete spec Gherkin unless the user
  explicitly asks for that exact spec change.

The guardrail is documented in `docs/agents/acceptance-specs.md` and enforced by
`scripts/guard-acceptance-spec-edits.mjs` during Codex pre-commit runs.

## How Specs Map To Code

Specs do not automatically cover every product feature. They cover the product
workflows the human writes down.

Each step phrase in a spec maps to a TypeScript binding in `steps.ts` or a
feature-owned step module. For example:

```gherkin
When I open the CodeGraphy graph view
Then I see file nodes before indexing
```

maps to executable functions that launch VS Code, open the Graph View webview,
and assert user-visible state.

As the suite grows, organize specs and bindings by product feature:

```txt
tests/acceptance/
  specs/
    graph-view.feature
    settings.feature
  graphView/
    steps.ts
    fixture.ts
    canvasProbe.ts
  settings/
    steps.ts
    fixture.ts
  vscode/
    fixture.ts
  steps.ts
```

Keep `steps.ts` as a small registry that combines feature step modules. Move
real work into feature folders before a file becomes a mutation-site magnet.

## Writing Good Specs

Good acceptance specs describe observable product behavior in CodeGraphy's
language.

- Prefer user-visible facts over implementation details.
- Use concrete examples, such as `src/index.ts opens in VS Code`.
- Keep each scenario focused on one workflow or rule.
- Keep scenarios short enough to read as documentation.
- Avoid selectors, CSS classes, store names, IPC messages, timers, and internal
  command plumbing.
- Let the step binding do the mechanical work.

Use these local language sources before inventing new terms:

- `CONTEXT.md`
- `docs/adr/`
- `docs/agents/domain.md`
- `docs/agents/acceptance-specs.md`

Helpful external references:

- [Uncle Bob Acceptance Pipeline Specification](https://github.com/unclebob/Acceptance-Pipeline-Specification)
- [Cucumber Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [Keep your scenarios BRIEF](https://cucumber.io/blog/bdd/keep-your-scenarios-brief/)
- [Uncle Bob empire-2025 acceptance examples](https://github.com/unclebob/empire-2025/tree/master/acceptanceTests)

## Commands

Regenerate the acceptance pipeline artifacts:

```bash
pnpm --filter @codegraphy-dev/extension run generate:acceptance
```

Run the full VS Code acceptance E2E path:

```bash
pnpm --filter @codegraphy-dev/extension run test:playwright
```

The full path compiles Gherkin, builds the extension, launches a VS Code
Extension Development Host, opens the Graph View, and runs the generated
Playwright test.

Run one generated scenario while iterating:

```bash
pnpm --filter @codegraphy-dev/extension run build:vscode
pnpm --filter @codegraphy-dev/extension exec playwright test --config playwright.vscode.config.ts --grep "Vue example"
```

The direct Playwright command is only safe after `build:vscode`; otherwise it
can launch stale extension output. Prefer `test:vscode` when you want the whole
pipeline.

The VS Code launcher in `graphView/vscode.ts` intentionally uses
`--use-inmemory-secretstorage` and `--use-mock-keychain` on macOS. Those flags
avoid the local "Keychain Not Found" / "Code Key" modal that blocks Playwright
before it can see the Extension Development Host. Keep that launcher path in
sync with any new VS Code Playwright fixtures.
