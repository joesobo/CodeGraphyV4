# Issue 133: Support Other Tree-sitter Languages

## Trello

- https://trello.com/c/nUrIpgHW/133-support-other-tree-sitter-languages

## Settled Behavior

- Base `tree-sitter` runtime support is not enough to call a language supported.
- A language has CodeGraphy support when the Core Extension bundles the grammar, maps its file extensions, extracts meaningful baseline relationships, includes examples, and proves behavior with tests.
- Prefer depth over breadth: a smaller number of well-supported languages is better than many parser-only languages.
- Skip JSON and CSS for this issue because they need a separate structured-file relationship model.
- Start with C/C++.
- This PR should intentionally support multiple new languages, one complete language slice at a time.
- Do not start the next language until the current language slice has complete implementation, examples, docs, and tests.
- Kotlin is the second language slice.
- Haskell, PHP, and Ruby are required language slices in this PR.
- Lua is required in this PR.
- Swift and Dart are required in this PR.
- OCaml is out of scope for this PR and can stay as a future candidate.
- Core language slices should stay at the baseline level where the Tree-sitter grammar does most of the heavy lifting.
- Supported languages should share common Tree-sitter analysis helpers wherever they follow the same parser-backed patterns.
- Language-specific core modules should stay small and capture only the syntax differences that shared helpers cannot express cleanly.
- Refactor existing Tree-sitter analyzer code opportunistically as each language slice needs shared behavior, so existing and new language support stay aligned.
- Avoid disconnected rewrites; cleanup should be tied to making the current language slice clearer, better tested, or less duplicated.
- If support requires lots of hand parsing, project-specific behavior, or framework/ecosystem resolution, stop at shallow core coverage and leave deeper support for a plugin.
- C/C++ support should include:
  - `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh`, `.hxx`
  - local include relationships
  - useful code symbols
  - examples showing `.c -> .h`, `.cpp -> .hpp`, and nested include paths
  - docs that say C/C++ are supported
- C/C++ support should not attempt full compiler include-path semantics, macros, templates, or conditional compilation in core.
- Kotlin support should include:
  - `.kt`, `.kts`
  - package declarations and import relationships
  - class, interface, object, and function symbols
  - inheritance relationships where the Tree-sitter grammar exposes them simply
  - Java-like workspace path resolution where practical
- Kotlin support should not attempt Gradle source-set semantics, multiplatform rules, extension function receiver inference, framework detection, or deep JVM build logic in core.
- Implement C and C++ as two analyzer modules with shared include/symbol helpers.
- Add a simple supported-language list to the root `README.md`.
- The focus-language set should include the GitNexus table languages:
  - TypeScript
  - JavaScript
  - Python
  - Java
  - Kotlin
  - C#
  - Go
  - Rust
  - PHP
  - Ruby
  - Swift
  - C
  - C++
  - Dart
  - Lua

## Root README Supported-Language List

List supported language names only:

- TypeScript
- JavaScript
- Python
- Java
- Kotlin
- C#
- Go
- Rust
- PHP
- Ruby
- Swift
- C
- C++
- Dart
- Lua

## Language Slice Order

1. C/C++
2. Kotlin
3. PHP
4. Ruby
5. Haskell
6. Lua
7. Swift
8. Dart

## Implementation Status

- C/C++, Kotlin, PHP, Ruby, Haskell, Lua, Swift, and Dart are implemented in this PR.
- `examples/` now includes a small fake project for each new language so opening the repo-root examples folder shows each language connected in the Relationship Graph.

## Future Candidates

- OCaml: `tree-sitter-ocaml` is available, but OCaml is not in the GitNexus README supported-language table.
