# Targeted queries use complete reexport relationships

**Status:** Accepted

## Context

The saved Graph View Scope enables File Nodes and structural import-like Edges by default while hiding detailed Symbol and call facts. That presentation preference leaked into CLI traversal: an exact Symbol `query` could expose cached calls, but `dependencies`, `dependents`, and `path` could return no result for the same selectors. General call reports also projected unresolved JavaScript-family calls to Files when an imported binding passed through a barrel, even though the Graph Cache contained the implementation Symbol.

Graphify was evaluated directly on the 912-file Core fixture. Code-only extraction took 5.53 seconds and breadth-first queries took 0.39–0.46 seconds, but phrase traversals returned broad truncated neighborhoods. Exact `runFilterCommand` traversal and `explain` were materially better: they exposed the direct extracted call to `readCodeGraphyWorkspaceSettingsOrInitial` with direction and provenance. This supports exact-anchor relationship deepening rather than broad natural-language traversal.

A bounded connected-search prototype expanded one exact lexical anchor through typed outgoing relationships to depth two, retained at most one incoming Edge, and suppressed expansion through p99-degree hubs. Three controlled variants were mixed:

- the first treatment slightly improved median elapsed time and tokens but increased calls and output;
- refinement plus guidance reduced calls and output but was 1.3% slower and used 2.2% more tokens;
- the final exact-anchor treatment was 2.8% faster, but median calls increased from 23 to 31, tokens from 98,117 to 126,766, and output from 93,765 to 105,773 bytes.

Agents still read source after receiving the neighborhoods. Generic connection augmentation therefore did not earn its added response surface. Leiden communities, personalized PageRank, and god-node ranking remain research candidates rather than default query behavior.

The narrower hypothesis was to make existing exact operations truthful. JavaScript-family export statements previously emitted ordinary `import` Relationships. Workspace enrichment could use transient binding metadata to resolve a call through a barrel during a full index, but the normalized Graph Cache intentionally does not persist analyzer metadata. A later incremental CLI process therefore fell back to the barrel File.

A three-pair hard-task comparison tested complete targeted scope plus direct call resolution through reexports against the prior graph-focused CLI. The first implementation produced these medians:

| Hard-task median | Prior graph | Complete reexport graph | Delta |
|---|---:|---:|---:|
| Elapsed | 120.2 s | 107.9 s | 10.3% faster |
| Tool calls | 21 | 24 | 14.3% more |
| Total tokens | 125,606 | 121,129 | 3.6% fewer |
| Tool output | 110,361 B | 101,930 B | 7.6% fewer |

Every run used four CodeGraphy calls. The treatment improved elapsed time, tokens, and output while increasing tool calls. A final paired run after making reexports explicit is recorded below.

The final selected interface and stable skill were then rerun in three fresh pairs:

| Hard-task median | Prior graph | Complete reexport graph | Delta |
|---|---:|---:|---:|
| Elapsed | 103.7 s | 106.9 s | 3.1% slower |
| Tool calls | 27 | 23 | 14.8% fewer |
| Total tokens | 128,784 | 173,530 | 34.7% more |
| Tool output | 107,563 B | 103,294 B | 4.0% fewer |
| Blinded correctness | 10/10 | 9/10 | one point lower |

The treatment won elapsed time in two of three matched pairs but lost on the independent cell medians. A separate final round likewise reduced output by 4.7% while elapsed, calls, and tokens varied in the other direction. Across the two final rounds, smaller tool output was the only stable aggregate improvement. The explicit relationship model is retained for structural correctness, incremental parity, 14.8% fewer calls in the selected round, and consistently smaller output—not as a claim that it universally speeds this task.

A follow-up skill sentence that explicitly preferred callable Symbol targets made all treatment agents choose `runFilterCommand` directly and reduced that treatment's cross-round median calls from 24 to 21. Against its paired prior-graph condition, however, it was 19.7% slower with 2.9% more tokens and 4.1% more output, so the sentence was removed.

The samples are intentionally small and retain the variance seen in earlier agent experiments. Exact reexport relationships are an evidence-backed graph correction with measured tradeoffs, not universal agent superiority.

## Decision

Use the complete cached Node and Edge Types for CLI Search, Target Query, Path, and exact targeted Relationship selectors. Saved Graph View Scope continues to shape inventory and presentation. Explicit `--node-type` and `--edge-type` projections constrain Search and Target Query before resolving cached Symbols or Relationships. Persisted and one-off path Filters apply to graph Nodes, live source evidence, cached Symbols, and cached relations through the same allowed-File set.

When File selectors expand to their Symbols for Path, try exact File endpoints first and stop after finding that exact route. Do not emit redundant longer Symbol-expanded routes after an exact File path succeeds.

Add `reexport` to the Core Relationship vocabulary and Plugin API. JavaScript-family export statements emit `reexport` rather than overloading persisted relation identity. Renamed exports create Alias Symbol Nodes, with the reexport originating at the alias. File-level projection still presents export-from dependencies as imports, preserving the default Graph View and dependency semantics while the persisted structural relation remains available to exact queries. Reexport Edges and capabilities remain hidden in the default Graph View Scope but are available to complete targeted queries and explicit projections.

Resolve call, event, inherit, and reference targets through named, aliased, and export-star reexport chains. Keep lexical import Relationships pointed at the barrel so dependency invalidation remains correct. Because the Graph Cache persists the reexport Edge Type, target Symbol, and Alias Symbol identity, a new CLI process can recover the same implementation target after incremental Indexing without persisting analyzer metadata or adding a compatibility path.

Do not add generic connected neighborhoods to Search or Target Query. Do not add a public traversal command, Leiden dependency, PageRank ranker, or god-node report without a controlled task where the added observation improves the selected metric without an unacceptable regression in the others.

## Consequences

- Exact Symbol dependencies and paths no longer depend on Graph View visibility settings.
- Calls through barrels terminate at implementation Symbols while File projection keeps lexical export-from dependencies visible as imports to the barrel.
- `reexport` is independently filterable and queryable as an Edge Type.
- Renamed exports are first-class Alias Symbols instead of metadata that disappears at the Graph Cache boundary.
- Full and incremental CLI processes produce the same tested call target through named reexports.
- Broad connection expansion remains rejected for the current agent workflow despite useful isolated rankings.

## References

- Graphify source and traversal implementation: https://github.com/Graphify-Labs/graphify
- ADR 0002, SQLite Graph Cache boundaries
- ADR 0007, Search and Target Query
- ADR 0008, deterministic phrase search and safe agent settings
