# Filter-aware indexing preserves reusable Graph Cache facts

**Status:** Accepted

## Context

File Discovery previously counted every include-matching file toward `maxFiles`, then applied Git ignored metadata and graph Filters later. Large filtered or Git-ignored directories could exhaust the indexing budget before ordinary workspace files were reached. Those hidden files were also analyzed and written into a fresh Graph Cache.

Deleting all hidden facts during each re-index would make filter toggles unnecessarily expensive. A file analyzed while its filter is disabled should remain reusable if the filter is enabled again, while a truly deleted file must still leave the cache.

This decision supersedes ADR 0002 only where it says Filters never affect Indexing or Graph Cache population. Graph Scope remains independent of Indexing.

## Decision

File Discovery classifies include-matching workspace files before applying `maxFiles`:

- active custom Filters, active plugin Filters, and Git ignored state make a file ineligible for new analysis;
- ineligible files do not consume `maxFiles`, enter fresh analysis, or create fresh Graph Cache rows;
- `maxFiles` applies only to currently eligible files;
- directories containing only ineligible files are omitted from the current graph.

Discovery also returns the file paths allowed to remain cached. That retention set contains the selected eligible files plus present files hidden by active Filters or Git ignored state. Indexing removes cached paths outside that set, so it prunes deleted files and eligible files displaced beyond `maxFiles` without deleting reusable hidden facts.

Graph projection uses only the files selected by the current discovery run. A retained hidden cache entry therefore remains absent from the current graph. Disabling its Filter on a later re-index makes the file eligible again and reuses its cached analysis when valid.

## Consequences

- File Discovery must continue past hidden files to fill the eligible-file budget.
- Git ignore classification remains batched so discovery does not spawn one process per file.
- Filter changes do not require clearing reusable analysis.
- Core one-shot indexing, the persistent workspace engine, and the VS Code extension pipeline use the same eligibility and retention semantics.
- Query and interface filtering remain necessary for cached snapshots and presentation, but they are no longer the only place Filters affect data flow.
