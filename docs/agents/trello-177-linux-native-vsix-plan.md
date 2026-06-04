# Trello 177: Platform-Specific VSIX Native Packaging

## Problem

CodeGraphy 5.6.5 can ship the build host's LadybugDB native module inside the VSIX.
When the VSIX is built on macOS arm64, Linux users can receive
`dist/node_modules/@ladybugdb/core/lbugjs.node` as a Mach-O arm64 binary. VS Code
then fails extension activation on Linux with `invalid ELF header`.

## Tracking

- GitHub issue: https://github.com/joesobo/CodeGraphyV4/issues/239
- Trello card: https://trello.com/c/mjnGkZQE/177-bug-linux-vs-code-extension-ships-macos-ladybugdb-native-module

## Current Release Goal

Keep the maintainer-facing release command stable:

```bash
pnpm run version-packages
pnpm run release:publish all
```

The extension release implementation can fan out to target-specific VSIX
publishing underneath that command.

## Test-First Plan

1. Add a failing packaging test that proves a target VSIX cannot contain a
   native LadybugDB binary for a different platform.
2. Add CI validation for Ubuntu, macOS, and Windows that installs or inspects
   the target extension artifact and proves activation cannot fail because of
   a mismatched native module.
3. Update extension release packaging so each VSIX target stages the matching
   LadybugDB native module before calling `vsce --target`.
4. Update release docs and add a patch changeset for the user-facing activation
   fix.

## Initial Target Set

- `linux-x64`
- `darwin-arm64`
- `darwin-x64`
- `win32-x64`

Additional targets such as `linux-arm64`, `win32-arm64`, and Alpine should be
added only after the native dependency and VS Code activation lane are proven
for those platforms.
