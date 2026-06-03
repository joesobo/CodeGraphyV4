# Rust Example

Small Rust workspace for manual checks of the core Tree-sitter pipeline.

What to look for:

- `use` edges resolved to local files
- `mod` edges resolved to sibling modules
- function, struct, enum, and trait symbols

## Graph Screenshot

![Rust example graph screenshot](../assets/graphs/rust.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `src/main.rs`.
2. In Graph Scope, enable **Symbol**.
3. Search for `App`, `Status`, `Service`, and `run`.

Expected behavior:

- Type and Function symbols sit beside the Rust module edges.
- The graph shows both the module layout and the declarations that make up the app flow.
