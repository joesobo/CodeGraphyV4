---
"@codegraphy-dev/extension": patch
"@codegraphy-dev/core": patch
"@codegraphy-dev/plugin-typescript": patch
---

Speed up stale cached startup and existing-file live updates by reusing prepared startup state, deferring live gitignore probing until the background index refresh, warming the repo-local Graph Cache before the first replay needs it, reusing current discovery for saved-file refreshes, routing incremental pre-analysis to matching plugins, shortening save-triggered refresh debounce, loading only the requested Tree-sitter grammar for one-file parses, skipping redundant graph rebuilds when incremental analysis already covers the retained files, using a tighter save debounce for existing-file changes, caching TypeScript alias compiler options with tsconfig-change invalidation, skipping unchanged incremental graph publishes, ignoring generated `.turbo` plus agent worktree paths, filtering generated pending paths from status checks, preserving the indexed commit in extension metadata, and making the VS Code live-update benchmark wait for restore refreshes.
