---
name: codegraphy
description: Use the CodeGraphy CLI for bounded source and relationship navigation in a prepared workspace graph.
---

# CodeGraphy

CodeGraphy identifies the smallest set of source files worth reading. It provides navigation evidence, not a substitute for source inspection.

## When to use it

Use CodeGraphy when:

- a task gives a symptom or identifier but not the owning source;
- an unfamiliar or large repository makes broad search expensive;
- a caller, dependency, re-export, or impact path is unknown.

Skip CodeGraphy when:

- the task or failing test already names the relevant source and the question is local to it;
- a small repository or one narrow text search is sufficient;
- the task is primarily about prose or configuration rather than code relationships.

## Setup only when needed

Do not call `status`, inspect settings, or index before ordinary navigation. If a command reports `graph_cache_not_found`, run `codegraphy index` once and retry. Use `codegraphy filter`, `settings`, `scope`, or `plugins` only to prepare or durably change the workspace, not as navigation steps. If indexing reports a file-budget cap, follow its `maxFiles` recovery action and reindex once.

Query with the narrowest operation that answers the question:

- `search <pattern>` locates live source, AST Symbols, and File Nodes.
- `query <exact-node>` gives bounded declarations plus incoming and outgoing Relationships for one returned File or Symbol ID.
- `dependencies`, `dependents`, and `path` answer one unresolved relationship question.
- `nodes` and `edges` enumerate graph inventories; do not use them for ordinary localization.

## Token-bounded navigation policy

1. Use `search` only when the relevant source is not already known. Search with at most three task literals:
   - use an exact identifier plus one domain word when the identifier is common;
   - otherwise use two or three short task words;
   - never submit a sentence or guess an API name.
2. If the first page is broad or unrelated, the second and final normal call may refine the search with one different task word. Otherwise use `query` only when one returned target's relationships are needed.
3. Normally make at most two CodeGraphy calls. A third is allowed only for one unresolved relationship continuation. Commands launched concurrently count separately.
4. Never repeat the same search or search an identifier already returned.
5. Once Search returns plausible source or test paths, read the best few paths directly. Do not rerun repository-wide `rg`, `grep`, or `find` merely to localize the same task. Use file-local search after reading.
6. Stop graph navigation once relevant files are known. Verify the requested behavior and tests from source before answering or editing.

Search is case-insensitive, `*` is a line-local wildcard, and multi-term searches rank Files containing all terms. Quote patterns containing spaces or `*`. Search results include paths and locations; query targets must be exact returned File paths or Symbol IDs.

Results are JSON envelopes. Use `data.page.nextOffset` only when the current page is insufficient. On `query_target_not_found`, search for an exact target. After one empty or refined search, switch to ordinary source search rather than spending more graph calls.

Run `codegraphy --help` or `codegraphy <command> --help` for complete syntax and examples.
