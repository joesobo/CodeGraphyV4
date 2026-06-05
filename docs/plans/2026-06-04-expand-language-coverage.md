# Expand Language Coverage

Trello: https://trello.com/c/fnxo3EzR

## Goal

Close the useful CodeGraph language-coverage gap while preserving CodeGraphy's
Core-vs-plugin boundary.

## Scope

- Add Core Tree-sitter language coverage and examples for Objective-C, Scala,
  and Pascal.
- Add a first-party Svelte plugin package, release metadata, and
  `examples/example-svelte`.
- Expand the Vue plugin with deeper Vue Single File Component behavior and show
  it in `examples/example-vue`.
- Skip Liquid, Delphi, Luau, and Nuxt for now.

## Boundary

- Core gets shallow parser-backed language coverage: grammar, extensions,
  baseline relationships, symbols, and example workspaces.
- Plugins get framework/project-aware behavior: Svelte SFC semantics and deeper
  Vue SFC behavior.

## Acceptance

- Each newly supported language or framework has an example under `examples/`.
- Svelte is represented as a workspace package and in the release flow.
- Vue's existing example demonstrates the expanded plugin behavior.
- Targeted tests cover new or changed language and plugin behavior before
  production changes.
- The PR links back to the Trello card and reports targeted test status.
