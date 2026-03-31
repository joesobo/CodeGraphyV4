## Goal

Fix custom group patterns so they match nested folder names and exact file names, not just extension-style patterns.

Card: https://trello.com/c/X8pMH5Yd/88-bug-with-groups-working-for-folders-regex

## Plan

1. Reproduce with matcher + group-color tests for nested `DIR_NAME/*` and basename-style paths.
2. Patch webview glob matching with minimal blast radius.
3. Verify targeted webview tests, then package gates.
4. Commit, push, PR to `main`.

## Risks

- Broadening slash-pattern semantics too far could change existing root-path matches.
- Group export uses the same matcher; keep behavior consistent there.

## Unresolved Questions

- None.
