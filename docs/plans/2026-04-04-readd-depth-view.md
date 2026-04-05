# Re-add Depth View

## Goal

Rebuild depth view from scratch as a local-graph variant of Connections. Keep graph interactions unchanged. Show a bottom slider for depth `1..5`. Fall back to full Connections graph when no focused file exists.

## Subtasks

- `S1` remove old depth view implementation/tests/plumbing; tests: remove obsolete depth coverage, keep repo green
- `S2` add fresh failing acceptance tests for new depth semantics and bottom slider; tests: targeted extension + webview red
- `S3` implement extension-side depth transform/state reuse from Connections; tests: targeted core/extension green
- `S4` implement webview bottom slider with shadcn/radix styling; tests: targeted webview green
- `S5` run subagents on disjoint slices after red tests exist; verify diffs + tests before integrating
- `S6` validate with lint, typecheck, targeted/full tests, CI, and manual smoke in real graph view

## Notes

- Protected worktree stays on `main`
- Branch: `codex/readd-depth-view-fresh`
- Worktree: sibling agent worktree
- Use GitHub draft PR early
- Depth traversal is undirected
- Node interactions stay the same across Connections, Folder, Depth

## Unresolved Questions

- None
