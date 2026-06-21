# Acceptance Specs For Graph E2E

## Goal

Replace the hand-written VS Code Playwright Graph View scenario with a
human-readable acceptance spec that compiles into the Playwright test.

## Direction

- Human-owned specs live under `packages/extension/tests/acceptance/specs/`.
- Agent-owned bindings and fixtures live under
  `packages/extension/tests/acceptance/`.
- `@poleski/quality-tools acceptance compile` parses the Gherkin feature and
  generates the Playwright spec under `packages/extension/tests/playwright-vscode/`.
- VS Code-window Playwright remains the product E2E runner.
- Lower-level package behavior stays in unit and integration tests.

## First Human Spec

The first spec should cover the current Graph View smoke flow:

1. Open the example TypeScript workspace.
2. Open the CodeGraphy Graph View.
3. See file nodes before Indexing.
4. Index the workspace.
5. See indexing progress appear and disappear.
6. See updated nodes and edges.
7. See the target file node and an edge.
8. Drag the target file node and observe movement.
9. Activate the target file node and open `src/index.ts`.

## Ownership Rule

The Gherkin feature files are the human contract. Agents may add or edit step bindings,
fixtures, generated tests, and tooling, but must not create, edit, or delete
acceptance spec Gherkin unless the user explicitly asks for that exact spec
change.
