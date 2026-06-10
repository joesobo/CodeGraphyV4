# Trello 193: C Upgrade Plan

Trello card: https://trello.com/c/4xVbXn3n/193-c-upgrade
Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/257

## Product Boundary

Core C support is **Core Tree-sitter Language Coverage**. This PR should push
`tree-sitter` plus `tree-sitter-c` as far as honest AST analysis allows without
pretending to be a C compiler or preprocessor.

Out of scope:

- Full compiler include-path semantics.
- Macro expansion.
- Conditional compilation evaluation.
- Build-system or compile-database interpretation.
- C-plugin-level semantic analysis.

## Target Experience

`examples/example-c` should become a clean tiny logger project. The first graph
should be useful from file-level edges: headers, source files, local includes,
and calls that Core can resolve from included declarations. Symbol nodes should
add detail in a separate acceptance scenario without being the primary selling
point.

## Planned Slices

1. Add or update Core tests for C AST behavior before analyzer changes.
2. Revamp `examples/example-c` into the tiny logger project.
3. Update the C acceptance spec with a file graph scenario and a symbol graph
   scenario.
4. Update the C example README and graph image from the real extension surface.
5. Add a user-facing changeset.
6. Run focused Core and extension tests, then broader gates, and verify PR CI.
