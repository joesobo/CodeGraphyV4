# Acceptance Tests: Basic Graph View and Language Examples

Trello: https://trello.com/c/7tFwbgvT/171-acceptance-tests-basic-graph-view-and-language-examples

## Workflow

This PR starts with an alignment phase before implementation.

1. Human writes informal rough specifications.
2. Agent converts rough specifications into harder, subdivided tasks.
3. Human reviews the tasks.
4. Agent converts reviewed tasks into Gherkin-ish Markdown.
5. Human spot-checks the Gherkin.
6. Agent implements step bindings, support code, tests, and production changes needed to make the accepted specs pass.

Human-owned acceptance spec Markdown under
`packages/extension/tests/acceptance/specs/` should not be created or edited by
agents until the human explicitly asks for that exact spec change.

## Initial Scope

This branch is for the first acceptance-test split:

- Basic Graph View smoke behavior.
- Graph rendering basics.
- Node information and opening files.
- Initial language-example acceptance coverage.

Candidate specs after review:

- `graph-view-smoke.md`
- `graph-rendering.md`
- `node-information.md`
- `language-examples.md`

## Out Of Scope

These are planned for later Trello cards:

- Search and filter workflows.
- Export and advanced graph features.
- Settings, cache, context menus, VS Code integrations, and plugins.
