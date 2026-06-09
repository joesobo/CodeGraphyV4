# Trello 195: Linux VSIX Ships Mach-O Tree-sitter Binding

## Report

CodeGraphy `5.8.0` Linux x64 installs with an invalid native Tree-sitter runtime:

```text
~/.vscode/extensions/codegraphy.codegraphy-5.8.0-linux-x64/dist/node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node
```

Observed with `file`:

```text
Mach-O 64-bit arm64 bundle
```

Expected for the `linux-x64` VSIX:

```text
ELF 64-bit LSB shared object, x86-64
```

## Tracking

- Trello card: https://trello.com/c/Oy83yMam/195-linux-vsix-ships-mach-o-tree-sitter-native-binding
- Branch: `codex/195-tree-sitter-linux-native`

## Feedback Loop

Build or inspect target VSIX artifacts and assert that every packaged native
`.node` binary matches the VSIX target platform. The first failing assertion
should cover:

```text
extension/dist/node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node
```

inside the `linux-x64` VSIX.

## Ranked Hypotheses

1. The target-specific VSIX native-artifact validator only inspects
   `@ladybugdb/core/lbugjs.node`, so the release pipeline still allows
   Tree-sitter's host-built native binding to be copied into every target.
   Prediction: extending the validator to inspect Tree-sitter will fail against
   the current or recreated `linux-x64` artifact.
2. `syncExtensionRuntimePackages` copies the workspace-installed `tree-sitter`
   package from the macOS arm64 release host after build, and no target-specific
   reinstall/rebuild step refreshes that package for `linux-x64`.
   Prediction: the staged `dist/node_modules/tree-sitter/...node` file matches
   the release host even when the VSIX target name is `linux-x64`.
3. `vsce --target linux-x64` labels and filters the VSIX but does not rewrite
   already-vendored native modules in `dist/node_modules`.
   Prediction: changing only `vsce` target arguments will not change the
   binary kind in the vendored Tree-sitter runtime.
4. `tree-sitter` does not expose the same optional native-package matrix as
   `@ladybugdb/core`, so the fix may need an explicit target install/rebuild
   strategy rather than selecting an existing optional package.
   Prediction: `tree-sitter` package metadata lacks platform-specific optional
   dependencies for the runtime binding.

## Test-First Plan

1. [x] Add a failing release test for Tree-sitter native binary validation in VSIX
   artifacts.
2. [x] Reproduce the reported mismatch by recreating the artifact-inspection
   failure locally with a `linux-x64` VSIX fixture that contains a Mach-O
   Tree-sitter binding.
3. [x] Trace how `tree-sitter` enters `dist/node_modules` during extension build
   and VSIX packaging.
4. [x] Fix the release pipeline so target VSIX artifacts cannot contain host-native
   Tree-sitter bindings.
5. [x] Re-run the focused release/native validation tests, then package validation
   for supported targets.

## Finding

`tree-sitter@0.25.0` does not publish platform-specific optional native
packages like `@ladybugdb/core` does. Its npm tarball contains source files and
an install script that runs `node-gyp-build`; the installed package then has a
host-built native file at:

```text
build/Release/tree_sitter_runtime_binding.node
```

The extension build copies that installed package into `dist/node_modules`.
`vsce --target linux-x64` labels the VSIX for Linux, but it does not rebuild
or replace the already-copied Tree-sitter binding. So a macOS arm64 release
host can create a `linux-x64` VSIX whose Tree-sitter runtime is still a Mach-O
arm64 binary.

The previous native-artifact validation only inspected
`@ladybugdb/core/lbugjs.node`, so it missed this second native runtime.

## Fix

- Validate both `@ladybugdb/core/lbugjs.node` and
  `tree-sitter/build/Release/tree_sitter_runtime_binding.node` inside VSIX
  artifacts.
- Make VSIX packaging fail closed when a release host tries to package a VSIX
  target that does not match its own native runtime platform.
- Run CI VSIX artifact checks as a Linux/macOS/Windows target matrix so each
  runner packages and validates the matching native artifact.
- Split manual release workflow publishing so npm packages publish once, while
  VSIX publishing runs per target on the matching OS runner.
