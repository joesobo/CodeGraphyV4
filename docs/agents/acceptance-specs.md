# Acceptance Specs

Acceptance specs are the human-written contract for product E2E behavior.

## Ownership

- Specs live under `packages/extension/tests/acceptance/specs/`.
- Specs are Markdown and should read like user facing acceptance criteria.
- Agents may create or edit bindings, fixtures, generated Playwright tests, and
  tooling.
- Agents must not create, edit, rename, or delete acceptance spec Markdown
  unless the user explicitly asks for that exact spec change.

## Workflow

1. The human writes or edits a spec in Gherkin-ish Markdown.
2. `quality-tools acceptance compile` parses the spec and generates the
   Playwright test file.
3. Agent owned step bindings in `packages/extension/tests/acceptance/steps.ts`
   connect the human phrases to executable product actions and assertions.

This keeps the alignment contract readable while leaving the implementation
details in normal TypeScript.

See `packages/extension/tests/acceptance/README.md` for the folder layout,
local commands, and writing guidance.
