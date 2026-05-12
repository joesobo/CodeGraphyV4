# Go Example

Small Go workspace for manual checks of the core Tree-sitter pipeline.

What to look for:

- package-level import edges
- extracted function and type symbols
- call edges tied to imported package bindings

## Symbol Node Demo

Suggested symbol check:

1. Open `main.go`.
2. In Graph Scope, enable **Symbol**.
3. Search for `main`, `Runner`, and `NewRunner`.

Expected behavior:

- Function and Type symbols identify the imported service package declarations.
- The graph shows `main.go` depending on `internal/service/service.go`, with symbols naming the entry points.
