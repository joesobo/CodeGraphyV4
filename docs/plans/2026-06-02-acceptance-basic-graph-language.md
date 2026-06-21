# Acceptance Tests: Basic Graph View and Language Examples

Trello: https://trello.com/c/7tFwbgvT/171-acceptance-tests-basic-graph-view-and-language-examples

## Workflow

This PR starts with an alignment phase before implementation.

1. Human writes informal rough specifications.
2. Agent converts rough specifications into harder, subdivided tasks.
3. Human reviews the tasks.
4. Agent converts reviewed tasks into Gherkin feature files.
5. Human spot-checks the Gherkin.
6. Agent implements step bindings, support code, tests, and production changes needed to make the accepted specs pass.

Human-owned acceptance spec Gherkin under
`packages/extension/tests/acceptance/specs/` should not be created, edited,
renamed, or deleted by agents until the human explicitly asks for that exact
spec change.

## Implemented Scope

This branch is the first acceptance-test split for basic Graph View behavior and
language examples. The accepted Gherkin specs now cover:

- Basic Graph View smoke behavior.
- Graph rendering basics.
- Graph navigation controls, including Fit to Screen and zoom.
- Node selection, dragging, hover details, and favorite outlines.
- File, folder, edge, multi-node, and background context menus.
- Theme-sensitive graph colors.
- Language-example graph coverage for C, C++, C#, Dart, Go, Godot,
  Haskell, Java, Kotlin, Lua, Markdown, PHP, Python, Ruby, Rust, Swift, and
  TypeScript.

The generated Playwright suite is produced from the accepted Gherkin specs by:

```bash
pnpm --filter @codegraphy-dev/extension run generate:acceptance
```

CI runs the VS Code Playwright acceptance suite through Turbo:

```bash
pnpm run test:playwright
```

The root `test:playwright` script discovers workspace packages and apps that
declare `test:playwright`, then filters Turbo to just those owners. Each
workspace package or app owns its full Playwright command. For the extension
package, that command regenerates acceptance tests, builds VS Code/webview
artifacts, and runs the VS Code Playwright suite.

CI splits the VS Code acceptance suite into language examples and graph
interaction shards with `CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE`. Each shard has a
separate Turbo cache key and report directory.

`turbo.json` includes the Playwright reports as task outputs and includes `CI`
and `CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE` in the task hash so local and CI runs
use the correct acceptance environment.

## Out Of Scope

These are planned for later Trello cards:

- Search and filter workflows.
- Export and advanced graph features.
- Settings, cache, deeper VS Code integrations, and plugin management flows.
